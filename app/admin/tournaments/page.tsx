"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { players } from "../../../data/players";

import {
  seasonCompetitions,
  type SeasonNumber,
} from "../../../data/competitions/season-competitions";

import { getCompetitionPlayers } from "../../../data/competitions/get-competition-players";
import { getCompetitionAssociations } from "../../../data/competitions/get-competition-associations";
import { getCompetitionGroups } from "../../../data/competitions/get-competition-groups";
import { getCompetitionStages } from "../../../data/competitions/get-competition-stages";

import AssociationSeriesForm from "./AssociationSeriesForm";
import AssociationSeriesSummary from "./AssociationSeriesSummary";
import TwoLegSeriesForm from "./TwoLegSeriesForm";
import TwoLegSeriesSummary from "./TwoLegSeriesSummary";

type TournamentMatch = {
  id: string;

  season: number;
  competition: string;

  division: number | null;

  round: number | null;

  stage: string | null;
  group_name: string | null;

  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;

  is_tiebreak: boolean;
};

/*
  ========================================
  ЧИ ЄВРОКУБОК
  ========================================
*/

function isEuropeanCompetition(
  competitionId: string
) {
  return (
    competitionId === "champions-league" ||
    competitionId === "europa-league" ||
    competitionId === "conference-league"
  );
}

/*
  ========================================
  ДВОМАТЧЕВІ СТАДІЇ ЄВРОКУБКІВ
  ========================================

  1/8
  1/4
  1/2

  Фінал = 1 матч.
*/

function isTwoLeggedCompetition(
  competitionId: string,
  stage: string
) {
  const isTwoLeggedStage =
    stage === "round-of-16" ||
    stage === "quarterfinal" ||
    stage === "semifinal";

  if (
    isEuropeanCompetition(
      competitionId
    ) &&
    isTwoLeggedStage
  ) {
    return true;
  }

  /*
    Iron Co-op Cup теж
    двоматчевий на всіх стадіях,
    включно з фіналом.

    Саму форму підключимо,
    коли будуть сформовані
    16 команд.
  */

  if (
    competitionId === "iron-coop-cup"
  ) {
    return true;
  }

  return false;
}

export default function TournamentAdminPage() {
  /*
    ========================================
    ОСНОВНІ НАЛАШТУВАННЯ
    ========================================
  */

  const [password, setPassword] =
    useState("");

  const [season, setSeason] =
    useState<SeasonNumber>(3);

  const [
    competitionId,
    setCompetitionId,
  ] = useState(
    seasonCompetitions[3][0]?.id ?? ""
  );

  /*
    ========================================
    НОВИЙ МАТЧ
    ========================================
  */

  const [stage, setStage] =
    useState("");

  const [groupName, setGroupName] =
    useState("");

  const [round, setRound] =
    useState("");

  const [homeId, setHomeId] =
    useState("");

  const [awayId, setAwayId] =
    useState("");

  /*
    ========================================
    МАТЧІ
    ========================================
  */

  const [
    matches,
    setMatches,
  ] = useState<TournamentMatch[]>([]);

  const [
    matchesLoading,
    setMatchesLoading,
  ] = useState(false);

  const [
    selectedMatchId,
    setSelectedMatchId,
  ] = useState("");

  /*
    ========================================
    РАХУНОК
    ========================================
  */

  const [
    homeGoals,
    setHomeGoals,
  ] = useState("");

  const [
    awayGoals,
    setAwayGoals,
  ] = useState("");

  /*
    ========================================
    СТАН
    ========================================
  */

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    summaryRefreshKey,
    setSummaryRefreshKey,
  ] = useState(0);

  /*
    ========================================
    ТУРНІРИ СЕЗОНУ
    ========================================
  */

  const competitions =
    seasonCompetitions[season];

  const competitionConfig =
    useMemo(() => {
      return competitions.find(
        (competition) =>
          competition.id ===
          competitionId
      );
    }, [
      competitions,
      competitionId,
    ]);

  const division =
    competitionConfig?.division ?? null;

  /*
    ========================================
    СТАДІЇ
    ========================================
  */

  const availableStages =
    useMemo(() => {
      if (!competitionId) {
        return [];
      }

      return getCompetitionStages({
        season,
        competition: competitionId,
      });
    }, [
      season,
      competitionId,
    ]);

  useEffect(() => {
    if (
      availableStages.length === 0
    ) {
      setStage("");

      return;
    }

    const stageExists =
      availableStages.some(
        (stageOption) =>
          stageOption.value === stage
      );

    if (!stageExists) {
      setStage(
        availableStages[0].value
      );
    }
  }, [
    availableStages,
    stage,
  ]);

  /*
    ========================================
    ГРУПИ
    ========================================
  */

  const availableGroups =
    useMemo(() => {
      if (!competitionId) {
        return [];
      }

      return getCompetitionGroups({
        season,
        competition: competitionId,
      });
    }, [
      season,
      competitionId,
    ]);

  const hasGroups =
    availableGroups.length > 0;

  useEffect(() => {
    if (stage !== "group") {
      setGroupName("");
    }
  }, [stage]);

  useEffect(() => {
    if (
      groupName &&
      !availableGroups.includes(
        groupName
      )
    ) {
      setGroupName("");
    }
  }, [
    availableGroups,
    groupName,
  ]);

  const normalizedGroupName =
    groupName || null;

  /*
    ========================================
    ЧИ ПОТРІБНА ДВОМАТЧЕВА ФОРМА
    ========================================
  */

  const usesTwoLegs =
    isTwoLeggedCompetition(
      competitionId,
      stage
    );

  /*
    ========================================
    ДОСТУПНІ ГРАВЦІ
    ========================================
  */

  const availablePlayerIds =
    useMemo(() => {
      if (
        !competitionId ||
        competitionId ===
          "associations-cup" ||
        competitionId ===
          "iron-coop-cup"
      ) {
        return [];
      }

      return getCompetitionPlayers({
        season,

        competition:
          competitionId,

        groupName:
          stage === "group"
            ? normalizedGroupName
            : null,
      });
    }, [
      season,
      competitionId,
      normalizedGroupName,
      stage,
    ]);

  /*
    ========================================
    АСОЦІАЦІЇ
    ========================================
  */

  const availableAssociations =
    useMemo(() => {
      if (
        competitionId !==
        "associations-cup"
      ) {
        return [];
      }

      return getCompetitionAssociations({
        season,
        competition:
          "associations-cup",
      });
    }, [
      season,
      competitionId,
    ]);

  /*
    ========================================
    ОЧИЩЕННЯ НЕВІРНИХ ГРАВЦІВ
    ========================================
  */

  useEffect(() => {
    if (
      competitionId ===
        "associations-cup" ||
      competitionId ===
        "iron-coop-cup"
    ) {
      return;
    }

    if (
      homeId &&
      !availablePlayerIds.includes(
        homeId
      )
    ) {
      setHomeId("");
    }

    if (
      awayId &&
      !availablePlayerIds.includes(
        awayId
      )
    ) {
      setAwayId("");
    }
  }, [
    availablePlayerIds,
    homeId,
    awayId,
    competitionId,
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

  function getParticipantName(
    id: string,
    type: string
  ) {
    if (type === "team") {
      return id;
    }

    return getPlayerName(id);
  }

  /*
    ========================================
    ЗАВАНТАЖЕННЯ МАТЧІВ
    ========================================
  */

  const loadMatches =
    useCallback(async () => {
      if (!competitionId) {
        setMatches([]);

        return;
      }

      setMatchesLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        params.set(
          "competition",
          competitionId
        );

        if (division !== null) {
          params.set(
            "division",
            String(division)
          );
        }

        const response =
          await fetch(
            `/api/admin/match?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          setMessage(
            result.error ??
              "Не вдалося завантажити матчі"
          );

          return;
        }

        setMatches(
          result.matches ?? []
        );
      } catch {
        setMessage(
          "Помилка з'єднання із сервером"
        );
      } finally {
        setMatchesLoading(false);
      }
    }, [
      season,
      competitionId,
      division,
    ]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  /*
    ========================================
    ОБРАНИЙ МАТЧ
    ========================================
  */

  const selectedMatch =
    useMemo(() => {
      return matches.find(
        (match) =>
          match.id ===
          selectedMatchId
      );
    }, [
      matches,
      selectedMatchId,
    ]);

  /*
    ========================================
    РАХУНОК ОБРАНОГО МАТЧУ
    ========================================
  */

  useEffect(() => {
    if (!selectedMatch) {
      setHomeGoals("");
      setAwayGoals("");

      return;
    }

    if (
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
    ========================================
    ЗМІНА СЕЗОНУ
    ========================================
  */

  function changeSeason(
    newSeason: SeasonNumber
  ) {
    setSeason(newSeason);

    const firstCompetition =
      seasonCompetitions[
        newSeason
      ][0];

    setCompetitionId(
      firstCompetition?.id ?? ""
    );

    setStage("");
    setGroupName("");
    setRound("");

    setHomeId("");
    setAwayId("");

    setSelectedMatchId("");

    setMessage("");

    setSummaryRefreshKey(0);
  }

  /*
    ========================================
    ЗМІНА ТУРНІРУ
    ========================================
  */

  function changeCompetition(
    newCompetitionId: string
  ) {
    setCompetitionId(
      newCompetitionId
    );

    setStage("");
    setGroupName("");
    setRound("");

    setHomeId("");
    setAwayId("");

    setSelectedMatchId("");

    setMessage("");

    setSummaryRefreshKey(0);
  }

  /*
    ========================================
    СТВОРЕННЯ ОДНОГО МАТЧУ
    ========================================

    Використовується для:

    - дивізіонів
    - кваліфікації
    - груп єврокубків
    - фіналу ЛЧ / ЛЄ / ЛК
    - кубків дивізіонів
    - Суперкубка
  */

  async function createMatch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (!competitionId) {
      setMessage(
        "Оберіть турнір"
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
      stage === "group" &&
      hasGroups &&
      !groupName
    ) {
      setMessage(
        "Оберіть групу"
      );

      return;
    }

    if (
      !homeId ||
      !awayId
    ) {
      setMessage(
        "Оберіть обох гравців"
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

              competition:
                competitionId,

              division,

              stage,

              group_name:
                stage === "group"
                  ? normalizedGroupName
                  : null,

              round:
                round === ""
                  ? null
                  : Number(round),

              /*
                Усі матчі,
                створені через цю форму,
                одноматчеві.
              */

              leg: 1,

              participant_type:
                "player",

              home_id:
                homeId,

              away_id:
                awayId,

              series_id: null,

              series_home_id: null,

              series_away_id: null,

              is_tiebreak: false,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити матч"
        );

        return;
      }

      setMessage(
        "✅ Матч створено"
      );

      setHomeId("");
      setAwayId("");

      await loadMatches();
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
    ЗБЕРЕЖЕННЯ РЕЗУЛЬТАТУ
    ========================================
  */

  async function saveResult(
    event: FormEvent<HTMLFormElement>
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

    const parsedHomeGoals =
      Number(homeGoals);

    const parsedAwayGoals =
      Number(awayGoals);

    if (
      !Number.isInteger(
        parsedHomeGoals
      ) ||
      !Number.isInteger(
        parsedAwayGoals
      ) ||
      parsedHomeGoals < 0 ||
      parsedAwayGoals < 0
    ) {
      setMessage(
        "Невірно введено рахунок"
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/match",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              password,

              match_id:
                selectedMatch.id,

              home_goals:
                parsedHomeGoals,

              away_goals:
                parsedAwayGoals,
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

      await loadMatches();

      setSummaryRefreshKey(
        (current) =>
          current + 1
      );
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
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
              Керування турнірами
            </div>
          </div>

          <div className="flex gap-4">
            <a
              href="/admin"
              className="font-bold text-blue-300"
            >
              ← Адмінка
            </a>

            <a
              href="/"
              className="font-bold text-white/40"
            >
              На сайт
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Universal Admin
        </div>

        <h1 className="mt-3 text-4xl font-black">
          Турнірні матчі
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/40">
          Календарі та результати
          турнірів Iron League.
        </p>

        {/* SETTINGS */}

        <div className="mt-10 grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 lg:grid-cols-3">
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
              Турнір
            </label>

            <select
              value={competitionId}
              onChange={(event) =>
                changeCompetition(
                  event.target.value
                )
              }
              disabled={
                competitions.length ===
                0
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 disabled:opacity-40"
            >
              {competitions.length ===
              0 ? (
                <option value="">
                  Турніри ще не налаштовані
                </option>
              ) : (
                competitions.map(
                  (competition) => (
                    <option
                      key={
                        competition.id
                      }
                      value={
                        competition.id
                      }
                    >
                      {
                        competition.name
                      }
                    </option>
                  )
                )
              )}
            </select>
          </div>
        </div>

        {/* SELECTED */}

        {competitionConfig && (
          <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            Обрано:{" "}
            <b>
              {
                competitionConfig.name
              }
            </b>

            {division !== null && (
              <>
                {" "}
                • Дивізіон{" "}
                {division}
              </>
            )}
          </div>
        )}

        {/* ASSOCIATIONS CUP */}

        {competitionId ===
          "associations-cup" && (
          <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Кубок асоціацій
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Створити протистояння
              </h2>
            </div>

            <div>
              <label className="text-sm font-bold">
                Стадія
              </label>

              <select
                value={stage}
                onChange={(event) =>
                  setStage(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
              >
                {availableStages.map(
                  (stageOption) => (
                    <option
                      key={
                        stageOption.value
                      }
                      value={
                        stageOption.value
                      }
                    >
                      {
                        stageOption.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <AssociationSeriesForm
              password={password}
              season={season}
              stage={stage}
              associations={
                availableAssociations
              }
              onCreated={() => {
                void loadMatches();
              }}
            />
          </div>
        )}

        {/* IRON CO-OP */}

        {competitionId ===
          "iron-coop-cup" && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Iron Co-op Cup
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Команди ще не сформовані
            </h2>

            <p className="mt-4 leading-7 text-white/40">
              Формат уже визначений:
              16 команд, по 2 гравці,
              двоматчевий плей-оф
              включно з фіналом.
            </p>
          </div>
        )}

        {/* EUROPEAN TWO LEG SERIES */}

        {competitionId &&
          competitionId !==
            "associations-cup" &&
          competitionId !==
            "iron-coop-cup" &&
          usesTwoLegs && (
            <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Плей-оф
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Створити двоматчеве протистояння
                </h2>
              </div>

              <div>
                <label className="text-sm font-bold">
                  Стадія
                </label>

                <select
                  value={stage}
                  onChange={(event) =>
                    setStage(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  {availableStages.map(
                    (stageOption) => (
                      <option
                        key={
                          stageOption.value
                        }
                        value={
                          stageOption.value
                        }
                      >
                        {
                          stageOption.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <TwoLegSeriesForm
                password={password}
                season={season}
                competition={
                  competitionId
                }
                stage={stage}
                playerIds={
                  availablePlayerIds
                }
                onCreated={() => {
                  void loadMatches();
                }}
              />
            </div>
          )}

        {/* REGULAR MATCH */}

        {competitionId &&
          competitionId !==
            "associations-cup" &&
          competitionId !==
            "iron-coop-cup" &&
          !usesTwoLegs && (
            <form
              onSubmit={createMatch}
              className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Календар
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Створити матч
                </h2>
              </div>

              {/* STAGE */}

              <div>
                <label className="text-sm font-bold">
                  Стадія
                </label>

                <select
                  value={stage}
                  onChange={(event) => {
                    setStage(
                      event.target.value
                    );

                    setGroupName("");

                    setHomeId("");
                    setAwayId("");
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  {availableStages.map(
                    (stageOption) => (
                      <option
                        key={
                          stageOption.value
                        }
                        value={
                          stageOption.value
                        }
                      >
                        {
                          stageOption.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* GROUP */}

              {stage === "group" &&
                hasGroups && (
                  <div>
                    <label className="text-sm font-bold">
                      Група
                    </label>

                    <select
                      value={
                        groupName
                      }
                      onChange={(event) => {
                        setGroupName(
                          event.target.value
                        );

                        setHomeId("");
                        setAwayId("");
                      }}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <option value="">
                        Оберіть групу
                      </option>

                      {availableGroups.map(
                        (group) => (
                          <option
                            key={group}
                            value={group}
                          >
                            Група {group}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

              {/* ROUND */}

              <div>
                <label className="text-sm font-bold">
                  Тур
                </label>

                <input
                  type="number"
                  min="1"
                  value={round}
                  onChange={(event) =>
                    setRound(
                      event.target.value
                    )
                  }
                  placeholder="Не обов'язково"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                />
              </div>

              {/* PLAYERS */}

              {stage === "group" &&
              hasGroups &&
              !groupName ? (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                  Спочатку оберіть
                  групу.
                </div>
              ) : availablePlayerIds.length ===
                0 ? (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                  Для цієї стадії
                  немає доступних
                  гравців.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold">
                      Господар
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

                      {availablePlayerIds.map(
                        (playerId) => (
                          <option
                            key={
                              playerId
                            }
                            value={
                              playerId
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
                      Гість
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

                      {availablePlayerIds.map(
                        (playerId) => (
                          <option
                            key={
                              playerId
                            }
                            value={
                              playerId
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
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !stage ||
                  !homeId ||
                  !awayId
                }
                className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "Створення..."
                  : "Створити матч"}
              </button>
            </form>
          )}

        {/* MATCH LIST */}

        {competitionId && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Supabase
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Створені матчі
                </h2>
              </div>

              <div className="text-sm text-white/35">
                {matches.length} матчів
              </div>
            </div>

            {matchesLoading ? (
              <div className="mt-7 text-white/40">
                Завантаження...
              </div>
            ) : matches.length ===
              0 ? (
              <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-white/40">
                Матчів цього
                турніру ще немає.
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                {matches.map(
                  (match) => (
                    <button
                      type="button"
                      key={match.id}
                      onClick={() =>
                        setSelectedMatchId(
                          match.id
                        )
                      }
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedMatchId ===
                        match.id
                          ? "border-blue-400/50 bg-blue-500/10"
                          : "border-white/10 bg-white/[0.025] hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="font-bold">
                            {getParticipantName(
                              match.home_id,
                              match.participant_type
                            )}

                            {" — "}

                            {getParticipantName(
                              match.away_id,
                              match.participant_type
                            )}
                          </div>

                          <div className="mt-2 text-xs text-white/35">
                            {match.stage &&
                              `Стадія: ${match.stage}`}

                            {match.group_name &&
                              ` • Група ${match.group_name}`}

                            {match.round &&
                              ` • № ${match.round}`}

                            {match.leg === 1 &&
                              match.series_id &&
                              " • 1-й матч"}

                            {match.leg === 2 &&
                              " • Матч-відповідь"}

                            {match.is_tiebreak &&
                              " • Тай-брейк"}
                          </div>
                        </div>

                        <div className="font-black">
                          {match.status ===
                          "finished"
                            ? `${match.home_goals} : ${match.away_goals}`
                            : "VS"}
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* RESULT */}

        {selectedMatch && (
          <form
            onSubmit={saveResult}
            className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7"
          >
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Результат
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Внести рахунок
            </h2>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
              <div>
                <div className="mb-3 text-center font-bold">
                  {getParticipantName(
                    selectedMatch.home_id,
                    selectedMatch.participant_type
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

              <div className="pb-4 text-2xl font-black text-white/25">
                :
              </div>

              <div>
                <div className="mb-3 text-center font-bold">
                  {getParticipantName(
                    selectedMatch.away_id,
                    selectedMatch.participant_type
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

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:opacity-40"
            >
              {loading
                ? "Збереження..."
                : selectedMatch.status ===
                    "finished"
                  ? "Оновити результат"
                  : "Зберегти результат"}
            </button>
          </form>
        )}

        {/* ASSOCIATION SUMMARY */}

        {competitionId ===
          "associations-cup" &&
          selectedMatch?.series_id && (
            <div className="mt-8">
              <AssociationSeriesSummary
                season={season}
                seriesId={
                  selectedMatch.series_id
                }
                password={password}
                refreshKey={
                  summaryRefreshKey
                }
                onTiebreakCreated={() => {
                  void loadMatches();

                  setSummaryRefreshKey(
                    (current) =>
                      current + 1
                  );
                }}
              />
            </div>
          )}

          {/* TWO LEG SERIES SUMMARY */}

{isEuropeanCompetition(competitionId) &&
  selectedMatch?.series_id &&
  !selectedMatch.is_tiebreak && (
    <div className="mt-8">
      <TwoLegSeriesSummary
        season={season}
        seriesId={
          selectedMatch.series_id
        }
        refreshKey={
          summaryRefreshKey
        }
      />
    </div>
  )}

        {/* MESSAGE */}

        {message && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}