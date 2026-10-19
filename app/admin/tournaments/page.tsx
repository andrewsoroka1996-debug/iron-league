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
import { getCompetitionGroups } from "../../../data/competitions/get-competition-groups";
import { getCompetitionStages } from "../../../data/competitions/get-competition-stages";

import AssociationSeriesForm from "./AssociationSeriesForm";
import AssociationSeriesSummary from "./AssociationSeriesSummary";
import TwoLegSeriesForm from "./TwoLegSeriesForm";
import TwoLegSeriesSummary from "./TwoLegSeriesSummary";
import EuropeanFinalForm from "./EuropeanFinalForm";
import CoopTeamsForm from "./CoopTeamsForm";
import DivisionCupBracketForm from "./DivisionCupBracketForm";
import CoopSeriesForm from "./CoopSeriesForm";
import ResultRestoreButton from "../ResultRestoreButton";
import UnplayedMatchActions from "../UnplayedMatchActions";
type SeasonPlayerReplacement = {
  outgoing_player_id: string;
  incoming_player_id: string;
};

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

type AdminAssociation = {
  id: string;
  name: string;
  players: string[];
};

type AssociationSquadsResponse = {
  success?: boolean;

  season?: number;

  associations?: AdminAssociation[];

  error?: string;
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
    competitionId ===
      "champions-league" ||
    competitionId ===
      "europa-league" ||
    competitionId ===
      "conference-league"
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
  */

  if (
    competitionId ===
    "iron-coop-cup"
  ) {
    return true;
  }

  return false;
}

/*
  ========================================
  DATABASE COMPETITION ID
  ========================================

  У конфігурації сайту:
  season-qualification

  У таблиці matches:
  qualification
  ========================================
*/

function getDatabaseCompetitionId(
  competitionId: string
) {
  if (
    competitionId ===
    "season-qualification"
  ) {
    return "qualification";
  }

  if (
    /^division-[1-4]$/.test(
      competitionId
    )
  ) {
    return "division";
  }

  return competitionId;
}

export default function TournamentAdminPage() {
  /*
    ========================================
    ОСНОВНІ НАЛАШТУВАННЯ
    ========================================
  */

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    season,
    setSeason,
  ] =
    useState<SeasonNumber>(
      3
    );

  const [
    competitionId,
    setCompetitionId,
  ] = useState(
    seasonCompetitions[3][0]
      ?.id ?? ""
  );

  /*
    ========================================
    НОВИЙ МАТЧ
    ========================================
  */

  const [
    stage,
    setStage,
  ] = useState("");

  const [
    groupName,
    setGroupName,
  ] = useState("");

  const [
    round,
    setRound,
  ] = useState("");

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
    МАТЧІ
    ========================================
  */

  const [
    matches,
    setMatches,
  ] =
    useState<
      TournamentMatch[]
    >([]);

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

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    summaryRefreshKey,
    setSummaryRefreshKey,
  ] = useState(0);

  /*
    ========================================
    АСОЦІАЦІЇ
    ========================================
  */

  const [
    availableAssociations,
    setAvailableAssociations,
  ] =
    useState<
      AdminAssociation[]
    >([]);

  const [
    associationsLoading,
    setAssociationsLoading,
  ] = useState(false);

  const [
    associationsError,
    setAssociationsError,
  ] = useState("");

  /*
    ========================================
    ТУРНІРИ СЕЗОНУ
    ========================================
  */

  const competitions =
    seasonCompetitions[
      season
    ];

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
    competitionConfig
      ?.division ?? null;

  /*
    ========================================
    СТАДІЇ
    ========================================
  */

  const availableStages =
    useMemo(() => {
      if (
        !competitionId
      ) {
        return [];
      }

      return getCompetitionStages({
        season,

        competition:
          competitionId,
      });
    }, [
      season,
      competitionId,
    ]);

  useEffect(() => {
    if (
      availableStages.length ===
      0
    ) {
      setStage("");

      return;
    }

    const stageExists =
      availableStages.some(
        (
          stageOption
        ) =>
          stageOption.value ===
          stage
      );

    if (!stageExists) {
      setStage(
        availableStages[0]
          .value
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
      if (
        !competitionId
      ) {
        return [];
      }

      return getCompetitionGroups({
        season,

        competition:
          competitionId,
      });
    }, [
      season,
      competitionId,
    ]);

  const hasGroups =
    availableGroups.length >
    0;

  useEffect(() => {
    if (
      stage !== "group"
    ) {
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
    ТИПИ СТАДІЙ
    ========================================
  */

  const usesTwoLegs =
    isTwoLeggedCompetition(
      competitionId,
      stage
    );

  const isEuropeanFinal =
    isEuropeanCompetition(
      competitionId
    ) &&
    stage === "final";

  const isDivisionCup =
    competitionId ===
      "division-1-cup" ||
    competitionId ===
      "division-2-cup" ||
    competitionId ===
      "division-3-cup" ||
    competitionId ===
      "division-4-cup";
const [
  loadedPlayerReplacements,
  setLoadedPlayerReplacements,
] = useState<{
  season: number;
  password: string;
  replacements: SeasonPlayerReplacement[];
} | null>(null);

const [
  playerReplacementsError,
  setPlayerReplacementsError,
] = useState("");

useEffect(() => {
  if (!password) {
    return;
  }

  const controller = new AbortController();

  async function loadPlayerReplacements() {
    try {
      const response = await fetch(
        `/api/admin/player-replacement?season=${season}&division=1`,
        {
          headers: {
            "x-admin-password": password,
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.replacements)
      ) {
        throw new Error(
          result.error ??
            "Не вдалося завантажити заміни гравців"
        );
      }

      if (!controller.signal.aborted) {
        setLoadedPlayerReplacements({
          season,
          password,
          replacements: result.replacements,
        });

        setPlayerReplacementsError("");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadedPlayerReplacements(null);

        setPlayerReplacementsError(
          error instanceof Error
            ? error.message
            : "Помилка завантаження замін"
        );
      }
    }
  }

  void loadPlayerReplacements();

  return () => {
    controller.abort();
  };
}, [season, password]);
  /*
    ========================================
    ДОСТУПНІ ГРАВЦІ
    ========================================
  */

  const availablePlayerIds = useMemo(() => {
  if (
    !competitionId ||
    competitionId === "associations-cup" ||
    competitionId === "iron-coop-cup"
  ) {
    return [];
  }

  const replacementDataIsReady =
    !!password &&
    loadedPlayerReplacements?.season === season &&
    loadedPlayerReplacements?.password === password &&
    !playerReplacementsError;

  if (!replacementDataIsReady) {
    return [];
  }

  const basePlayerIds = getCompetitionPlayers({
    season,
    competition: competitionId,
    groupName:
      stage === "group"
        ? normalizedGroupName
        : null,
  });

  const replacementMap = new Map(
    loadedPlayerReplacements.replacements.map(
      (replacement) => [
        replacement.outgoing_player_id,
        replacement.incoming_player_id,
      ]
    )
  );

  const currentPlayerIds = basePlayerIds.map(
    (playerId) => {
      let currentId = playerId;
      const visited = new Set<string>();

      while (
        replacementMap.has(currentId) &&
        !visited.has(currentId)
      ) {
        visited.add(currentId);

        currentId =
          replacementMap.get(currentId)!;
      }

      return currentId;
    }
  );

  return [...new Set(currentPlayerIds)];
}, [
  season,
  competitionId,
  normalizedGroupName,
  stage,
  password,
  loadedPlayerReplacements,
  playerReplacementsError,
]);

  /*
    ========================================
    АСОЦІАЦІЇ
    ========================================
  */

  useEffect(() => {
    let cancelled =
      false;

    async function loadAssociations() {
      if (
        competitionId !==
        "associations-cup"
      ) {
        setAvailableAssociations(
          []
        );

        setAssociationsError(
          ""
        );

        setAssociationsLoading(
          false
        );

        return;
      }

      setAssociationsLoading(
        true
      );

      setAssociationsError(
        ""
      );

      try {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        const response =
          await fetch(
            `/api/admin/association-squads?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as
            AssociationSquadsResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setAvailableAssociations(
            []
          );

          setAssociationsError(
            result.error ??
              "Не вдалося завантажити склади Асоціацій"
          );

          return;
        }

        setAvailableAssociations(
          result.associations ??
            []
        );
      } catch {
        if (cancelled) {
          return;
        }

        setAvailableAssociations(
          []
        );

        setAssociationsError(
          "Помилка з'єднання при завантаженні Асоціацій"
        );
      } finally {
        if (!cancelled) {
          setAssociationsLoading(
            false
          );
        }
      }
    }

    void loadAssociations();

    return () => {
      cancelled = true;
    };
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
          player.id ===
          playerId
      )?.nickname ??
      playerId
    );
  }

  const [coopTeamNames, setCoopTeamNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!matches.some((match) => match.participant_type === "team")) {
      setCoopTeamNames({});
      return;
    }

    const controller = new AbortController();

    async function loadCoopTeamNames() {
      try {
        const response = await fetch(
          `/api/admin/coop-teams?season=${season}`,
          { cache: "no-store", signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Team names request failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          success?: boolean;
          teams?: { id: string; name: string }[];
        };

        if (data.success !== true || !Array.isArray(data.teams)) {
          throw new Error("Invalid coop teams response");
        }

        const names: Record<string, string> = {};
        for (const team of data.teams) {
          if (typeof team.id === "string" && typeof team.name === "string") {
            names[team.id] = team.name;
          }
        }

        if (!controller.signal.aborted) {
          setCoopTeamNames(names);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("COOP TEAM NAMES ERROR:", error);
        }
      }
    }

    void loadCoopTeamNames();
    return () => controller.abort();
  }, [season, matches]);

  function getParticipantName(
    id: string,
    type: string
  ) {
    if (
      type === "team"
    ) {
      return coopTeamNames[id] ?? id;
    }

    return getPlayerName(
      id
    );
  }

  /*
    ========================================
    ЗАВАНТАЖЕННЯ МАТЧІВ
    ========================================
  */

  const loadMatches =
    useCallback(async () => {
      if (
        !competitionId
      ) {
        setMatches([]);

        return;
      }

      setMatchesLoading(
        true
      );

      try {
        const params =
          new URLSearchParams();

        params.set(
          "season",
          String(season)
        );

        params.set(
          "competition",
          getDatabaseCompetitionId(
            competitionId
          )
        );

        if (
          division !== null
        ) {
          params.set(
            "division",
            String(division)
          );
        }

        const response =
          await fetch(
            `/api/admin/match?${params.toString()}`,
            {
              cache:
                "no-store",
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
          result.matches ??
            []
        );
      } catch {
        setMessage(
          "Помилка з'єднання із сервером"
        );
      } finally {
        setMatchesLoading(
          false
        );
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
    if (
      !selectedMatch
    ) {
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
          selectedMatch
            .home_goals
        )
      );

      setAwayGoals(
        String(
          selectedMatch
            .away_goals
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
    newSeason:
      SeasonNumber
  ) {
    setSeason(newSeason);

    const firstCompetition =
      seasonCompetitions[
        newSeason
      ][0];

    setCompetitionId(
      firstCompetition
        ?.id ?? ""
    );

    setStage("");
    setGroupName("");
    setRound("");
    setHomeId("");
    setAwayId("");
    setSelectedMatchId(
      ""
    );
    setMessage("");

    setSummaryRefreshKey(
      0
    );
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

    setSelectedMatchId(
      ""
    );

    setMessage("");

    setSummaryRefreshKey(
      0
    );
  }

  /*
    ========================================
    СТВОРЕННЯ ОДНОГО МАТЧУ
    ========================================
  */

  async function createMatch(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );

      return;
    }

    if (
      !competitionId
    ) {
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

                competition:
                  getDatabaseCompetitionId(
                    competitionId
                  ),

                division,

                stage,

                group_name:
                  stage ===
                  "group"
                    ? normalizedGroupName
                    : null,

                round:
                  round === ""
                    ? null
                    : Number(
                        round
                      ),

                leg: 1,

                participant_type:
                  "player",

                home_id:
                  homeId,

                away_id:
                  awayId,

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
    event:
      FormEvent<HTMLFormElement>
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
      parsedHomeGoals <
        0 ||
      parsedAwayGoals <
        0
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
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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

  /*
    ========================================
    CANCEL RESULT
    ========================================

    1. Preview перевіряє,
       чи можна безпечно
       скасувати результат.

    2. Якщо можна —
       просимо підтвердження.

    3. Revert API ще раз
       виконує shared safety check.
    ========================================
  */

  async function cancelResult() {
    if (!password) {
      setMessage(
        "Enter administrator password"
      );

      return;
    }

    if (!selectedMatch) {
      setMessage(
        "Select a match"
      );

      return;
    }

    if (
      selectedMatch.status !==
        "finished" ||
      selectedMatch.home_goals ===
        null ||
      selectedMatch.away_goals ===
        null
    ) {
      setMessage(
        "This match has no result to cancel"
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      /*
        ========================================
        PREVIEW
        ========================================
      */

      const previewResponse =
        await fetch(
          "/api/admin/match-result-revert-preview",
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

                match_id:
                  selectedMatch.id,
              }),
          }
        );

      const preview =
        await previewResponse.json();

      if (
        !previewResponse.ok ||
        !preview.can_revert
      ) {
        const blockerText =
          Array.isArray(
            preview.blockers
          ) &&
          preview.blockers.length >
            0
            ? preview.blockers.join(
                " | "
              )
            : "";

        setMessage(
          blockerText ||
            preview.error ||
            "This result cannot be cancelled"
        );

        return;
      }

      /*
        ========================================
        CONFIRMATION
        ========================================
      */

      const confirmed =
        window.confirm(
          [
            "Скасувати результат цього матчу?",
            "",
            `${getParticipantName(
              selectedMatch.home_id,
              selectedMatch.participant_type
            )} ${selectedMatch.home_goals} : ${selectedMatch.away_goals} ${getParticipantName(
              selectedMatch.away_id,
              selectedMatch.participant_type
            )}`,
            "",
            "Матч повернеться до статусу «Заплановано», а рахунок буде видалено.",
          ].join("\n")
        );

      if (!confirmed) {
        return;
      }

      /*
        ========================================
        REAL REVERT
        ========================================
      */

      const response =
        await fetch(
          "/api/admin/match-result-revert",
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

                match_id:
                  selectedMatch.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        const blockerText =
          Array.isArray(
            result.blockers
          ) &&
          result.blockers.length >
            0
            ? result.blockers.join(
                " | "
              )
            : "";

        setMessage(
          blockerText ||
            result.error ||
            "Не вдалося скасувати результат"
        );

        return;
      }

      setMessage(
        "✅ Результат успішно скасовано"
      );

      setHomeGoals("");
      setAwayGoals("");

      await loadMatches();

      setSummaryRefreshKey(
        (current) =>
          current + 1
      );
    } catch {
      setMessage(
        "Connection error"
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
              Керування
              турнірами
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
          Календарі та
          результати турнірів
          Iron League.
        </p>

        {/* SETTINGS */}

        <div className="mt-10 grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 lg:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-white/60">
              Пароль
              адміністратора
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
              onChange={(
                event
              ) =>
                changeSeason(
                  Number(
                    event.target
                      .value
                  ) as SeasonNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option
                value={1}
              >
                Сезон 1
              </option>

              <option
                value={2}
              >
                Сезон 2
              </option>

              <option
                value={3}
              >
                Сезон 3
              </option>

              <option
                value={4}
              >
                Сезон 4
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Турнір
            </label>

            <select
              value={
                competitionId
              }
              onChange={(
                event
              ) =>
                changeCompetition(
                  event.target
                    .value
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
                  Турніри ще не
                  налаштовані
                </option>
              ) : (
                competitions.map(
                  (
                    competition
                  ) => (
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

            {division !==
              null && (
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
                Кубок
                асоціацій
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Створити
                протистояння
              </h2>
            </div>

            <div>
              <label className="text-sm font-bold">
                Стадія
              </label>

              <select
                value={stage}
                onChange={(
                  event
                ) =>
                  setStage(
                    event.target
                      .value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
              >
                {availableStages.map(
                  (
                    stageOption
                  ) => (
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

            {associationsLoading && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/40">
                Завантаження
                складів
                Асоціацій...
              </div>
            )}

            {associationsError && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {
                  associationsError
                }
              </div>
            )}

            {!associationsLoading &&
              !associationsError && (
                <AssociationSeriesForm
                  password={
                    password
                  }
                  season={
                    season
                  }
                  stage={
                    stage
                  }
                  associations={
                    availableAssociations
                  }
                  onCreated={() => {
                    void loadMatches();
                  }}
                />
              )}
          </div>
        )}

        {/* IRON CO-OP */}

        {competitionId ===
          "iron-coop-cup" && (
          <div className="mt-8 space-y-8">
            <div className="space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Iron Co-op Cup
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Формування
                  команд
                </h2>

                <p className="mt-4 max-w-2xl leading-7 text-white/40">
                  Сформуй 16
                  команд по два
                  гравці. Один
                  гравець може
                  входити лише
                  до однієї
                  команди цього
                  сезону.
                </p>
              </div>

              <CoopTeamsForm
                password={
                  password
                }
                season={
                  season
                }
              />
            </div>

            <div className="space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Iron Co-op Cup
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Турнірна
                  сітка
                </h2>

                <p className="mt-4 max-w-2xl leading-7 text-white/40">
                  1/8 фіналу
                  формується
                  вручну.
                  Наступні
                  стадії
                  отримують
                  переможців
                  автоматично
                  відповідно
                  до турнірної
                  сітки.
                </p>
              </div>

              <div>
                <label className="text-sm font-bold">
                  Стадія
                </label>

                <select
                  value={stage}
                  onChange={(
                    event
                  ) =>
                    setStage(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  {availableStages.map(
                    (
                      stageOption
                    ) => (
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

              <CoopSeriesForm
                password={
                  password
                }
                season={
                  season
                }
                stage={
                  stage
                }
                onCreated={() => {
                  void loadMatches();
                }}
              />
            </div>
          </div>
        )}

        {/* DIVISION CUP */}

        {isDivisionCup && (
          <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Кубок дивізіону
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Турнірна сітка
              </h2>
            </div>

            <div>
              <label className="text-sm font-bold">
                Стадія
              </label>

              <select
                value={stage}
                onChange={(
                  event
                ) => {
                  setStage(
                    event.target
                      .value
                  );

                  setSelectedMatchId(
                    ""
                  );

                  setMessage(
                    ""
                  );
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
              >
                {availableStages.map(
                  (
                    stageOption
                  ) => (
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

            <DivisionCupBracketForm
              password={
                password
              }
              season={
                season
              }
              competition={
                competitionId
              }
              stage={
                stage
              }
              playerIds={
                availablePlayerIds
              }
              onCreated={() => {
                void loadMatches();
              }}
            />
          </div>
        )}

        {/* EUROPEAN TWO LEG SERIES */}

        {competitionId &&
          competitionId !==
            "associations-cup" &&
          competitionId !==
            "iron-coop-cup" &&
          usesTwoLegs &&
          !isEuropeanFinal &&
          !isDivisionCup && (
            <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Плей-оф
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Створити
                  двоматчеве
                  протистояння
                </h2>
              </div>

              <div>
                <label className="text-sm font-bold">
                  Стадія
                </label>

                <select
                  value={stage}
                  onChange={(
                    event
                  ) =>
                    setStage(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  {availableStages.map(
                    (
                      stageOption
                    ) => (
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
                password={
                  password
                }
                season={
                  season
                }
                competition={
                  competitionId
                }
                stage={
                  stage
                }
                playerIds={
                  availablePlayerIds
                }
                onCreated={() => {
                  void loadMatches();
                }}
              />
            </div>
          )}

        {/* EUROPEAN FINAL */}

        {isEuropeanFinal && (
          <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Фінал
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Створити
                фінальний матч
              </h2>
            </div>

            <EuropeanFinalForm
              password={
                password
              }
              season={
                season
              }
              competition={
                competitionId
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
          !usesTwoLegs &&
          !isEuropeanFinal &&
          !isDivisionCup && (
            <form
              onSubmit={
                createMatch
              }
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

              <div>
                <label className="text-sm font-bold">
                  Стадія
                </label>

                <select
                  value={stage}
                  onChange={(
                    event
                  ) => {
                    setStage(
                      event.target
                        .value
                    );

                    setGroupName(
                      ""
                    );

                    setHomeId(
                      ""
                    );

                    setAwayId(
                      ""
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                >
                  {availableStages.map(
                    (
                      stageOption
                    ) => (
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

              {stage ===
                "group" &&
                hasGroups && (
                  <div>
                    <label className="text-sm font-bold">
                      Група
                    </label>

                    <select
                      value={
                        groupName
                      }
                      onChange={(
                        event
                      ) => {
                        setGroupName(
                          event.target
                            .value
                        );

                        setHomeId(
                          ""
                        );

                        setAwayId(
                          ""
                        );
                      }}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <option value="">
                        Оберіть
                        групу
                      </option>

                      {availableGroups.map(
                        (
                          group
                        ) => (
                          <option
                            key={
                              group
                            }
                            value={
                              group
                            }
                          >
                            Група{" "}
                            {
                              group
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

              <div>
                <label className="text-sm font-bold">
                  Тур
                </label>

                <input
                  type="number"
                  min="1"
                  value={round}
                  onChange={(
                    event
                  ) =>
                    setRound(
                      event.target
                        .value
                    )
                  }
                  placeholder="Не обов'язково"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                />
              </div>

              {stage ===
                "group" &&
              hasGroups &&
              !groupName ? (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                  Спочатку
                  оберіть групу.
                </div>
              ) : availablePlayerIds.length ===
                0 ? (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-yellow-200">
                  Для цієї
                  стадії немає
                  доступних
                  гравців.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold">
                      Господар
                    </label>

                    <select
                      value={
                        homeId
                      }
                      onChange={(
                        event
                      ) =>
                        setHomeId(
                          event.target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <option value="">
                        Оберіть
                        гравця
                      </option>

                      {availablePlayerIds.map(
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
                      value={
                        awayId
                      }
                      onChange={(
                        event
                      ) =>
                        setAwayId(
                          event.target
                            .value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <option value="">
                        Оберіть
                        гравця
                      </option>

                      {availablePlayerIds.map(
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

                {/* MATCH LIST */}

        {competitionId && (
          <div className="mt-8 min-w-0 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:rounded-3xl sm:p-7">

            <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">

              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Supabase
                </div>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Створені матчі
                </h2>
              </div>

              <div className="whitespace-nowrap text-sm font-medium text-white/45">
                {matches.length}{" "}
{matches.length % 100 >= 11 && matches.length % 100 <= 14
  ? "матчів"
  : matches.length % 10 === 1
    ? "матч"
    : [2, 3, 4].includes(matches.length % 10)
      ? "матчі"
      : "матчів"}
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
                турніру ще
                немає.
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                {matches.map(
                  (match) => (
                    <button
                      type="button"
                      key={
                        match.id
                      }
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
                                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">

                        {/* УЧАСНИКИ ТА СТАДІЯ */}
                        <div className="min-w-0">

                          <div className="text-sm font-bold leading-5 [overflow-wrap:anywhere] sm:text-base">
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

                          <div className="mt-2 text-xs leading-5 text-white/40 [overflow-wrap:anywhere]">
                            {match.stage && (
                              <>
                                Стадія:{" "}
                                {match.stage === "qualification"
  ? "Кваліфікація"
  : match.stage === "quarterfinal"
    ? "Чвертьфінал"
    : match.stage === "semifinal"
      ? "Півфінал"
      : match.stage === "final"
        ? "Фінал"
        : match.stage}
                              </>
                            )}

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

                        {/* РАХУНОК */}
                        <div className="shrink-0 whitespace-nowrap text-right text-xs font-black tabular-nums text-white sm:text-base">
                          {match.status === "finished" &&
                          match.home_goals !== null &&
                          match.away_goals !== null
                            ? `${match.home_goals} : ${match.away_goals}`
                            : match.status === "closed_unplayed"
                              ? "Без результату"
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
            onSubmit={
              saveResult
            }
            className="mt-6 min-w-0 rounded-2xl border border-white/10 bg-[#07101d] p-4 sm:mt-8 sm:rounded-3xl sm:p-7"
          >
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Результат
            </div>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
  Внести рахунок
</h2>

                        <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:mt-8 sm:gap-4">

              {/* ГОСПОДАР */}
              <div className="min-w-0">
                <div className="mb-3 min-w-0 text-center text-xs font-bold leading-5 [overflow-wrap:anywhere] sm:text-base">
                  {getParticipantName(
                    selectedMatch.home_id,
                    selectedMatch.participant_type
                  )}
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  aria-label="Голи господаря"
                  value={homeGoals}
                  onChange={(event) =>
                    setHomeGoals(event.target.value)
                  }
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#030711] px-2 py-3 text-center text-2xl font-black sm:px-4 sm:py-4 sm:text-3xl"
                />
              </div>

              {/* РОЗДІЛЬНИК */}
              <div className="pb-3 text-xl font-black text-white/30 sm:pb-4 sm:text-2xl">
                :
              </div>

              {/* ГІСТЬ */}
              <div className="min-w-0">
                <div className="mb-3 min-w-0 text-center text-xs font-bold leading-5 [overflow-wrap:anywhere] sm:text-base">
                  {getParticipantName(
                    selectedMatch.away_id,
                    selectedMatch.participant_type
                  )}
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  aria-label="Голи гостя"
                  value={awayGoals}
                  onChange={(event) =>
                    setAwayGoals(event.target.value)
                  }
                  className="w-full min-w-0 rounded-xl border border-white/10 bg-[#030711] px-2 py-3 text-center text-2xl font-black sm:px-4 sm:py-4 sm:text-3xl"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={
                loading
              }
              className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:opacity-40"
            >
              {loading
                ? "Збереження..."
                : selectedMatch.status ===
                    "finished"
                  ? "Оновити результат"
                  : "Зберегти результат"}
            </button>

            {selectedMatch.status ===
              "finished" &&
              selectedMatch.home_goals !==
                null &&
              selectedMatch.away_goals !==
                null && (
                <button
                  type="button"
                  onClick={
                    cancelResult
                  }
                  disabled={
                    loading
                  }
                  className="mt-3 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                >
                  {loading
  ? "Обробка..."
  : "Скасувати результат"}
                </button>
              )}

              <div className="mt-3">
  <UnplayedMatchActions
    password={password}
    match={selectedMatch ?? null}
    disabled={loading}
    onMessage={setMessage}
    onUpdated={async () => {
      await loadMatches();

      setSummaryRefreshKey(
        (current) => current + 1
      );
    }}
  />
</div>
              <ResultRestoreButton
  password={
    password
  }
  match={
    selectedMatch
  }
  disabled={
    loading
  }
  onMessage={
    setMessage
  }
  onRestored={
    async () => {
      await loadMatches();

      setSummaryRefreshKey(
        (current) =>
          current + 1
      );
    }
  }
/>
          </form>
        )}

        {/* ASSOCIATION SUMMARY */}

        {competitionId ===
          "associations-cup" &&
          selectedMatch
            ?.series_id && (
            <div className="mt-8">
              <AssociationSeriesSummary
                season={
                  season
                }
                seriesId={
                  selectedMatch.series_id
                }
                password={
                  password
                }
                refreshKey={
                  summaryRefreshKey
                }
                onTiebreakCreated={() => {
                  void loadMatches();

                  setSummaryRefreshKey(
                    (
                      current
                    ) =>
                      current +
                      1
                  );
                }}
              />
            </div>
          )}

        {/* TWO LEG SERIES SUMMARY */}

        {isEuropeanCompetition(
          competitionId
        ) &&
          selectedMatch
            ?.series_id &&
          !selectedMatch.is_tiebreak && (
            <div className="mt-8">
              <TwoLegSeriesSummary
                season={
                  season
                }
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