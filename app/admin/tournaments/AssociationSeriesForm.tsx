"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../../../data/players";

import type { CompetitionAssociation } from "../../../data/competitions/get-competition-associations";

type Pairing = {
  home_id: string;
  away_id: string;
};

type Props = {
  password: string;

  season: number;

  stage: string;

  associations: CompetitionAssociation[];

  onCreated?: () => void;
};

type SourceSeries = {
  series_id: string;

  home_id: string | null;
  home_name: string;

  away_id: string | null;
  away_name: string;

  complete: boolean;

  winner_id: string | null;
  winner_name: string | null;
};

type NextRoundSlot = {
  slot: number;

  source_slots: number[];

  association_a: string | null;
  association_a_name: string | null;

  association_b: string | null;
  association_b_name: string | null;

  source_a:
    | SourceSeries
    | null;

  source_b:
    | SourceSeries
    | null;

  ready: boolean;
};

type ThirdPlaceSlot = {
  association_a: string | null;
  association_a_name: string | null;

  association_b: string | null;
  association_b_name: string | null;

  ready: boolean;
};

type CurrentSeries = {
  series_id: string;

  bracket_slot: number | null;

  home_id: string | null;
  home_name: string;

  away_id: string | null;
  away_name: string;

  complete: boolean;

  winner_id: string | null;
  winner_name: string | null;
};

type PlayoffResponse = {
  success?: boolean;

  expected_series?: number;

  created_series?: number;

  completed_series?: number;

  stage_complete?: boolean;

  next_round_slots?: NextRoundSlot[];

  third_place_slot?:
    | ThirdPlaceSlot
    | null;

  series?: CurrentSeries[];

  error?: string;
};

function emptyPairings(): Pairing[] {
  return Array.from(
    {
      length: 6,
    },
    () => ({
      home_id: "",
      away_id: "",
    })
  );
}

function getPreviousStage(
  stage: string
) {
  if (
    stage === "semifinal"
  ) {
    return "quarterfinal";
  }

  if (
    stage === "final" ||
    stage === "third-place"
  ) {
    return "semifinal";
  }

  return null;
}

export default function AssociationSeriesForm({
  password,
  season,
  stage,
  associations,
  onCreated,
}: Props) {
  /*
    ========================================
    ВИБРАНІ АСОЦІАЦІЇ
    ========================================
  */

  const [
    homeAssociationId,
    setHomeAssociationId,
  ] = useState("");

  const [
    awayAssociationId,
    setAwayAssociationId,
  ] = useState("");

  /*
    ========================================
    ПАРИ ГРАВЦІВ 6×6
    ========================================
  */

  const [
    pairings,
    setPairings,
  ] =
    useState<Pairing[]>(
      emptyPairings()
    );

  /*
    ========================================
    BRACKET SLOT
    ========================================
  */

  const [
    bracketSlot,
    setBracketSlot,
  ] =
    useState<number | null>(
      null
    );

  /*
    ========================================
    СІТКА
    ========================================
  */

  const [
    nextRoundSlots,
    setNextRoundSlots,
  ] =
    useState<
      NextRoundSlot[]
    >([]);

  const [
    thirdPlaceSlot,
    setThirdPlaceSlot,
  ] =
    useState<
      ThirdPlaceSlot | null
    >(null);

  const [
    currentSeries,
    setCurrentSeries,
  ] =
    useState<
      CurrentSeries[]
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

  /*
    ========================================
    СТАН
    ========================================
  */

  const [
    loadingBracket,
    setLoadingBracket,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const previousStage =
    getPreviousStage(stage);

  /*
    ========================================
    НАЗВА ГРАВЦЯ
    ========================================
  */

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

  /*
    ========================================
    ПОШУК АСОЦІАЦІЇ
    ========================================
  */

  const homeAssociation =
    useMemo(() => {
      return associations.find(
        (association) =>
          association.id ===
          homeAssociationId
      );
    }, [
      associations,
      homeAssociationId,
    ]);

  const awayAssociation =
    useMemo(() => {
      return associations.find(
        (association) =>
          association.id ===
          awayAssociationId
      );
    }, [
      associations,
      awayAssociationId,
    ]);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ПОТОЧНОЇ СТАДІЇ
    ========================================
  */

  const loadCurrentStage =
    useCallback(async () => {
      if (!stage) {
        setCurrentSeries([]);

        return;
      }

      const params =
        new URLSearchParams();

      params.set(
        "season",
        String(season)
      );

      params.set(
        "stage",
        stage
      );

      const response =
        await fetch(
          `/api/admin/association-playoff?${params.toString()}`,
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
            "Не вдалося завантажити поточну стадію"
        );
      }

      setCurrentSeries(
        result.series ?? []
      );
    }, [
      season,
      stage,
    ]);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ СІТКИ
    ========================================
  */

  const loadBracket =
    useCallback(async () => {
      if (!stage) {
        return;
      }

      setLoadingBracket(true);
      setMessage("");

      try {
        await loadCurrentStage();

        /*
          ====================================
          1/4

          Формуємо вручну.
          Попередньої стадії немає.
          ====================================
        */

        if (
          stage ===
          "quarterfinal"
        ) {
          setNextRoundSlots([]);
          setThirdPlaceSlot(null);

          setPreviousCompleted(0);
          setPreviousExpected(0);

          return;
        }

        /*
          ====================================
          1/2 / ФІНАЛ / 3 МІСЦЕ
          ====================================
        */

        if (!previousStage) {
          return;
        }

        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        params.set(
          "stage",
          previousStage
        );

        const response =
          await fetch(
            `/api/admin/association-playoff?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as PlayoffResponse;

        if (!response.ok) {
          setMessage(
            result.error ??
              "Не вдалося завантажити турнірну сітку"
          );

          return;
        }

        setPreviousCompleted(
          result.completed_series ??
            0
        );

        setPreviousExpected(
          result.expected_series ??
            0
        );

        if (
          stage ===
          "third-place"
        ) {
          setThirdPlaceSlot(
            result.third_place_slot ??
              null
          );

          setNextRoundSlots([]);

          return;
        }

        setNextRoundSlots(
          result.next_round_slots ??
            []
        );

        setThirdPlaceSlot(null);
      } catch (
        error
      ) {
        setMessage(
          error instanceof
            Error
            ? error.message
            : "Помилка завантаження сітки"
        );
      } finally {
        setLoadingBracket(false);
      }
    }, [
      season,
      stage,
      previousStage,
      loadCurrentStage,
    ]);

  useEffect(() => {
    void loadBracket();
  }, [
    loadBracket,
  ]);

  /*
    ========================================
    ОЧИЩЕННЯ ПРИ ЗМІНІ СТАДІЇ
    ========================================
  */

  useEffect(() => {
    setHomeAssociationId("");
    setAwayAssociationId("");

    setBracketSlot(null);

    setPairings(
      emptyPairings()
    );

    setMessage("");
  }, [
    season,
    stage,
  ]);

  /*
    ========================================
    ПРИ ЗМІНІ АСОЦІАЦІЙ
    ========================================
  */

  useEffect(() => {
    setPairings(
      emptyPairings()
    );

    setMessage("");
  }, [
    homeAssociationId,
    awayAssociationId,
  ]);

  /*
    ========================================
    ВЖЕ ВИКОРИСТАНІ АСОЦІАЦІЇ
    В 1/4
    ========================================
  */

  const usedAssociationIds =
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
    ВЖЕ СТВОРЕНІ СЛОТИ
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

  /*
    ========================================
    ЗМІНА ОДНІЄЇ ПАРИ
    ========================================
  */

  function updatePairing(
    index: number,
    side:
      | "home_id"
      | "away_id",
    value: string
  ) {
    setPairings(
      (current) =>
        current.map(
          (
            pairing,
            pairingIndex
          ) => {
            if (
              pairingIndex !==
              index
            ) {
              return pairing;
            }

            return {
              ...pairing,

              [side]:
                value,
            };
          }
        )
    );
  }

  /*
    ========================================
    ВЖЕ ВИКОРИСТАНІ ГРАВЦІ
    ========================================
  */

  function usedHomePlayers(
    currentIndex: number
  ) {
    return pairings
      .filter(
        (
          _,
          index
        ) =>
          index !==
          currentIndex
      )
      .map(
        (pairing) =>
          pairing.home_id
      )
      .filter(Boolean);
  }

  function usedAwayPlayers(
    currentIndex: number
  ) {
    return pairings
      .filter(
        (
          _,
          index
        ) =>
          index !==
          currentIndex
      )
      .map(
        (pairing) =>
          pairing.away_id
      )
      .filter(Boolean);
  }

  /*
    ========================================
    ЧИ ГОТОВІ ВСІ 6 ПАР
    ========================================
  */

  const allPairingsReady =
    pairings.every(
      (pairing) =>
        pairing.home_id &&
        pairing.away_id
    );

  /*
    ========================================
    ОБРАТИ АВТОМАТИЧНИЙ СЛОТ
    ========================================
  */

  function selectBracketSlot(
    slot: NextRoundSlot
  ) {
    if (
      !slot.ready ||
      !slot.association_a ||
      !slot.association_b
    ) {
      return;
    }

    setBracketSlot(
      slot.slot
    );

    setHomeAssociationId(
      slot.association_a
    );

    setAwayAssociationId(
      slot.association_b
    );

    setPairings(
      emptyPairings()
    );

    setMessage("");
  }

  /*
    ========================================
    ОБРАТИ МАТЧ ЗА 3 МІСЦЕ
    ========================================
  */

  function selectThirdPlace() {
    if (
      !thirdPlaceSlot?.ready ||
      !thirdPlaceSlot
        .association_a ||
      !thirdPlaceSlot
        .association_b
    ) {
      return;
    }

    setBracketSlot(1);

    setHomeAssociationId(
      thirdPlaceSlot
        .association_a
    );

    setAwayAssociationId(
      thirdPlaceSlot
        .association_b
    );

    setPairings(
      emptyPairings()
    );

    setMessage("");
  }

  /*
    ========================================
    СТВОРЕННЯ ПРОТИСТОЯННЯ
    ========================================
  */

  async function createSeries() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!stage) {
      setMessage(
        "Оберіть стадію"
      );

      return;
    }

    if (
      !homeAssociation ||
      !awayAssociation
    ) {
      setMessage(
        "Оберіть дві асоціації"
      );

      return;
    }

    if (
      homeAssociation.id ===
      awayAssociation.id
    ) {
      setMessage(
        "Асоціація не може грати сама із собою"
      );

      return;
    }

    if (!allPairingsReady) {
      setMessage(
        "Потрібно сформувати всі 6 пар"
      );

      return;
    }

    /*
      Для автоматичних стадій
      слот обов'язково має бути
      відомим.
    */

    if (
      stage !==
        "quarterfinal" &&
      bracketSlot === null
    ) {
      setMessage(
        "Спочатку оберіть готову пару турнірної сітки"
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/association-series",
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

                association_home_id:
                  homeAssociation.id,

                association_away_id:
                  awayAssociation.id,

                pairings,

                /*
                  Для 1/4 null/undefined
                  дозволяє API взяти
                  перший вільний слот.

                  Для наступних стадій
                  передаємо точний слот.
                */

                bracket_slot:
                  bracketSlot ??
                  undefined,
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
        `✅ Протистояння №${result.bracket_slot} створено`
      );

      setHomeAssociationId("");
      setAwayAssociationId("");

      setBracketSlot(null);

      setPairings(
        emptyPairings()
      );

      await loadBracket();

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
    БЛОК ПАР ГРАВЦІВ
    ========================================
  */

  function renderPairings() {
    if (
      !homeAssociation ||
      !awayAssociation
    ) {
      return null;
    }

    return (
      <>
        <div className="border-t border-white/10 pt-6">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Пари 6×6
          </div>

          <h3 className="mt-2 text-2xl font-black">
            {
              homeAssociation.name
            }{" "}
            —{" "}
            {
              awayAssociation.name
            }
          </h3>

          {bracketSlot !==
            null && (
            <div className="mt-2 text-sm font-bold text-white/35">
              Пара турнірної
              сітки №
              {
                bracketSlot
              }
            </div>
          )}
        </div>

        <div className="space-y-4">
          {pairings.map(
            (
              pairing,
              index
            ) => {
              const usedHome =
                usedHomePlayers(
                  index
                );

              const usedAway =
                usedAwayPlayers(
                  index
                );

              return (
                <div
                  key={
                    index
                  }
                  className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[50px_1fr_auto_1fr]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 font-black text-blue-300">
                    {index +
                      1}
                  </div>

                  {/* HOME */}

                  <select
                    value={
                      pairing.home_id
                    }
                    onChange={(
                      event
                    ) =>
                      updatePairing(
                        index,
                        "home_id",
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Гравець{" "}
                      {
                        homeAssociation.name
                      }
                    </option>

                    {homeAssociation.players.map(
                      (
                        playerId
                      ) => (
                        <option
                          key={
                            playerId
                          }
                          value={
                            playerId
                          }
                          disabled={usedHome.includes(
                            playerId
                          )}
                        >
                          {getPlayerName(
                            playerId
                          )}
                        </option>
                      )
                    )}
                  </select>

                  <div className="text-center font-black text-blue-400">
                    VS
                  </div>

                  {/* AWAY */}

                  <select
                    value={
                      pairing.away_id
                    }
                    onChange={(
                      event
                    ) =>
                      updatePairing(
                        index,
                        "away_id",
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Гравець{" "}
                      {
                        awayAssociation.name
                      }
                    </option>

                    {awayAssociation.players.map(
                      (
                        playerId
                      ) => (
                        <option
                          key={
                            playerId
                          }
                          value={
                            playerId
                          }
                          disabled={usedAway.includes(
                            playerId
                          )}
                        >
                          {getPlayerName(
                            playerId
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>
              );
            }
          )}
        </div>

        <button
          type="button"
          onClick={
            createSeries
          }
          disabled={
            loading ||
            !allPairingsReady
          }
          className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "Створення..."
            : "Створити протистояння 6×6"}
        </button>
      </>
    );
  }

  /*
    ========================================
    1/4 — РУЧНЕ ФОРМУВАННЯ
    ========================================
  */

  if (
    stage === "quarterfinal"
  ) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
          Чвертьфінальні
          протистояння
          формуються вручну.

          <div className="mt-2">
            Одне
            протистояння =
            6 окремих матчів.
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Чвертьфінали
          </div>

          <div className="mt-3 text-sm">
            Створено:{" "}
            <b>
              {
                currentSeries.length
              }
              /4
            </b>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold">
              Асоціація 1
            </label>

            <select
              value={
                homeAssociationId
              }
              onChange={(
                event
              ) =>
                setHomeAssociationId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value="">
                Оберіть
                асоціацію
              </option>

              {associations.map(
                (
                  association
                ) => (
                  <option
                    key={
                      association.id
                    }
                    value={
                      association.id
                    }
                    disabled={
                      usedAssociationIds.has(
                        association.id
                      ) ||
                      association.id ===
                        awayAssociationId
                    }
                  >
                    {
                      association.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold">
              Асоціація 2
            </label>

            <select
              value={
                awayAssociationId
              }
              onChange={(
                event
              ) =>
                setAwayAssociationId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value="">
                Оберіть
                асоціацію
              </option>

              {associations.map(
                (
                  association
                ) => (
                  <option
                    key={
                      association.id
                    }
                    value={
                      association.id
                    }
                    disabled={
                      usedAssociationIds.has(
                        association.id
                      ) ||
                      association.id ===
                        homeAssociationId
                    }
                  >
                    {
                      association.name
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {renderPairings()}

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
    МАТЧ ЗА 3 МІСЦЕ
    ========================================
  */

  if (
    stage === "third-place"
  ) {
    const alreadyCreated =
      createdSlots.has(1);

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm text-yellow-100">
          Матч за 3 місце
          формується з двох
          асоціацій, які програли
          півфінали.
        </div>

        {loadingBracket ? (
          <div className="text-white/40">
            Завантаження...
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#07101d] p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
              Матч за 3 місце
            </div>

            <div className="mt-5 text-xl font-black">
              {thirdPlaceSlot
                ?.association_a_name ??
                "Ще не визначено"}
            </div>

            <div className="py-3 text-center font-black text-white/20">
              VS
            </div>

            <div className="text-xl font-black">
              {thirdPlaceSlot
                ?.association_b_name ??
                "Ще не визначено"}
            </div>

            <button
              type="button"
              onClick={
                selectThirdPlace
              }
              disabled={
                alreadyCreated ||
                !thirdPlaceSlot?.ready
              }
              className="mt-5 w-full rounded-xl bg-yellow-400 px-5 py-3 font-black text-black disabled:opacity-35"
            >
              {alreadyCreated
                ? "Протистояння вже створене"
                : thirdPlaceSlot?.ready
                  ? "Сформувати 6 матчів"
                  : "Очікуємо завершення півфіналів"}
            </button>
          </div>
        )}

        {renderPairings()}

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
    1/2 ТА ФІНАЛ
    ========================================
  */

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Асоціації цієї стадії
        визначаються
        автоматично за
        турнірною сіткою.

        <div className="mt-2">
          Пари гравців 6×6
          формуються вручну.
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Попередня стадія
        </div>

        {loadingBracket ? (
          <div className="mt-3 text-white/40">
            Завантаження...
          </div>
        ) : (
          <div className="mt-3">
            Завершено:{" "}
            <b>
              {
                previousCompleted
              }
              /
              {
                previousExpected
              }
            </b>
          </div>
        )}
      </div>

      {!loadingBracket && (
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
                  <div className="flex items-center justify-between gap-4">
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

                  <div className="mt-5 rounded-xl border border-white/10 bg-[#030711] p-4">
                    {slot.association_a ? (
                      <div className="text-lg font-black">
                        {
                          slot.association_a_name
                        }
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-yellow-300">
                          Переможець
                          ще визначається
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
                    {slot.association_b ? (
                      <div className="text-lg font-black">
                        {
                          slot.association_b_name
                        }
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-yellow-300">
                          Переможець
                          ще визначається
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
                      selectBracketSlot(
                        slot
                      )
                    }
                    disabled={
                      alreadyCreated ||
                      !slot.ready
                    }
                    className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black transition hover:bg-blue-400 disabled:opacity-35"
                  >
                    {alreadyCreated
                      ? "Протистояння вже створене"
                      : slot.ready
                        ? "Сформувати 6 матчів"
                        : "Очікуємо суперника"}
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}

      {renderPairings()}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}