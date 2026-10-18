import { Fragment } from "react";
import MobileCupBracketToggle from "./public/MobileCupBracketToggle";
import { players } from "../data/players";

import { supabase } from "../lib/supabase";

import { calculateTwoLegSeries } from "../lib/two-leg-series";

type StageId =
  | "round-of-16"
  | "quarterfinal"
  | "semifinal"
  | "final";

type Team = {
  id: string;
  name: string;
  players: string[];
};

type CupMatch = {
  id: string;

  stage: string | null;

  round: number | null;
  leg: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string | null;

  series_id: string | null;

  series_home_id: string | null;
  series_away_id: string | null;
};

type BracketSlot = {
  number: number;

  actual: boolean;

  teamA: string | null;
  teamB: string | null;

  sourceALabel:
    | string
    | null;

  sourceBLabel:
    | string
    | null;

  winnerId:
    | string
    | null;

  aggregateA:
    | number
    | null;

  aggregateB:
    | number
    | null;

  matches: CupMatch[];
};

type Props = {
  season: number;
  teams: Team[];
};

const stages: {
  id: StageId;
  label: string;
  count: number;
}[] = [
  {
    id: "round-of-16",
    label: "1/8 фіналу",
    count: 8,
  },
  {
    id: "quarterfinal",
    label: "1/4 фіналу",
    count: 4,
  },
  {
    id: "semifinal",
    label: "1/2 фіналу",
    count: 2,
  },
  {
    id: "final",
    label: "Фінал",
    count: 1,
  },
];

function getStageShortLabel(
  stage: StageId
) {
  if (
    stage ===
    "round-of-16"
  ) {
    return "1/8";
  }

  if (
    stage ===
    "quarterfinal"
  ) {
    return "1/4";
  }

  if (
    stage ===
    "semifinal"
  ) {
    return "1/2";
  }

  return "Фінал";
}

function isFinished(
  match: CupMatch
) {
  return (
    match.home_goals !==
      null &&
    match.away_goals !==
      null
  );
}

export default async function CoopCupPlayoffBracket({
  season,
  teams,
}: Props) {
  /*
    ========================================
    МАТЧІ IRON CO-OP CUP
    ========================================
  */

  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        stage,
        round,
        leg,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        series_id,
        series_home_id,
        series_away_id
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      "iron-coop-cup"
    )
    .order(
      "stage",
      {
        ascending: true,
      }
    )
    .order(
      "round",
      {
        ascending: true,
      }
    )
    .order(
      "leg",
      {
        ascending: true,
      }
    );

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
        Не вдалося завантажити
        турнірну сітку.
      </div>
    );
  }

  const matches =
    (data ??
      []) as CupMatch[];

  /*
    ========================================
    НАЗВА КОМАНДИ
    ========================================
  */

  function getTeam(
    teamId:
      | string
      | null
  ) {
    if (!teamId) {
      return null;
    }

    return (
      teams.find(
        (team) =>
          team.id ===
          teamId
      ) ?? null
    );
  }

  function getTeamName(
    teamId:
      | string
      | null
  ) {
    if (!teamId) {
      return null;
    }

    return (
      getTeam(teamId)
        ?.name ??
      teamId
    );
  }

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
    СТВОРЕНЕ ПРОТИСТОЯННЯ
    ========================================
  */

  function getActualSlot(
    stage: StageId,
    slotNumber: number
  ): BracketSlot | null {
    const stageMatches =
      matches.filter(
        (match) =>
          match.stage ===
            stage &&
          match.round ===
            slotNumber &&
          match.series_id
      );

    if (
      stageMatches.length ===
      0
    ) {
      return null;
    }

    const seriesId =
      stageMatches[0]
        .series_id;

    const seriesMatches =
      stageMatches
        .filter(
          (match) =>
            match.series_id ===
            seriesId
        )
        .sort(
          (a, b) =>
            (a.leg ?? 999) -
            (b.leg ?? 999)
        );

    const firstMatch =
      seriesMatches[0];

    const teamA =
      firstMatch
        .series_home_id;

    const teamB =
      firstMatch
        .series_away_id;

    if (
      !teamA ||
      !teamB
    ) {
      return null;
    }

    const summary =
      calculateTwoLegSeries({
        seriesHomeId:
          teamA,

        seriesAwayId:
          teamB,

        matches:
          seriesMatches.map(
            (match) => ({
              id:
                match.id,

              home_id:
                match.home_id,

              away_id:
                match.away_id,

              home_goals:
                match.home_goals,

              away_goals:
                match.away_goals,

              status:
                match.status ??
                "scheduled",

              leg:
                match.leg,
            })
          ),
      });

    let winnerId:
      | string
      | null = null;

    if (
      summary.winner ===
      "home"
    ) {
      winnerId =
        teamA;
    }

    if (
      summary.winner ===
      "away"
    ) {
      winnerId =
        teamB;
    }

    /*
      Сума двох матчів.
    */

    let aggregateA = 0;
    let aggregateB = 0;

    let finishedMatches =
      0;

    for (
      const match of
        seriesMatches
    ) {
      if (
        !isFinished(
          match
        )
      ) {
        continue;
      }

      if (
        match.home_id ===
          teamA &&
        match.away_id ===
          teamB
      ) {
        aggregateA +=
          match.home_goals ??
          0;

        aggregateB +=
          match.away_goals ??
          0;

        finishedMatches +=
          1;

        continue;
      }

      if (
        match.home_id ===
          teamB &&
        match.away_id ===
          teamA
      ) {
        aggregateA +=
          match.away_goals ??
          0;

        aggregateB +=
          match.home_goals ??
          0;

        finishedMatches +=
          1;
      }
    }

    return {
      number:
        slotNumber,

      actual: true,

      teamA,

      teamB,

      sourceALabel:
        null,

      sourceBLabel:
        null,

      winnerId,

      aggregateA:
        finishedMatches >= 2
          ? aggregateA
          : null,

      aggregateB:
        finishedMatches >= 2
          ? aggregateB
          : null,

      matches:
        seriesMatches,
    };
  }

  /*
    ========================================
    1/8
    ========================================
  */

  const roundOf16 =
    Array.from(
      {
        length: 8,
      },
      (_, index) => {
        const slot =
          index + 1;

        return (
          getActualSlot(
            "round-of-16",
            slot
          ) ?? {
            number:
              slot,

            actual: false,

            teamA:
              null,

            teamB:
              null,

            sourceALabel:
              null,

            sourceBLabel:
              null,

            winnerId:
              null,

            aggregateA:
              null,

            aggregateB:
              null,

            matches: [],
          }
        );
      }
    );

  /*
    ========================================
    НАСТУПНА СТАДІЯ
    ========================================
  */

  function buildNextStage(
    stage: StageId,
    count: number,
    previous:
      BracketSlot[],
    previousStage:
      StageId
  ) {
    return Array.from(
      {
        length:
          count,
      },
      (_, index) => {
        const slot =
          index + 1;

        const actual =
          getActualSlot(
            stage,
            slot
          );

        if (actual) {
          return actual;
        }

        const sourceA =
          previous[
            index * 2
          ];

        const sourceB =
          previous[
            index * 2 +
              1
          ];

        return {
          number:
            slot,

          actual: false,

          teamA:
            sourceA
              ?.winnerId ??
            null,

          teamB:
            sourceB
              ?.winnerId ??
            null,

          sourceALabel:
            sourceA
              ?.winnerId
              ? null
              : `Переможець ${getStageShortLabel(
                  previousStage
                )} №${
                  index *
                    2 +
                  1
                }`,

          sourceBLabel:
            sourceB
              ?.winnerId
              ? null
              : `Переможець ${getStageShortLabel(
                  previousStage
                )} №${
                  index *
                    2 +
                  2
                }`,

          winnerId:
            null,

          aggregateA:
            null,

          aggregateB:
            null,

          matches: [],
        } satisfies BracketSlot;
      }
    );
  }

  const quarterfinal =
    buildNextStage(
      "quarterfinal",
      4,
      roundOf16,
      "round-of-16"
    );

  const semifinal =
    buildNextStage(
      "semifinal",
      2,
      quarterfinal,
      "quarterfinal"
    );

  const final =
    buildNextStage(
      "final",
      1,
      semifinal,
      "semifinal"
    );

  const bracket: Record<
    StageId,
    BracketSlot[]
  > = {
    "round-of-16":
      roundOf16,

    quarterfinal,

    semifinal,

    final,
  };

  const createdSeriesCount =
    new Set(
      matches
        .map(
          (match) =>
            match.series_id
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    ).size;

  /*
    ========================================
    КАРТКА ПАРИ
    ========================================
  */

  function MatchCard({
    slot,
    stage,
  }: {
    slot: BracketSlot;
    stage: StageId;
  }) {
    const teamA =
      getTeam(
        slot.teamA
      );

    const teamB =
      getTeam(
        slot.teamB
      );

    const match1 =
      slot.matches.find(
        (match) =>
          match.leg === 1
      ) ?? null;

    const match2 =
      slot.matches.find(
        (match) =>
          match.leg === 2
      ) ?? null;

    const complete =
      slot.winnerId !==
      null;

    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            {stage ===
            "final"
              ? "Фінал"
              : `Пара №${slot.number}`}
          </div>

          {slot.actual ? (
            <div
              className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                complete
                  ? "text-blue-300"
                  : "text-yellow-300"
              }`}
            >
              {complete
                ? "Завершено"
                : "Триває"}
            </div>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">
              Очікує
            </div>
          )}
        </div>

        {/* TEAM A */}

        <div
          className={`border-b border-white/5 px-4 py-4 ${
            slot.winnerId ===
            slot.teamA
              ? "bg-blue-500/[0.07]"
              : ""
          }`}
        >
          {slot.teamA ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="font-black">
                  {getTeamName(
                    slot.teamA
                  )}
                </div>

                <div className="text-lg font-black">
                  {slot.aggregateA ??
                    "—"}
                </div>
              </div>

              {teamA && (
                <div className="mt-1 text-[11px] text-white/30">
                  {teamA.players
                    .map(
                      getPlayerName
                    )
                    .join(
                      " + "
                    )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm font-bold text-white/30">
              {slot.sourceALabel ??
                "Ще не визначено"}
            </div>
          )}
        </div>

        {/* TEAM B */}

        <div
          className={`px-4 py-4 ${
            slot.winnerId ===
            slot.teamB
              ? "bg-blue-500/[0.07]"
              : ""
          }`}
        >
          {slot.teamB ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="font-black">
                  {getTeamName(
                    slot.teamB
                  )}
                </div>

                <div className="text-lg font-black">
                  {slot.aggregateB ??
                    "—"}
                </div>
              </div>

              {teamB && (
                <div className="mt-1 text-[11px] text-white/30">
                  {teamB.players
                    .map(
                      getPlayerName
                    )
                    .join(
                      " + "
                    )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm font-bold text-white/30">
              {slot.sourceBLabel ??
                "Ще не визначено"}
            </div>
          )}
        </div>

        {/* LEGS */}

        {slot.actual && (
          <div className="border-t border-white/10 bg-black/15 px-4 py-3">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/30">
                  1-й матч
                </span>

                <span className="font-bold text-white/70">
                  {match1 &&
                  isFinished(
                    match1
                  )
                    ? `${getTeamName(
                        match1.home_id
                      )} ${match1.home_goals}:${match1.away_goals} ${getTeamName(
                        match1.away_id
                      )}`
                    : "Очікує результату"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/30">
                  2-й матч
                </span>

                <span className="font-bold text-white/70">
                  {match2 &&
                  isFinished(
                    match2
                  )
                    ? `${getTeamName(
                        match2.home_id
                      )} ${match2.home_goals}:${match2.away_goals} ${getTeamName(
                        match2.away_id
                      )}`
                    : "Очікує результату"}
                </span>
              </div>
            </div>

            {slot.winnerId && (
              <div className="mt-3 border-t border-white/5 pt-3 text-xs font-bold text-blue-300">
                Переможець:{" "}
                {getTeamName(
                  slot.winnerId
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /*
    ========================================
    COMPACT BRACKET PRESENTATION
    ========================================
    The same slot geometry/connectors as division cups.
    No fixture or winner logic is changed here.
  */

  const CARD_HEIGHT = 128;
  const CARD_GAP = 12;
  const CARD_STEP = CARD_HEIGHT + CARD_GAP;
  const BRACKET_HEIGHT = 8 * CARD_HEIGHT + 7 * CARD_GAP;
  const CONNECTOR_WIDTH = 26;
  const stageCounts = stages.map((stage) => stage.count);

  function cardTop(stageIndex: number, slotIndex: number) {
    const scale = 2 ** stageIndex;
    return (slotIndex * scale + (scale - 1) / 2) * CARD_STEP;
  }

  function cardCenter(stageIndex: number, slotIndex: number) {
    return cardTop(stageIndex, slotIndex) + CARD_HEIGHT / 2;
  }

  function BracketConnectors({ stageIndex }: { stageIndex: number }) {
    const pairCount = stageCounts[stageIndex + 1] ?? 0;
    const middleX = CONNECTOR_WIDTH / 2;

    return (
      <div className="pointer-events-none pt-[60px]" aria-hidden="true">
        <svg
          width={CONNECTOR_WIDTH}
          height={BRACKET_HEIGHT}
          viewBox={`0 0 ${CONNECTOR_WIDTH} ${BRACKET_HEIGHT}`}
          className="block overflow-visible"
          fill="none"
        >
          {Array.from({ length: pairCount }, (_, pairIndex) => {
            const upper = cardCenter(stageIndex, pairIndex * 2);
            const lower = cardCenter(stageIndex, pairIndex * 2 + 1);
            const center = (upper + lower) / 2;

            return (
              <path
                key={pairIndex}
                d={`M 0 ${upper} H ${middleX} V ${lower} H 0 M ${middleX} ${center} H ${CONNECTOR_WIDTH}`}
                stroke="#4f86bd"
                strokeWidth="1.6"
                strokeOpacity="0.65"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
    );
  }

  function CompactMatchCard({
    slot,
    stage,
  }: {
    slot: BracketSlot;
    stage: StageId;
  }) {
    const first = slot.matches.find((match) => match.leg === 1) ?? null;
    const second = slot.matches.find((match) => match.leg === 2) ?? null;
    const complete = slot.winnerId !== null;

    function legScore(match: CupMatch | null) {
      if (!match || !isFinished(match)) return "—";
      // Both legs are shown from Team A's point of view, even in the return leg.
      return match.home_id === slot.teamA
        ? `${match.home_goals}:${match.away_goals}`
        : match.away_id === slot.teamA
          ? `${match.away_goals}:${match.home_goals}`
          : `${match.home_goals}:${match.away_goals}`;
    }

    function TeamRow({
      teamId,
      sourceLabel,
      aggregate,
    }: {
      teamId: string | null;
      sourceLabel: string | null;
      aggregate: number | null;
    }) {
      const team = getTeam(teamId);
      const name = teamId ? getTeamName(teamId) ?? teamId : sourceLabel ?? "Ще не визначено";
      const roster = team?.players.map(getPlayerName).join(" + ") ?? "";
      const isWinner = Boolean(slot.winnerId && slot.winnerId === teamId);

      return (
        <div className={`flex min-h-0 flex-1 items-center gap-2 border-b border-white/[0.06] px-2.5 py-1 ${
          isWinner ? "bg-blue-500/15" : ""
        }`}>
          <span className={`h-4 w-0.5 shrink-0 rounded-full ${isWinner ? "bg-blue-400" : "bg-transparent"}`} />
          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-[12px] font-black leading-[15px] ${teamId ? "text-white" : "text-slate-500"}`}
              title={name}
            >
              {name}
            </div>
            {roster && (
              <div className="mt-0.5 truncate text-[9px] leading-3 text-slate-500" title={roster}>
                {roster}
              </div>
            )}
          </div>
          <span className={`w-6 shrink-0 text-right text-[15px] font-black tabular-nums ${
            isWinner ? "text-blue-300" : "text-white/85"
          }`}>
            {aggregate ?? "—"}
          </span>
        </div>
      );
    }

    return (
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#081321] shadow-[0_6px_18px_rgba(0,0,0,0.20)]">
        <div className="flex h-6 shrink-0 items-center justify-between gap-1.5 border-b border-white/[0.08] bg-white/[0.025] px-2.5">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-400">
            {stage === "final" ? "Фінал" : `Пара №${slot.number}`}
          </span>
          <span className={`truncate text-[9px] font-bold uppercase tracking-[0.06em] ${
            slot.actual ? (complete ? "text-blue-300" : "text-amber-300") : "text-slate-500"
          }`}>
            {slot.actual ? (complete ? "Завершено" : "Триває") : "Очікує"}
          </span>
        </div>

        <TeamRow teamId={slot.teamA} sourceLabel={slot.sourceALabel} aggregate={slot.aggregateA} />
        <TeamRow teamId={slot.teamB} sourceLabel={slot.sourceBLabel} aggregate={slot.aggregateB} />

        <div
          className="flex h-6 shrink-0 items-center justify-between gap-2 bg-black/20 px-2.5 text-[10px] text-white/60"
          title="Рахунки обох матчів показані з погляду першої команди"
        >
          {slot.actual ? (
            <>
              <span className="whitespace-nowrap">1-й: <b className="text-white/85">{legScore(first)}</b></span>
              <span className="whitespace-nowrap">2-й: <b className="text-white/85">{legScore(second)}</b></span>
            </>
          ) : (
            <span className="truncate">Очікує визначення учасників</span>
          )}
        </div>
      </article>
    );
  }

  function StageColumn({
    stageIndex,
    mobile,
  }: {
    stageIndex: number;
    mobile: boolean;
  }) {
    const stage = stages[stageIndex];
    const slots = bracket[stage.id];
    const active = slots.filter((slot) => slot.actual).length;

    return (
      <section
        className={`min-w-0 ${mobile ? "snap-start" : ""}`}
        data-mobile-bracket-stage={mobile ? "" : undefined}
      >
        <div className="mb-3 h-12 border-b border-white/10 pb-2">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-400">
            {stage.label}
          </div>
          <div className="mt-1 text-[11px] text-white/65">
            {active} / {stage.count} пар
          </div>
        </div>

        <div className="relative" style={{ height: BRACKET_HEIGHT }}>
          {slots.map((slot, index) => (
            <div
              key={`${stage.id}-${slot.number}`}
              className="absolute inset-x-0"
              style={{ top: cardTop(stageIndex, index), height: CARD_HEIGHT }}
            >
              <CompactMatchCard slot={slot} stage={stage.id} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  /*
    ========================================
    EMPTY
    ========================================
  */

  if (
    createdSeriesCount ===
    0
  ) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#07101d] p-8">
        <div className="font-bold text-blue-300">
          Сітка буде доступна
          після жеребкування
          1/8 фіналу.
        </div>

        <p className="mt-3 text-sm leading-6 text-white/35">
          Створені команди вже
          відображаються на
          сторінці. Після
          формування першої пари
          сітка з&apos;явиться
          автоматично.
        </p>
      </div>
    );
  }

  /*
    ========================================
    BRACKET
    ========================================
    Mobile/tablet: round navigation + list view.
    Desktop: aligned bracket with real connecting lines.
  */

  return (
    <>
      <MobileCupBracketToggle
        tournamentLabel="Iron Co-op Cup"
        bracket={
          <div
            className="max-w-full snap-x snap-mandatory scroll-smooth overflow-x-auto overscroll-x-contain rounded-xl border border-white/[0.06] bg-[#06101d]/30 px-3 pb-3 pt-3 [scroll-padding-inline-start:12px] [scrollbar-color:#365b86_transparent] [scrollbar-width:thin]"
            data-mobile-bracket-scroll
            role="region"
            tabIndex={0}
            aria-label="Турнірна сітка Iron Co-op Cup. Гортайте горизонтально для переходу між раундами"
          >
            <div
              className="grid w-max gap-0"
              style={{
                gridTemplateColumns:
                  "238px 26px 238px 26px 238px 26px 238px",
              }}
            >
              {stages.map((stage, stageIndex) => (
                <Fragment key={stage.id}>
                  <StageColumn stageIndex={stageIndex} mobile />
                  {stageIndex < stages.length - 1 && (
                    <BracketConnectors stageIndex={stageIndex} />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        }
        list={
          <div className="grid grid-cols-1 gap-6">
            {stages.map((stage) => (
              <section key={stage.id} className="min-w-0">
                <div className="mb-3 border-b border-white/10 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
                    {stage.label}
                  </h3>
                  <p className="mt-1 text-xs text-white/60">
                    {bracket[stage.id].filter((slot) => slot.actual).length} / {stage.count} пар
                  </p>
                </div>
                <div className="space-y-3">
                  {bracket[stage.id].map((slot) => (
                    <MatchCard key={`${stage.id}-${slot.number}`} slot={slot} stage={stage.id} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        }
      />

      <div className="hidden xl:block xl:overflow-x-auto xl:pb-1">
        <div
          className="grid min-w-[1000px] gap-0"
          style={{
            gridTemplateColumns:
              "minmax(0, 1fr) 26px minmax(0, 1fr) 26px minmax(0, 1fr) 26px minmax(0, 1fr)",
          }}
        >
          {stages.map((stage, stageIndex) => (
            <Fragment key={stage.id}>
              <StageColumn stageIndex={stageIndex} mobile={false} />
              {stageIndex < stages.length - 1 && (
                <BracketConnectors stageIndex={stageIndex} />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
