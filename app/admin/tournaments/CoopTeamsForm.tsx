"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../../../data/players";

type Props = {
  password: string;
  season: number;
};

type CoopTeam = {
  id: string;

  season: number;

  name: string;

  player_1_id: string;
  player_2_id: string;

  created_at: string;
};

type TeamsResponse = {
  success?: boolean;

  teams?: CoopTeam[];

  count?: number;

  error?: string;
};

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

function notifyTeamsChanged() {
  window.dispatchEvent(
    new Event(
      "coop-teams-changed"
    )
  );
}

export default function CoopTeamsForm({
  password,
  season,
}: Props) {
  const [
    teams,
    setTeams,
  ] =
    useState<CoopTeam[]>([]);

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    player1Id,
    setPlayer1Id,
  ] =
    useState("");

  const [
    player2Id,
    setPlayer2Id,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  /*
    ========================================
    ЗАВАНТАЖЕННЯ КОМАНД
    ========================================
  */

  const loadTeams =
    useCallback(async () => {
      setLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        const response =
          await fetch(
            `/api/admin/coop-teams?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as TeamsResponse;

        if (!response.ok) {
          setMessage(
            result.error ??
              "Не вдалося завантажити команди"
          );

          return;
        }

        setTeams(
          result.teams ?? []
        );
      } catch {
        setMessage(
          "Помилка завантаження команд"
        );
      } finally {
        setLoading(false);
      }
    }, [
      season,
    ]);

  useEffect(() => {
    void loadTeams();
  }, [
    loadTeams,
  ]);

  /*
    ========================================
    ЗМІНА СЕЗОНУ
    ========================================
  */

  useEffect(() => {
    setName("");
    setPlayer1Id("");
    setPlayer2Id("");
    setMessage("");
  }, [
    season,
  ]);

  /*
    ========================================
    ВИКОРИСТАНІ ГРАВЦІ
    ========================================
  */

  const usedPlayerIds =
    useMemo(() => {
      const result =
        new Set<string>();

      for (
        const team of teams
      ) {
        result.add(
          team.player_1_id
        );

        result.add(
          team.player_2_id
        );
      }

      return result;
    }, [
      teams,
    ]);

  /*
    ========================================
    ДОСТУПНІ ГРАВЦІ
    ========================================
  */

  const availablePlayers =
    useMemo(() => {
      return players.filter(
        (player) =>
          !usedPlayerIds.has(
            player.id
          )
      );
    }, [
      usedPlayerIds,
    ]);

  /*
    ========================================
    СТВОРЕННЯ КОМАНДИ
    ========================================
  */

  async function createTeam() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!name.trim()) {
      setMessage(
        "Введіть назву команди"
      );

      return;
    }

    if (
      !player1Id ||
      !player2Id
    ) {
      setMessage(
        "Оберіть двох гравців"
      );

      return;
    }

    if (
      player1Id ===
      player2Id
    ) {
      setMessage(
        "У команді мають бути два різні гравці"
      );

      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-teams",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                season,

                name:
                  name.trim(),

                player_1_id:
                  player1Id,

                player_2_id:
                  player2Id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити команду"
        );

        return;
      }

      setMessage(
        "✅ Команду створено"
      );

      setName("");
      setPlayer1Id("");
      setPlayer2Id("");

      await loadTeams();

      /*
        Повідомляємо турнірній
        сітці, що склад команд
        змінився.
      */

      notifyTeamsChanged();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setCreating(false);
    }
  }

  /*
    ========================================
    ВИДАЛЕННЯ КОМАНДИ
    ========================================
  */

  async function deleteTeam(
    team: CoopTeam
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Видалити команду «${team.name}»?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      team.id
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-teams",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                season,

                team_id:
                  team.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося видалити команду"
        );

        return;
      }

      setMessage(
        "✅ Команду видалено"
      );

      await loadTeams();

      notifyTeamsChanged();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setDeletingId(null);
    }
  }

  const tournamentReady =
    teams.length === 16;

  return (
    <div className="space-y-6">
      {/* INFO */}

      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Iron Co-op Cup складається
        з 16 команд.

        <div className="mt-2">
          У кожній команді —
          по 2 різні гравці.
        </div>
      </div>

      {/* PROGRESS */}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Формування складу
            </div>

            <div className="mt-2 text-3xl font-black">
              {teams.length}
              <span className="text-white/25">
                {" "}
                / 16
              </span>
            </div>
          </div>

          <div
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              tournamentReady
                ? "bg-green-500/10 text-green-300"
                : "bg-yellow-500/10 text-yellow-300"
            }`}
          >
            {tournamentReady
              ? "✓ 16 команд готові"
              : `Ще потрібно ${16 - teams.length}`}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{
              width:
                `${Math.min(
                  100,
                  (teams.length /
                    16) *
                    100
                )}%`,
            }}
          />
        </div>
      </div>

      {/* CREATE */}

      {teams.length < 16 && (
        <div className="rounded-2xl border border-white/10 bg-[#030711] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Нова команда
          </div>

          <div className="mt-5">
            <label className="text-sm font-bold">
              Назва команди
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Наприклад: Iron Wolves"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 outline-none transition focus:border-blue-400/40"
            />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold">
                Гравець 1
              </label>

              <select
                value={
                  player1Id
                }
                onChange={(
                  event
                ) =>
                  setPlayer1Id(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3"
              >
                <option value="">
                  Оберіть гравця
                </option>

                {availablePlayers.map(
                  (
                    player
                  ) => (
                    <option
                      key={
                        player.id
                      }
                      value={
                        player.id
                      }
                      disabled={
                        player.id ===
                        player2Id
                      }
                    >
                      {
                        player.nickname
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold">
                Гравець 2
              </label>

              <select
                value={
                  player2Id
                }
                onChange={(
                  event
                ) =>
                  setPlayer2Id(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3"
              >
                <option value="">
                  Оберіть гравця
                </option>

                {availablePlayers.map(
                  (
                    player
                  ) => (
                    <option
                      key={
                        player.id
                      }
                      value={
                        player.id
                      }
                      disabled={
                        player.id ===
                        player1Id
                      }
                    >
                      {
                        player.nickname
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void createTeam()
            }
            disabled={
              creating ||
              !name.trim() ||
              !player1Id ||
              !player2Id
            }
            className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating
              ? "Створення..."
              : `Створити команду №${teams.length + 1}`}
          </button>
        </div>
      )}

      {/* TEAMS */}

      <div>
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Створені команди
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-white/40">
            Завантаження...
          </div>
        ) : teams.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8 text-center text-white/35">
            Команд ще немає.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map(
              (
                team,
                index
              ) => (
                <div
                  key={
                    team.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 font-black text-blue-300">
                        {index +
                          1}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-lg font-black">
                          {
                            team.name
                          }
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            <span className="text-white/35">
                              1.
                            </span>{" "}
                            <span className="font-bold">
                              {getPlayerName(
                                team.player_1_id
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="text-white/35">
                              2.
                            </span>{" "}
                            <span className="font-bold">
                              {getPlayerName(
                                team.player_2_id
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteTeam(
                          team
                        )
                      }
                      disabled={
                        deletingId !==
                        null
                      }
                      className="shrink-0 rounded-lg border border-red-400/15 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                    >
                      {deletingId ===
                      team.id
                        ? "..."
                        : "Видалити"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* READY */}

      {tournamentReady && (
        <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
            Готово
          </div>

          <div className="mt-2 text-2xl font-black">
            Склад Iron Co-op Cup
            сформований
          </div>

          <p className="mt-3 text-sm leading-6 text-green-100/60">
            Створено 16 команд і
            використано 32 гравці.
            Тепер можна переходити
            до жеребкування 1/8
            фіналу.
          </p>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}