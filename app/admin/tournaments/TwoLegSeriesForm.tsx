"use client";

import {
  useEffect,
  useState,
} from "react";

import { players } from "../../../data/players";

type Props = {
  password: string;

  season: number;

  competition: string;

  stage: string;

  playerIds: readonly string[];

  onCreated?: () => void;
};

type SourceSeries = {
  series_id: string;

  home_id: string | null;
  away_id: string | null;

  complete: boolean;

  winner_id: string | null;
};

type NextRoundSlot = {
  slot: number;

  source_slots: number[];

  player_a: string | null;
  player_b: string | null;

  source_a:
    | SourceSeries
    | null;

  source_b:
    | SourceSeries
    | null;

  ready: boolean;
};

type PlayoffQualifiersResponse = {
  success?: boolean;

  qualifiers?: string[];

  next_round_slots?: NextRoundSlot[];

  stage_complete?: boolean;

  expected_series?: number;
  completed_series?: number;

  error?: string;
};

type GroupQualifiersResponse = {
  success?: boolean;

  qualifiers?: string[];

  count?: number;

  group_stage_complete?: boolean;

  error?: string;
};

function getPreviousStage(
  stage: string
) {
  if (
    stage === "quarterfinal"
  ) {
    return "round-of-16";
  }

  if (
    stage === "semifinal"
  ) {
    return "quarterfinal";
  }

  return null;
}

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

export default function TwoLegSeriesForm({
  password,
  season,
  competition,
  stage,
  playerIds,
  onCreated,
}: Props) {
  /*
    ========================================
    1/8 — РУЧНИЙ ЖЕРЕБ
    ========================================
  */

  const [
    homeId,
    setHomeId,
  ] = useState("");

  const [
    awayId,
    setAwayId,
  ] = useState("");

  /*
    ========================================
    УЧАСНИКИ 1/8
    ========================================
  */

  const [
    qualifiers,
    setQualifiers,
  ] = useState<string[]>([]);

  /*
    ========================================
    ТОЧНІ СЛОТИ 1/4 / 1/2
    ========================================
  */

  const [
    nextRoundSlots,
    setNextRoundSlots,
  ] = useState<NextRoundSlot[]>(
    []
  );

  const [
    previousStageComplete,
    setPreviousStageComplete,
  ] = useState(false);

  const [
    expectedSeries,
    setExpectedSeries,
  ] = useState<number | null>(
    null
  );

  const [
    completedSeries,
    setCompletedSeries,
  ] = useState<number | null>(
    null
  );

  /*
    ========================================
    СТАН
    ========================================
  */

  const [
    qualifiersLoading,
    setQualifiersLoading,
  ] = useState(false);

  const [
    qualifiersError,
    setQualifiersError,
  ] = useState("");

  const [
    creatingSlot,
    setCreatingSlot,
  ] = useState<number | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const previousStage =
    getPreviousStage(stage);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ
    ========================================
  */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setQualifiersLoading(true);

      setQualifiersError("");

      setQualifiers([]);

      setNextRoundSlots([]);

      setPreviousStageComplete(
        false
      );

      setExpectedSeries(null);

      setCompletedSeries(null);

      try {
        /*
          ====================================
          1/8

          Беремо учасників
          із завершеного
          групового етапу.
          ====================================
        */

        if (
          stage ===
          "round-of-16"
        ) {
          const params =
            new URLSearchParams();

          params.set(
            "season",
            String(season)
          );

          params.set(
            "competition",
            competition
          );

          const response =
            await fetch(
              `/api/admin/group-qualifiers?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as GroupQualifiersResponse;

          if (cancelled) {
            return;
          }

          if (!response.ok) {
            setQualifiersError(
              result.error ??
                "Не вдалося визначити учасників 1/8"
            );

            return;
          }

          setQualifiers(
            result.qualifiers ??
              []
          );

          setPreviousStageComplete(
            result.group_stage_complete ??
              false
          );

          return;
        }

        /*
          ====================================
          1/4 / 1/2

          Отримуємо точну сітку
          з попередньої стадії.
          ====================================
        */

        if (previousStage) {
          const params =
            new URLSearchParams();

          params.set(
            "season",
            String(season)
          );

          params.set(
            "competition",
            competition
          );

          params.set(
            "stage",
            previousStage
          );

          const response =
            await fetch(
              `/api/admin/playoff-qualifiers?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as PlayoffQualifiersResponse;

          if (cancelled) {
            return;
          }

          if (!response.ok) {
            setQualifiersError(
              result.error ??
                "Не вдалося завантажити сітку"
            );

            return;
          }

          setQualifiers(
            result.qualifiers ??
              []
          );

          setNextRoundSlots(
            result.next_round_slots ??
              []
          );

          setPreviousStageComplete(
            result.stage_complete ??
              false
          );

          setExpectedSeries(
            result.expected_series ??
              null
          );

          setCompletedSeries(
            result.completed_series ??
              null
          );
        }
      } catch {
        if (!cancelled) {
          setQualifiersError(
            "Помилка завантаження учасників"
          );
        }
      } finally {
        if (!cancelled) {
          setQualifiersLoading(
            false
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    season,
    competition,
    stage,
    previousStage,
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
    competition,
    stage,
  ]);

  /*
    ========================================
    СТВОРЕННЯ 1/8

    Тут жереб формується
    вручну з 16 учасників.
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
      !homeId ||
      !awayId
    ) {
      setMessage(
        "Оберіть двох гравців"
      );

      return;
    }

    if (
      homeId === awayId
    ) {
      setMessage(
        "Гравець не може грати сам із собою"
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/two-leg-series",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              season,

              competition,

              stage,

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
            "Не вдалося створити протистояння"
        );

        return;
      }

      setMessage(
        `✅ Пару №${result.bracket_slot} створено`
      );

      setHomeId("");
      setAwayId("");

      if (onCreated) {
        onCreated();
      }
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    СТВОРЕННЯ ТОЧНОЇ ПАРИ
    1/4 АБО 1/2
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
      !slot.player_a ||
      !slot.player_b
    ) {
      setMessage(
        `Пара №${slot.slot} ще не визначена повністю`
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
          "/api/admin/two-leg-series",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              season,

              competition,

              stage,

              home_id:
                slot.player_a,

              away_id:
                slot.player_b,

              /*
                Найважливіше:

                передаємо точне
                місце в сітці.
              */

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

      if (onCreated) {
        onCreated();
      }
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setCreatingSlot(null);
    }
  }

  /*
    ========================================
    1/8
    ========================================
  */

  if (
    stage === "round-of-16"
  ) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
          Сформуй пари 1/8
          фіналу вручну.
          Система автоматично
          присвоїть їм номери
          від 1 до 8.
        </div>

        {/* GROUP STATUS */}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Кваліфікація
          </div>

          {qualifiersLoading ? (
            <div className="mt-3 text-white/40">
              Завантаження...
            </div>
          ) : qualifiersError ? (
            <div className="mt-3 text-red-300">
              {
                qualifiersError
              }
            </div>
          ) : (
            <>
              <div className="mt-3">
                Учасників 1/8:{" "}
                <b className="text-blue-300">
                  {
                    qualifiers.length
                  }
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
                  ? "Груповий етап завершено"
                  : "Груповий етап ще не завершено"}
              </div>
            </>
          )}
        </div>

        {/* PLAYERS */}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold">
              Гравець A
            </label>

            <select
              value={homeId}
              onChange={(event) =>
                setHomeId(
                  event.target.value
                )
              }
              disabled={
                qualifiersLoading ||
                qualifiers.length ===
                  0
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
            >
              <option value="">
                Оберіть гравця
              </option>

              {qualifiers.map(
                (playerId) => (
                  <option
                    key={
                      playerId
                    }
                    value={
                      playerId
                    }
                    disabled={
                      playerId ===
                      awayId
                    }
                  >
                    {getPlayerName(
                      playerId
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold">
              Гравець B
            </label>

            <select
              value={awayId}
              onChange={(event) =>
                setAwayId(
                  event.target.value
                )
              }
              disabled={
                qualifiersLoading ||
                qualifiers.length ===
                  0
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
            >
              <option value="">
                Оберіть гравця
              </option>

              {qualifiers.map(
                (playerId) => (
                  <option
                    key={
                      playerId
                    }
                    value={
                      playerId
                    }
                    disabled={
                      playerId ===
                      homeId
                    }
                  >
                    {getPlayerName(
                      playerId
                    )}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {homeId &&
          awayId && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                Буде створено
              </div>

              <div className="mt-4 font-bold">
                1-й матч:{" "}
                {getPlayerName(
                  homeId
                )}{" "}
                —{" "}
                {getPlayerName(
                  awayId
                )}
              </div>

              <div className="mt-2 font-bold">
                2-й матч:{" "}
                {getPlayerName(
                  awayId
                )}{" "}
                —{" "}
                {getPlayerName(
                  homeId
                )}
              </div>
            </div>
          )}

        <button
          type="button"
          onClick={
            createRoundOf16
          }
          disabled={
            loading ||
            qualifiersLoading ||
            !homeId ||
            !awayId
          }
          className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "Створення..."
            : "Створити пару 1/8"}
        </button>

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
    1/4 / 1/2
    ========================================
  */

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Пари цієї стадії
        формуються автоматично
        відповідно до турнірної
        сітки попереднього раунду.
      </div>

      {/* PROGRESS */}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Попередня стадія
        </div>

        {qualifiersLoading ? (
          <div className="mt-3 text-white/40">
            Завантаження...
          </div>
        ) : qualifiersError ? (
          <div className="mt-3 text-red-300">
            {
              qualifiersError
            }
          </div>
        ) : (
          <>
            {expectedSeries !==
              null &&
              completedSeries !==
                null && (
                <div className="mt-3">
                  Завершено:{" "}
                  <b>
                    {
                      completedSeries
                    }
                    /
                    {
                      expectedSeries
                    }
                  </b>
                </div>
              )}

            <div
              className={`mt-2 text-sm font-bold ${
                previousStageComplete
                  ? "text-green-300"
                  : "text-yellow-300"
              }`}
            >
              {previousStageComplete
                ? "Усі пари попередньої стадії завершені"
                : "Деякі пари ще граються"}
            </div>
          </>
        )}
      </div>

      {/* BRACKET SLOTS */}

      {!qualifiersLoading &&
        !qualifiersError && (
          <div className="space-y-4">
            {nextRoundSlots.map(
              (slot) => {
                const playerA =
                  slot.player_a;

                const playerB =
                  slot.player_b;

                return (
                  <div
                    key={
                      slot.slot
                    }
                    className="rounded-2xl border border-white/10 bg-[#07101d] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                          Пара №
                          {
                            slot.slot
                          }
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          Із пар №
                          {
                            slot
                              .source_slots[0]
                          }{" "}
                          та №
                          {
                            slot
                              .source_slots[1]
                          }{" "}
                          попереднього
                          раунду
                        </div>
                      </div>

                      <div
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${
                          slot.ready
                            ? "bg-green-500/10 text-green-300"
                            : "bg-yellow-500/10 text-yellow-300"
                        }`}
                      >
                        {slot.ready
                          ? "Готова"
                          : "Очікує"}
                      </div>
                    </div>

                    {/* PLAYER A */}

                    <div className="mt-5 rounded-xl border border-white/10 bg-[#030711] p-4">
                      {playerA ? (
                        <>
                          <div className="text-xs text-green-300">
                            ✓ Переможець
                            визначений
                          </div>

                          <div className="mt-1 text-lg font-black">
                            {getPlayerName(
                              playerA
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-yellow-300">
                            Переможець
                            ще визначається
                          </div>

                          <div className="mt-2 font-bold">
                            {slot.source_a
                              ? `${getPlayerName(
                                  slot
                                    .source_a
                                    .home_id
                                )} — ${getPlayerName(
                                  slot
                                    .source_a
                                    .away_id
                                )}`
                              : `Пара №${slot.source_slots[0]} ще не створена`}
                          </div>
                        </>
                      )}
                    </div>

                    {/* VS */}

                    <div className="py-3 text-center font-black text-white/20">
                      VS
                    </div>

                    {/* PLAYER B */}

                    <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                      {playerB ? (
                        <>
                          <div className="text-xs text-green-300">
                            ✓ Переможець
                            визначений
                          </div>

                          <div className="mt-1 text-lg font-black">
                            {getPlayerName(
                              playerB
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-yellow-300">
                            Переможець
                            ще визначається
                          </div>

                          <div className="mt-2 font-bold">
                            {slot.source_b
                              ? `${getPlayerName(
                                  slot
                                    .source_b
                                    .home_id
                                )} — ${getPlayerName(
                                  slot
                                    .source_b
                                    .away_id
                                )}`
                              : `Пара №${slot.source_slots[1]} ще не створена`}
                          </div>
                        </>
                      )}
                    </div>

                    {/* CREATE */}

                    <button
                      type="button"
                      onClick={() =>
                        void createBracketSlot(
                          slot
                        )
                      }
                      disabled={
                        !slot.ready ||
                        creatingSlot !==
                          null
                      }
                      className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {creatingSlot ===
                      slot.slot
                        ? "Створення..."
                        : slot.ready
                          ? `Створити пару №${slot.slot}`
                          : "Очікуємо суперника"}
                    </button>
                  </div>
                );
              }
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