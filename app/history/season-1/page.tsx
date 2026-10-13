
import Image from "next/image";
import Link from "next/link";

import { season1 } from "../../../data/seasons/season-1";

import {
  seasonCompetitions,
} from "../../../data/competitions/season-competitions";

import SeasonWinners from "../../../components/SeasonWinners";
import SiteHeader from "../../../components/public/SiteHeader";
import SiteFooter from "../../../components/public/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TournamentCard = {
  id: string;
  category: string;
  name: string;
  href: string;
};

/*
  ========================================
  УЧАСНИКИ ПЕРШОГО СЕЗОНУ
  ========================================
*/

const playerIds = Array.from(
  new Set([
    ...season1.division1.players,
    ...season1.division2.players,
    ...season1.division3.players,
  ])
);

/*
  ========================================
  ТУРНІРИ ПЕРШОГО СЕЗОНУ
  ========================================
*/

function getTournamentCard(
  competitionId: string
): TournamentCard | null {
  /*
    У першому сезоні не було
    асоціацій та Iron Co-op Cup.
  */

  if (
    competitionId === "associations-cup" ||
    competitionId === "league-of-associations" ||
    competitionId === "season-qualification"
  ) {
    return null;
  }

  /*
    Дивізіони вже додаються
    окремими картками.
  */

  if (
    /^division-[1-4]$/.test(competitionId)
  ) {
    return null;
  }

  /*
    Кубки дивізіонів відображаємо
    однією спільною карткою.
  */

  if (
    /^division-[1-4]-cup$/.test(competitionId)
  ) {
    return null;
  }

  if (competitionId === "champions-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга чемпіонів",
      href: "/tournaments/champions-league?season=1",
    };
  }

  if (competitionId === "europa-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга Європи",
      href: "/tournaments/europa-league?season=1",
    };
  }

  if (competitionId === "conference-league") {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга конференцій",
      href: "/tournaments/conference-league?season=1",
    };
  }

  if (competitionId === "european-super-cup") {
    return {
      id: competitionId,
      category: "Суперкубок",
      name: "Суперкубок Європи",
      href: "/tournaments/european-super-cup?season=1",
    };
  }

  if (competitionId === "iron-coop-cup") {
    return null;
  }

  return null;
}

const competitions =
  seasonCompetitions[1] ?? [];

const hasDivisionCups = competitions.some(
  (competition) =>
    /^division-[1-4]-cup$/.test(
      competition.id
    )
);

const tournaments: TournamentCard[] = [
  {
    id: "division-1",
    category: "Чемпіонат",
    name: "1 Дивізіон",
    href: "/divisions/1?season=1",
  },
  {
    id: "division-2",
    category: "Чемпіонат",
    name: "2 Дивізіон",
    href: "/divisions/2?season=1",
  },
  {
    id: "division-3",
    category: "Чемпіонат",
    name: "3 Дивізіон",
    href: "/divisions/3?season=1",
  },

  ...competitions
    .map((competition) =>
      getTournamentCard(competition.id)
    )
    .filter(
      (card): card is TournamentCard =>
        card !== null
    ),

  ...(hasDivisionCups
    ? [
        {
          id: "division-cups",
          category: "Кубки",
          name: "Кубки дивізіонів",
          href: "/tournaments/division-cups?season=1",
        },
      ]
    : []),
];

/*
  ========================================
  ІСТОРІЯ ПЕРШОГО СЕЗОНУ
  ========================================
*/

export default function Season1HistoryPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <Image
          src="/stadium-bg.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          quality={70}
          className="object-cover object-center opacity-20"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK LINK */}
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі сезони
          </Link>

          {/* HEADING */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · HISTORY
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Сезон 1
              </h1>

              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-bold text-white/55">
                Архів
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Перший сезон Iron League.
              Історичні турніри, склади учасників,
              результати та переможці.
            </p>
          </div>

          {/* SEASON STATISTICS */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Дивізіонів
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                3
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Гравців
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                {playerIds.length}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Турнірів
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-blue-300">
                {tournaments.length}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Статус
              </div>

              <div className="mt-2 text-base font-black text-blue-300">
                Архів
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOURNAMENTS */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* SECTION HEADER */}
        <div className="mb-6 sm:mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
            ЗМАГАННЯ IRON LEAGUE
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Турніри сезону 1
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Чемпіонати дивізіонів, кубкові змагання
            та європейські турніри першого сезону.
          </p>
        </div>

        {/* TOURNAMENT GRID */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={tournament.href}
              className="group relative flex min-h-[150px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-[#0a1729] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:min-h-[175px] sm:p-5"
            >
              {/* CARD ACCENT */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/[0.06] blur-3xl" />

              <div className="relative flex flex-1 flex-col">
                {/* CATEGORY */}
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-6 w-1 shrink-0 rounded-full bg-blue-400"
                  />

                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400 sm:text-[11px]">
                    {tournament.category}
                  </span>
                </div>

                {/* NAME */}
                <h3 className="mt-4 min-w-0 break-words text-xl font-black leading-snug text-white sm:text-2xl">
                  {tournament.name}
                </h3>

                {/* FOOTER */}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-xs font-bold text-blue-300 transition group-hover:text-blue-200 sm:text-sm">
                    Переглянути турнір
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
          ))}
        </div>
      </section>

      {/* HALL OF FAME */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          {/* SECTION HEADER */}
          <div className="mb-6 sm:mb-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-300 sm:text-xs">
              HALL OF FAME
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Переможці сезону
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Чемпіони та володарі трофеїв першого
              сезону Iron League.
            </p>
          </div>

          {/* EXISTING WINNERS COMPONENT */}
          <SeasonWinners season={1} />
        </div>
      </section>

      {/* BACK TO HISTORY */}
      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 text-sm font-black text-blue-300 transition hover:border-blue-400/40 hover:bg-blue-500/15"
        >
          <span aria-hidden="true">←</span>
          Усі сезони Iron League
        </Link>
      </section>

      {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}
