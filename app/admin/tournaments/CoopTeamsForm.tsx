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

function notifyTeamsChanged() {
  window.dispatchEvent(
    new Event("coop-teams-changed")
  );
}

export default function CoopTeamsForm({
  password,
  season,
}: Props) {
  const [teams, setTeams] =
    useState<CoopTeam[]>([]);

  const [drafts, setDrafts] =
    useState<
      Record<string, TeamDraft>
    >({});

  const [
    teamName,
    setTeamName,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [savingAll, setSavingAll] =
    useState(false);

  const [
    deletingTeamId,
    setDeletingTeamId,
  ] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  /*
    ========================================
    ГРАВЦІ
    ========================================
  */

  const sortedPlayers =
    useMemo(() => {
      return [...players].sort(
        (a, b) =>
          a.nickname.localeCompare(
            b.nickname,
            "uk"
          )
      );
    }, []);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ
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
    }, [season]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    setTeamName("");
    setMessage("");
  }, [season]);

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
    }, [teams]);

  const assignedPlayers =
    useMemo(() => {
      let count = 0;

      for (
        const team of
          teams
      ) {
        if (
          team.player_1_id
        ) {
          count += 1;
        }

        if (
          team.player_2_id
        ) {
          count += 1;
        }
      }

      return count;
    }, [teams]);

  const teamsReady =
    teams.length === 16;

  const rostersReady =
    teamsReady &&
    completeTeams === 16;

  /*
    ========================================
    НЕЗБЕРЕЖЕНІ ЗМІНИ
    ========================================
  */

  const changedTeamIds =
    useMemo(() => {
      const result: string[] =
        [];

      for (
        const team of
          teams
      ) {
        const draft =
          drafts[team.id];

        if (!draft) {
          continue;
        }

        const original1 =
          team.player_1_id ??
          "";

        const original2 =
          team.player_2_id ??
          "";

        if (
          draft.player1Id !==
            original1 ||
          draft.player2Id !==
            original2
        ) {
          result.push(
            team.id
          );
        }
      }

      return result;
    }, [
      teams,
      drafts,
    ]);

  const hasChanges =
    changedTeamIds.length >
    0;

  /*
    ========================================
    ВИКОРИСТАННЯ ГРАВЦІВ
    У ЧЕРНЕТКАХ

    Це важливо:
    дублікати блокуємо ще ДО
    натискання "Зберегти".
    ========================================
  */

  function isPlayerSelectedElsewhere(
    playerId: string,
    currentTeamId: string,
    currentField:
      | "player1Id"
      | "player2Id"
  ) {
    for (
      const team of
        teams
    ) {
      const draft =
        drafts[team.id];

      if (!draft) {
        continue;
      }

      if (
        team.id ===
        currentTeamId
      ) {
        const otherValue =
          currentField ===
          "player1Id"
            ? draft.player2Id
            : draft.player1Id;

        if (
          otherValue ===
          playerId
        ) {
          return true;
        }

        continue;
      }

      if (
        draft.player1Id ===
          playerId ||
        draft.player2Id ===
          playerId
      ) {
        return true;
      }
    }

    return false;
  }

  /*
    ========================================
    ЗМІНА СКЛАДУ
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

    setMessage("");
  }

  /*
    ========================================
    ОЧИСТИТИ ЧЕРНЕТКУ ОДНІЄЇ КОМАНДИ
    ========================================
  */

  function clearDraft(
    teamId: string
  ) {
    setDrafts(
      (current) => ({
        ...current,

        [teamId]: {
          player1Id: "",
          player2Id: "",
        },
      })
    );

    setMessage("");
  }

  /*
    ========================================
    СКАСУВАТИ ВСІ НЕЗБЕРЕЖЕНІ ЗМІНИ
    ========================================
  */

  function resetChanges() {
    const nextDrafts:
      Record<
        string,
        TeamDraft
      > = {};

    for (
      const team of
        teams
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

    setMessage(
      "Незбережені зміни скасовано"
    );
  }

  /*
    ========================================
    ПЕРЕВІРКА ВСІХ ЧЕРНЕТок
    ========================================
  */

  function validateDrafts() {
    const used =
      new Map<
        string,
        string
      >();

    for (
      const team of
        teams
    ) {
      const draft =
        drafts[team.id];

      if (!draft) {
        continue;
      }

      const ids = [
        draft.player1Id,
        draft.player2Id,
      ].filter(Boolean);

      if (
        ids.length === 2 &&
        ids[0] === ids[1]
      ) {
        return `У команді «${team.name}» обрано одного гравця двічі`;
      }

      for (
        const playerId of
          ids
      ) {
        const previousTeam =
          used.get(
            playerId
          );

        if (
          previousTeam
        ) {
          return `Гравець уже використаний у двох командах: «${previousTeam}» та «${team.name}»`;
        }

        used.set(
          playerId,
          team.name
        );
      }
    }

    return null;
  }

  /*
    ========================================
    ЗБЕРЕГТИ ВСІ ЗМІНИ
    ========================================
  */

  async function saveAll() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!hasChanges) {
      setMessage(
        "Немає змін для збереження"
      );

      return;
    }

    const validationError =
      validateDrafts();

    if (
      validationError
    ) {
      setMessage(
        validationError
      );

      return;
    }

    setSavingAll(true);
    setMessage("");

    try {
      /*
        Зберігаємо послідовно,
        а не паралельно.

        Так серверна перевірка
        унікальності гравців
        залишається надійною.
      */

      for (
        const teamId of
          changedTeamIds
      ) {
        const draft =
          drafts[teamId];

        const team =
          teams.find(
            (item) =>
              item.id ===
              teamId
          );

        if (
          !draft ||
          !team
        ) {
          continue;
        }

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
                    teamId,

                  player_1_id:
                    draft.player1Id ||
                    null,

                  player_2_id:
                    draft.player2Id ||
                    null,
                }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              `Не вдалося зберегти склад «${team.name}»`
          );
        }
      }

      await loadTeams();

      notifyTeamsChanged();

      setMessage(
        `✅ Збережено змін: ${changedTeamIds.length}`
      );
    } catch (error) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Помилка збереження складів"
      );

      /*
        Після часткового
        збереження перечитуємо
        реальний стан БД.
      */

      await loadTeams();
    } finally {
      setSavingAll(false);
    }
  }

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

    if (
      !teamName.trim()
    ) {
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

      await loadTeams();

      notifyTeamsChanged();

      setMessage(
        "✅ Команду створено"
      );
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
    ВИДАЛЕННЯ
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

      await loadTeams();

      notifyTeamsChanged();

      setMessage(
        "✅ Команду видалено"
      );
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
    <div className="space-y-7">
      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
            Команди
          </div>

          <div className="mt-2 text-3xl font-black">
            {teams.length}
            <span className="text-white/20">
              /16
            </span>
          </div>

          <div
            className={`mt-2 text-xs font-bold ${
              teamsReady
                ? "text-green-300"
                : "text-yellow-300"
            }`}
          >
            {teamsReady
              ? "✓ Список клубів готовий"
              : "Формування клубів"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
            Склади
          </div>

          <div className="mt-2 text-3xl font-black">
            {completeTeams}
            <span className="text-white/20">
              /16
            </span>
          </div>

          <div
            className={`mt-2 text-xs font-bold ${
              rostersReady
                ? "text-green-300"
                : "text-yellow-300"
            }`}
          >
            {rostersReady
              ? "✓ Усі склади готові"
              : "Призначення учасників"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
            Гравці
          </div>

          <div className="mt-2 text-3xl font-black">
            {assignedPlayers}
            <span className="text-white/20">
              /32
            </span>
          </div>

          <div className="mt-2 text-xs font-bold text-white/35">
            Закріплено за командами
          </div>
        </div>
      </div>

      {/* GLOBAL ACTIONS */}

      <div className="sticky top-4 z-20 rounded-2xl border border-blue-400/20 bg-[#07101d]/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-black">
              Керування складами
            </div>

            <div className="mt-1 text-xs text-white/35">
              {hasChanges
                ? `Незбережених команд: ${changedTeamIds.length}`
                : "Усі зміни збережені"}
            </div>
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={
                  resetChanges
                }
                disabled={
                  savingAll
                }
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/50 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
              >
                Скасувати
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                void saveAll()
              }
              disabled={
                !hasChanges ||
                savingAll
              }
              className="rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {savingAll
                ? "Збереження..."
                : hasChanges
                  ? `Зберегти всі (${changedTeamIds.length})`
                  : "Все збережено"}
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center text-white/35">
          Завантаження...
        </div>
      ) : teams.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/35">
          Команд ще немає.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
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

              const original1 =
                team.player_1_id ??
                "";

              const original2 =
                team.player_2_id ??
                "";

              const changed =
                draft.player1Id !==
                  original1 ||
                draft.player2Id !==
                  original2;

              const draftComplete =
                Boolean(
                  draft.player1Id
                ) &&
                Boolean(
                  draft.player2Id
                );

              return (
                <div
                  key={
                    team.id
                  }
                  className={`grid gap-4 border-b border-white/10 p-5 last:border-b-0 lg:grid-cols-[60px_1.1fr_1fr_1fr_auto] lg:items-center ${
                    changed
                      ? "bg-blue-500/[0.05]"
                      : "bg-[#030711]"
                  }`}
                >
                  {/* NUMBER */}

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] font-black text-white/35">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  {/* CLUB */}

                  <div>
                    <div className="text-lg font-black">
                      {
                        team.name
                      }
                    </div>

                    <div
                      className={`mt-1 text-xs font-bold ${
                        draftComplete
                          ? "text-green-300"
                          : "text-yellow-300"
                      }`}
                    >
                      {draftComplete
                        ? "✓ Склад визначений"
                        : "Склад не повний"}
                    </div>

                    {changed && (
                      <div className="mt-1 text-[11px] font-bold text-blue-300">
                        • Незбережені зміни
                      </div>
                    )}
                  </div>

                  {/* PLAYER 1 */}

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
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
                      disabled={
                        savingAll
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#07101d] px-3 py-3 text-sm outline-none transition focus:border-blue-400/40 disabled:opacity-40"
                    >
                      <option value="">
                        — Не визначено —
                      </option>

                      {sortedPlayers.map(
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
                            disabled={isPlayerSelectedElsewhere(
                              player.id,
                              team.id,
                              "player1Id"
                            )}
                          >
                            {
                              player.nickname
                            }
                            {player.account
                              ? ` (${player.account})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* PLAYER 2 */}

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
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
                      disabled={
                        savingAll
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#07101d] px-3 py-3 text-sm outline-none transition focus:border-blue-400/40 disabled:opacity-40"
                    >
                      <option value="">
                        — Не визначено —
                      </option>

                      {sortedPlayers.map(
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
                            disabled={isPlayerSelectedElsewhere(
                              player.id,
                              team.id,
                              "player2Id"
                            )}
                          >
                            {
                              player.nickname
                            }
                            {player.account
                              ? ` (${player.account})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex gap-2 lg:justify-end">
                    {(draft.player1Id ||
                      draft.player2Id) && (
                      <button
                        type="button"
                        onClick={() =>
                          clearDraft(
                            team.id
                          )
                        }
                        disabled={
                          savingAll
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/40 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                      >
                        Очистити
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void deleteTeam(
                          team
                        )
                      }
                      disabled={
                        savingAll ||
                        deletingTeamId !==
                          null
                      }
                      className="rounded-lg border border-red-400/10 px-3 py-2 text-xs font-bold text-red-300/60 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                    >
                      {deletingTeamId ===
                      team.id
                        ? "..."
                        : "×"}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* CREATE TEAM */}

      {teams.length < 16 && (
        <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Додати клуб
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={
                teamName
              }
              onChange={(
                event
              ) =>
                setTeamName(
                  event
                    .target
                    .value
                )
              }
              placeholder="Назва команди"
              className="flex-1 rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none focus:border-blue-400/40"
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
              className="rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400 disabled:opacity-40"
            >
              {creating
                ? "Створення..."
                : "Додати команду"}
            </button>
          </div>
        </div>
      )}

      {/* READY */}

      {rostersReady && (
        <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
            Готово
          </div>

          <div className="mt-2 text-2xl font-black">
            Усі 16 складів сформовані
          </div>

          <p className="mt-3 text-sm text-green-100/60">
            У 16 командах
            призначено 32
            учасники. Iron Co-op
            Cup готовий до
            жеребкування 1/8
            фіналу.
          </p>
        </div>
      )}

      {/* MESSAGE */}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm font-bold">
          {message}
        </div>
      )}
    </div>
  );
}