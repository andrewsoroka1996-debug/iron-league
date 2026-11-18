"use client";

import { useMemo, useState } from "react";
import {
  countDirectPlayerMatches,
  type PlayerAccountMatch,
  type PlayerMatchGroup,
} from "../../lib/player-account-match-groups";

type StatusFilter = "all" | "scheduled" | "finished" | "closed_unplayed";

type Props = {
  playerId: string;
  groups: PlayerMatchGroup[];
  playerNames: Record<string, string>;
};

function displayStatus(match: PlayerAccountMatch): string {
  switch (match.status) {
    case "scheduled": return "Не зіграно";
    case "finished": return "Завершено";
    case "closed_unplayed": return "Закрито без гри";
    default: return match.status;
  }
}

function displayCompetition(group: PlayerMatchGroup): string {
  if (group.competition === "division" && group.division !== null) {
    return `${group.division} дивізіон`;
  }
  return group.competition.replaceAll("-", " ");
}

function details(match: PlayerAccountMatch): string {
  const parts: string[] = [];
  if (match.stage) parts.push(match.stage);
  if (match.group_name) parts.push(`Група ${match.group_name}`);
  if (match.round !== null) parts.push(`Тур ${match.round}`);
  if (match.leg !== null) parts.push(`Матч ${match.leg}`);
  return parts.join(" · ") || "Матч";
}

export default function PlayerAccountMatches({ playerId, groups, playerNames }: Props) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [competition, setCompetition] = useState("all");

  const competitions = useMemo(() =>
    [...new Set(groups.map((group) =>
      JSON.stringify([group.competition, group.division])
    ))].sort(), [groups]
  );

  const visibleGroups = useMemo(() => groups.flatMap((group) => {
    if (competition !== "all" && JSON.stringify([group.competition, group.division]) !== competition) {
      return [];
    }
    const matches = group.matches.filter((match) => status === "all" || match.status === status);
    return matches.length ? [{ ...group, matches }] : [];
  }), [groups, status, competition]);

  const counts = useMemo(() => countDirectPlayerMatches(groups), [groups]);
  const playerLabel = playerNames[playerId] || playerId;

  return (
    <section aria-label="Мої матчі" className="space-y-4">
      <p className="text-sm text-white/60">
        Матчі згруповано за суперниками в межах одного сезону й турніру.
        Кожен матч залишається самостійним.
      </p>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="text-xl font-black text-blue-200">{counts.scheduled}</div>
          <div className="text-xs text-white/60">До гри</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="text-xl font-black text-white">{counts.finished}</div>
          <div className="text-xs text-white/60">Завершено</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="text-xl font-black text-white">{counts.closedUnplayed}</div>
          <div className="text-xs text-white/60">Без гри</div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-white/65">
          <span>Статус</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className="w-full rounded-lg border border-blue-400/25 bg-[#081728] px-3 py-2 text-sm text-white"
          >
            <option value="all">Усі матчі</option>
            <option value="scheduled">Не зіграно</option>
            <option value="finished">Завершено</option>
            <option value="closed_unplayed">Закрито без гри</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-white/65">
          <span>Турнір</span>
          <select
            value={competition}
            onChange={(event) => setCompetition(event.target.value)}
            className="w-full rounded-lg border border-blue-400/25 bg-[#081728] px-3 py-2 text-sm text-white"
          >
            <option value="all">Усі турніри</option>
            {competitions.map((value) => {
              const [competitionId, division] = JSON.parse(value) as [string, number | null];
              const label = displayCompetition({ competition: competitionId, division } as PlayerMatchGroup);
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {visibleGroups.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            Матчів за вибраними фільтрами немає.
          </p>
        )}
        {visibleGroups.map((group) => (
          <div key={group.key} className="rounded-xl border border-blue-400/20 bg-[#081728]/70 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-300">
                {displayCompetition(group)} · Сезон {group.season}
              </span>
              <span className="text-xs text-white/55">{group.matches.length} матч(і)</span>
            </div>
            <h4 className="mt-2 break-words text-base font-black text-white">
              {playerLabel} — {playerNames[group.opponentId] || group.opponentId}
            </h4>
            <div className="mt-3 space-y-2">
              {group.matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-white/10 bg-[#030b16]/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-white/60">{details(match)}</span>
                    <span className="font-bold text-blue-200">{displayStatus(match)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="break-words text-white/85">
                      {playerNames[match.home_id] || match.home_id} — {playerNames[match.away_id] || match.away_id}
                    </span>
                    <span className="font-black tabular-nums text-white">
                      {match.status === "finished" && match.home_goals !== null && match.away_goals !== null
                        ? `${match.home_goals}:${match.away_goals}`
                        : "—:—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
