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

  player_1_id: string | null;
  player_2_id: string | null;

  created_at: string;
};

type TeamDraft = {
  player1Id: string;
  player2Id: string;
};

type TeamsResponse = {
  success?: boolean;

  teams?: CoopTeam[];

  count?: number;

  error?: string;
};

function getPlayerName(
  playerId: string | null
) {
  if (!playerId) {
    return "Ще не визначено";
  }

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
    teamName,
    setTeamName,
  ] =
    useState("");

  const [
    drafts,
    setDrafts,
  ] =
    useState<
      Record<
        string,
        TeamDraft
      >
    >({});

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
    savingTeamId,
    setSavingTeamId,
  ] =
    useState<string | null>(
      null
    );

  const [
    deletingTeamId,
    setDeletingTeamId,
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

        const loadedTeams =
          result.teams ?? [];

        setTeams(
          loadedTeams
        );

        /*
          Формуємо локальні
          чернетки складів.
        */

        const nextDrafts:
          Record<
            string,
            TeamDraft
          > = {};

        for (
          const team of
            loadedTeams
        ) {
          nextDrafts[
            team.id
          ] = {
            player1Id:
              team.player_1_id ??
              "",

            player2Id:
              team.player_2_id ??
              "",
          };
        }

        setDrafts(
          nextDrafts
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
    setTeamName("");

    setMessage("");

    setDrafts({});
  }, [
    season,
  ]);

  /*
    ========================================
    СТАТИСТИКА
    ========================================
  */

  const completeTeams =
    useMemo(() => {
      return teams.filter(
        (team) =>
          Boolean(
            team.player_1_id
          ) &&
          Boolean(
            team.player_2_id
          )
      ).length;
    }, [
      teams,
    ]);

  const teamsReady =
    teams.length === 16;

  const rostersReady =
    teamsReady &&
    completeTeams === 16;

  /*
    ========================================
    ЧИ ВИКОРИСТОВУЄТЬСЯ ГРАВЕЦЬ
    ІНШОЮ КОМАНДОЮ
    ========================================
  */

  function isPlayerUsedByOtherTeam(
    playerId: string,
    currentTeamId: string
  ) {
    return teams.some(
      (team) =>
        team.id !==
          currentTeamId &&
        (
          team.player_1_id ===
            playerId ||
          team.player_2_id ===
            playerId
        )
    );
  }

  /*
    ========================================
    ЗМІНА ЧЕРНЕТКИ СКЛАДУ
    ========================================
  */

  function updateDraft(
    teamId: string,
    field:
      | "player1Id"
      | "player2Id",
    value: string
  ) {
    setDrafts(
      (current) => ({
        ...current,

        [teamId]: {
          player1Id:
            current[
              teamId
            ]?.player1Id ??
            "",

          player2Id:
            current[
              teamId
            ]?.player2Id ??
            "",

          [field]:
            value,
        },
      })
    );
  }

  /*
    ========================================
    СТВОРЕННЯ КОМАНДИ

    ТІЛЬКИ НАЗВА.
    ========================================
  */

  async function createTeam() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!teamName.trim()) {
      setMessage(
        "Введіть назву команди"
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
                  teamName.trim(),
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

      setTeamName("");

      setMessage(
        "✅ Команду створено"
      );

      await loadTeams();

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
    ЗБЕРЕЖЕННЯ СКЛАДУ
    ========================================
  */

  async function saveRoster(
    team: CoopTeam
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    const draft =
      drafts[team.id];

    const player1Id =
      draft?.player1Id ??
      "";

    const player2Id =
      draft?.player2Id ??
      "";

    if (
      player1Id &&
      player2Id &&
      player1Id ===
        player2Id
    ) {
      setMessage(
        "У команді мають бути два різні гравці"
      );

      return;
    }

    setSavingTeamId(
      team.id
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-teams",
          {
            method:
              "PATCH",

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

                player_1_id:
                  player1Id ||
                  null,

                player_2_id:
                  player2Id ||
                  null,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося зберегти склад"
        );

        return;
      }

      setMessage(
        `✅ Склад «${team.name}» збережено`
      );

      await loadTeams();

      notifyTeamsChanged();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setSavingTeamId(
        null
      );
    }
  }

  /*
    ========================================
    ОЧИЩЕННЯ СКЛАДУ
    ========================================
  */

  async function clearRoster(
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
        `Очистити склад команди «${team.name}»?`
      );

    if (!confirmed) {
      return;
    }

    setSavingTeamId(
      team.id
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-teams",
          {
            method:
              "PATCH",

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

                player_1_id:
                  null,

                player_2_id:
                  null,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося очистити склад"
        );

        return;
      }

      setMessage(
        `✅ Склад «${team.name}» очищено`
      );

      await loadTeams();

      notifyTeamsChanged();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setSavingTeamId(
        null
      );
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

    setDeletingTeamId(
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
      setDeletingTeamId(
        null
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* STATUS */}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Команди
          </div>

          <div className="mt-3 text-3xl font-black">
            {teams.length}
            <span className="text-white/25">
              {" "}
              / 16
            </span>
          </div>

          <div
            className={`mt-3 text-sm font-bold ${
              teamsReady
                ? "text-green-300"
                : "text-yellow-300"
            }`}
          >
            {teamsReady
              ? "✓ Усі 16 команд створені"
              : `Ще потрібно створити ${16 - teams.length} команд`}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Склади
          </div>

          <div className="mt-3 text-3xl font-black">
            {completeTeams}
            <span className="text-white/25">
              {" "}
              / 16
            </span>
          </div>

          <div
            className={`mt-3 text-sm font-bold ${
              rostersReady
                ? "text-green-300"
                : "text-yellow-300"
            }`}
          >
            {rostersReady
              ? "✓ Усі склади визначені"
              : "Гравців можна призначити пізніше"}
          </div>
        </div>
      </div>

      {/* CREATE TEAM */}

      {teams.length < 16 && (
        <div className="rounded-2xl border border-white/10 bg-[#030711] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Нова команда
          </div>

          <h3 className="mt-2 text-xl font-black">
            Додати клуб
          </h3>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Зараз достатньо
            вказати тільки назву.
            Гравців можна
            призначити пізніше.
          </p>

          <input
            value={
              teamName
            }
            onChange={(
              event
            ) =>
              setTeamName(
                event.target.value
              )
            }
            placeholder="Назва команди"
            className="mt-5 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3 outline-none transition focus:border-blue-400/40"
          />

          <button
            type="button"
            onClick={() =>
              void createTeam()
            }
            disabled={
              creating ||
              !teamName.trim()
            }
            className="mt-4 w-full rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating
              ? "Створення..."
              : `Створити команду №${teams.length + 1}`}
          </button>
        </div>
      )}

      {/* TEAMS */}

      <div>
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Iron Co-op Cup
          </div>

          <h3 className="mt-2 text-2xl font-black">
            Команди та склади
          </h3>
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
          <div className="grid gap-5 xl:grid-cols-2">
            {teams.map(
              (
                team,
                index
              ) => {
                const draft =
                  drafts[
                    team.id
                  ] ?? {
                    player1Id:
                      "",
                    player2Id:
                      "",
                  };

                const rosterComplete =
                  Boolean(
                    team.player_1_id
                  ) &&
                  Boolean(
                    team.player_2_id
                  );

                return (
                  <div
                    key={
                      team.id
                    }
                    className="rounded-2xl border border-white/10 bg-[#030711] p-5"
                  >
                    {/* HEADER */}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 font-black text-blue-300">
                          {index +
                            1}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xl font-black">
                            {
                              team.name
                            }
                          </div>

                          <div
                            className={`mt-1 text-xs font-bold ${
                              rosterComplete
                                ? "text-green-300"
                                : "text-yellow-300"
                            }`}
                          >
                            {rosterComplete
                              ? "✓ Склад визначений"
                              : "Склад ще не визначений"}
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
                          deletingTeamId !==
                            null ||
                          savingTeamId !==
                            null
                        }
                        className="shrink-0 rounded-lg border border-red-400/15 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        {deletingTeamId ===
                        team.id
                          ? "..."
                          : "Видалити"}
                      </button>
                    </div>

                    {/* PLAYERS */}

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                          Гравець 1
                        </label>

                        <select
                          value={
                            draft.player1Id
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              team.id,
                              "player1Id",
                              event
                                .target
                                .value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3"
                        >
                          <option value="">
                            Ще не визначено
                          </option>

                          {players.map(
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
                                    draft.player2Id ||
                                  isPlayerUsedByOtherTeam(
                                    player.id,
                                    team.id
                                  )
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
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                          Гравець 2
                        </label>

                        <select
                          value={
                            draft.player2Id
                          }
                          onChange={(
                            event
                          ) =>
                            updateDraft(
                              team.id,
                              "player2Id",
                              event
                                .target
                                .value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3"
                        >
                          <option value="">
                            Ще не визначено
                          </option>

                          {players.map(
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
                                    draft.player1Id ||
                                  isPlayerUsedByOtherTeam(
                                    player.id,
                                    team.id
                                  )
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

                    {/* CURRENT */}

                    <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm">
                      <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/25">
                        Поточний склад
                      </div>

                      <div className="mt-2">
                        <span className="text-white/35">
                          1.
                        </span>{" "}
                        <b>
                          {getPlayerName(
                            team.player_1_id
                          )}
                        </b>
                      </div>

                      <div className="mt-1">
                        <span className="text-white/35">
                          2.
                        </span>{" "}
                        <b>
                          {getPlayerName(
                            team.player_2_id
                          )}
                        </b>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void saveRoster(
                            team
                          )
                        }
                        disabled={
                          savingTeamId !==
                            null ||
                          deletingTeamId !==
                            null
                        }
                        className="flex-1 rounded-xl bg-blue-500 px-4 py-3 font-black transition hover:bg-blue-400 disabled:opacity-40"
                      >
                        {savingTeamId ===
                        team.id
                          ? "Збереження..."
                          : "Зберегти склад"}
                      </button>

                      {(team.player_1_id ||
                        team.player_2_id) && (
                        <button
                          type="button"
                          onClick={() =>
                            void clearRoster(
                              team
                            )
                          }
                          disabled={
                            savingTeamId !==
                              null ||
                            deletingTeamId !==
                              null
                          }
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/50 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          Очистити склад
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* READY */}

      {teamsReady && (
        <div
          className={`rounded-2xl border p-6 ${
            rostersReady
              ? "border-green-400/20 bg-green-500/10"
              : "border-blue-400/20 bg-blue-500/10"
          }`}
        >
          <div
            className={`text-xs font-bold uppercase tracking-[0.2em] ${
              rostersReady
                ? "text-green-300"
                : "text-blue-300"
            }`}
          >
            {rostersReady
              ? "Готово"
              : "Команди сформовані"}
          </div>

          <div className="mt-2 text-2xl font-black">
            {rostersReady
              ? "Iron Co-op Cup готовий до жеребкування"
              : "Усі 16 команд уже створені"}
          </div>

          <p className="mt-3 text-sm leading-6 text-white/50">
            {rostersReady
              ? "У кожної команди визначено двох гравців. Можна переходити до формування пар 1/8 фіналу."
              : "Назви команд уже можна показувати на публічній сторінці. Склади гравців можна додавати поступово."}
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