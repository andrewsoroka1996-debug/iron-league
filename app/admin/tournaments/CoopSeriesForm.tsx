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
  stage: string;

  onCreated?: () => void;
};

type CoopTeam = {
  id: string;

  season: number;

  name: string;

  player_1_id: string;
  player_2_id: string;

  created_at: string;
};

type CurrentSeries = {
  series_id: string;

  bracket_slot:
    | number
    | null;

  home_id:
    | string
    | null;

  home_name: string;

  away_id:
    | string
    | null;

  away_name: string;

  complete: boolean;

  winner_id:
    | string
    | null;

  winner_name:
    | string
    | null;

  status: string;
};

type SourceSeries = {
  series_id: string;

  home_id:
    | string
    | null;

  home_name: string;

  away_id:
    | string
    | null;

  away_name: string;

  complete: boolean;

  winner_id:
    | string
    | null;

  winner_name:
    | string
    | null;
};

type NextRoundSlot = {
  slot: number;

  source_slots: number[];

  team_a:
    | string
    | null;

  team_a_name:
    | string
    | null;

  team_b:
    | string
    | null;

  team_b_name:
    | string
    | null;

  source_a:
    | SourceSeries
    | null;

  source_b:
    | SourceSeries
    | null;

  ready: boolean;
};

type PlayoffResponse = {
  success?: boolean;

  expected_series?: number;

  created_series?: number;

  completed_series?: number;

  stage_complete?: boolean;

  next_round_slots?: NextRoundSlot[];

  series?: CurrentSeries[];

  error?: string;
};

type TeamsResponse = {
  success?: boolean;

  teams?: CoopTeam[];

  count?: number;

  error?: string;
};

function getPreviousStage(
  stage: string
) {
  if (
    stage ===
    "quarterfinal"
  ) {
    return "round-of-16";
  }

  if (
    stage ===
    "semifinal"
  ) {
    return "quarterfinal";
  }

  if (
    stage ===
    "final"
  ) {
    return "semifinal";
  }

  return null;
}

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id ===
        playerId
    )?.nickname ??
    playerId
  );
}

export default function CoopSeriesForm({
  password,
  season,
  stage,
  onCreated,
}: Props) {
  const [
    teams,
    setTeams,
  ] =
    useState<CoopTeam[]>([]);

  const [
    homeId,
    setHomeId,
  ] =
    useState("");

  const [
    awayId,
    setAwayId,
  ] =
    useState("");

  const [
    currentSeries,
    setCurrentSeries,
  ] =
    useState<
      CurrentSeries[]
    >([]);

  const [
    nextRoundSlots,
    setNextRoundSlots,
  ] =
    useState<
      NextRoundSlot[]
    >([]);

  const [
    previousCompleted,
    setPreviousCompleted,
  ] =
    useState(0);

  const [
    previousExpected,
    setPreviousExpected,
  ] =
    useState(0);

  const [
    previousStageComplete,
    setPreviousStageComplete,
  ] =
    useState(false);

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
    creatingSlot,
    setCreatingSlot,
  ] =
    useState<
      number | null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const previousStage =
    getPreviousStage(
      stage
    );

  /*
    ========================================
    КОМАНДИ
    ========================================
  */

  const loadTeams =
    useCallback(async () => {
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
        throw new Error(
          result.error ??
            "Не вдалося завантажити Co-op команди"
        );
      }

      return (
        result.teams ??
        []
      );
    }, [
      season,
    ]);

  /*
    ========================================
    СІТКА
    ========================================
  */

  const loadPlayoffStage =
    useCallback(
      async (
        targetStage: string
      ) => {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        params.set(
          "stage",
          targetStage
        );

        const response =
          await fetch(
            `/api/admin/coop-playoff?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as PlayoffResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Не вдалося завантажити Co-op сітку"
          );
        }

        return result;
      },
      [
        season,
      ]
    );

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ВСЬОГО
    ========================================
  */

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setMessage("");

      try {
        /*
          Команди завжди
          завантажуємо першими.
        */

        const loadedTeams =
          await loadTeams();

        setTeams(
          loadedTeams
        );

        /*
          Після зміни турніру
          stage може короткий час
          бути порожнім.
        */

        if (!stage) {
          setCurrentSeries([]);
          setNextRoundSlots([]);

          setPreviousCompleted(
            0
          );

          setPreviousExpected(
            0
          );

          setPreviousStageComplete(
            false
          );

          return;
        }

        const currentStage =
          await loadPlayoffStage(
            stage
          );

        setCurrentSeries(
          currentStage.series ??
            []
        );

        /*
          1/8
        */

        if (
          stage ===
          "round-of-16"
        ) {
          setNextRoundSlots([]);

          setPreviousCompleted(
            0
          );

          setPreviousExpected(
            0
          );

          setPreviousStageComplete(
            false
          );

          return;
        }

        /*
          1/4, 1/2, фінал
        */

        if (
          previousStage
        ) {
          const previous =
            await loadPlayoffStage(
              previousStage
            );

          setNextRoundSlots(
            previous.next_round_slots ??
              []
          );

          setPreviousCompleted(
            previous.completed_series ??
              0
          );

          setPreviousExpected(
            previous.expected_series ??
              0
          );

          setPreviousStageComplete(
            previous.stage_complete ??
              false
          );
        }
      } catch (
        error
      ) {
        setMessage(
          error instanceof
            Error
            ? error.message
            : "Помилка завантаження Iron Co-op Cup"
        );
      } finally {
        setLoading(false);
      }
    }, [
      stage,
      previousStage,
      loadTeams,
      loadPlayoffStage,
    ]);

  /*
    ========================================
    ПЕРШЕ ЗАВАНТАЖЕННЯ
    ========================================
  */

  useEffect(() => {
    void loadData();
  }, [
    loadData,
  ]);

  /*
    ========================================
    АВТОМАТИЧНА СИНХРОНІЗАЦІЯ

    Якщо CoopTeamsForm створив
    або видалив команду —
    перезавантажуємо сітку.
    ========================================
  */

  useEffect(() => {
    function handleTeamsChanged() {
      void loadData();
    }

    window.addEventListener(
      "coop-teams-changed",
      handleTeamsChanged
    );

    return () => {
      window.removeEventListener(
        "coop-teams-changed",
        handleTeamsChanged
      );
    };
  }, [
    loadData,
  ]);

  /*
    ========================================
    ОЧИЩЕННЯ
    ========================================
  */

  useEffect(() => {
    setHomeId("");
    setAwayId("");
    setMessage("");
  }, [
    season,
    stage,
  ]);

  /*
    ========================================
    ВИКОРИСТАНІ КОМАНДИ
    ========================================
  */

  const usedTeamIds =
    useMemo(() => {
      const result =
        new Set<string>();

      for (
        const series of
          currentSeries
      ) {
        if (
          series.home_id
        ) {
          result.add(
            series.home_id
          );
        }

        if (
          series.away_id
        ) {
          result.add(
            series.away_id
          );
        }
      }

      return result;
    }, [
      currentSeries,
    ]);

  /*
    ========================================
    СТВОРЕНІ СЛОТИ
    ========================================
  */

  const createdSlots =
    useMemo(() => {
      return new Set(
        currentSeries
          .map(
            (series) =>
              series.bracket_slot
          )
          .filter(
            (
              slot
            ): slot is number =>
              slot !== null
          )
      );
    }, [
      currentSeries,
    ]);

  const tournamentReady =
    teams.length === 16;

  /*
    ========================================
    КОМАНДА
    ========================================
  */

  function getTeam(
    teamId:
      | string
      | null
  ) {
    if (!teamId) {
      return null;
    }

    return (
      teams.find(
        (team) =>
          team.id ===
          teamId
      ) ?? null
    );
  }

  /*
    ========================================
    ВІДОБРАЖЕННЯ КОМАНДИ
    ========================================
  */

  function TeamInfo({
    teamId,
  }: {
    teamId: string;
  }) {
    const team =
      getTeam(teamId);

    if (!team) {
      return (
        <div className="font-bold">
          {teamId}
        </div>
      );
    }

    return (
      <div>
        <div className="text-lg font-black">
          {team.name}
        </div>

        <div className="mt-2 text-xs text-white/40">
          {getPlayerName(
            team.player_1_id
          )}
          {" + "}
          {getPlayerName(
            team.player_2_id
          )}
        </div>
      </div>
    );
  }

  /*
    ========================================
    СТВОРИТИ ПАРУ 1/8
    ========================================
  */

  async function createRoundOf16() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (
      !tournamentReady
    ) {
      setMessage(
        "Спочатку потрібно сформувати всі 16 команд"
      );

      return;
    }

    if (
      !homeId ||
      !awayId
    ) {
      setMessage(
        "Оберіть дві команди"
      );

      return;
    }

    if (
      homeId ===
      awayId
    ) {
      setMessage(
        "Команда не може грати сама із собою"
      );

      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-series",
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

                stage:
                  "round-of-16",

                home_id:
                  homeId,

                away_id:
                  awayId,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити пару 1/8"
        );

        return;
      }

      setMessage(
        `✅ Пару №${result.bracket_slot} створено`
      );

      setHomeId("");
      setAwayId("");

      await loadData();

      if (onCreated) {
        onCreated();
      }
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
    НАСТУПНА СТАДІЯ
    ========================================
  */

  async function createBracketSlot(
    slot: NextRoundSlot
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (
      !slot.team_a ||
      !slot.team_b
    ) {
      setMessage(
        `Пара №${slot.slot} ще не визначена`
      );

      return;
    }

    setCreatingSlot(
      slot.slot
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/coop-series",
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

                stage,

                home_id:
                  slot.team_a,

                away_id:
                  slot.team_b,

                bracket_slot:
                  slot.slot,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            `Не вдалося створити пару №${slot.slot}`
        );

        return;
      }

      setMessage(
        `✅ Пару №${slot.slot} створено`
      );

      await loadData();

      if (onCreated) {
        onCreated();
      }
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setCreatingSlot(
        null
      );
    }
  }

  /*
    ========================================
    LOADING
    ========================================
  */

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-white/40">
        Завантаження Iron Co-op Cup...
      </div>
    );
  }

  /*
    ========================================
    1/8 ФІНАЛУ
    ========================================
  */

  if (
    stage ===
    "round-of-16"
  ) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
          Пари 1/8 фіналу
          формуються вручну.

          <div className="mt-2">
            Кожне протистояння
            складається з двох
            матчів — вдома та
            на виїзді.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Учасники
          </div>

          <div className="mt-3">
            Сформовано команд:{" "}
            <b
              className={
                tournamentReady
                  ? "text-green-300"
                  : "text-yellow-300"
              }
            >
              {teams.length}
              /16
            </b>
          </div>

          <div className="mt-2">
            Створено пар 1/8:{" "}
            <b className="text-blue-300">
              {currentSeries.length}
              /8
            </b>
          </div>
        </div>

        {!tournamentReady && (
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-100">
            Жеребкування стане
            доступним після
            формування всіх 16
            команд.
          </div>
        )}

        {tournamentReady && (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold">
                  Команда A
                </label>

                <select
                  value={
                    homeId
                  }
                  onChange={(
                    event
                  ) =>
                    setHomeId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  <option value="">
                    Оберіть команду
                  </option>

                  {teams.map(
                    (team) => (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                        disabled={
                          usedTeamIds.has(
                            team.id
                          ) ||
                          team.id ===
                            awayId
                        }
                      >
                        {team.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold">
                  Команда B
                </label>

                <select
                  value={
                    awayId
                  }
                  onChange={(
                    event
                  ) =>
                    setAwayId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  <option value="">
                    Оберіть команду
                  </option>

                  {teams.map(
                    (team) => (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                        disabled={
                          usedTeamIds.has(
                            team.id
                          ) ||
                          team.id ===
                            homeId
                        }
                      >
                        {team.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {homeId &&
              awayId && (
                <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                    Протистояння
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <TeamInfo
                      teamId={
                        homeId
                      }
                    />

                    <div className="text-center font-black text-blue-400">
                      VS
                    </div>

                    <TeamInfo
                      teamId={
                        awayId
                      }
                    />
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/45">
                    Матч 1:{" "}
                    <b className="text-white">
                      {
                        getTeam(
                          homeId
                        )?.name
                      }
                    </b>{" "}
                    —{" "}
                    <b className="text-white">
                      {
                        getTeam(
                          awayId
                        )?.name
                      }
                    </b>

                    <div className="mt-2">
                      Матч 2:{" "}
                      <b className="text-white">
                        {
                          getTeam(
                            awayId
                          )?.name
                        }
                      </b>{" "}
                      —{" "}
                      <b className="text-white">
                        {
                          getTeam(
                            homeId
                          )?.name
                        }
                      </b>
                    </div>
                  </div>
                </div>
              )}

            <button
              type="button"
              onClick={() =>
                void createRoundOf16()
              }
              disabled={
                creating ||
                !homeId ||
                !awayId ||
                currentSeries.length >=
                  8
              }
              className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating
                ? "Створення..."
                : "Створити пару 1/8"}
            </button>
          </>
        )}

        {currentSeries.length >
          0 && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Створені пари
            </div>

            {currentSeries.map(
              (series) => (
                <div
                  key={
                    series.series_id
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="text-xs text-white/30">
                    Пара №
                    {
                      series.bracket_slot
                    }
                  </div>

                  <div className="mt-2 font-black">
                    {
                      series.home_name
                    }
                    {" — "}
                    {
                      series.away_name
                    }
                  </div>
                </div>
              )
            )}
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

  /*
    ========================================
    1/4, 1/2, ФІНАЛ
    ========================================
  */

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Пари цієї стадії
        визначаються
        автоматично за
        турнірною сіткою.

        <div className="mt-2">
          Кожне протистояння —
          два матчі, вдома та
          на виїзді.
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Попередня стадія
        </div>

        <div className="mt-3">
          Завершено:{" "}
          <b>
            {previousCompleted}
            /
            {previousExpected}
          </b>
        </div>

        <div
          className={`mt-2 text-sm font-bold ${
            previousStageComplete
              ? "text-green-300"
              : "text-yellow-300"
          }`}
        >
          {previousStageComplete
            ? "Усі протистояння завершені"
            : "Деякі протистояння ще тривають"}
        </div>
      </div>

      <div className="space-y-4">
        {nextRoundSlots.map(
          (slot) => {
            const alreadyCreated =
              createdSlots.has(
                slot.slot
              );

            return (
              <div
                key={
                  slot.slot
                }
                className="rounded-2xl border border-white/10 bg-[#07101d] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                      {stage ===
                      "final"
                        ? "Фінал"
                        : `Пара №${slot.slot}`}
                    </div>

                    <div className="mt-1 text-xs text-white/30">
                      Переможці пар №
                      {
                        slot
                          .source_slots[0]
                      }{" "}
                      та №
                      {
                        slot
                          .source_slots[1]
                      }
                    </div>
                  </div>

                  <div
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                      alreadyCreated
                        ? "bg-blue-500/10 text-blue-300"
                        : slot.ready
                          ? "bg-green-500/10 text-green-300"
                          : "bg-yellow-500/10 text-yellow-300"
                    }`}
                  >
                    {alreadyCreated
                      ? "Створена"
                      : slot.ready
                        ? "Готова"
                        : "Очікує"}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/10 bg-[#030711] p-4">
                  {slot.team_a ? (
                    <TeamInfo
                      teamId={
                        slot.team_a
                      }
                    />
                  ) : (
                    <>
                      <div className="text-xs font-bold text-yellow-300">
                        Переможець ще визначається
                      </div>

                      <div className="mt-2 font-bold">
                        {slot.source_a
                          ? `${slot.source_a.home_name} — ${slot.source_a.away_name}`
                          : `Пара №${slot.source_slots[0]} ще не створена`}
                      </div>
                    </>
                  )}
                </div>

                <div className="py-3 text-center font-black text-white/20">
                  VS
                </div>

                <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                  {slot.team_b ? (
                    <TeamInfo
                      teamId={
                        slot.team_b
                      }
                    />
                  ) : (
                    <>
                      <div className="text-xs font-bold text-yellow-300">
                        Переможець ще визначається
                      </div>

                      <div className="mt-2 font-bold">
                        {slot.source_b
                          ? `${slot.source_b.home_name} — ${slot.source_b.away_name}`
                          : `Пара №${slot.source_slots[1]} ще не створена`}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void createBracketSlot(
                      slot
                    )
                  }
                  disabled={
                    alreadyCreated ||
                    !slot.ready ||
                    creatingSlot !==
                      null
                  }
                  className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {alreadyCreated
                    ? "Протистояння вже створене"
                    : creatingSlot ===
                        slot.slot
                      ? "Створення..."
                      : slot.ready
                        ? stage ===
                          "final"
                          ? "Створити фінал"
                          : `Створити пару №${slot.slot}`
                        : "Очікуємо суперника"}
                </button>
              </div>
            );
          }
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}