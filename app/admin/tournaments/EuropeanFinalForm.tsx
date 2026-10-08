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

  onCreated?: () => void;
};

type SourceSeries = {
  series_id: string;

  home_id: string | null;
  away_id: string | null;

  complete: boolean;

  winner_id: string | null;
};

type FinalSlot = {
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

type PlayoffResponse = {
  success?: boolean;

  stage_complete?: boolean;

  expected_series?: number;
  completed_series?: number;

  next_round_slots?: FinalSlot[];

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

export default function EuropeanFinalForm({
  password,
  season,
  competition,
  onCreated,
}: Props) {
  const [
    finalSlot,
    setFinalSlot,
  ] =
    useState<FinalSlot | null>(
      null
    );

  const [
    loadingFinalists,
    setLoadingFinalists,
  ] = useState(true);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    completedSemifinals,
    setCompletedSemifinals,
  ] = useState(0);

  const [
    expectedSemifinals,
    setExpectedSemifinals,
  ] = useState(2);

  const [
    message,
    setMessage,
  ] = useState("");

  /*
    ========================================
    ЗАВАНТАЖУЄМО ПІВФІНАЛИ
    ========================================
  */

  useEffect(() => {
    let cancelled = false;

    async function loadFinalists() {
      setLoadingFinalists(true);

      setMessage("");

      try {
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
          "semifinal"
        );

        const response =
          await fetch(
            `/api/admin/playoff-qualifiers?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as PlayoffResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setFinalSlot(null);

          setMessage(
            result.error ??
              "Не вдалося визначити фіналістів"
          );

          return;
        }

        setCompletedSemifinals(
          result.completed_series ??
            0
        );

        setExpectedSemifinals(
          result.expected_series ??
            2
        );

        /*
          Для півфіналу
          next_round_slots
          містить один слот:

          півфінал №1
             +
          півфінал №2
             ↓
          фінал
        */

        setFinalSlot(
          result.next_round_slots?.[0] ??
            null
        );
      } catch {
        if (!cancelled) {
          setFinalSlot(null);

          setMessage(
            "Помилка завантаження фіналістів"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingFinalists(
            false
          );
        }
      }
    }

    void loadFinalists();

    return () => {
      cancelled = true;
    };
  }, [
    season,
    competition,
  ]);

  /*
    ========================================
    СТВОРЕННЯ ФІНАЛУ
    ========================================
  */

  async function createFinal() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (
      !finalSlot?.player_a ||
      !finalSlot.player_b
    ) {
      setMessage(
        "Обидва фіналісти ще не визначені"
      );

      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/match",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              season,

              competition,

              division: null,

              stage:
                "final",

              group_name:
                null,

              /*
                Фінал —
                єдина пара,
                тому слот №1.
              */

              round: 1,

              leg: 1,

              participant_type:
                "player",

              home_id:
                finalSlot.player_a,

              away_id:
                finalSlot.player_b,

              series_id:
                null,

              series_home_id:
                null,

              series_away_id:
                null,

              is_tiebreak:
                false,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити фінал"
        );

        return;
      }

      setMessage(
        "✅ Фінальний матч створено"
      );

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

  return (
    <div className="space-y-6">
      {/* INFO */}

      <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-100">
        Фінал складається
        з одного матчу.

        <div className="mt-2">
          Фіналісти автоматично
          визначаються з
          півфіналів №1 і №2.
        </div>
      </div>

      {/* PROGRESS */}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Півфінали
        </div>

        {loadingFinalists ? (
          <div className="mt-3 text-white/40">
            Завантаження...
          </div>
        ) : (
          <div className="mt-3">
            Завершено:{" "}
            <b>
              {completedSemifinals}
              /
              {expectedSemifinals}
            </b>
          </div>
        )}
      </div>

      {/* FINAL SLOT */}

      {!loadingFinalists &&
        finalSlot && (
          <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Фінал
            </div>

            {/* FINALIST 1 */}

            <div className="mt-5 rounded-xl border border-white/10 bg-[#030711] p-4">
              {finalSlot.player_a ? (
                <>
                  <div className="text-xs text-green-300">
                    ✓ Перший
                    фіналіст
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {getPlayerName(
                      finalSlot.player_a
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-yellow-300">
                    Перший
                    фіналіст ще
                    визначається
                  </div>

                  <div className="mt-2 font-bold">
                    {finalSlot.source_a
                      ? `Переможець: ${getPlayerName(
                          finalSlot
                            .source_a
                            .home_id
                        )} — ${getPlayerName(
                          finalSlot
                            .source_a
                            .away_id
                        )}`
                      : "Півфінал №1 ще не створено"}
                  </div>
                </>
              )}
            </div>

            <div className="py-4 text-center text-xl font-black text-white/20">
              VS
            </div>

            {/* FINALIST 2 */}

            <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
              {finalSlot.player_b ? (
                <>
                  <div className="text-xs text-green-300">
                    ✓ Другий
                    фіналіст
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {getPlayerName(
                      finalSlot.player_b
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-yellow-300">
                    Другий
                    фіналіст ще
                    визначається
                  </div>

                  <div className="mt-2 font-bold">
                    {finalSlot.source_b
                      ? `Переможець: ${getPlayerName(
                          finalSlot
                            .source_b
                            .home_id
                        )} — ${getPlayerName(
                          finalSlot
                            .source_b
                            .away_id
                        )}`
                      : "Півфінал №2 ще не створено"}
                  </div>
                </>
              )}
            </div>

            {/* CREATE */}

            <button
              type="button"
              onClick={
                createFinal
              }
              disabled={
                creating ||
                !finalSlot.ready
              }
              className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {creating
                ? "Створення..."
                : finalSlot.ready
                  ? "Створити фінальний матч"
                  : "Очікуємо другого фіналіста"}
            </button>
          </div>
        )}

      {!loadingFinalists &&
        !finalSlot && (
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
            Півфінальна сітка
            ще не сформована.
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