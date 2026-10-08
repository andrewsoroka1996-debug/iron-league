"use client";

import { useEffect, useMemo, useState } from "react";

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

const emptyPairings = (): Pairing[] =>
  Array.from(
    { length: 6 },
    () => ({
      home_id: "",
      away_id: "",
    })
  );

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

  const [pairings, setPairings] =
    useState<Pairing[]>(
      emptyPairings()
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

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
          player.id === playerId
      )?.nickname ?? playerId
    );
  }

  /*
    ========================================
    ПРИ ЗМІНІ АСОЦІАЦІЙ
    ОЧИЩАЄМО 6 ПАР
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
              [side]: value,
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

    if (!allPairingsReady) {
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
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
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

      setPairings(
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
      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Одне протистояння Кубка
        асоціацій складається з
        шести окремих матчів.
        Пари гравців формуються
        вручну.
      </div>

      {/* ASSOCIATIONS */}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-bold">
            Асоціація 1
          </label>

          <select
            value={
              homeAssociationId
            }
            onChange={(event) =>
              setHomeAssociationId(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть асоціацію
            </option>

            {associations.map(
              (association) => (
                <option
                  key={
                    association.id
                  }
                  value={
                    association.id
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
            onChange={(event) =>
              setAwayAssociationId(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть асоціацію
            </option>

            {associations.map(
              (association) => (
                <option
                  key={
                    association.id
                  }
                  value={
                    association.id
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

      {/* 6 PAIRS */}

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
                      key={index}
                      className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[50px_1fr_auto_1fr]"
                    >
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

                      {/* AWAY PLAYER */}

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
        )}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}