"use client";

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { players } from "../../../data/players";

type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type DivisionNumber =
  | 1
  | 2
  | 3
  | 4;

type PlayerReplacement = {
  id: string;

  season: number;
  division: number;

  outgoing_player_id: string;
  incoming_player_id: string;

  inherit_standings: boolean;

  coop_removed_team_id:
    | string
    | null;

  coop_removed_slot:
    | number
    | null;

  created_at: string;
};

type StandingsRow = {
  playerId: string;

  played: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  goalDifference: number;

  points: number;
};

type CompetitionSummary = {
  competition: string;
  matches: number;
};

type PreviewMatch = {
  id: string;

  competition: string;

  division:
    | number
    | null;

  round:
    | number
    | null;

  stage:
    | string
    | null;

  group_name:
    | string
    | null;

  status: string;

  before: {
    home_id: string;
    away_id: string;

    home_goals:
      | number
      | null;

    away_goals:
      | number
      | null;
  };

  after: {
    home_id: string;
    away_id: string;

    home_goals:
      | number
      | null;

    away_goals:
      | number
      | null;
  };
};

type HistoricalMatch = {
  id: string;

  competition: string;

  division:
    | number
    | null;

  round:
    | number
    | null;

  stage:
    | string
    | null;

  group_name:
    | string
    | null;

  home_id: string;
  away_id: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;
};

type CoopRemoval = {
  required: boolean;

  team_id:
    | string
    | null;

  team_name:
    | string
    | null;

  slot:
    | 1
    | 2
    | null;

  teammate_id:
    | string
    | null;

  teammate_nickname:
    | string
    | null;

  incoming_player_added: boolean;

  action:
    | string
    | null;
};

type LoadResponse = {
  success?: boolean;

  season?: number;
  division?: number;

  base_player_ids?: string[];
  current_player_ids?: string[];

  eligible_incoming_player_ids?: string[];

  replacements?: PlayerReplacement[];

  error?: string;
};

type PreviewResponse = {
  success?: boolean;

  preview?: boolean;

  replacement_mode?: string;

  season?: number;
  division?: number;

  outgoing_player?: {
    id: string;
    nickname: string;
  };

  incoming_player?: {
    id: string;
    nickname: string;
  };

  affected_future_matches?: number;

  affected_unfinished_matches?: number;

  affected_by_competition?:
    CompetitionSummary[];

  affected_match_ids?: string[];

  affected_matches?:
    PreviewMatch[];

  finished_historical_matches?:
    HistoricalMatch[];

  standings_before?:
    | StandingsRow
    | null;

  standings_after?:
    | StandingsRow
    | null;

  points_inherited?: number;

  current_player_count?: number;
  preview_player_count?: number;

  coop_removal?:
    CoopRemoval;

  error?: string;
};

type LoadingAction =
  | "load"
  | "preview"
  | "apply"
  | "revert"
  | null;

/*
  ========================================
  НАЗВА ТУРНІРУ
  ========================================
*/

function getCompetitionName(
  competition: string
) {
  const names:
    Record<
      string,
      string
    > = {
      division:
        "Дивізіон",

      "division-1-cup":
        "Кубок 1 дивізіону",

      "division-2-cup":
        "Кубок 2 дивізіону",

      "division-3-cup":
        "Кубок 3 дивізіону",

      qualification:
        "Кваліфікація",

      "champions-league":
        "Ліга чемпіонів",

      "europa-league":
        "Ліга Європи",

      "conference-league":
        "Ліга конференцій",

      "european-super-cup":
        "Суперкубок Європи",

      "associations-cup":
        "Кубок асоціацій",
    };

  return (
    names[
      competition
    ] ??
    competition
  );
}

/*
  ========================================
  СТОРІНКА
  ========================================
*/

export default function PlayerReplacementsPage() {
  /*
    ========================================
    НАЛАШТУВАННЯ
    ========================================
  */

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    season,
    setSeason,
  ] =
    useState<SeasonNumber>(
      3
    );

  const [
    division,
    setDivision,
  ] =
    useState<DivisionNumber>(
      1
    );

  /*
    ========================================
    ДАНІ
    ========================================
  */

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  const [
    currentPlayerIds,
    setCurrentPlayerIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    eligibleIncomingPlayerIds,
    setEligibleIncomingPlayerIds,
  ] =
    useState<string[]>(
      []
    );

  const [
    replacements,
    setReplacements,
  ] =
    useState<
      PlayerReplacement[]
    >([]);

  /*
    ========================================
    НОВА ЗАМІНА
    ========================================
  */

  const [
    outgoingId,
    setOutgoingId,
  ] =
    useState("");

  const [
    incomingId,
    setIncomingId,
  ] =
    useState("");

  const [
    preview,
    setPreview,
  ] =
    useState<
      PreviewResponse | null
    >(null);

  /*
    ========================================
    ІНТЕРФЕЙС
    ========================================
  */

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    loadingAction,
    setLoadingAction,
  ] =
    useState<LoadingAction>(
      null
    );

  const busy =
    loadingAction !==
    null;

  /*
    ========================================
    ІМ'Я ГРАВЦЯ
    ========================================
  */

  function getPlayerName(
    playerId:
      | string
      | null
      | undefined
  ) {
    if (!playerId) {
      return "—";
    }

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
    ПОТОЧНІ ГРАВЦІ
    ========================================
  */

  const currentPlayers =
    useMemo(() => {
      return currentPlayerIds
        .map((id) =>
          players.find(
            (player) =>
              player.id ===
              id
          )
        )
        .filter(
          (
            player
          ): player is (typeof players)[number] =>
            player !==
            undefined
        );
    }, [
      currentPlayerIds,
    ]);

  /*
    ========================================
    ДОСТУПНІ НОВІ ГРАВЦІ
    ========================================
  */

  const incomingPlayers =
    useMemo(() => {
      return eligibleIncomingPlayerIds
        .map((id) =>
          players.find(
            (player) =>
              player.id ===
              id
          )
        )
        .filter(
          (
            player
          ): player is (typeof players)[number] =>
            player !==
            undefined
        )
        .sort(
          (a, b) =>
            a.nickname.localeCompare(
              b.nickname
            )
        );
    }, [
      eligibleIncomingPlayerIds,
    ]);

  /*
    ========================================
    ІСТОРІЯ
    ========================================
  */

  const sortedReplacements =
    useMemo(() => {
      return [
        ...replacements,
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
    }, [
      replacements,
    ]);

  /*
    ========================================
    ЧИ МОЖНА СКАСУВАТИ ЗАМІНУ
    ========================================
  */

  function canRevertReplacement(
    replacement:
      PlayerReplacement
  ) {
    return !replacements.some(
      (other) =>
        other.outgoing_player_id ===
          replacement
            .incoming_player_id &&
        new Date(
          other.created_at
        ).getTime() >
          new Date(
            replacement.created_at
          ).getTime()
    );
  }

  /*
    ========================================
    ОЧИЩЕННЯ ПОПЕРЕДНЬОГО ПЕРЕГЛЯДУ
    ========================================
  */

  function clearPreview() {
    setPreview(null);

    setMessage("");
  }

  /*
    ========================================
    СКИДАННЯ ЗАВАНТАЖЕНИХ ДАНИХ
    ========================================
  */

  function resetLoadedData() {
    setLoaded(false);

    setCurrentPlayerIds(
      []
    );

    setEligibleIncomingPlayerIds(
      []
    );

    setReplacements(
      []
    );

    setOutgoingId("");

    setIncomingId("");

    setPreview(null);

    setMessage("");
  }

  /*
    ========================================
    ЗАВАНТАЖЕННЯ ДИВІЗІОНУ
    ========================================
  */

  const loadDivision =
    useCallback(
      async (
        showMessage =
          true
      ) => {
        if (!password) {
          setMessage(
            "Введіть пароль адміністратора"
          );

          return;
        }

        setLoadingAction(
          "load"
        );

        if (showMessage) {
          setMessage("");
        }

        try {
          const params =
            new URLSearchParams();

          params.set(
            "season",
            String(
              season
            )
          );

          params.set(
            "division",
            String(
              division
            )
          );

          const response =
            await fetch(
              `/api/admin/player-replacement?${params.toString()}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                headers: {
                  "x-admin-password":
                    password,
                },
              }
            );

          const result =
            (await response.json()) as
              LoadResponse;

          if (!response.ok) {
            setLoaded(false);

            setCurrentPlayerIds(
              []
            );

            setEligibleIncomingPlayerIds(
              []
            );

            setReplacements(
              []
            );

            setMessage(
              result.error ??
                "Не вдалося завантажити дивізіон"
            );

            return;
          }

          const nextPlayerIds =
            result
              .current_player_ids ??
            [];

          const nextEligibleIncomingPlayerIds =
            result
              .eligible_incoming_player_ids ??
            [];

          const nextReplacements =
            result
              .replacements ??
            [];

          setCurrentPlayerIds(
            nextPlayerIds
          );

          setEligibleIncomingPlayerIds(
            nextEligibleIncomingPlayerIds
          );

          setReplacements(
            nextReplacements
          );

          setLoaded(true);

          setPreview(null);

          setOutgoingId(
            (current) =>
              nextPlayerIds.includes(
                current
              )
                ? current
                : nextPlayerIds[0] ??
                  ""
          );

          setIncomingId("");

          if (showMessage) {
            setMessage(
              `✅ Дивізіон завантажено. Доступних кандидатів на заміну: ${nextEligibleIncomingPlayerIds.length}`
            );
          }
        } catch {
          setLoaded(false);

          setCurrentPlayerIds(
            []
          );

          setEligibleIncomingPlayerIds(
            []
          );

          setReplacements(
            []
          );

          setMessage(
            "Помилка з'єднання"
          );
        } finally {
          setLoadingAction(
            null
          );
        }
      },
      [
        password,
        season,
        division,
      ]
    );

  /*
    ========================================
    ЗМІНА СЕЗОНУ
    ========================================
  */

  function changeSeason(
    newSeason:
      SeasonNumber
  ) {
    setSeason(
      newSeason
    );

    if (
      newSeason === 1 &&
      division === 4
    ) {
      setDivision(1);
    }

    resetLoadedData();
  }

  /*
    ========================================
    ЗМІНА ДИВІЗІОНУ
    ========================================
  */

  function changeDivision(
    newDivision:
      DivisionNumber
  ) {
    setDivision(
      newDivision
    );

    resetLoadedData();
  }

  /*
    ========================================
    ПОПЕРЕДНІЙ ПЕРЕГЛЯД
    ========================================
  */

  async function previewReplacement(
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

    if (!outgoingId) {
      setMessage(
        "Оберіть гравця, який вибуває"
      );

      return;
    }

    if (!incomingId) {
      setMessage(
        "Оберіть нового гравця"
      );

      return;
    }

    setLoadingAction(
      "preview"
    );

    setMessage("");

    setPreview(null);

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement-preview",
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

                division,

                outgoing_player_id:
                  outgoingId,

                incoming_player_id:
                  incomingId,
              }),
          }
        );

      const result =
        (await response.json()) as
          PreviewResponse;

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося створити попередній перегляд"
        );

        return;
      }

      setPreview(
        result
      );

      setMessage(
        "✅ Попередній перегляд готовий. Жодних змін у базі даних не виконано."
      );
    } catch {
      setMessage(
        "Помилка з'єднання"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    ЗАСТОСУВАННЯ ЗАМІНИ
    ========================================
  */

  async function applyReplacement() {
    if (!preview) {
      return;
    }

    const affectedMatches =
      preview
        .affected_unfinished_matches ??
      preview
        .affected_future_matches ??
      0;

    const competitionCount =
      preview
        .affected_by_competition
        ?.length ??
      0;

    const coopText =
      preview
        .coop_removal
        ?.required
        ? `

Iron Co-op Cup:
${getPlayerName(
  outgoingId
)} буде видалений із команди ${
            preview
              .coop_removal
              .team_name ??
            "Iron Co-op Cup"
          }.

Місце в команді залишиться вільним.
Новий гравець НЕ буде автоматично доданий до Co-op команди.`
        : "";

    const confirmed =
      window.confirm(
        `ГЛОБАЛЬНА ЗАМІНА ГРАВЦЯ

${getPlayerName(
  outgoingId
)} → ${getPlayerName(
          incomingId
        )}

Сезон ${season}

Буде перенесено ${affectedMatches} незавершених матчів у ${competitionCount} турнірах.

Завершені історичні матчі залишаться без змін.

Новий гравець успадкує турнірний слот і статистику попереднього гравця.${coopText}

Підтвердити заміну?`
      );

    if (!confirmed) {
      return;
    }

    setLoadingAction(
      "apply"
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement",
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

                division,

                outgoing_player_id:
                  outgoingId,

                incoming_player_id:
                  incomingId,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося виконати заміну"
        );

        return;
      }

      const updatedMatches =
        result.replacement
          ?.updated_matches ??
        0;

      setPreview(null);

      setIncomingId("");

      await loadDivision(
        false
      );

      setMessage(
        `✅ Заміна успішно виконана. Оновлено незавершених матчів: ${updatedMatches}`
      );
    } catch {
      setMessage(
        "Помилка з'єднання"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    СКАСУВАННЯ ЗАМІНИ
    ========================================
  */

  async function revertReplacement(
    replacement:
      PlayerReplacement
  ) {
    const coopText =
      replacement
        .coop_removed_team_id
        ? `

Якщо початкове місце в Iron Co-op Cup досі вільне, попередній гравець буде повернений у команду.

Якщо це місце вже вручну зайняв інший гравець, сервер заблокує скасування заміни.`
        : "";

    const confirmed =
      window.confirm(
        `СКАСУВАННЯ ЗАМІНИ

${getPlayerName(
  replacement
    .outgoing_player_id
)} ← ${getPlayerName(
          replacement
            .incoming_player_id
        )}

Усі незавершені матчі сезону ${replacement.season} повернуться попередньому гравцю.

Якщо новий гравець уже зіграв хоча б один завершений матч після заміни, сервер заблокує скасування.${coopText}

Продовжити?`
      );

    if (!confirmed) {
      return;
    }

    setLoadingAction(
      "revert"
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/player-replacement-revert",
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

                replacement_id:
                  replacement.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося скасувати заміну"
        );

        return;
      }

      const updatedMatches =
        result.revert
          ?.updated_matches ??
        0;

      await loadDivision(
        false
      );

      setMessage(
        `✅ Заміну скасовано. Повернуто незавершених матчів: ${updatedMatches}`
      );
    } catch {
      setMessage(
        "Помилка з'єднання"
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  /*
    ========================================
    КАРТКА СТАТИСТИКИ
    ========================================
  */

  function standingsCard(
    title: string,

    row:
      | StandingsRow
      | null
      | undefined
  ) {
    if (!row) {
      return (
        <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
          <div className="text-sm font-bold text-white/40">
            {title}
          </div>

          <div className="mt-4 text-white/30">
            Немає даних таблиці
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
        <div className="text-sm font-bold text-white/40">
          {title}
        </div>

        <div className="mt-2 text-xl font-black">
          {getPlayerName(
            row.playerId
          )}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-white/35">
              І
            </div>

            <div className="mt-1 font-black">
              {row.played}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              В
            </div>

            <div className="mt-1 font-black">
              {row.wins}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              Н
            </div>

            <div className="mt-1 font-black">
              {row.draws}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              П
            </div>

            <div className="mt-1 font-black">
              {row.losses}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-white/35">
              ГЗ
            </div>

            <div className="mt-1 font-black">
              {row.goalsFor}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              ГП
            </div>

            <div className="mt-1 font-black">
              {row.goalsAgainst}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/35">
              РГ
            </div>

            <div className="mt-1 font-black">
              {row.goalDifference >
              0
                ? "+"
                : ""}

              {
                row.goalDifference
              }
            </div>
          </div>

          <div>
            <div className="text-xs text-blue-300">
              ОЧК
            </div>

            <div className="mt-1 text-xl font-black text-blue-300">
              {row.points}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
    ========================================
    ОПИС МАТЧУ
    ========================================
  */

  function getMatchContext(
    match:
      | PreviewMatch
      | HistoricalMatch
  ) {
    const parts:
      string[] = [];

    if (
      match.competition ===
        "division" &&
      match.division !==
        null
    ) {
      parts.push(
        `Дивізіон ${match.division}`
      );
    } else {
      parts.push(
        getCompetitionName(
          match.competition
        )
      );

      if (
        match.division !==
        null
      ) {
        parts.push(
          `Дивізіон ${match.division}`
        );
      }
    }

    if (
      match.stage
    ) {
      parts.push(
        match.stage
      );
    }

    if (
      match.group_name
    ) {
      parts.push(
        `Група ${match.group_name}`
      );
    }

    return parts.join(
      " • "
    );
  }

  /*
    ========================================
    ІНТЕРФЕЙС
    ========================================
  */

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
              Керування гравцями
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="font-bold text-blue-300 transition hover:text-blue-200"
            >
              ← Адмінка
            </a>

            <a
              href="/"
              className="font-bold text-white/40 transition hover:text-white/70"
            >
              Сайт
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Керування складом сезону
        </div>

        <h1 className="mt-3 text-4xl font-black">
          Заміни гравців
        </h1>

        <p className="mt-4 max-w-3xl leading-7 text-white/40">
          Глобальна заміна гравця в межах сезону зі
          збереженням історичних результатів та
          успадкуванням турнірної статистики.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5 text-sm leading-7 text-blue-100/70">
          <b className="text-blue-200">
            Глобальна заміна:
          </b>{" "}
          усі незавершені матчі гравця в поточному
          сезоні переходять новому гравцю в усіх
          індивідуальних турнірах. Завершені матчі
          залишаються в історії за попереднім гравцем.
        </div>

        <div className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-5 text-sm leading-7 text-purple-100/70">
          <b className="text-purple-200">
            Iron Co-op Cup:
          </b>{" "}
          якщо гравець перебуває в Co-op команді, він
          буде видалений із неї, а його місце залишиться
          вільним. Новий гравець глобальної заміни
          автоматично до Co-op команди не додається.
        </div>

        {/* SETTINGS */}

        <div className="mt-8 grid gap-5 rounded-3xl border border-white/10 bg-[#07101d] p-7 lg:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-white/60">
              Пароль адміністратора
            </label>

            <input
              type="password"
              value={
                password
              }
              onChange={(
                event
              ) => {
                setPassword(
                  event.target
                    .value
                );

                resetLoadedData();
              }}
              placeholder="Введіть пароль"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-white/60">
              Сезон
            </label>

            <select
              value={
                season
              }
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
              value={
                division
              }
              onChange={(
                event
              ) =>
                changeDivision(
                  Number(
                    event.target
                      .value
                  ) as DivisionNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                Дивізіон 1
              </option>

              <option value={2}>
                Дивізіон 2
              </option>

              <option value={3}>
                Дивізіон 3
              </option>

              <option
                value={4}
                disabled={
                  season ===
                  1
                }
              >
                Дивізіон 4
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDivision()
            }
            disabled={
              busy ||
              !password
            }
            className="rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-3"
          >
            {loadingAction ===
            "load"
              ? "Завантаження..."
              : "Завантажити дивізіон"}
          </button>
        </div>

        {/* LOADED */}

        {loaded && (
          <>
            {/* CURRENT ROSTER */}

            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Поточний склад
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Дивізіон{" "}
                    {division}
                  </h2>
                </div>

                <div className="text-sm text-white/35">
                  Гравців:{" "}
                  {
                    currentPlayers.length
                  }
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {currentPlayers.map(
                  (
                    player,
                    index
                  ) => (
                    <div
                      key={
                        player.id
                      }
                      className="rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                    >
                      <div className="text-xs font-bold text-white/25">
                        #
                        {index +
                          1}
                      </div>

                      <div className="mt-1 font-black">
                        {
                          player.nickname
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* NEW REPLACEMENT */}

            <form
              onSubmit={
                previewReplacement
              }
              className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Нова глобальна заміна
                </div>

                <h2 className="mt-2 text-3xl font-black">
                  Замінити гравця
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-white/40">
                  Оберіть гравця, який вибуває, та нового
                  гравця. Заміна буде застосована до всіх
                  незавершених індивідуальних матчів
                  сезону{" "}
                  {season}.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-white/60">
                    Гравець, який вибуває
                  </label>

                  <select
                    value={
                      outgoingId
                    }
                    onChange={(
                      event
                    ) => {
                      setOutgoingId(
                        event.target
                          .value
                      );

                      clearPreview();
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Оберіть гравця
                    </option>

                    {currentPlayers.map(
                      (
                        player
                      ) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.id
                          }
                        >
                          {
                            player.nickname
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-white/60">
                    Новий гравець
                  </label>

                  <select
                    value={
                      incomingId
                    }
                    onChange={(
                      event
                    ) => {
                      setIncomingId(
                        event.target
                          .value
                      );

                      clearPreview();
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
                  >
                    <option value="">
                      Оберіть гравця
                    </option>

                    {incomingPlayers.map(
                      (
                        player
                      ) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.id
                          }
                        >
                          {
                            player.nickname
                          }
                        </option>
                      )
                    )}
                  </select>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-white/30">
                    <span>
                      Доступних кандидатів:{" "}
                      {
                        incomingPlayers.length
                      }
                    </span>

                    <span>
                      Тільки гравці без власної історії
                      матчів у сезоні{" "}
                      {season}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#030711] p-5 text-sm leading-7 text-white/50">
                <b className="text-white/80">
                  Правило заміни:
                </b>{" "}
                усі незавершені матчі сезону переходять
                новому гравцю. Завершені матчі залишаються
                в історії за попереднім гравцем. Новий
                гравець успадковує турнірний слот і
                статистику.
              </div>

              <button
                type="submit"
                disabled={
                  busy ||
                  !outgoingId ||
                  !incomingId
                }
                className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 px-6 py-4 font-black text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingAction ===
                "preview"
                  ? "Формування перегляду..."
                  : "Переглянути заміну"}
              </button>
            </form>

            {/* PREVIEW */}

            {preview && (
              <div className="mt-8 rounded-3xl border border-blue-400/25 bg-blue-500/[0.06] p-7">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                  Попередній перегляд
                </div>

                <h2 className="mt-3 text-3xl font-black">
                  {getPlayerName(
                    outgoingId
                  )}{" "}
                  <span className="text-blue-300">
                    →
                  </span>{" "}
                  {getPlayerName(
                    incomingId
                  )}
                </h2>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-blue-300">
                    Глобальна заміна
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white/50">
                    Сезон{" "}
                    {season}
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white/50">
                    Завершені матчі зберігаються
                  </div>
                </div>

                {/* STANDINGS */}

                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  {standingsCard(
                    "До заміни",
                    preview
                      .standings_before
                  )}

                  {standingsCard(
                    "Після заміни",
                    preview
                      .standings_after
                  )}
                </div>

                {/* SUMMARY */}

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Незавершених матчів
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .affected_unfinished_matches ??
                        preview
                          .affected_future_matches ??
                        0
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Успадковано очок
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .points_inherited ??
                        0
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/35">
                      Гравців у дивізіоні
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {
                        preview
                          .current_player_count ??
                        0
                      }

                      <span className="mx-2 text-xl text-white/25">
                        →
                      </span>

                      {
                        preview
                          .preview_player_count ??
                        0
                      }
                    </div>
                  </div>
                </div>

                {/* COMPETITIONS */}

                {(preview
                  .affected_by_competition
                  ?.length ??
                  0) > 0 && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#030711] p-5">
                    <div className="text-xs font-black uppercase tracking-[0.15em] text-blue-300">
                      Турніри, яких торкнеться заміна
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {preview
                        .affected_by_competition
                        ?.map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.competition
                              }
                              className="rounded-xl border border-white/10 bg-[#07101d] px-4 py-4"
                            >
                              <div className="font-black">
                                {getCompetitionName(
                                  item.competition
                                )}
                              </div>

                              <div className="mt-1 text-sm text-white/40">
                                Незавершених матчів:{" "}
                                {
                                  item.matches
                                }
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                )}

                {/* CO-OP */}

                <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-5">
                  <div className="text-xs font-black uppercase tracking-[0.15em] text-purple-300">
                    Iron Co-op Cup
                  </div>

                  {preview
                    .coop_removal
                    ?.required ? (
                    <>
                      <div className="mt-3 text-lg font-black">
                        Видалити{" "}
                        {getPlayerName(
                          outgoingId
                        )}{" "}
                        із команди{" "}
                        {
                          preview
                            .coop_removal
                            .team_name
                        }
                      </div>

                      <div className="mt-3 grid gap-3 text-sm text-white/50 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                          <div className="text-xs uppercase tracking-[0.12em] text-white/30">
                            Місце
                          </div>

                          <div className="mt-1 font-black text-white">
                            #
                            {
                              preview
                                .coop_removal
                                .slot
                            }
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                          <div className="text-xs uppercase tracking-[0.12em] text-white/30">
                            Напарник
                          </div>

                          <div className="mt-1 font-black text-white">
                            {preview
                              .coop_removal
                              .teammate_nickname ??
                              "—"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-[#030711] p-4">
                          <div className="text-xs uppercase tracking-[0.12em] text-white/30">
                            Стан місця
                          </div>

                          <div className="mt-1 font-black text-purple-300">
                            Вільне
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-6 text-purple-100/60">
                        Новий гравець глобальної заміни не
                        буде автоматично доданий до цієї
                        Co-op команди. Пізніше ви зможете
                        вручну призначити будь-якого
                        дозволеного гравця на вільне місце.
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-sm text-white/45">
                      Для цієї заміни жодних дій з
                      Iron Co-op Cup не потрібно.
                    </div>
                  )}
                </div>

                {/* HISTORICAL */}

                {(preview
                  .finished_historical_matches
                  ?.length ??
                  0) > 0 && (
                  <div className="mt-6 rounded-2xl border border-green-400/15 bg-green-500/[0.05] p-5">
                    <div className="text-xs font-black uppercase tracking-[0.15em] text-green-300">
                      Історичні матчі збережено
                    </div>

                    <div className="mt-2 text-sm text-white/45">
                      Ці завершені матчі назавжди
                      залишаться записаними за{" "}
                      <b className="text-white/70">
                        {getPlayerName(
                          outgoingId
                        )}
                      </b>
                      .
                    </div>

                    <div className="mt-4 space-y-2">
                      {preview
                        .finished_historical_matches
                        ?.map(
                          (
                            match
                          ) => (
                            <div
                              key={
                                match.id
                              }
                              className="rounded-xl border border-white/5 bg-[#030711] px-4 py-3"
                            >
                              <div className="text-xs font-bold text-green-300/70">
                                {getMatchContext(
                                  match
                                )}

                                {match.round !==
                                  null &&
                                  ` • Тур ${match.round}`}
                              </div>

                                                            <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                                {/* ГОСПОДАР */}
                                <div className="min-w-0 text-right font-bold leading-5 [overflow-wrap:anywhere]">
                                  {getPlayerName(match.home_id)}
                                </div>

                                {/* РАХУНОК */}
                                <div className="shrink-0 whitespace-nowrap font-black tabular-nums text-green-300">
                                  {match.home_goals} : {match.away_goals}
                                </div>

                                {/* ГІСТЬ */}
                                <div className="min-w-0 font-bold leading-5 [overflow-wrap:anywhere]">
                                  {getPlayerName(match.away_id)}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                )}

                {/* AFFECTED MATCHES */}

                {(preview
                  .affected_matches
                  ?.length ??
                  0) > 0 && (
                  <details className="mt-6 rounded-2xl border border-white/10 bg-[#030711]">
                    <summary className="cursor-pointer px-5 py-4 font-black">
                      Усі незавершені матчі для перенесення (
                      {
                        preview
                          .affected_matches
                          ?.length
                      }
                      )
                    </summary>

                    <div className="border-t border-white/10">
                      {preview
                        .affected_matches
                        ?.map(
                          (
                            match
                          ) => (
                            <div
                              key={
                                match.id
                              }
                              className="border-b border-white/5 px-5 py-4 last:border-b-0"
                            >
                              <div className="text-xs font-black text-blue-300">
                                {getMatchContext(
                                  match
                                )}

                                {match.round !==
                                  null &&
                                  ` • Тур ${match.round}`}
                              </div>

                              <div className="mt-2 grid gap-2 text-sm lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                                <div className="text-white/45">
                                  {getPlayerName(
                                    match.before
                                      .home_id
                                  )}{" "}
                                  —{" "}
                                  {getPlayerName(
                                    match.before
                                      .away_id
                                  )}
                                </div>

                                <div className="text-white/20">
                                  →
                                </div>

                                <div className="font-bold">
                                  {getPlayerName(
                                    match.after
                                      .home_id
                                  )}{" "}
                                  —{" "}
                                  {getPlayerName(
                                    match.after
                                      .away_id
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </details>
                )}

                {/* WARNING */}

                <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-200">
                  <b>
                    Увага.
                  </b>{" "}
                  Підтвердження виконає глобальну заміну
                  гравця в базі даних поточного сезону.
                  Завершені історичні матчі переписані не
                  будуть.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void applyReplacement()
                  }
                  disabled={
                    busy
                  }
                  className="mt-6 w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loadingAction ===
                  "apply"
                    ? "Виконується заміна..."
                    : "Підтвердити заміну"}
                </button>
              </div>
            )}

            {/* HISTORY */}

            <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Історія сезону
                  </div>

                  <h2 className="mt-2 text-3xl font-black">
                    Історія замін
                  </h2>
                </div>

                <div className="text-sm text-white/35">
                  Замін:{" "}
                  {
                    replacements.length
                  }
                </div>
              </div>

              {sortedReplacements.length ===
              0 ? (
                <div className="mt-7 rounded-2xl border border-white/10 bg-[#030711] p-7 text-center text-white/35">
                  У цьому сезоні замін ще не було.
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {sortedReplacements.map(
                    (
                      replacement
                    ) => {
                      const canRevert =
                        canRevertReplacement(
                          replacement
                        );

                      return (
                        <div
                          key={
                            replacement.id
                          }
                          className="rounded-2xl border border-white/10 bg-[#030711] p-5"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-xl font-black">
                                {getPlayerName(
                                  replacement
                                    .outgoing_player_id
                                )}{" "}
                                <span className="text-blue-300">
                                  →
                                </span>{" "}
                                {getPlayerName(
                                  replacement
                                    .incoming_player_id
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/35">
                                <span>
                                  Сезон{" "}
                                  {
                                    replacement.season
                                  }
                                </span>

                                <span>
                                  Початковий дивізіон:{" "}
                                  {
                                    replacement.division
                                  }
                                </span>

                                <span>
                                  Незавершені матчі
                                  перенесено глобально
                                </span>

                                <span>
                                  Статистику успадковано:{" "}
                                  {replacement
                                    .inherit_standings
                                    ? "Так"
                                    : "Ні"}
                                </span>

                                {replacement
                                  .coop_removed_team_id && (
                                  <span className="text-purple-300/70">
                                    Місце{" "}
                                    {
                                      replacement
                                        .coop_removed_slot
                                    }{" "}
                                    у Co-op звільнено
                                  </span>
                                )}

                                <span>
                                  {new Date(
                                    replacement
                                      .created_at
                                  ).toLocaleString(
                                    "uk-UA"
                                  )}
                                </span>
                              </div>
                            </div>

                            {canRevert ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void revertReplacement(
                                    replacement
                                  )
                                }
                                disabled={
                                  busy
                                }
                                className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {loadingAction ===
                                "revert"
                                  ? "Скасування..."
                                  : "Скасувати заміну"}
                              </button>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white/30">
                                Спочатку скасуйте наступну
                                заміну в ланцюжку
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </>
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