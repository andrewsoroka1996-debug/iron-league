"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../../data/players";

import { season1 } from "../../data/seasons/season-1";
import { season2 } from "../../data/seasons/season-2";
import { season3 } from "../../data/seasons/season-3";
import { season4 } from "../../data/seasons/season-4";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

type AdminTab = "results" | "calendar";

type CalendarMatch = {
  id: string;
  season: number;
  division: number | null;
  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

export default function AdminPage() {
  const [tab, setTab] =
    useState<AdminTab>("results");

  const [password, setPassword] =
    useState("");

  const [season, setSeason] =
    useState<SeasonNumber>(3);

  const [division, setDivision] =
    useState<DivisionNumber>(1);

  const [
    calendarMatches,
    setCalendarMatches,
  ] = useState<CalendarMatch[]>([]);

  const [
    calendarLoading,
    setCalendarLoading,
  ] = useState(false);

  const [round, setRound] =
    useState(1);

  const [matchId, setMatchId] =
    useState("");

  const [homeGoals, setHomeGoals] =
    useState("");

  const [awayGoals, setAwayGoals] =
    useState("");

  const [manualRound, setManualRound] =
    useState(1);

  const [manualHome, setManualHome] =
    useState("");

  const [manualAway, setManualAway] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /*
    ==================================
    НІКНЕЙМ ГРАВЦЯ
    ==================================
  */

  function getNickname(
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
    ==================================
    СКЛАД ДИВІЗІОНУ
    ==================================
  */

  function getDivisionPlayerIds(
    selectedSeason: SeasonNumber,
    selectedDivision: DivisionNumber
  ): readonly string[] {
    /*
      СЕЗОН 1
      Було тільки 3 дивізіони.
    */

    if (selectedSeason === 1) {
      if (selectedDivision === 1) {
        return season1.division1.players;
      }

      if (selectedDivision === 2) {
        return season1.division2.players;
      }

      if (selectedDivision === 3) {
        return season1.division3.players;
      }

      return [];
    }

    /*
      СЕЗОН 2
      Було 4 дивізіони.
    */

    if (selectedSeason === 2) {
      if (selectedDivision === 1) {
        return season2.division1.players;
      }

      if (selectedDivision === 2) {
        return season2.division2.players;
      }

      if (selectedDivision === 3) {
        return season2.division3.players;
      }

      return season2.division4.players;
    }

    /*
      СЕЗОН 3
    */

    if (selectedSeason === 3) {
      if (selectedDivision === 1) {
        return season3.division1.players;
      }

      if (selectedDivision === 2) {
        return season3.division2.players;
      }

      if (selectedDivision === 3) {
        return season3.division3.players;
      }

      return season3.division4.players;
    }

    /*
      СЕЗОН 4
    */

    if (selectedDivision === 1) {
      return season4.division1.players;
    }

    if (selectedDivision === 2) {
      return season4.division2.players;
    }

    if (selectedDivision === 3) {
      return season4.division3.players;
    }

    return season4.division4.players;
  }

  const divisionPlayerIds =
    getDivisionPlayerIds(
      season,
      division
    );

  const divisionPlayers =
    divisionPlayerIds
      .map((id) =>
        players.find(
          (player) =>
            player.id === id
        )
      )
      .filter(
        (
          player
        ): player is (typeof players)[number] =>
          player !== undefined
      );

  const divisionDidNotExist =
    season === 1 &&
    division === 4;

  /*
    ==================================
    ЗАВАНТАЖЕННЯ КАЛЕНДАРЯ
    ==================================
  */

  const loadCalendar =
    useCallback(async () => {
      setCalendarLoading(true);

      try {
        const response =
          await fetch(
            `/api/admin/calendar?season=${season}&division=${division}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          setMessage(
            result.error ??
              "Не вдалося завантажити календар"
          );

          return;
        }

        const matches =
          (result.matches ??
            []) as CalendarMatch[];

        setCalendarMatches(matches);

        const availableRounds =
          Array.from(
            new Set(
              matches
                .map(
                  (match) =>
                    match.round
                )
                .filter(
                  (
                    value
                  ): value is number =>
                    value !== null
                )
            )
          ).sort(
            (a, b) => a - b
          );

        setRound(
          availableRounds[0] ?? 1
        );

        setMatchId("");
        setHomeGoals("");
        setAwayGoals("");
      } catch {
        setMessage(
          "Помилка завантаження календаря"
        );
      } finally {
        setCalendarLoading(false);
      }
    }, [
      season,
      division,
    ]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  /*
    ==================================
    СПИСОК ТУРІВ
    ==================================
  */

  const roundNumbers =
    useMemo(() => {
      return Array.from(
        new Set(
          calendarMatches
            .map(
              (match) =>
                match.round
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            )
        )
      ).sort(
        (a, b) => a - b
      );
    }, [calendarMatches]);

  /*
    ==================================
    МАТЧІ ОБРАНОГО ТУРУ
    ==================================
  */

  const roundMatches =
    useMemo(() => {
      return calendarMatches.filter(
        (match) =>
          match.round === round
      );
    }, [
      calendarMatches,
      round,
    ]);

  /*
    ==================================
    ОБРАНИЙ МАТЧ
    ==================================
  */

  const selectedMatch =
    useMemo(() => {
      return roundMatches.find(
        (match) =>
          match.id === matchId
      );
    }, [
      roundMatches,
      matchId,
    ]);

  /*
    Якщо результат уже внесений,
    показуємо поточний рахунок.
  */

  useEffect(() => {
    if (!selectedMatch) {
      setHomeGoals("");
      setAwayGoals("");
      return;
    }

    if (
      selectedMatch.status ===
        "finished" &&
      selectedMatch.home_goals !==
        null &&
      selectedMatch.away_goals !==
        null
    ) {
      setHomeGoals(
        String(
          selectedMatch.home_goals
        )
      );

      setAwayGoals(
        String(
          selectedMatch.away_goals
        )
      );
    } else {
      setHomeGoals("");
      setAwayGoals("");
    }
  }, [selectedMatch]);

  /*
    ==================================
    ЗБЕРЕЖЕННЯ РЕЗУЛЬТАТУ
    ==================================
  */

  async function saveResult(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );
      return;
    }

    if (!selectedMatch) {
      setMessage(
        "Оберіть матч"
      );
      return;
    }

    if (
      homeGoals === "" ||
      awayGoals === ""
    ) {
      setMessage(
        "Введіть рахунок"
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/result",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              season,
              division,
              round,

              home_id:
                selectedMatch.home_id,

              away_id:
                selectedMatch.away_id,

              home_goals:
                Number(homeGoals),

              away_goals:
                Number(awayGoals),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося зберегти результат"
        );

        return;
      }

      setMessage(
        result.updated
          ? "✅ Результат оновлено"
          : "✅ Результат збережено"
      );

      await loadCalendar();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ==================================
    РУЧНЕ ДОДАВАННЯ МАТЧУ
    СЕЗОНИ 1–3
    ==================================
  */

  async function addManualMatch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (season > 3) {
      setMessage(
        "Ручне формування використовується для Сезонів 1–3"
      );

      return;
    }

    if (divisionDidNotExist) {
      setMessage(
        "4 Дивізіону в Сезоні 1 не існувало"
      );

      return;
    }

    if (
      !manualHome ||
      !manualAway
    ) {
      setMessage(
        "Оберіть обох гравців"
      );

      return;
    }

    if (
      manualHome ===
      manualAway
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
          "/api/admin/calendar",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              action:
                "manual",

              season,
              division,

              round:
                manualRound,

              home_id:
                manualHome,

              away_id:
                manualAway,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося додати матч"
        );

        return;
      }

      setMessage(
        "✅ Матч додано до календаря"
      );

      setManualHome("");
      setManualAway("");

      await loadCalendar();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ==================================
    АВТОМАТИЧНЕ ЖЕРЕБКУВАННЯ
    СЕЗОН 4
    ==================================
  */

  async function generateCalendar() {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (season !== 4) {
      setMessage(
        "Автоматичне жеребкування призначене для Сезону 4"
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/calendar",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              action:
                "generate",

              season: 4,
              division,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити календар"
        );

        return;
      }

      setMessage(
        `✅ ${result.message}. Турів: ${result.rounds}, матчів: ${result.matches}`
      );

      await loadCalendar();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  function changeSeason(
    value: SeasonNumber
  ) {
    setSeason(value);

    setRound(1);
    setMatchId("");

    setManualRound(1);
    setManualHome("");
    setManualAway("");

    setMessage("");
  }

  function changeDivision(
    value: DivisionNumber
  ) {
    setDivision(value);

    setRound(1);
    setMatchId("");

    setManualRound(1);
    setManualHome("");
    setManualAway("");

    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="font-black tracking-[0.18em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/40">
              Адмін-панель
            </div>
          </div>

          <a
            href="/"
            className="font-bold text-blue-300"
          >
            ← На сайт
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h1 className="text-4xl font-black">
          Керування Iron League
        </h1>

        {/* TABS */}
        <div className="mt-8 inline-flex rounded-xl border border-white/10 bg-[#07101d] p-1">
          <button
            type="button"
            onClick={() => {
              setTab("results");
              setMessage("");
            }}
            className={`rounded-lg px-6 py-3 text-sm font-bold transition ${
              tab === "results"
                ? "bg-blue-500 text-white"
                : "text-white/45 hover:text-white"
            }`}
          >
            Результати
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("calendar");
              setMessage("");
            }}
            className={`rounded-lg px-6 py-3 text-sm font-bold transition ${
              tab === "calendar"
                ? "bg-blue-500 text-white"
                : "text-white/45 hover:text-white"
            }`}
          >
            Календар
          </button>
        </div>

        {/* COMMON SETTINGS */}
        <div className="mt-8 grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 md:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-white/60">
              Пароль адміністратора
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Пароль"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Сезон
            </label>

            <select
              value={season}
              onChange={(event) =>
                changeSeason(
                  Number(
                    event.target.value
                  ) as SeasonNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                Сезон 1
              </option>

              <option value={2}>
                Сезон 2
              </option>

              <option value={3}>
                Сезон 3
              </option>

              <option value={4}>
                Сезон 4
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Дивізіон
            </label>

            <select
              value={division}
              onChange={(event) =>
                changeDivision(
                  Number(
                    event.target.value
                  ) as DivisionNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                1 Дивізіон
              </option>

              <option value={2}>
                2 Дивізіон
              </option>

              <option value={3}>
                3 Дивізіон
              </option>

              <option value={4}>
                4 Дивізіон
              </option>
            </select>
          </div>
        </div>

        {/* RESULTS */}
        {tab === "results" && (
          <form
            onSubmit={saveResult}
            className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
          >
            <h2 className="text-3xl font-black">
              Внести результат
            </h2>

            {calendarLoading ? (
              <div className="text-white/40">
                Завантаження календаря...
              </div>
            ) : roundNumbers.length === 0 ? (
              <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                Для цього дивізіону календар
                ще не створено.
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-bold">
                    Тур
                  </label>

                  <select
                    value={round}
                    onChange={(event) => {
                      setRound(
                        Number(
                          event.target.value
                        )
                      );

                      setMatchId("");
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    {roundNumbers.map(
                      (number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          Тур {number}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Матч
                  </label>

                  <select
                    value={matchId}
                    onChange={(event) =>
                      setMatchId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Оберіть матч
                    </option>

                    {roundMatches.map(
                      (match) => (
                        <option
                          key={match.id}
                          value={match.id}
                        >
                          {getNickname(
                            match.home_id
                          )}
                          {" — "}
                          {getNickname(
                            match.away_id
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {selectedMatch && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-black">
                        Рахунок
                      </h3>

                      {selectedMatch.status ===
                      "finished" ? (
                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                          Результат внесено
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
                          Матч не зіграно
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div>
                        <div className="mb-2 text-center font-bold">
                          {getNickname(
                            selectedMatch.home_id
                          )}
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={homeGoals}
                          onChange={(event) =>
                            setHomeGoals(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-4 text-center text-3xl font-black"
                        />
                      </div>

                      <div className="mt-7 text-2xl font-black text-white/25">
                        :
                      </div>

                      <div>
                        <div className="mb-2 text-center font-bold">
                          {getNickname(
                            selectedMatch.away_id
                          )}
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={awayGoals}
                          onChange={(event) =>
                            setAwayGoals(
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-4 text-center text-3xl font-black"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedMatch
                  }
                  className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:opacity-40"
                >
                  {loading
                    ? "Збереження..."
                    : selectedMatch?.status ===
                        "finished"
                      ? "Оновити результат"
                      : "Зберегти результат"}
                </button>
              </>
            )}
          </form>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div className="mt-8 space-y-8">
            {season <= 3 && (
              <form
                onSubmit={addManualMatch}
                className="space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Історичний календар
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Додати матч вручну
                  </h2>

                  <p className="mt-3 text-white/40">
                    Для Сезонів 1–3 ми
                    відтворюємо реальні
                    історичні тури.
                  </p>
                </div>

                {divisionDidNotExist ? (
                  <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                    4 Дивізіону в Сезоні 1
                    ще не існувало.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-bold">
                        Номер туру
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={manualRound}
                        onChange={(event) =>
                          setManualRound(
                            Number(
                              event.target.value
                            )
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold">
                        Господар
                      </label>

                      <select
                        value={manualHome}
                        onChange={(event) =>
                          setManualHome(
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                      >
                        <option value="">
                          Оберіть гравця
                        </option>

                        {divisionPlayers.map(
                          (player) => (
                            <option
                              key={player.id}
                              value={player.id}
                            >
                              {player.nickname}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">
                        Гість
                      </label>

                      <select
                        value={manualAway}
                        onChange={(event) =>
                          setManualAway(
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                      >
                        <option value="">
                          Оберіть гравця
                        </option>

                        {divisionPlayers.map(
                          (player) => (
                            <option
                              key={player.id}
                              value={player.id}
                            >
                              {player.nickname}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        divisionPlayers.length === 0
                      }
                      className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:opacity-40"
                    >
                      Додати матч до календаря
                    </button>
                  </>
                )}
              </form>
            )}

            {season === 4 && (
              <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Новий сезон
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Автоматичне жеребкування
                </h2>

                <p className="mt-4 text-white/40">
                  Система випадково перемішає
                  16 учасників і створить
                  30 турів.
                </p>

                <div className="mt-7 rounded-2xl border border-white/10 bg-[#030711] p-5">
                  <div className="text-sm text-white/40">
                    Гравців у дивізіоні
                  </div>

                  <div className="mt-2 text-4xl font-black">
                    {divisionPlayerIds.length}

                    <span className="text-xl text-white/25">
                      {" "}
                      / 16
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    generateCalendar
                  }
                  disabled={
                    loading ||
                    divisionPlayerIds.length !== 16 ||
                    calendarMatches.length > 0
                  }
                  className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:opacity-40"
                >
                  {calendarMatches.length > 0
                    ? "Календар уже створено"
                    : divisionPlayerIds.length !== 16
                      ? "Потрібно 16 гравців"
                      : "Провести жеребкування"}
                </button>
              </div>
            )}

            {/* CURRENT CALENDAR */}
            <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <h2 className="text-2xl font-black">
                Поточний календар
              </h2>

              {calendarLoading ? (
                <div className="mt-6 text-white/40">
                  Завантаження...
                </div>
              ) : calendarMatches.length === 0 ? (
                <div className="mt-6 text-white/40">
                  Матчів ще немає.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {roundNumbers.map(
                    (roundNumber) => {
                      const matches =
                        calendarMatches.filter(
                          (match) =>
                            match.round ===
                            roundNumber
                        );

                      return (
                        <div
                          key={roundNumber}
                          className="overflow-hidden rounded-2xl border border-white/10"
                        >
                          <div className="bg-white/[0.04] px-5 py-3 font-black">
                            Тур {roundNumber}
                          </div>

                          {matches.map(
                            (match) => (
                              <div
                                key={match.id}
                                className="grid grid-cols-[1fr_auto_1fr] gap-4 border-t border-white/5 px-5 py-4"
                              >
                                <div className="text-right">
                                  {getNickname(
                                    match.home_id
                                  )}
                                </div>

                                <div className="font-black text-white/30">
                                  {match.status ===
                                  "finished"
                                    ? `${match.home_goals} : ${match.away_goals}`
                                    : "VS"}
                                </div>

                                <div>
                                  {getNickname(
                                    match.away_id
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}