import MobileCupBracketToggle from "./public/MobileCupBracketToggle";
import { players } from "../data/players";
import { supabase } from "../lib/supabase";
import { calculateTwoLegSeries } from "../lib/two-leg-series";

type Competition =
  | "champions-league"
  | "europa-league"
  | "conference-league";

type Props = {
  season: 1 | 2 | 3 | 4;
  competition: Competition;
};

const STAGES = [
  { id: "round-of-16", title: "1/8 фіналу", count: 8 },
  { id: "quarterfinal", title: "1/4 фіналу", count: 4 },
  { id: "semifinal", title: "1/2 фіналу", count: 2 },
  { id: "final", title: "Фінал", count: 1 },
] as const;

type StageId = (typeof STAGES)[number]["id"];

type Match = {
  id: string;
  stage: string | null;
  round: number | null;
  leg: number | null;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  series_id: string | null;
  series_home_id: string | null;
  series_away_id: string | null;
};

type Tie = {
  id: string;
  round: number | null;
  firstId: string;
  secondId: string;
  firstScore: number | null;
  secondScore: number | null;
  winnerId: string | null;
  matchesPlayed: number;
  expectedMatches: number;
  legScores: [string, string] | null;
};

type Bracket = Record<StageId, (Tie | null)[]>;

const CARD_HEIGHT = 118;
const CARD_GAP = 22;
const PITCH = CARD_HEIGHT + CARD_GAP;
const TOTAL_HEIGHT = 8 * PITCH - CARD_GAP;

const competitionNames: Record<Competition, string> = {
  "champions-league": "Ліга чемпіонів",
  "europa-league": "Ліга Європи",
  "conference-league": "Ліга конференцій",
};

function playerName(id: string) {
  return players.find((player) => player.id === id)?.nickname ?? id;
}

function finished(match: Match) {
  return (
    match.status === "finished" &&
    match.home_goals !== null &&
    match.away_goals !== null
  );
}

function orientedLegScore(match: Match | undefined, firstId: string, secondId: string) {
  if (!match || !finished(match)) return "—";
  if (match.home_id === firstId && match.away_id === secondId) {
    return `${match.home_goals}:${match.away_goals}`;
  }
  if (match.home_id === secondId && match.away_id === firstId) {
    return `${match.away_goals}:${match.home_goals}`;
  }
  return "—";
}

function toTie(matches: Match[]): Tie {
  const ordered = [...matches].sort(
    (a, b) => (a.leg ?? 99) - (b.leg ?? 99) || a.id.localeCompare(b.id)
  );
  const first = ordered[0];
  const hasSeries = Boolean(first.series_id);
  const firstId = (hasSeries && first.series_home_id) || first.home_id;
  const secondId = (hasSeries && first.series_away_id) || first.away_id;

  if (hasSeries) {
    // Reuse the same two-leg winner calculation as the existing Euro cup UI.
    const summary = calculateTwoLegSeries({
      seriesHomeId: firstId,
      seriesAwayId: secondId,
      matches: ordered.map((match) => ({
        id: match.id,
        home_id: match.home_id,
        away_id: match.away_id,
        home_goals: match.home_goals,
        away_goals: match.away_goals,
        status: match.status,
        leg: match.leg,
      })),
    });
    return {
      id: first.series_id!,
      round: first.round,
      firstId,
      secondId,
      firstScore: summary.matchesPlayed ? summary.aggregateHomeGoals : null,
      secondScore: summary.matchesPlayed ? summary.aggregateAwayGoals : null,
      winnerId:
        summary.winner === "home"
          ? firstId
          : summary.winner === "away"
            ? secondId
            : null,
      matchesPlayed: summary.matchesPlayed,
      expectedMatches: 2,
      legScores: [
        orientedLegScore(ordered.find((match) => match.leg === 1), firstId, secondId),
        orientedLegScore(ordered.find((match) => match.leg === 2), firstId, secondId),
      ],
    };
  }

  const isDone = finished(first);
  return {
    id: first.id,
    round: first.round,
    firstId,
    secondId,
    firstScore: isDone ? first.home_goals : null,
    secondScore: isDone ? first.away_goals : null,
    winnerId: isDone
      ? first.home_goals! > first.away_goals!
        ? firstId
        : first.away_goals! > first.home_goals!
          ? secondId
          : null
      : null,
    matchesPlayed: isDone ? 1 : 0,
    expectedMatches: 1,
    legScores: null,
  };
}

function makeBracket(matches: Match[]): { bracket: Bracket; overflow: Tie[] } {
  const bracket = {} as Bracket;
  const overflow: Tie[] = [];

  for (const stage of STAGES) {
    const stageMatches = matches.filter((match) => match.stage === stage.id);
    const groups = new Map<string, Match[]>();

    for (const match of stageMatches) {
      const key = match.series_id ?? match.id;
      const group = groups.get(key) ?? [];
      group.push(match);
      groups.set(key, group);
    }

    const ties = [...groups.values()]
      .map(toTie)
      .sort((a, b) => (a.round ?? 999) - (b.round ?? 999) || a.id.localeCompare(b.id));
    const slots: (Tie | null)[] = Array.from({ length: stage.count }, () => null);
    const unassigned: Tie[] = [];

    for (const tie of ties) {
      const wantedIndex = (tie.round ?? 0) - 1;
      if (wantedIndex >= 0 && wantedIndex < stage.count && !slots[wantedIndex]) {
        slots[wantedIndex] = tie;
      } else {
        unassigned.push(tie);
      }
    }

    for (const tie of unassigned) {
      const emptyIndex = slots.findIndex((slot) => slot === null);
      if (emptyIndex === -1) overflow.push(tie);
      else slots[emptyIndex] = tie;
    }

    bracket[stage.id] = slots;
  }

  return { bracket, overflow };
}

function BracketCard({ tie, number, final = false }: {
  tie: Tie | null;
  number: number;
  final?: boolean;
}) {
  const isWinner = Boolean(tie?.winnerId);
  const isPendingDecision = Boolean(
    tie && tie.matchesPlayed === tie.expectedMatches && !tie.winnerId
  );
  const state = !tie
    ? "ОЧІКУЄ"
    : isWinner
      ? "ЗАВЕРШЕНО"
      : isPendingDecision
        ? "БЕЗ ПЕРЕМОЖЦЯ"
        : tie.matchesPlayed
          ? "ТРИВАЄ"
          : "ЗАПЛАНОВАНО";
  const chipColor = isWinner
    ? "bg-emerald-400/10 text-emerald-300"
    : tie?.matchesPlayed || isPendingDecision
      ? "bg-amber-400/10 text-amber-300"
      : "bg-white/[0.05] text-slate-400";
  const sides = [
    { name: tie ? playerName(tie.firstId) : "Учасник не визначений", score: tie?.firstScore, id: tie?.firstId },
    { name: tie ? playerName(tie.secondId) : "Учасник не визначений", score: tie?.secondScore, id: tie?.secondId },
  ];

  return (
    <article className="grid h-[118px] min-w-0 grid-rows-[24px_34px_34px_26px] overflow-hidden rounded-xl border border-white/[0.12] bg-[#07111f] shadow-[0_5px_18px_rgba(0,0,0,0.12)]">
      <div className="flex min-w-0 items-center justify-between gap-1.5 border-b border-white/[0.08] bg-white/[0.035] px-3">
        <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-blue-400">
          {final ? "Фінал" : `Пара №${number}`}
        </span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${chipColor}`}>
          {state}
        </span>
      </div>

      {sides.map((side, index) => {
        const winner = Boolean(tie?.winnerId && side.id === tie.winnerId);
        return (
          <div
            key={index}
            title={side.name}
            className={`flex min-w-0 items-center gap-2 px-3 ${index === 0 ? "border-b border-white/[0.06]" : ""} ${winner ? "bg-blue-500/[0.14]" : index === 1 ? "bg-black/[0.10]" : ""}`}
          >
            <span aria-hidden="true" className={`h-4 w-[3px] shrink-0 rounded-full ${winner ? "bg-emerald-300" : tie ? "bg-blue-400/35" : "bg-white/15"}`} />
            <span className={`min-w-0 flex-1 truncate text-[13px] font-bold ${tie ? "text-white" : "text-slate-500"}`}>
              {side.name}
            </span>
            <span className={`shrink-0 text-sm font-black tabular-nums ${winner ? "text-blue-300" : "text-white/75"}`}>
              {side.score ?? "—"}
            </span>
            {winner && <span className="shrink-0 text-[12px] font-black text-emerald-300" aria-label="Переможець">✓</span>}
          </div>
        );
      })}

      <div className="flex items-center gap-1.5 border-t border-white/[0.08] bg-black/[0.12] px-3 text-[10px] font-semibold text-slate-400">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isWinner ? "bg-emerald-400" : tie?.matchesPlayed ? "bg-amber-400" : "bg-slate-500"}`} aria-hidden="true" />
        <span className="min-w-0 truncate" title={tie?.legScores ? `1-й матч: ${tie.legScores[0]}; 2-й матч: ${tie.legScores[1]}` : undefined}>
          {!tie
            ? "Очікується жеребкування"
            : tie.legScores
              ? `1-й ${tie.legScores[0]} · 2-й ${tie.legScores[1]}`
              : tie.matchesPlayed
                ? "Результат матчу"
                : "Матч ще не зіграно"}
        </span>
      </div>
    </article>
  );
}

function RoundHeading({ title, actual, total }: { title: string; actual: number; total: number }) {
  return (
    <div className="mb-3 flex h-[50px] min-w-0 items-center justify-between gap-2 border-b border-white/10">
      <h3 className="text-xs font-black uppercase tracking-[0.1em] text-blue-400">{title}</h3>
      <span className="shrink-0 text-[11px] text-slate-400">{actual}/{total} пар</span>
    </div>
  );
}

function topFor(level: number, slot: number) {
  const scale = 2 ** level;
  return (slot - 1) * scale * PITCH + ((scale - 1) * PITCH) / 2;
}

function BracketColumns({ bracket, mobile }: { bracket: Bracket; mobile: boolean }) {
  const gap = mobile ? "12px" : "12px";
  return (
    <div className={mobile ? "flex w-max items-start gap-6" : "grid min-w-[1120px] grid-cols-4 gap-6"}>
      {STAGES.map((stage, stageIndex) => (
        <section
          key={stage.id}
          data-mobile-bracket-stage={mobile ? "" : undefined}
          className={mobile ? "w-[276px] shrink-0 snap-start" : "min-w-0"}
        >
          <RoundHeading
            title={stage.title}
            actual={bracket[stage.id].filter(Boolean).length}
            total={stage.count}
          />
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {bracket[stage.id].map((tie, index) => {
              const top = topFor(stageIndex, index + 1);
              return (
                <div key={index} className="absolute inset-x-0" style={{ top, height: CARD_HEIGHT }}>
                  {stageIndex > 0 && (
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-px bg-blue-400/40" style={{ left: `-${gap}`, width: gap }} />
                  )}
                  {stageIndex < STAGES.length - 1 && (
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-px bg-blue-400/40" style={{ right: `-${gap}`, width: gap }} />
                  )}
                  <BracketCard tie={tie} number={index + 1} final={stage.id === "final"} />
                </div>
              );
            })}
            {stageIndex < STAGES.length - 1 &&
              Array.from({ length: stage.count / 2 }, (_, index) => {
                const top = topFor(stageIndex, index * 2 + 1) + CARD_HEIGHT / 2;
                const bottom = topFor(stageIndex, index * 2 + 2) + CARD_HEIGHT / 2;
                return (
                  <span key={index} aria-hidden="true" className="pointer-events-none absolute w-px bg-blue-400/40" style={{ right: `-${gap}`, top, height: bottom - top }} />
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function BracketList({ bracket }: { bracket: Bracket }) {
  return (
    <div className="space-y-7">
      {STAGES.map((stage) => (
        <section key={stage.id}>
          <RoundHeading title={stage.title} actual={bracket[stage.id].filter(Boolean).length} total={stage.count} />
          <div className="grid gap-3 sm:grid-cols-2">
            {bracket[stage.id].map((tie, index) => (
              <BracketCard key={index} tie={tie} number={index + 1} final={stage.id === "final"} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function EuropeanPlayoffBracket({ season, competition }: Props) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, stage, round, leg, home_id, away_id, home_goals,
       away_goals, status, series_id, series_home_id, series_away_id`
    )
    .eq("season", season)
    .eq("competition", competition)
    .in("stage", STAGES.map((stage) => stage.id));

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 p-5 text-red-200">
          Не вдалося завантажити сітку плей-оф.
        </div>
      </section>
    );
  }

  const { bracket, overflow } = makeBracket((data ?? []) as Match[]);
  const actualTies = STAGES.reduce(
    (total, stage) => total + bracket[stage.id].filter(Boolean).length,
    0
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            {competitionNames[competition]} · Плей-оф
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Турнірна сітка</h2>
        </div>
        {actualTies === 0 && (
          <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-200">
            Очікується жеребкування
          </span>
        )}
      </div>

      <div className="hidden overflow-x-auto pb-3 xl:block">
        <BracketColumns bracket={bracket} mobile={false} />
      </div>

      <MobileCupBracketToggle
        tournamentLabel={competitionNames[competition]}
        bracket={
          <div data-mobile-bracket-scroll className="min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4">
            <BracketColumns bracket={bracket} mobile />
          </div>
        }
        list={<BracketList bracket={bracket} />}
      />

      {overflow.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
          <p className="mb-3 text-xs font-bold text-amber-200">Додаткові пари без місця в сітці: {overflow.length}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overflow.map((tie, index) => (
              <BracketCard key={tie.id} tie={tie} number={index + 1} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 max-w-4xl text-xs leading-5 text-white/40">
        До жеребкування місця залишаються порожніми. Лінії позначають візуальну структуру;
        наступні пари підтверджуються лише після створення відповідних матчів.
        Рахунки та переможці відображаються з офіційних результатів.
      </p>
    </section>
  );
}
