import Link from "next/link";

import StadiumBackground from "../../../components/StadiumBackground";
import SiteHeader from "../../../components/public/SiteHeader";
import SiteFooter from "../../../components/public/SiteFooter";
import PlayerEmblem from "../../../components/PlayerEmblem";
import { getPlayerEmblemUrls } from "../../../lib/player-emblem-urls";
import { getPlayerHonours } from "../../../lib/player-honours";
import { buildOverallHistory } from "../../../lib/history-overall";
import { players } from "../../../data/players";
import { seasonCompetitions, type SeasonNumber } from "../../../data/competitions/season-competitions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ season?: string }>;
};

type CatalogEntry = {
  id: string;
  title: string;
  href: string;
};

const seasonNumbers = [1, 2, 3, 4] as const;
const seasonStatus = {
  1: "Архів",
  2: "Архів",
  3: "Триває",
  4: "Підготовка",
} as const;

function initials(nickname: string) {
  return (nickname.split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("") || "IL").toUpperCase();
}

function destinationForTournament(id: string, season: number) {
  const division = /^division-([1-4])$/.exec(id);
  if (division) return `/divisions/${division[1]}?season=${season}`;
  if (/^division-[1-4]-cup$/.test(id)) return `/tournaments/division-cups?season=${season}`;
  if (id === "association-league" || id === "league-of-associations" || id === "associations-cup") {
    return `/tournaments/associations?season=${season}`;
  }
  if (id === "iron-coop-cup") return `/tournaments/coop-cup?season=${season}`;
  if (id === "season-qualification") return `/tournaments/qualification?season=${season}`;
  if (["champions-league", "europa-league", "conference-league", "european-super-cup"].includes(id)) {
    return `/tournaments/${id}?season=${season}`;
  }
  return `/history/season-${season}#history-tournaments`;
}

// A catalog item is not a trophy: qualifications and Association Cup also belong
// to the history even though they do not award a separate honour.
function competitionLabel(id: string): string {
  const division = /^division-([1-4])$/.exec(id);
  if (division) return `${division[1]} Дивізіон`;
  const cup = /^division-([1-4])-cup$/.exec(id);
  if (cup) return `Кубок ${cup[1]} Дивізіону`;
  const names: Record<string, string> = {
    "champions-league": "Ліга чемпіонів",
    "europa-league": "Ліга Європи",
    "conference-league": "Ліга конференцій",
    "european-super-cup": "Суперкубок Європи",
    "associations-cup": "Кубок асоціацій",
    "league-of-associations": "Ліга асоціацій",
    "iron-coop-cup": "Iron Co-op Cup",
    "season-qualification": "Кваліфікація сезону",
  };
  return names[id] ?? id.replaceAll("-", " ");
}

function catalogForSeason(season: SeasonNumber): CatalogEntry[] {
  const divisions = season === 1 ? [1, 2, 3] : [1, 2, 3, 4];
  const ids = new Set<string>([
    ...divisions.map((n) => `division-${n}`),
    ...(seasonCompetitions[season] ?? []).map((competition) => competition.id),
  ]);
  return Array.from(ids).map((id) => ({
    id,
    title: competitionLabel(id),
    href: destinationForTournament(id, season),
  }));
}

// Editorial sections only. Tournament titles, editions and winners always
// come from buildOverallHistory (confirmed player honours), never this list.
const historyGroups: {
  id: string;
  title: string;
  shortTitle: string;
  caption: string;
  types: readonly string[];
  line: string;
  border: string;
  ink: string;
  badge: string;
}[] = [
  {
    id: "divisions",
    title: "Чемпіонати дивізіонів",
    shortTitle: "Дивізіони",
    caption: "Історія чемпіонів усіх дивізіонів",
    types: ["division"],
    line: "bg-blue-400",
    border: "border-blue-400/25",
    ink: "text-blue-300",
    badge: "border-blue-400/25 bg-blue-500/10 text-blue-200",
  },
  {
    id: "cups",
    title: "Кубки дивізіонів",
    shortTitle: "Кубки",
    caption: "Переможці окремих кубкових розіграшів",
    types: ["cup"],
    line: "bg-yellow-400",
    border: "border-yellow-400/20",
    ink: "text-yellow-300",
    badge: "border-yellow-400/20 bg-yellow-400/[0.07] text-yellow-200",
  },
  {
    id: "europe",
    title: "Єврокубки",
    shortTitle: "Єврокубки",
    caption: "Ліга чемпіонів, Ліга Європи та Ліга конференцій",
    types: ["europe"],
    line: "bg-violet-400",
    border: "border-violet-400/25",
    ink: "text-violet-300",
    badge: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  },
  {
    id: "supercup",
    title: "Суперкубок Європи",
    shortTitle: "Суперкубок",
    caption: "Окрема історія престижного фіналу",
    types: ["super-cup"],
    line: "bg-orange-400",
    border: "border-orange-400/25",
    ink: "text-orange-300",
    badge: "border-orange-400/25 bg-orange-400/10 text-orange-200",
  },
  {
    id: "teams",
    title: "Асоціації та Co-op",
    shortTitle: "Асоціації / Co-op",
    caption: "Колективні перемоги та всі їхні офіційні чемпіони",
    types: ["association", "coop"],
    line: "bg-emerald-400",
    border: "border-emerald-400/25",
    ink: "text-emerald-300",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
];

export default async function OverallHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const chosen = Number(params.season);
  const seasonFilter: SeasonNumber | undefined =
    (seasonNumbers as readonly number[]).includes(chosen) ? (chosen as SeasonNumber) : undefined;

  // One honours calculation per player across all requested seasons. The
  // existing service is the sole source of confirmed trophies and protects
  // unfinished competitions, archived seasons and Association finalization.
  const entries: { player: { id: string; nickname: string }; honours: Awaited<ReturnType<typeof getPlayerHonours>> }[] = [];
  const batchSize = 8;
  for (let start = 0; start < players.length; start += batchSize) {
    const batch = await Promise.all(
      players.slice(start, start + batchSize).map(async (player) => ({
        player: { id: player.id, nickname: player.nickname },
        honours: await getPlayerHonours(player.id, seasonFilter),
      }))
    );
    entries.push(...batch);
  }

  const data = buildOverallHistory(entries, seasonFilter);
  const emblems = await getPlayerEmblemUrls();
  const activeSeasons = seasonFilter ? [seasonFilter] : [...seasonNumbers];
  // Do not promote a large arbitrary sample of tied one-title winners into a Top 9.
  // Keep every multi-title player visible; expose all one-title winners on demand.
  const multiTitleRecords = data.records.filter((record) => record.titles >= 2);
  const singleTitleRecords = data.records.filter((record) => record.titles === 1);

  const groupedTournaments = historyGroups
    .map((group) => ({
      ...group,
      tournaments: data.tournaments.filter((tournament) => group.types.includes(tournament.category)),
    }))
    .filter((group) => group.tournaments.length > 0);


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030711] text-white">
      <SiteHeader />
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#07172b]/95 to-[#030711]/85" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
          <Link href="/history" className="text-xs font-bold text-blue-300 hover:text-white sm:text-sm">← До історії сезонів</Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.21em] text-yellow-300">IRON LEAGUE · LEGACY</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Загальна історія</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/75 sm:text-base sm:leading-7">
                Всі сезони та турніри Iron League в одному місці: підтверджені чемпіони,
                історія трофеїв і всі турнірні розділи.
              </p>
            </div>
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-3 text-xs leading-5 text-yellow-100/80">
              Сезони 1–2 — архів. Сезон 3 триває.
              <br />Сезон 4 — підготовка.
            </div>
          </div>

          <nav aria-label="Фільтр сезонів загальної історії" className="mt-6 grid grid-cols-5 gap-1.5 rounded-xl border border-white/10 bg-[#060e1a]/80 p-1.5 sm:max-w-xl sm:gap-2">
            <Link href="/history/overall" aria-current={seasonFilter === undefined ? "page" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg px-1 text-xs font-bold transition sm:text-sm ${seasonFilter === undefined ? "bg-blue-500 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>Усі</Link>
            {seasonNumbers.map((season) => (
              <Link key={season} href={`/history/overall?season=${season}`} aria-label={`Сезон ${season}`} aria-current={seasonFilter === season ? "page" : undefined} className={`flex min-h-10 items-center justify-center rounded-lg px-1 text-xs font-bold transition sm:text-sm ${seasonFilter === season ? "bg-blue-500 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                <span className="sm:hidden">{season}</span><span className="hidden sm:inline">Сезон {season}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { value: data.editions, label: "Підтверджених трофеїв" },
              { value: data.uniqueWinners, label: "Гравців із нагородами" },
              { value: data.tournaments.length, label: "Турнірів із чемпіонами" },
            ].map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl border border-blue-400/20 bg-[#0b1a2d]/90 p-3 sm:rounded-2xl sm:p-5">
                <div className="text-2xl font-black tabular-nums text-blue-100 sm:text-4xl">{item.value}</div>
                <div className="mt-1 text-[10px] font-bold leading-4 text-white/55 sm:text-xs">{item.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-white/45">
            Один командний трофей рахується як один розіграш, але зараховується кожному його офіційному переможцю.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300 sm:text-xs">HALL OF FAME</div>
            <h2 className="mt-2 text-2xl font-black sm:text-4xl">Найтитулованіші гравці</h2>
            <p className="mt-2 text-xs leading-6 text-white/50 sm:text-sm">
              Лідери за кількістю офіційно підтверджених трофеїв {seasonFilter ? `сезону ${seasonFilter}` : "за всю історію"}.
              Гравці з однаковою кількістю титулів ділять одне місце.
            </p>
          </div>
          <a href="#overall-honours" className="text-xs font-bold text-blue-300 hover:text-white">До чемпіонів за турнірами ↓</a>
        </div>
        {data.records.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5 text-sm text-white/70">
            Підтверджених трофеїв у вибраному сезоні поки немає.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {multiTitleRecords.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-yellow-200 sm:text-base">Володарі двох і більше трофеїв</h3>
                  <span className="shrink-0 text-xs text-white/50">{multiTitleRecords.length} гравців</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {multiTitleRecords.map((record) => {
                    // Competition ranking: tied totals share the same place.
                    const position = data.records.findIndex((item) => item.titles === record.titles) + 1;
                    return (
                      <Link key={record.player.id} href={`/players/${record.player.id}`} className={`group flex min-w-0 items-center gap-3 rounded-xl border bg-gradient-to-r from-[#162234] to-[#0b1422] p-3 transition hover:border-yellow-400/40 sm:p-4 ${position <= 3 ? "border-yellow-400/35" : "border-white/10"}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black tabular-nums ${position <= 3 ? "bg-yellow-300/10 text-yellow-300" : "bg-white/5 text-white/60"}`}>{String(position).padStart(2, "0")}</span>
                        <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b1728] [&>*]:!h-full [&>*]:!w-full [&_img]:!h-full [&_img]:!w-full [&_img]:!object-cover">
                          <PlayerEmblem nickname={record.player.nickname} initials={initials(record.player.nickname)} src={emblems[record.player.id]} variant="profile" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-black sm:text-base">{record.player.nickname}</span>
                        <span className="shrink-0 text-right"><span className="block text-xl font-black tabular-nums text-yellow-300">{record.titles}</span><span className="text-[10px] text-white/50">трофеїв</span></span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {singleTitleRecords.length > 0 && (
              <details className="group rounded-2xl border border-white/10 bg-[#0c1727]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-4 transition hover:bg-white/[0.03] sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] text-base font-black text-yellow-300">1</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black sm:text-base">Володарі одного трофея</span>
                      <span className="mt-0.5 block text-xs text-white/50">{singleTitleRecords.length} гравців · показати весь список</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-xl font-bold text-blue-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                  {singleTitleRecords.map((record) => (
                    <Link key={record.player.id} href={`/players/${record.player.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 transition hover:border-yellow-400/25 hover:bg-white/[0.05]">
                      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0b1728] [&>*]:!h-full [&>*]:!w-full [&_img]:!h-full [&_img]:!w-full [&_img]:!object-cover">
                        <PlayerEmblem nickname={record.player.nickname} initials={initials(record.player.nickname)} src={emblems[record.player.id]} variant="profile" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-black">{record.player.nickname}</span>
                      <span className="shrink-0 text-xs font-bold text-yellow-300">1 трофей</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <section id="overall-honours" className="scroll-mt-20 border-t border-white/10 bg-gradient-to-b from-[#0b1422] to-[#050a13]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 sm:text-xs">АРХІВ ТРОФЕЇВ</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Чемпіони за турнірами</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-white/55 sm:text-sm">
            Турніри впорядковані за типами змагань. У кожному — підтверджені переможці за сезонами.
            Незавершені змагання не отримують чемпіона завчасно.
          </p>

          {groupedTournaments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/60">
              Наразі немає підтверджених чемпіонів для вибраного сезону.
            </div>
          ) : (
            <>
              <nav aria-label="Категорії трофеїв" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {groupedTournaments.map((group, index) => (
                  <a
                    key={group.id}
                    href={`#honours-${group.id}`}
                    className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-2 py-2.5 text-center text-xs font-bold leading-snug transition hover:brightness-125 sm:px-3 sm:text-sm ${group.badge} ${groupedTournaments.length % 2 === 1 && index === groupedTournaments.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
                  >
                    <span className="lg:hidden">{group.shortTitle}</span>
                    <span className="hidden lg:inline">{group.title}</span>
                  </a>
                ))}
              </nav>
              <div className="mt-4 space-y-8 sm:mt-6 sm:space-y-11">
                {groupedTournaments.map((group, groupIndex) => (
                  <section key={group.id} id={`honours-${group.id}`} className="scroll-mt-24">
                    <div className={`mb-3 flex items-start gap-3 border-b pb-3 sm:mb-4 sm:pb-4 ${group.border}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white/[0.025] text-sm font-black tabular-nums ${group.border} ${group.ink}`}>
                        {String(groupIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black tracking-tight sm:text-2xl">{group.title}</h3>
                        <p className="mt-1 text-xs text-white/50 sm:text-sm">{group.caption}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${group.badge}`}>
                        {group.tournaments.length} {group.tournaments.length === 1 ? "турнір" : "турніри"}
                      </span>
                    </div>
                    <div className="grid items-start gap-3 md:grid-cols-2 lg:gap-4">
                      {group.tournaments.map((tournament) => (
                        <article key={tournament.id} id={`trophy-${tournament.id}`} className={`relative min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#132236] to-[#09131f] ${group.border}`}>
                          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[2px] ${group.line}`} />
                          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                            <h4 className="min-w-0 text-base font-black leading-snug text-white sm:text-lg">{tournament.title}</h4>
                            <span className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums ${group.badge}`}>
                              {tournament.editions.length} {tournament.editions.length === 1 ? "титул" : "титули"}
                            </span>
                          </div>
                          <div className="mx-4 border-t border-white/[0.08] sm:mx-5" />
                          <div className="divide-y divide-white/[0.07] px-4 pb-2 sm:px-5">
                            {tournament.editions.map((edition) => (
                              <div key={edition.key} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-3">
                                <Link href={destinationForTournament(tournament.id, edition.season)} className="flex shrink-0 items-center gap-2 text-xs font-black text-blue-300 transition hover:text-white sm:w-[82px] sm:pt-1.5">
                                  Сезон {edition.season} <span aria-hidden="true">↗</span>
                                </Link>
                                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                                  {edition.players.map((player) => (
                                    <Link key={player.id} href={`/players/${player.id}?season=${edition.season}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.035] px-2 py-1.5 transition hover:border-white/25 hover:bg-white/[0.07]">
                                      <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#0a1725] [&>*]:!h-full [&>*]:!w-full [&_img]:!h-full [&_img]:!w-full [&_img]:!object-cover">
                                        <PlayerEmblem nickname={player.nickname} initials={initials(player.nickname)} src={emblems[player.id]} variant="profile" />
                                      </span>
                                      <span className="min-w-0 max-w-[170px] truncate text-xs font-black text-white sm:text-sm">{player.nickname}</span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section id="history-all-tournaments" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 sm:text-xs">ПОВНИЙ КАТАЛОГ</div>
          <h2 className="mt-2 text-2xl font-black sm:text-4xl">Усі турніри за сезонами</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-white/55 sm:text-sm">Тут є і завершені, і незавершені турніри. Посилання ведуть до чинних сторінок турнірів і календарів; участь у каталозі не означає присудження трофея.</p>
          <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
            {activeSeasons.map((season) => {
              const catalog = catalogForSeason(season);
              return (
                <details key={season} className="group rounded-2xl border border-blue-400/15 bg-[#0c192a] p-4 sm:p-5" open={seasonFilter === season}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <span><span className="block text-lg font-black">Сезон {season}</span><span className="text-xs text-white/50">{seasonStatus[season]} · {catalog.length} турнірів/розділів</span></span>
                    <span className="text-xl font-bold text-blue-300 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {catalog.map((competition) => (
                      <Link key={competition.id} href={competition.href} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs font-bold text-white/80 hover:border-blue-400/30 hover:text-white sm:text-sm">
                        <span className="min-w-0 truncate">{competition.title}</span><span className="shrink-0 text-blue-300">↗</span>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/history/season-${season}`} className="mt-4 inline-block text-xs font-bold text-blue-300 hover:text-white">Повна сторінка сезону {season} →</Link>
                </details>
              );
            })}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
