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

  competition: string;

  stage: string;

  playerIds: readonly string[];

  onCreated?: () => void;
};

type PlayoffMatch = {
  id: string;

  bracket_slot: number | null;

  next_round_slot: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  complete: boolean;

  winner_id: string | null;
};

type SourceMatch = {
  id: string;

  bracket_slot: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  complete: boolean;

  winner_id: string | null;
};

type NextRoundSlot = {
  slot: number;

  source_slots: number[];

  player_a: string | null;
  player_b: string | null;

  source_a:
    | SourceMatch
    | null;

  source_b:
    | SourceMatch
    | null;

  ready: boolean;
};

type PlayoffResponse = {
  success?: boolean;

  expected_matches?: number;

  created_matches?: number;

  completed_matches?: number;

  stage_complete?: boolean;

  next_round_slots?: NextRoundSlot[];

  matches?: PlayoffMatch[];

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

  if (
    stage === "final"
  ) {
    return "semifinal";
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

export default function DivisionCupBracketForm({
  password,
  season,
  competition,
  stage,
  playerIds,
  onCreated,
}: Props) {
  /*
    ========================================
    РУЧНИЙ ЖЕРЕБ 1/8
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
    ДАНІ СІТКИ
    ========================================
  */

  const [
    currentMatches,
    setCurrentMatches,
  ] = useState<PlayoffMatch[]>(
    []
  );

  const [
    nextRoundSlots,
    setNextRoundSlots,
  ] = useState<NextRoundSlot[]>(
    []
  );

  const [
    previousCompleted,
    setPreviousCompleted,
  ] = useState(0);

  const [
    previousExpected,
    setPreviousExpected,
  ] = useState(0);

  /*
    ========================================
    СТАН
    ========================================
  */

  const [
    loadingData,
    setLoadingData,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    creatingSlot,
    setCreatingSlot,
  ] = useState<number | null>(
    null
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const previousStage =
    getPreviousStage(stage);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ СІТКИ
    ========================================
  */

  const loadData =
  useCallback(async () => {
    if (!stage) {
      setCurrentMatches([]);
      setNextRoundSlots([]);
      setMessage("");

      return;
    }

    setLoadingData(true);
    setMessage("");

    try {
        /*
          Поточна стадія.
        */

        const currentParams =
          new URLSearchParams();

        currentParams.set(
          "season",
          String(season)
        );

        currentParams.set(
          "competition",
          competition
        );

        currentParams.set(
          "stage",
          stage
        );

        const currentResponse =
          await fetch(
            `/api/admin/single-leg-playoff?${currentParams.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const currentResult =
          (await currentResponse.json()) as PlayoffResponse;

        if (!currentResponse.ok) {
          setMessage(
            currentResult.error ??
              "Не вдалося завантажити сітку Кубка"
          );

          return;
        }

        setCurrentMatches(
          currentResult.matches ??
            []
        );

        /*
          Для 1/8 попередньої
          стадії немає.
        */

        if (!previousStage) {
          setNextRoundSlots([]);

          setPreviousCompleted(0);

          setPreviousExpected(0);

          return;
        }

        /*
          Попередня стадія,
          щоб побудувати точні
          пари наступного раунду.
        */

        const previousParams =
          new URLSearchParams();

        previousParams.set(
          "season",
          String(season)
        );

        previousParams.set(
          "competition",
          competition
        );

        previousParams.set(
          "stage",
          previousStage
        );

        const previousResponse =
          await fetch(
            `/api/admin/single-leg-playoff?${previousParams.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const previousResult =
          (await previousResponse.json()) as PlayoffResponse;

        if (!previousResponse.ok) {
          setMessage(
            previousResult.error ??
              "Не вдалося завантажити попередню стадію"
          );

          return;
        }

        setNextRoundSlots(
          previousResult.next_round_slots ??
            []
        );

        setPreviousCompleted(
          previousResult.completed_matches ??
            0
        );

        setPreviousExpected(
          previousResult.expected_matches ??
            0
        );
      } catch {
        setMessage(
          "Помилка завантаження сітки"
        );
      } finally {
        setLoadingData(false);
      }
    }, [
      season,
      competition,
      stage,
      previousStage,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    ГРАВЦІ, ЯКІ ВЖЕ Є В 1/8
    ========================================
  */

  const usedPlayerIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      for (
        const match of currentMatches
      ) {
        ids.add(
          match.home_id
        );

        ids.add(
          match.away_id
        );
      }

      return ids;
    }, [
      currentMatches,
    ]);

  /*
    ========================================
    ДОСТУПНІ ДЛЯ ЖЕРЕБУ
    ========================================
  */

  const availablePlayerIds =
    useMemo(() => {
      return playerIds.filter(
        (playerId) =>
          !usedPlayerIds.has(
            playerId
          )
      );
    }, [
      playerIds,
      usedPlayerIds,
    ]);

  /*
    ========================================
    ВЖЕ СТВОРЕНІ СЛОТИ
    ========================================
  */

  const createdSlots =
    useMemo(() => {
      return new Set(
        currentMatches
          .map(
            (match) =>
              match.bracket_slot
          )
          .filter(
            (
              slot
            ): slot is number =>
              slot !== null
          )
      );
    }, [
      currentMatches,
    ]);

  /*
    ========================================
    СТВОРИТИ 1/8
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

    setCreating(true);

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/single-leg-playoff",
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
            "Не вдалося створити пару"
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
    СТВОРИТИ НАСТУПНИЙ СЛОТ
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
          "/api/admin/single-leg-playoff",
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
      setCreatingSlot(null);
    }
  }

  /*
    ========================================
    1/8 ФІНАЛУ
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

          <div className="mt-2">
            Кожна пара грає
            один матч.
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Жеребкування
          </div>

          <div className="mt-3 text-sm text-white/55">
            Створено пар:{" "}
            <b className="text-white">
              {
                currentMatches.length
              }
              /8
            </b>
          </div>

          <div className="mt-2 text-sm text-white/55">
            Вільних гравців:{" "}
            <b className="text-white">
              {
                availablePlayerIds.length
              }
            </b>
          </div>
        </div>

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
                loadingData ||
                availablePlayerIds.length <
                  2
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
            >
              <option value="">
                Оберіть гравця
              </option>

              {availablePlayerIds.map(
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
                loadingData ||
                availablePlayerIds.length <
                  2
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
            >
              <option value="">
                Оберіть гравця
              </option>

              {availablePlayerIds.map(
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

        <button
          type="button"
          onClick={() =>
            void createRoundOf16()
          }
          disabled={
            creating ||
            loadingData ||
            !homeId ||
            !awayId
          }
          className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating
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
    1/4, 1/2, ФІНАЛ
    ========================================
  */

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Пари формуються
        автоматично за
        турнірною сіткою.

        <div className="mt-2">
          Кожна пара грає
          один матч.
        </div>
      </div>

      {/* PROGRESS */}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Попередня стадія
        </div>

        {loadingData ? (
          <div className="mt-3 text-white/40">
            Завантаження...
          </div>
        ) : (
          <div className="mt-3">
            Завершено:{" "}
            <b>
              {previousCompleted}
              /
              {previousExpected}
            </b>
          </div>
        )}
      </div>

      {/* SLOTS */}

      {!loadingData && (
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                        {stage ===
                        "final"
                          ? "Фінал"
                          : `Пара №${slot.slot}`}
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

                  {/* PLAYER A */}

                  <div className="mt-5 rounded-xl border border-white/10 bg-[#030711] p-4">
                    {slot.player_a ? (
                      <>
                        <div className="text-xs text-green-300">
                          ✓ Переможець
                          визначений
                        </div>

                        <div className="mt-1 text-lg font-black">
                          {getPlayerName(
                            slot.player_a
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

                  <div className="py-3 text-center font-black text-white/20">
                    VS
                  </div>

                  {/* PLAYER B */}

                  <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                    {slot.player_b ? (
                      <>
                        <div className="text-xs text-green-300">
                          ✓ Переможець
                          визначений
                        </div>

                        <div className="mt-1 text-lg font-black">
                          {getPlayerName(
                            slot.player_b
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
                      ? "Матч уже створено"
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
      )}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}