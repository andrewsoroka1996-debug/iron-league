"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import PlayerEmblem from "../../../components/PlayerEmblem";
import { players } from "../../../data/players";

type Emblem = {
  player_id: string;
  image_path: string;
  updated_at: string;
  url: string;
};

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  warning?: string;
  emblems?: Emblem[];
  player_id?: string;
  image_path?: string;
  url?: string;
};

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const sortedPlayers = [...players].sort((a, b) =>
  a.nickname.localeCompare(b.nickname, "uk", { sensitivity: "base" })
);

function getInitials(nickname: string): string {
  const cleaned = nickname
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase() || "?";
}

async function readResult(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return { error: "Сервер повернув некоректну відповідь" };
  }
}

export default function AdminPlayerEmblemsPage() {
  const [password, setPassword] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emblems, setEmblems] = useState<Emblem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [filter, setFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectedPlayer = sortedPlayers.find((player) => player.id === playerId);
  const selectedEmblem = emblems.find((emblem) => emblem.player_id === playerId);

  const filteredPlayers = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase("uk");
    if (!term) return sortedPlayers;
    return sortedPlayers.filter(
      (player) =>
        player.nickname.toLocaleLowerCase("uk").includes(term) ||
        player.id.toLowerCase().includes(term)
    );
  }, [filter]);

  function notify(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  function resetFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function loadEmblems() {
    if (!password.trim()) {
      notify("Введіть пароль адміністратора", true);
      return;
    }

    setBusy(true);
    notify("");
    try {
      const response = await fetch("/api/admin/player-emblems", {
        method: "GET",
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      const result = await readResult(response);
      if (!response.ok || !result.success || !Array.isArray(result.emblems)) {
        notify(result.error ?? "Не вдалося завантажити емблеми", true);
        return;
      }
      setEmblems(result.emblems);
      setLoaded(true);
      notify("Список емблем завантажено");
    } catch {
      notify("Помилка з'єднання із сервером", true);
    } finally {
      setBusy(false);
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      resetFile();
      return;
    }
    if (!ALLOWED_TYPES.has(nextFile.type)) {
      resetFile();
      notify("Дозволені лише PNG, JPG та WebP", true);
      return;
    }
    if (nextFile.size === 0 || nextFile.size > MAX_FILE_SIZE) {
      resetFile();
      notify("Максимальний розмір емблеми — 3 МБ", true);
      return;
    }
    setFile(nextFile);
    notify("");
  }

  async function uploadEmblem() {
    if (!loaded) {
      notify("Спочатку завантажте список емблем", true);
      return;
    }
    if (!password.trim()) {
      notify("Введіть пароль адміністратора", true);
      return;
    }
    if (!playerId || !selectedPlayer) {
      notify("Оберіть гравця", true);
      return;
    }
    if (!file) {
      notify("Оберіть зображення емблеми", true);
      return;
    }

    setBusy(true);
    notify("");
    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("player_id", playerId);
      formData.append("file", file);

      const response = await fetch("/api/admin/player-emblems", {
        method: "POST",
        body: formData,
      });
      const result = await readResult(response);
      if (
        !response.ok ||
        !result.success ||
        !result.player_id ||
        !result.image_path ||
        !result.url
      ) {
        notify(result.error ?? "Не вдалося зберегти емблему", true);
        return;
      }

      const updated: Emblem = {
        player_id: result.player_id,
        image_path: result.image_path,
        url: result.url,
        updated_at: new Date().toISOString(),
      };
      setEmblems((previous) => [
        ...previous.filter((item) => item.player_id !== updated.player_id),
        updated,
      ]);
      setLoaded(true);
      resetFile();
      notify(result.message ?? "Емблему гравця збережено");
    } catch {
      notify("Помилка з'єднання із сервером", true);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmblem() {
    if (!password.trim()) {
      notify("Введіть пароль адміністратора", true);
      return;
    }
    if (!selectedPlayer || !selectedEmblem) return;
    if (!window.confirm(`Видалити емблему гравця ${selectedPlayer.nickname}?`)) {
      return;
    }

    setBusy(true);
    notify("");
    try {
      const response = await fetch("/api/admin/player-emblems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, player_id: playerId }),
      });
      const result = await readResult(response);
      if (!response.ok || !result.success) {
        notify(result.error ?? "Не вдалося видалити емблему", true);
        return;
      }
      setEmblems((previous) =>
        previous.filter((item) => item.player_id !== playerId)
      );
      resetFile();
      notify(
        result.warning
          ? `${result.message ?? "Емблему прибрано"}. ${result.warning}`
          : result.message ?? "Емблему прибрано"
      );
    } catch {
      notify("Помилка з'єднання із сервером", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <div className="font-black tracking-[0.18em]">IRON LEAGUE</div>
            <div className="mt-1 text-xs text-white/45">Адмін-панель · Емблеми гравців</div>
          </div>
          <a href="/admin" className="text-sm font-bold text-blue-300 hover:text-blue-200">
            ← До адмін-панелі
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Керування гравцями
          </div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Емблеми гравців</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Одна емблема для кожного гравця в усіх сезонах. Завантаження,
            заміна й видалення доступні лише адміністратору.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
          <label htmlFor="emblems-password" className="block text-sm font-bold text-white/75">
            Пароль адміністратора
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="emblems-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoaded(false);
                setEmblems([]);
              }}
              placeholder="Введіть пароль"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#030711] px-4 py-3 outline-none focus:border-blue-400/50"
            />
            <button
              type="button"
              onClick={() => void loadEmblems()}
              disabled={busy || !password.trim()}
              className="rounded-xl bg-blue-500 px-5 py-3 font-bold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Зачекайте..." : "Завантажити емблеми"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            {loaded
              ? `Завантажено емблем: ${emblems.length}`
              : "Введіть пароль і завантажте список, щоб побачити встановлені емблеми."}
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
            <h2 className="text-xl font-black">Встановлення емблеми</h2>

            <label htmlFor="emblems-player" className="mt-6 block text-sm font-bold text-white/75">
              Гравець
            </label>
            <select
              id="emblems-player"
              value={playerId}
              disabled={busy}
              onChange={(event) => {
                setPlayerId(event.target.value);
                resetFile();
                notify("");
              }}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#030711] px-4 py-3 text-sm outline-none focus:border-blue-400/50 disabled:opacity-50"
            >
              <option value="">Оберіть гравця</option>
              {sortedPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname}
                </option>
              ))}
            </select>

            <label htmlFor="emblems-file" className="mt-6 block text-sm font-bold text-white/75">
              Зображення
            </label>
            <input
              id="emblems-file"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy || !playerId}
              onChange={chooseFile}
              className="mt-2 block w-full min-w-0 text-sm text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-4 file:py-2.5 file:font-bold file:text-blue-300 disabled:opacity-50"
            />
            <p className="mt-3 text-xs text-white/40">
              PNG, JPG або WebP, до 3 МБ. Рекомендований розмір — 512 × 512 px.
            </p>
            {file && (
              <div className="mt-4 break-all text-xs text-white/60">
                Обрано: {file.name} ({(file.size / 1024).toFixed(0)} КБ)
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void uploadEmblem()}
                disabled={busy || !loaded || !password.trim() || !playerId || !file}
                className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Зачекайте..." : selectedEmblem ? "Замінити емблему" : "Завантажити емблему"}
              </button>
              <button
                type="button"
                onClick={() => void deleteEmblem()}
                disabled={busy || !loaded || !password.trim() || !selectedEmblem}
                className="rounded-xl border border-red-400/25 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Видалити емблему
              </button>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
            <h2 className="text-xl font-black">Попередній перегляд</h2>
            {selectedPlayer ? (
              <div className="mt-6 flex items-center gap-4 rounded-xl border border-white/10 bg-[#030711] p-4">
                <PlayerEmblem
                  variant="profile"
                  nickname={selectedPlayer.nickname}
                  initials={getInitials(selectedPlayer.nickname)}
                  src={previewUrl ?? selectedEmblem?.url ?? null}
                />
                <div className="min-w-0">
                  <div className="break-words font-black">{selectedPlayer.nickname}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {file ? "Перегляд нового файлу" : selectedEmblem ? "Емблему встановлено" : "Поки без емблеми"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-white/45">Оберіть гравця, щоб переглянути емблему.</p>
            )}
            <p className="mt-5 text-xs leading-5 text-white/40">
              Якщо емблеми немає або файл не відкривається, замість неї відображаються ініціали гравця.
            </p>
          </div>
        </section>

        {message && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm font-semibold ${
              isError
                ? "border-red-400/25 bg-red-500/10 text-red-200"
                : "border-blue-400/20 bg-blue-500/10 text-blue-200"
            }`}
          >
            {message}
          </div>
        )}

        {loaded && (
          <section className="rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Каталог емблем</h2>
              <div className="text-xs text-white/50">
                {emblems.length} із {sortedPlayers.length} гравців
              </div>
            </div>
            <label htmlFor="emblems-search" className="mt-5 block text-xs font-bold text-white/60">
              Пошук гравця
            </label>
            <input
              id="emblems-search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Нікнейм або ID"
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#030711] px-4 py-3 text-sm outline-none focus:border-blue-400/50"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((player) => {
                const emblem = emblems.find((item) => item.player_id === player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPlayerId(player.id);
                      resetFile();
                      notify("");
                    }}
                    className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                      player.id === playerId
                        ? "border-blue-400/50 bg-blue-500/10"
                        : "border-white/10 bg-[#030711] hover:border-blue-400/30"
                    }`}
                  >
                    <PlayerEmblem
                      nickname={player.nickname}
                      initials={getInitials(player.nickname)}
                      src={emblem?.url ?? null}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{player.nickname}</span>
                      <span className="mt-0.5 block text-xs text-white/40">
                        {emblem ? "Є емблема" : "Без емблеми"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredPlayers.length === 0 && (
              <p className="mt-5 text-sm text-white/50">Гравців не знайдено.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
