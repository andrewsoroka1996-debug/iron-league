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

export default function TwoLegSeriesForm({
  password,
  season,
  competition,
  stage,
  playerIds,
  onCreated,
}: Props) {
  const [homeId, setHomeId] =
    useState("");

  const [awayId, setAwayId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

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
    ОЧИЩЕННЯ ПРИ ЗМІНІ ТУРНІРУ / СТАДІЇ
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
    СТВОРЕННЯ ДВОМАТЧЕВОЇ СЕРІЇ
    ========================================
  */

  async function createSeries() {
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
        "✅ Двоматчеве протистояння створено"
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

  return (
    <div className="space-y-6">
      {/* INFO */}

      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Обери одну пару гравців.
        Система автоматично створить
        два матчі:
        <div className="mt-2 font-bold">
          Гравець A — Гравець B
        </div>

        <div className="font-bold">
          Гравець B — Гравець A
        </div>
      </div>

      {/* PLAYERS */}

      <div className="grid gap-5 md:grid-cols-2">
        {/* PLAYER A */}

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
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть гравця
            </option>

            {playerIds.map(
              (playerId) => (
                <option
                  key={playerId}
                  value={playerId}
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

        {/* PLAYER B */}

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
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Оберіть гравця
            </option>

            {playerIds.map(
              (playerId) => (
                <option
                  key={playerId}
                  value={playerId}
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

      {/* PREVIEW */}

      {homeId &&
        awayId && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Буде створено
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-[#030711] px-4 py-3 font-bold">
                1-й матч:{" "}
                {getPlayerName(
                  homeId
                )}{" "}
                —{" "}
                {getPlayerName(
                  awayId
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#030711] px-4 py-3 font-bold">
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
          </div>
        )}

      {/* BUTTON */}

      <button
        type="button"
        onClick={
          createSeries
        }
        disabled={
          loading ||
          !homeId ||
          !awayId
        }
        className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "Створення..."
          : "Створити двоматчеве протистояння"}
      </button>

      {/* MESSAGE */}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          {message}
        </div>
      )}
    </div>
  );
}