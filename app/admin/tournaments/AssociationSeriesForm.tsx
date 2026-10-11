"use client";

import {
  useMemo,
  useState,
} from "react";

import { players } from "../../../data/players";

type Pairing = {
  home_id: string;
  away_id: string;
};

type AssociationMember = {
  playerId: string;

  rank:
    | number
    | null;
};

type AdminAssociation = {
  id: string;

  name: string;

  players: string[];

  members?: AssociationMember[];
};

type Props = {
  password: string;

  season: number;

  stage: string;

  associations:
    AdminAssociation[];

  onCreated?: () => void;
};

/*
  ========================================
  ПОРОЖНІ 6 ПАР
  ========================================
*/

const emptyPairings =
  (): Pairing[] =>
    Array.from(
      {
        length: 6,
      },
      () => ({
        home_id: "",
        away_id: "",
      })
    );

/*
  ========================================
  COMPONENT
  ========================================
*/

export default function AssociationSeriesForm({
  password,
  season,
  stage,
  associations,
  onCreated,
}: Props) {
  const [
    homeAssociationId,
    setHomeAssociationId,
  ] = useState("");

  const [
    awayAssociationId,
    setAwayAssociationId,
  ] = useState("");

  /*
    Для Сезону 2
    залишаємо ручне
    формування пар.
  */

  const [
    manualPairings,
    setManualPairings,
  ] =
    useState<Pairing[]>(
      emptyPairings()
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  /*
    ========================================
    ОБРАНІ АСОЦІАЦІЇ
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
    ЧИ ВИКОРИСТОВУЄМО РАНГИ
    ========================================

    Сезон 2:
    пари вручну.

    Сезон 3+:
    автоматично R1–R6.
  */

  const usesAutomaticRanks =
    season >= 3;

  /*
    ========================================
    ГРАВЕЦЬ ЗА РАНГОМ
    ========================================
  */

  function getPlayerByRank(
    association:
      | AdminAssociation
      | undefined,
    rank: number
  ) {
    if (!association) {
      return null;
    }

    const members =
      association.members ??
      [];

    const matches =
      members.filter(
        (member) =>
          member.rank ===
          rank
      );

    /*
      Має бути рівно
      один гравець
      конкретного рангу.
    */

    if (
      matches.length !== 1
    ) {
      return null;
    }

    return matches[0]
      .playerId;
  }

  /*
    ========================================
    АВТОМАТИЧНІ ПАРИ R1–R6
    ========================================
  */

  const automaticPairings =
    useMemo<Pairing[]>(
      () => {
        if (
          !homeAssociation ||
          !awayAssociation
        ) {
          return emptyPairings();
        }

        return Array.from(
          {
            length: 6,
          },
          (
            _,
            index
          ) => {
            const rank =
              index + 1;

            return {
              home_id:
                getPlayerByRank(
                  homeAssociation,
                  rank
                ) ?? "",

              away_id:
                getPlayerByRank(
                  awayAssociation,
                  rank
                ) ?? "",
            };
          }
        );
      },
      [
        homeAssociation,
        awayAssociation,
      ]
    );

  /*
    ========================================
    ФАКТИЧНІ ПАРИ
    ========================================
  */

  const pairings =
    usesAutomaticRanks
      ? automaticPairings
      : manualPairings;

  /*
    ========================================
    ПЕРЕВІРКА РАНГІВ
    ========================================
  */

  const automaticRanksReady =
    !usesAutomaticRanks ||
    pairings.every(
      (pairing) =>
        Boolean(
          pairing.home_id
        ) &&
        Boolean(
          pairing.away_id
        )
    );

  /*
    ========================================
    ЗМІНА РУЧНОЇ ПАРИ
    ========================================

    Використовується тільки
    для історичного Сезону 2.
  */

  function updateManualPairing(
    index: number,

    side:
      | "home_id"
      | "away_id",

    value: string
  ) {
    setManualPairings(
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

    setMessage("");
  }

  /*
    ========================================
    ВИКОРИСТАНІ ГРАВЦІ
    СЕЗОН 2
    ========================================
  */

  function usedHomePlayers(
    currentIndex: number
  ) {
    return manualPairings
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
    return manualPairings
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
        Boolean(
          pairing.home_id
        ) &&
        Boolean(
          pairing.away_id
        )
    );

  /*
    ========================================
    ЧИ АСОЦІАЦІЯ МАЄ 6 ГРАВЦІВ
    ========================================
  */

  const homeSquadReady =
    Boolean(
      homeAssociation &&
        homeAssociation.players
          .length === 6
    );

  const awaySquadReady =
    Boolean(
      awayAssociation &&
        awayAssociation.players
          .length === 6
    );

  /*
    ========================================
    СТВОРЕННЯ СЕРІЇ
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

    if (
      !homeSquadReady ||
      !awaySquadReady
    ) {
      setMessage(
        "Одна з Асоціацій ще не має повного складу з 6 гравців"
      );

      return;
    }

    if (
      usesAutomaticRanks &&
      !automaticRanksReady
    ) {
      setMessage(
        "Не вдалося сформувати всі пари R1–R6. Перевір зафіксовані ранги Асоціацій."
      );

      return;
    }

    if (
      !allPairingsReady
    ) {
      setMessage(
        "Потрібно сформувати всі 6 пар"
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
        "✅ Протистояння 6×6 створено"
      );

      /*
        Після успішного
        створення очищаємо
        вибір.
      */

      setHomeAssociationId(
        ""
      );

      setAwayAssociationId(
        ""
      );

      setManualPairings(
        emptyPairings()
      );

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
    UI
    ========================================
  */

  return (
    <div className="space-y-6">
      {/* INFO */}

      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        {usesAutomaticRanks ? (
          <>
            Одне протистояння
            Кубка асоціацій
            складається з шести
            матчів. Після вибору
            двох Асоціацій пари
            формуються автоматично:
            R1 проти R1, R2 проти
            R2, R3 проти R3, R4
            проти R4, R5 проти R5
            та R6 проти R6.
          </>
        ) : (
          <>
            Одне протистояння
            Кубка асоціацій
            складається з шести
            окремих матчів. Для
            історичного Сезону 2
            пари гравців
            формуються вручну.
          </>
        )}
      </div>

      {/* ASSOCIATIONS */}

      <div className="grid gap-5 md:grid-cols-2">
        {/* HOME */}

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
            ) => {
              setHomeAssociationId(
                event.target.value
              );

              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть асоціацію
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

          {homeAssociation &&
            homeAssociation.players
              .length !== 6 && (
              <div className="mt-2 text-xs font-bold text-yellow-300">
                Склад ще не
                сформований повністю:{" "}
                {
                  homeAssociation
                    .players
                    .length
                }
                /6
              </div>
            )}
        </div>

        {/* AWAY */}

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
            ) => {
              setAwayAssociationId(
                event.target.value
              );

              setMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть асоціацію
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

          {awayAssociation &&
            awayAssociation.players
              .length !== 6 && (
              <div className="mt-2 text-xs font-bold text-yellow-300">
                Склад ще не
                сформований повністю:{" "}
                {
                  awayAssociation
                    .players
                    .length
                }
                /6
              </div>
            )}
        </div>
      </div>

      {/* PAIRINGS */}

      {homeAssociation &&
        awayAssociation && (
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
            </div>

            {/* AUTO MODE */}

            {usesAutomaticRanks ? (
              <>
                {!automaticRanksReady && (
                  <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-6 text-yellow-200">
                    Не вдалося
                    автоматично
                    визначити всі
                    шість рангів.
                    Перевір, чи в
                    обох Асоціаціях
                    зафіксовано рівно
                    по одному R1,
                    R2, R3, R4, R5
                    та R6.
                  </div>
                )}

                <div className="space-y-3">
                  {pairings.map(
                    (
                      pairing,
                      index
                    ) => {
                      const rank =
                        index +
                        1;

                      return (
                        <div
                          key={
                            rank
                          }
                          className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[64px_1fr_auto_1fr]"
                        >
                          {/* RANK */}

                          <div className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 font-black text-blue-300">
                            R
                            {
                              rank
                            }
                          </div>

                          {/* HOME */}

                          <div className="rounded-xl border border-white/[0.06] bg-[#030711] px-4 py-3 font-bold">
                            {pairing.home_id
                              ? getPlayerName(
                                  pairing.home_id
                                )
                              : "Ранг не визначено"}
                          </div>

                          {/* VS */}

                          <div className="text-sm font-black text-white/25">
                            VS
                          </div>

                          {/* AWAY */}

                          <div className="rounded-xl border border-white/[0.06] bg-[#030711] px-4 py-3 font-bold">
                            {pairing.away_id
                              ? getPlayerName(
                                  pairing.away_id
                                )
                              : "Ранг не визначено"}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            ) : (
              /*
                ========================================
                СЕЗОН 2 — РУЧНИЙ РЕЖИМ
                ========================================
              */

              <div className="space-y-4">
                {manualPairings.map(
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
                        {/* NUMBER */}

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 font-black text-blue-300">
                          {index +
                            1}
                        </div>

                        {/* HOME PLAYER */}

                        <select
                          value={
                            pairing.home_id
                          }
                          onChange={(
                            event
                          ) =>
                            updateManualPairing(
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

                        {/* VS */}

                        <div className="text-sm font-black text-white/25">
                          VS
                        </div>

                        {/* AWAY PLAYER */}

                        <select
                          value={
                            pairing.away_id
                          }
                          onChange={(
                            event
                          ) =>
                            updateManualPairing(
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
            )}

            {/* CREATE */}

            <button
              type="button"
              onClick={
                createSeries
              }
              disabled={
                loading ||
                !allPairingsReady ||
                !homeSquadReady ||
                !awaySquadReady
              }
              className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "Створення..."
                : usesAutomaticRanks
                  ? "Створити протистояння R1–R6"
                  : "Створити протистояння 6×6"}
            </button>
          </>
        )}

      {/* MESSAGE */}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}