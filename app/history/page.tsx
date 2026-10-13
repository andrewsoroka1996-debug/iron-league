
import Link from "next/link";

import StadiumBackground from "../../components/StadiumBackground";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const seasons = [
  {
    number: 1,
    title: "Сезон 1",
    status: "Архів",
    href: "/history/season-1",
  },
  {
    number: 2,
    title: "Сезон 2",
    status: "Архів",
    href: "/history/season-2",
  },
  {
    number: 3,
    title: "Сезон 3",
    status: "Поточний сезон",
    href: "/history/season-3",
  },
  {
    number: 4,
    title: "Сезон 4",
    status: "Підготовка",
    href: "/history/season-4",
  },
];

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK LINK */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </Link>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · HISTORY
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Історія ліги
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Історія сезонів Iron League: склади учасників,
              турнірні таблиці, переможці, кубки,
              статистика та головні події ліги.
            </p>
          </div>

          {/* ARCHIVE INFORMATION */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-blue-400/15 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xl font-black text-blue-300">
              {seasons.length}
            </div>

            <div>
              <div className="text-sm font-black text-white">
                Сезони Iron League
              </div>

              <div className="mt-0.5 text-xs text-white/45">
                Історія та розвиток чемпіонату
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEASON ARCHIVE */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* SECTION HEADER */}
        <div className="mb-6 sm:mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
            АРХІВ IRON LEAGUE
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Історія за сезонами
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Обери сезон, щоб переглянути його історію,
            результати та турніри.
          </p>
        </div>

        {/* SEASONS GRID */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {seasons.map((season) => {
            const isCurrent = season.number === 3;
            const isPreparing = season.number === 4;

            return (
              <Link
                key={season.number}
                href={season.href}
                aria-label={`Відкрити ${season.title}`}
                className={`group relative flex min-h-[190px] min-w-0 flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-[0_18px_45px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:min-h-[215px] sm:p-6 ${
                  isCurrent
                    ? "border-blue-400/25 bg-[#09182c]"
                    : "border-white/10 bg-[#07101d]"
                }`}
              >
                {/* BACKGROUND EFFECT */}
                <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-blue-500/[0.07] blur-3xl" />

                {/* BACKGROUND NUMBER */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-3 text-[105px] font-black leading-none tracking-tighter text-white/[0.035] sm:text-[120px]"
                >
                  {String(season.number).padStart(2, "0")}
                </div>

                {/* CARD CONTENT */}
                <div className="relative flex flex-1 flex-col">
                  {/* NUMBER AND STATUS */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-1 rounded-full bg-blue-400" />

                      <span className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-400">
                        SEASON{" "}
                        {String(season.number).padStart(2, "0")}
                      </span>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold ${
                        isCurrent
                          ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
                          : isPreparing
                            ? "border-white/10 bg-white/[0.04] text-white/45"
                            : "border-white/15 bg-white/[0.05] text-white/60"
                      }`}
                    >
                      {season.status}
                    </span>
                  </div>

                  {/* SEASON TITLE */}
                  <div className="mt-5">
                    <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {season.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/45">
                      Матеріали та історія виступів учасників.
                    </p>
                  </div>

                  {/* CARD FOOTER */}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="text-xs font-bold text-blue-300 transition group-hover:text-blue-200 sm:text-sm">
                      Переглянути сезон
                    </span>

                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-lg text-blue-300 transition-all duration-300 group-hover:translate-x-1 group-hover:border-blue-400/40 group-hover:bg-blue-500/20"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}
