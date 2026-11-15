import type { PlayerPlacement } from "../lib/player-placements";

const groups = [
  {
    kind: "silver",
    title: "Срібні призери",
    marker: "border-slate-300/30 bg-slate-300/10 text-slate-200",
    card: "border-slate-400/20 bg-gradient-to-br from-[#142235] to-[#0a1523]",
  },
  {
    kind: "bronze",
    title: "Бронзові призери",
    marker: "border-amber-600/30 bg-amber-700/10 text-orange-300",
    card: "border-orange-400/15 bg-gradient-to-br from-[#1c202c] to-[#0a1523]",
  },
  {
    kind: "finalist",
    title: "Фіналісти кубків",
    marker: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    card: "border-blue-400/15 bg-gradient-to-br from-[#10233b] to-[#0a1523]",
  },
] as const;

function PlacementBadge({ kind }: { kind: "silver" | "bronze" | "finalist" }) {
  if (kind === "finalist") {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M9 5.5h14V14c0 5-2.8 8.2-7 9.3C11.8 22.2 9 19 9 14V5.5Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 8H5v3c0 3.4 1.7 5.2 5.5 5.4M23 8h4v3c0 3.4-1.7 5.2-5.5 5.4M16 23.3V27m-5 1.3h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 36" fill="none" aria-hidden="true">
      <path d="M7 3h7l3 10-7 3L7 3Z" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M18 3h7l-4 13-7-3 4-10Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="16" cy="23" r="9" fill="currentColor" fillOpacity="0.17" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="23" r="6.7" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.9" />
      <text x="16" y="27" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="900">{kind === "silver" ? "2" : "3"}</text>
    </svg>
  );
}

export default function PlayerPlacements({ placements }: { placements: PlayerPlacement[] }) {
  if (placements.length === 0) return null;
  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300/75">IRON LEAGUE · CAREER MILESTONES</div>
          <h3 className="mt-1 text-lg font-black text-white sm:text-xl">Призові місця та фінали</h3>
        </div>
        <span className="rounded-full border border-blue-400/20 bg-blue-500/[0.07] px-3 py-1 text-xs font-bold text-blue-100/80">
          {placements.length} відзнак
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-white/45">Це досягнення карʼєри, а не виграні трофеї.</p>
      <div className="mt-4 space-y-4">
        {groups.map((group) => {
          const entries = placements.filter((placement) => placement.kind === group.kind);
          if (!entries.length) return null;
          return (
            <div key={group.kind}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="h-1 w-1 rounded-full bg-blue-300/70" aria-hidden="true" />
                {group.title}
                <span className="text-white/35">({entries.length})</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((placement) => (
                  <article key={placement.key} className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${group.card}`}>
                    <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${group.marker}`}>
                      <PlacementBadge kind={group.kind} />
                    </span>
                    <div className="min-w-0">
                      <div className="break-words text-sm font-bold leading-5 text-white/90">{placement.title}</div>
                      <div className="mt-1 text-[11px] font-semibold text-white/45">Сезон {placement.season}</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
