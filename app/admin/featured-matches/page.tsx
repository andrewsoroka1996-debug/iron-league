"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { players } from "../../../data/players";

type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type SlotNumber =
  | 1
  | 2
  | 3;

type Match = {
  id: string;

  season: number;

  competition: string;

  division: number | null;

  stage: string | null;

  group_name: string | null;

  round: number | null;

  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;

  status: string;

  played_at:
    | string
    | null;
};

type CoopTeam = {
  id: string;
  name: string;
};

type FeaturedMatch = {
  id: number;

  season: number;

  feature_date: string;

  slot: SlotNumber;

  match_id: string;

  updated_at: string;
};

type ApiResponse = {
  success?: boolean;

  featured_matches?:
    FeaturedMatch[];

  matches?: Match[];

  coop_teams?: CoopTeam[];

  error?: string;
};

const SLOT_NUMBERS:
  SlotNumber[] = [
    1,
    2,
    3,
  ];

function todayLocal() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getTournamentName(
  match: Match
) {
  if (
    match.competition ===
      "division" &&
    match.division
  ) {
    return `${match.division} Дивізіон`;
  }

  if (
    match.competition ===
    "champions-league"
  ) {
    return "Ліга чемпіонів";
  }

  if (
    match.competition ===
    "europa-league"
  ) {
    return "Ліга Європи";
  }

  if (
    match.competition ===
    "conference-league"
  ) {
    return "Ліга конференцій";
  }

  if (
    match.competition ===
    "european-super-cup"
  ) {
    return "Суперкубок Європи";
  }

  if (
    match.competition ===
    "associations-cup"
  ) {
    return "Кубок асоціацій";
  }

  if (
    match.competition ===
    "iron-coop-cup"
  ) {
    return "Iron Co-op Cup";
  }

  const divisionCup =
    match.competition.match(
      /^division-(\d)-cup$/
    );

  if (divisionCup) {
    return `Кубок ${divisionCup[1]} Дивізіону`;
  }

  return match.competition;
}

function getStageName(
  stage: string | null
) {
  if (!stage) {
    return "";
  }

  if (stage === "group") {
    return "Груповий етап";
  }

  if (
    stage ===
    "round-of-16"
  ) {
    return "1/8 фіналу";
  }

  if (
    stage ===
    "quarterfinal"
  ) {
    return "1/4 фіналу";
  }

  if (
    stage ===
    "semifinal"
  ) {
    return "1/2 фіналу";
  }

  if (stage === "final") {
    return "Фінал";
  }

  if (
    stage ===
    "third-place"
  ) {
    return "Матч за 3 місце";
  }

  return stage;
}

export default function FeaturedMatchesAdminPage() {
  const [
    season,
    setSeason,
  ] =
    useState<SeasonNumber>(
      3
    );

  const [
    featureDate,
    setFeatureDate,
  ] =
    useState(
      todayLocal()
    );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    matches,
    setMatches,
  ] =
    useState<Match[]>([]);

  const [
    featured,
    setFeatured,
  ] =
    useState<
      FeaturedMatch[]
    >([]);

  const [
    coopTeams,
    setCoopTeams,
  ] =
    useState<CoopTeam[]>(
      []
    );

  const [
    selected,
    setSelected,
  ] =
    useState<
      Record<
        SlotNumber,
        string
      >
    >({
      1: "",
      2: "",
      3: "",
    });

  const [
    competitionFilter,
    setCompetitionFilter,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    savingSlot,
    setSavingSlot,
  ] =
    useState<
      SlotNumber | null
    >(null);

  const [
    message,
    setMessage,
  ] = useState("");

  /*
    ========================================
    НАЗВА УЧАСНИКА
    ========================================
  */

  const getParticipantName =
    useCallback(
      (
        id: string,
        type: string
      ) => {
        if (
          type === "team"
        ) {
          return (
            coopTeams.find(
              (team) =>
                team.id === id ||
                team.name === id
            )?.name ?? id
          );
        }

        return (
          players.find(
            (player) =>
              player.id === id
          )?.nickname ?? id
        );
      },
      [coopTeams]
    );

  /*
    ========================================
    LOAD
    ========================================
  */

  const loadData =
    useCallback(
      async () => {
        if (!featureDate) {
          return;
        }

        setLoading(true);
        setMessage("");

        try {
          const params =
            new URLSearchParams();

          params.set(
            "season",
            String(season)
          );

          params.set(
            "date",
            featureDate
          );

          const response =
            await fetch(
              `/api/admin/featured-matches?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as ApiResponse;

          if (
            !response.ok
          ) {
            setMessage(
              result.error ??
                "Не вдалося завантажити дані"
            );

            return;
          }

          const rows =
            result.featured_matches ??
            [];

          setFeatured(rows);

          setMatches(
            result.matches ??
              []
          );

          setCoopTeams(
            result.coop_teams ??
              []
          );

          const nextSelected:
            Record<
              SlotNumber,
              string
            > = {
              1: "",
              2: "",
              3: "",
            };

          for (
            const row of rows
          ) {
            nextSelected[
              row.slot
            ] =
              row.match_id;
          }

          setSelected(
            nextSelected
          );
        } catch {
          setMessage(
            "Помилка з'єднання із сервером"
          );
        } finally {
          setLoading(false);
        }
      },
      [
        season,
        featureDate,
      ]
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /*
    ========================================
    ТУРНІРИ
    ========================================
  */

  const competitions =
    useMemo(() => {
      return Array.from(
        new Set(
          matches.map(
            (match) =>
              match.competition
          )
        )
      ).sort();
    }, [matches]);

  /*
    ========================================
    ФІЛЬТР
    ========================================
  */

  const filteredMatches =
    useMemo(() => {
      if (
        !competitionFilter
      ) {
        return matches;
      }

      return matches.filter(
        (match) =>
          match.competition ===
          competitionFilter
      );
    }, [
      matches,
      competitionFilter,
    ]);

  /*
    ========================================
    ЗБЕРЕГТИ СЛОТ
    ========================================
  */

  async function saveSlot(
    slot: SlotNumber
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    const matchId =
      selected[slot];

    if (!matchId) {
      setMessage(
        `Оберіть матч для слота ${slot}`
      );

      return;
    }

    setSavingSlot(slot);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/featured-matches",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                action:
                  "set",

                season,

                feature_date:
                  featureDate,

                slot,

                match_id:
                  matchId,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося призначити матч"
        );

        return;
      }

      setMessage(
        `✅ Слот ${slot} збережено`
      );

      await loadData();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setSavingSlot(
        null
      );
    }
  }

  /*
    ========================================
    ОЧИСТИТИ СЛОТ
    ========================================
  */

  async function clearSlot(
    slot: SlotNumber
  ) {
    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    setSavingSlot(slot);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/featured-matches",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,

                action:
                  "clear",

                season,

                feature_date:
                  featureDate,

                slot,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося очистити слот"
        );

        return;
      }

      setMessage(
        `✅ Слот ${slot} очищено`
      );

      await loadData();
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setSavingSlot(
        null
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* HEADER */}

        <div className="mb-10">
          <a
            href="/"
            className="text-sm font-bold text-blue-400"
          >
            ← На головну
          </a>

          <div className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Адмін-панель
          </div>

          <h1 className="mt-3 text-4xl font-black">
            Матчі дня
          </h1>

          <p className="mt-3 max-w-2xl text-white/40">
            На кожну дату можна
            призначити від одного
            до трьох центральних
            матчів Iron League.
          </p>
        </div>

        {/* SETTINGS */}

        <div className="grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 md:grid-cols-3">
          <div>
            <label className="text-sm font-bold">
              Сезон
            </label>

            <select
              value={season}
              onChange={(
                event
              ) => {
                setSeason(
                  Number(
                    event.target
                      .value
                  ) as SeasonNumber
                );

                setCompetitionFilter(
                  ""
                );

                setMessage("");
              }}
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
            <label className="text-sm font-bold">
              Дата
            </label>

            <input
              type="date"
              value={
                featureDate
              }
              onChange={(
                event
              ) => {
                setFeatureDate(
                  event.target
                    .value
                );

                setMessage("");
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-bold">
              Пароль адміністратора
            </label>

            <input
              type="password"
              value={password}
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="ADMIN_PASSWORD"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            />
          </div>
        </div>

        {/* FILTER */}

        <div className="mt-7 rounded-3xl border border-white/10 bg-[#07101d] p-7">
          <label className="text-sm font-bold">
            Фільтр за турніром
          </label>

          <select
            value={
              competitionFilter
            }
            onChange={(
              event
            ) =>
              setCompetitionFilter(
                event.target
                  .value
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
          >
            <option value="">
              Усі турніри
            </option>

            {competitions.map(
              (
                competition
              ) => {
                const sample =
                  matches.find(
                    (match) =>
                      match.competition ===
                      competition
                  );

                return (
                  <option
                    key={
                      competition
                    }
                    value={
                      competition
                    }
                  >
                    {sample
                      ? getTournamentName(
                          sample
                        )
                      : competition}
                  </option>
                );
              }
            )}
          </select>
        </div>

        {/* SLOTS */}

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          {SLOT_NUMBERS.map(
            (slot) => {
              const selectedId =
                selected[slot];

              const selectedMatch =
                matches.find(
                  (match) =>
                    match.id ===
                    selectedId
                ) ?? null;

              const saved =
                featured.some(
                  (row) =>
                    row.slot ===
                    slot
                );

              const usedInOtherSlot =
                Object.entries(
                  selected
                )
                  .filter(
                    ([key]) =>
                      Number(key) !==
                      slot
                  )
                  .map(
                    ([, value]) =>
                      value
                  )
                  .filter(Boolean);

              return (
                <section
                  key={slot}
                  className="rounded-3xl border border-white/10 bg-[#07101d] p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                        Матч дня
                      </div>

                      <h2 className="mt-2 text-3xl font-black">
                        #{slot}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        saved
                          ? "border-green-400/20 bg-green-500/10 text-green-300"
                          : "border-white/10 bg-white/[0.03] text-white/30"
                      }`}
                    >
                      {saved
                        ? "Збережено"
                        : "Порожньо"}
                    </span>
                  </div>

                  <div className="mt-6">
                    <label className="text-sm font-bold">
                      Матч
                    </label>

                    <select
                      value={
                        selectedId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelected(
                          (
                            current
                          ) => ({
                            ...current,

                            [slot]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      disabled={
                        loading
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
                    >
                      <option value="">
                        Оберіть матч
                      </option>

                      {filteredMatches.map(
                        (
                          match
                        ) => (
                          <option
                            key={
                              match.id
                            }
                            value={
                              match.id
                            }
                            disabled={usedInOtherSlot.includes(
                              match.id
                            )}
                          >
                            {getTournamentName(
                              match
                            )}
                            {" • "}
                            {getParticipantName(
                              match.home_id,
                              match.participant_type
                            )}
                            {" — "}
                            {getParticipantName(
                              match.away_id,
                              match.participant_type
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* PREVIEW */}

                  {selectedMatch && (
                    <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] p-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        {getTournamentName(
                          selectedMatch
                        )}
                      </div>

                      <div className="mt-3 text-lg font-black">
                        {getParticipantName(
                          selectedMatch.home_id,
                          selectedMatch.participant_type
                        )}
                      </div>

                      <div className="my-2 text-sm font-black text-blue-400">
                        VS
                      </div>

                      <div className="text-lg font-black">
                        {getParticipantName(
                          selectedMatch.away_id,
                          selectedMatch.participant_type
                        )}
                      </div>

                      <div className="mt-4 text-xs leading-5 text-white/35">
                        {getStageName(
                          selectedMatch.stage
                        )}

                        {selectedMatch.group_name
                          ? ` • Група ${selectedMatch.group_name}`
                          : ""}

                        {selectedMatch.round
                          ? ` • №${selectedMatch.round}`
                          : ""}

                        {selectedMatch.leg
                          ? ` • матч ${selectedMatch.leg}`
                          : ""}
                      </div>

                      {selectedMatch.home_goals !==
                        null &&
                        selectedMatch.away_goals !==
                          null && (
                          <div className="mt-4 text-3xl font-black text-blue-300">
                            {
                              selectedMatch.home_goals
                            }
                            {" : "}
                            {
                              selectedMatch.away_goals
                            }
                          </div>
                        )}
                    </div>
                  )}

                  {/* BUTTONS */}

                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        void saveSlot(
                          slot
                        )
                      }
                      disabled={
                        savingSlot !==
                          null ||
                        !selectedId
                      }
                      className="rounded-xl bg-blue-500 px-5 py-3 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {savingSlot ===
                      slot
                        ? "Збереження..."
                        : `Зберегти #${slot}`}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void clearSlot(
                          slot
                        )
                      }
                      disabled={
                        savingSlot !==
                          null ||
                        !saved
                      }
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Очистити слот
                    </button>
                  </div>
                </section>
              );
            }
          )}
        </div>

        {loading && (
          <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-white/40">
            Завантаження матчів...
          </div>
        )}

        {message && (
          <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}