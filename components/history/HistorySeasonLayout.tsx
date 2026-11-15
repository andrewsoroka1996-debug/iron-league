import Link from "next/link";

import StadiumBackground from "../StadiumBackground";
import SiteHeader from "../public/SiteHeader";
import SiteFooter from "../public/SiteFooter";
import SeasonWinners from "../SeasonWinners";

type Season = 1 | 2 | 3 | 4;

type TournamentCard = {
  id: string;
  category: string;
  name: string;
  href: string;
};

type Props = {
  season: Season;
  divisionCount: number;
  playerCount: number;
  tournaments: TournamentCard[];
};

const seasonDetails = {
  1: {
    status: "Архів",
    lead: "Перший сезон Iron League: початок історії ліги, склади учасників, турніри та чемпіони.",
    note: "Результати та досягнення завершеного сезону збережені в історії.",
  },
  2: {
    status: "Архів",
    lead: "Другий сезон Iron League: чемпіонати дивізіонів, єврокубки та здобуті трофеї.",
    note: "Результати та досягнення завершеного сезону збережені в історії.",
  },
  3: {
    status: "Поточний сезон",
    lead: "Третій сезон Iron League: актуальні турніри, результати матчів і підтверджені досягнення.",
    note: "Сезон триває. Досягнення з'являються лише після визначення переможців відповідних турнірів.",
  },
  4: {
    status: "Підготовка",
    lead: "Четвертий сезон Iron League: формування складів, підготовка турнірів та майбутні змагання.",
    note: "Сезон на етапі підготовки. Інформація з'являтиметься в міру формування турнірів.",
  },
} as const;

const seasonNumbers = [1, 2, 3, 4] as const;

const getCategoryAccent = (category: string) => {
  if (category === "Чемпіонат") return "bg-blue-400";
  if (category === "Єврокубок") return "bg-violet-400";
  if (category === "Кубки") return "bg-amber-400";
  if (category === "Суперкубок") return "bg-yellow-300";
  if (category === "Асоціації") return "bg-cyan-400";
  if (category === "Co-op") return "bg-emerald-400";
  return "bg-blue-400";
};

export default function HistorySeasonLayout({
  season,
  divisionCount,
  playerCount,
  tournaments,
}: Props) {
  const detail = seasonDetails[season];
  const isActive = season === 3;
  const isArchive = season <= 2;

  const stats = [
    { label: "Дивізіонів", value: divisionCount },
    { label: "Учасників", value: playerCount },
    { label: "Розділів турнірів", value: tournaments.length },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030711] text-white">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pb-10 sm:pt-10">
          <Link
            href="/history"
            className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі сезони
          </Link>

          {/* PROFILE-INSPIRED HEADER */}
          <div className="relative mt-3 overflow-hidden rounded-[22px] border border-blue-400/25 bg-gradient-to-br from-[#1b3a59]/95 via-[#0b1d32]/95 to-[#07111f] shadow-[0_18px_55px_rgba(0,0,0,0.27)] sm:mt-5">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-400 via-sky-300/70 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-7 select-none text-[180px] font-black leading-none tracking-tighter text-blue-100/[0.035] sm:text-[240px]">{String(season).padStart(2, "0")}</div>
            <div className="relative flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7 lg:flex-row lg:items-center lg:justify-between lg:gap-9">
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-500/[0.08] blur-3xl" />
              <div className="relative flex min-w-0 items-center gap-3 sm:gap-5">
                <div
                  aria-hidden="true"
                  className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl border border-blue-300/35 bg-[#071426]/90 text-3xl font-black tabular-nums tracking-tight text-blue-100 shadow-[0_0_0_4px_rgba(59,130,246,0.06),0_12px_34px_rgba(0,0,0,0.35)] sm:h-[108px] sm:w-[108px] sm:text-5xl"
                >
                  {String(season).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-300 sm:text-xs sm:tracking-[0.18em]">
                    IRON LEAGUE · ІСТОРІЯ
                  </div>
                  <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight sm:mt-2 sm:text-4xl">
                    Сезон {season}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                        isActive
                          ? "border-blue-400/35 bg-blue-500/15 text-blue-200"
                          : isArchive
                            ? "border-white/15 bg-white/[0.06] text-white/70"
                            : "border-white/10 bg-white/[0.04] text-white/55"
                      }`}
                    >
                      {detail.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* SAME FOUR-SEASON SWITCHER PATTERN AS THE PLAYER PROFILE */}
              <div className="relative w-full shrink-0 border-t border-blue-300/15 pt-3 lg:w-[390px] lg:border-t-0 lg:pt-0">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/55">
                  <span>Обрати сезон</span>
                  <span className="text-blue-300">Сезон {season}</span>
                </div>
                <nav
                  aria-label="Вибір сезону історії"
                  className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#06101e]/85 p-1"
                >
                  {seasonNumbers.map((number) => (
                    <Link
                      key={number}
                      href={`/history/season-${number}`}
                      aria-current={season === number ? "page" : undefined}
                      aria-label={`Сезон ${number}`}
                      className={`flex min-h-9 items-center justify-center rounded-lg px-1 py-1.5 text-center text-xs font-bold transition-colors sm:min-h-10 sm:text-sm ${
                        season === number
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="sm:hidden">{number}</span>
                      <span className="hidden sm:inline">Сезон {number}</span>
                    </Link>
                  ))}
                </nav>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-blue-200/80 sm:text-xs">
                  <a href="#history-tournaments" className="hover:text-white">Турніри ↓</a>
                  <a href="#history-winners" className="hover:text-white">Зал слави ↓</a>
                  <Link href="/history/overall" className="text-yellow-200/90 hover:text-yellow-100">Загальна історія ↗</Link>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-3xl border-l-2 border-blue-400/50 pl-3 text-sm leading-6 text-blue-100/65 sm:mt-5 sm:pl-4 sm:text-base sm:leading-7">
            {detail.lead}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-xl border border-blue-400/15 bg-gradient-to-br from-[#102033]/90 to-[#07101d] px-3 py-3 sm:rounded-2xl sm:px-5 sm:py-4"
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/45 sm:text-xs">
                  {stat.label}
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums text-blue-100 sm:text-3xl">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {!isArchive && (
            <div className="mt-3 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] px-3 py-3 text-xs leading-5 text-blue-100/75 sm:mt-4 sm:px-4 sm:text-sm">
              {detail.note}
            </div>
          )}
        </div>
      </section>

      {/* TOURNAMENT NAVIGATION */}
      <section id="history-tournaments" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
                ЗМАГАННЯ IRON LEAGUE
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:mt-2 sm:text-4xl">
                Турніри сезону {season}
              </h2>
              <p className="mt-1 text-xs leading-5 text-white/45 sm:mt-2 sm:text-sm">
                Переходь до таблиць, результатів і календарів турнірів.
              </p>
            </div>
            <span className="rounded-lg border border-blue-400/15 bg-blue-500/[0.06] px-3 py-1.5 text-xs font-bold tabular-nums text-blue-200">
              {tournaments.length} розділів
            </span>
          </div>

          <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
            {tournaments.map((tournament, index) => (
              <Link
                key={tournament.id}
                href={tournament.href}
                className="group relative flex min-h-[80px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#14253b] via-[#0d1b2d] to-[#08111f] px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/35 hover:shadow-[0_12px_28px_rgba(0,0,0,0.19)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:min-h-[108px] sm:px-5 sm:py-4"
              >
                <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-[3px] ${getCategoryAccent(tournament.category)}`} />
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-sm font-black tabular-nums text-blue-200/70 sm:h-12 sm:w-12">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.13em] text-blue-300/80 sm:text-[11px]">
                    {tournament.category}
                  </div>
                  <h3 className="mt-1 text-sm font-black leading-snug text-white sm:text-base lg:text-lg">
                    {tournament.name}
                  </h3>
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-lg text-blue-300 transition group-hover:translate-x-0.5 group-hover:bg-blue-500/20 sm:h-9 sm:w-9"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HISTORICAL HONOURS: SOURCE OF TRUTH UNCHANGED */}
      <section id="history-winners" className="scroll-mt-24 border-t border-yellow-300/10 bg-gradient-to-b from-[#10151e] via-[#090f1a] to-[#050a13]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300 sm:text-xs">
                HALL OF FAME
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:mt-2 sm:text-4xl">
                Зал слави · сезон {season}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50 sm:mt-2 sm:text-sm">
                {isArchive
                  ? "Підтверджені переможці та трофеї завершеного сезону."
                  : "Лише підтверджені нагороди. Незавершені турніри не отримують переможців завчасно."}
              </p>
            </div>
            <span className="rounded-lg border border-yellow-400/15 bg-yellow-500/[0.06] px-3 py-1.5 text-xs font-bold text-yellow-200">
              Сезон {season}
            </span>
          </div>
          <SeasonWinners season={season} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/history"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/15 sm:text-sm"
        >
          <span aria-hidden="true">←</span>
          До всіх сезонів
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
