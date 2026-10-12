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

type ExistingFinalMatch = {
  id: string;

  season: number;
  competition: string;

  stage: string | null;

  round: number | null;
  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;
};

type MatchesResponse = {
  matches?: ExistingFinalMatch[];

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
    existingFinal,
    setExistingFinal,
  ] =
    useState<ExistingFinalMatch | null>(
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

  const [
    finalCheckFailed,
    setFinalCheckFailed,
  ] = useState(false);

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ФІНАЛІСТІВ
    + ПЕРЕВІРКА ІСНУЮЧОГО ФІНАЛУ
    ========================================

    Робимо дві незалежні перевірки:

    1. playoff-qualifiers
       визначає переможців
       двох півфіналів.

    2. /api/admin/match
       перевіряє, чи фінальний
       матч уже існує.

    Це важливо для історичних
    сезонів і захисту від
    повторного створення фіналу.
    ========================================
  */

  useEffect(() => {
    let cancelled =
      false;

    async function loadFinalData() {
      setLoadingFinalists(
        true
      );

      setMessage("");

      setFinalCheckFailed(
        false
      );

      try {
        /*
          ====================================
          ПІВФІНАЛИ
          ====================================
        */

        const playoffParams =
          new URLSearchParams();

        playoffParams.set(
          "season",
          String(season)
        );

        playoffParams.set(
          "competition",
          competition
        );

        playoffParams.set(
          "stage",
          "semifinal"
        );

        /*
          ====================================
          УСІ МАТЧІ ТУРНІРУ
          ====================================
        */

        const matchParams =
          new URLSearchParams();

        matchParams.set(
          "season",
          String(season)
        );

        matchParams.set(
          "competition",
          competition
        );

        /*
          Обидва запити можна
          виконати одночасно.
        */

        const [
          playoffResponse,
          matchesResponse,
        ] =
          await Promise.all([
            fetch(
              `/api/admin/playoff-qualifiers?${playoffParams.toString()}`,
              {
                cache:
                  "no-store",
              }
            ),

            fetch(
              `/api/admin/match?${matchParams.toString()}`,
              {
                cache:
                  "no-store",
              }
            ),
          ]);

        const playoffResult =
          (await playoffResponse.json()) as
            PlayoffResponse;

        const matchesResult =
          (await matchesResponse.json()) as
            MatchesResponse;

        if (cancelled) {
          return;
        }

        /*
          ====================================
          ПЕРЕВІРКА ПІВФІНАЛІВ
          ====================================
        */

        if (
          !playoffResponse.ok
        ) {
          setFinalSlot(
            null
          );

          setMessage(
            playoffResult.error ??
              "Не вдалося визначити фіналістів"
          );

          return;
        }

        setCompletedSemifinals(
          playoffResult.completed_series ??
            0
        );

        setExpectedSemifinals(
          playoffResult.expected_series ??
            2
        );

        /*
          Для semifinal
          next_round_slots
          повинен містити
          один фінальний слот.
        */

        setFinalSlot(
          playoffResult
            .next_round_slots?.[0] ??
            null
        );

        /*
          ====================================
          ПЕРЕВІРКА ІСНУЮЧОГО ФІНАЛУ
          ====================================

          Якщо цей запит не вдався,
          створення фіналу блокуємо.

          Краще не дозволити створення,
          ніж випадково створити дубль.
          ====================================
        */

        if (
          !matchesResponse.ok
        ) {
          setExistingFinal(
            null
          );

          setFinalCheckFailed(
            true
          );

          setMessage(
            matchesResult.error ??
              "Не вдалося перевірити, чи фінальний матч уже існує"
          );

          return;
        }

        const foundFinal =
          (
            matchesResult.matches ??
            []
          ).find(
            (match) =>
              match.stage ===
              "final"
          ) ?? null;

        setExistingFinal(
          foundFinal
        );
      } catch {
        if (!cancelled) {
          setFinalSlot(
            null
          );

          setExistingFinal(
            null
          );

          setFinalCheckFailed(
            true
          );

          setMessage(
            "Помилка завантаження даних фіналу"
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

    void loadFinalData();

    return () => {
      cancelled = true;
    };
  }, [
    season,
    competition,
    refreshKey,
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

    /*
      Додатковий UI-захист.

      Якщо фінал уже є,
      навіть функція створення
      не повинна виконувати запит.
    */

    if (existingFinal) {
      setMessage(
        "Фінальний матч уже створено"
      );

      return;
    }

    /*
      Якщо нам не вдалося
      перевірити БД,
      теж нічого не створюємо.
    */

    if (finalCheckFailed) {
      setMessage(
        "Спочатку потрібно успішно перевірити існуючі матчі"
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

    if (
      !finalSlot.ready
    ) {
      setMessage(
        "Фінальний слот ще не готовий"
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
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                season,

                competition,

                division:
                  null,

                stage:
                  "final",

                group_name:
                  null,

                /*
                  Фінал —
                  одна пара,
                  тому slot №1.
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

      /*
        Перезавантажуємо
        власний стан форми,
        щоб кнопка одразу
        зникла після створення.
      */

      setRefreshKey(
        (current) =>
          current + 1
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

            {/* EXISTING FINAL */}

            {existingFinal ? (
              <div className="mt-6 rounded-xl border border-green-400/20 bg-green-500/10 p-5">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
                  Фінальний матч уже створено
                </div>

                <div className="mt-3 text-lg font-black">
                  {getPlayerName(
                    existingFinal.home_id
                  )}

                  {" — "}

                  {getPlayerName(
                    existingFinal.away_id
                  )}
                </div>

                {existingFinal.status ===
                  "finished" &&
                  existingFinal.home_goals !==
                    null &&
                  existingFinal.away_goals !==
                    null && (
                    <div className="mt-3 text-3xl font-black">
                      {
                        existingFinal.home_goals
                      }
                      {" : "}
                      {
                        existingFinal.away_goals
                      }
                    </div>
                  )}

                {existingFinal.status !==
                  "finished" && (
                  <div className="mt-3 text-sm text-green-100/70">
                    Матч створений,
                    результат ще
                    не внесено.
                  </div>
                )}
              </div>
            ) : finalCheckFailed ? (
              <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
                Не вдалося
                перевірити
                існуючий фінал.
                Створення нового
                матчу заблоковано.
              </div>
            ) : (
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
            )}
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