import StadiumBackground from "../../../components/StadiumBackground";
import Link from "next/link";
import SiteHeader from "../../../components/public/SiteHeader";
import SiteFooter from "../../../components/public/SiteFooter";
import { season4 } from "../../../data/seasons/season-4";

import {
  seasonCompetitions,
} from "../../../data/competitions/season-competitions";

import SeasonWinners from "../../../components/SeasonWinners";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TournamentCard = {
  id: string;
  category: string;
  name: string;
  href: string;
};

const playerIds = Array.from(
  new Set([
    ...season4.division1.players,
    ...season4.division2.players,
    ...season4.division3.players,
    ...season4.division4.players,
  ])
);

function getTournamentCard(
  competitionId: string
): TournamentCard | null {
  if (
    competitionId ===
      "season-qualification" ||
    competitionId ===
      "league-of-associations"
  ) {
    return null;
  }

  if (
    /^division-[1-4]$/.test(
      competitionId
    )
  ) {
    return null;
  }

  if (
    /^division-[1-4]-cup$/.test(
      competitionId
    )
  ) {
    return null;
  }

  if (
    competitionId ===
    "champions-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга чемпіонів",
      href:
        "/tournaments/champions-league?season=4",
    };
  }

  if (
    competitionId ===
    "europa-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга Європи",
      href:
        "/tournaments/europa-league?season=4",
    };
  }

  if (
    competitionId ===
    "conference-league"
  ) {
    return {
      id: competitionId,
      category: "Єврокубок",
      name: "Ліга конференцій",
      href:
        "/tournaments/conference-league?season=4",
    };
  }

  if (
    competitionId ===
    "european-super-cup"
  ) {
    return {
      id: competitionId,
      category: "Суперкубок",
      name: "Суперкубок Європи",
      href:
        "/tournaments/european-super-cup?season=4",
    };
  }

  if (
    competitionId ===
    "associations-cup"
  ) {
    return {
      id: competitionId,
      category: "Асоціації",
      name: "Ліга Асоціацій",
      href:
        "/tournaments/associations?season=4",
    };
  }

  if (
    competitionId ===
    "iron-coop-cup"
  ) {
    return {
      id: competitionId,
      category: "Co-op",
      name: "Iron Co-op Cup",
      href:
        "/tournaments/coop-cup?season=4",
    };
  }

  return null;
}

const competitions =
  seasonCompetitions[4] ?? [];

const hasDivisionCups =
  competitions.some(
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
    href: "/divisions/1?season=4",
  },

  {
    id: "division-2",
    category: "Чемпіонат",
    name: "2 Дивізіон",
    href: "/divisions/2?season=4",
  },

  {
    id: "division-3",
    category: "Чемпіонат",
    name: "3 Дивізіон",
    href: "/divisions/3?season=4",
  },

  {
    id: "division-4",
    category: "Чемпіонат",
    name: "4 Дивізіон",
    href: "/divisions/4?season=4",
  },

  ...competitions
    .map((competition) =>
      getTournamentCard(
        competition.id
      )
    )
    .filter(
      (
        card
      ): card is TournamentCard =>
        card !== null
    ),

  ...(hasDivisionCups
    ? [
        {
          id: "division-cups",
          category: "Кубки",
          name: "Кубки дивізіонів",
          href:
            "/tournaments/division-cups?season=4",
        },
      ]
    : []),
];


export default function Season4HistoryPage() {
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
            href="/history"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі сезони
          </Link>

          {/* SEASON TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · HISTORY
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Сезон 4
              </h1>

              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-bold text-white/55">
                Підготовка
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Четвертий сезон Iron League.
              Формування складів, підготовка турнірів
              та майбутні змагання ліги.
            </p>
          </div>

          {/* SEASON STATISTICS */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            {/* DIVISIONS */}
            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Дивізіонів
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                4
              </div>
            </div>

            {/* PLAYERS */}
            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Гравців
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                {playerIds.length}
              </div>
            </div>

            {/* TOURNAMENTS */}
            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Турнірів
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-blue-300">
                {tournaments.length}
              </div>
            </div>

            {/* STATUS */}
            <div className="rounded-xl border border-white/10 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm sm:min-w-36">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Статус
              </div>

              <div className="mt-2 text-base font-black text-white/70">
                Підготовка
              </div>
            </div>
          </div>

          {/* PREPARATION INFORMATION */}
          <div className="mt-5 flex max-w-2xl items-start gap-3 rounded-xl border border-blue-400/15 bg-blue-500/[0.05] px-4 py-3">
            <span
              aria-hidden="true"
              className="mt-0.5 text-lg text-blue-300"
            >
              ◷
            </span>

            <p className="text-xs leading-6 text-white/55 sm:text-sm">
              Сезон перебуває на етапі підготовки.
              Склади, турнірні дані та результати
              відображатимуться відповідно до
              їх формування та внесення на сайт.
            </p>
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
            Турніри сезону 4
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Чемпіонати дивізіонів, кубкові змагання,
            єврокубки та інші турніри четвертого сезону.
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
              {/* BACKGROUND ACCENT */}
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

                {/* TOURNAMENT NAME */}
                <h3 className="mt-4 min-w-0 break-words text-xl font-black leading-snug text-white sm:text-2xl">
                  {tournament.name}
                </h3>

                {/* CARD FOOTER */}
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
              Розділ поповнюватиметься в міру
              завершення змагань четвертого сезону.
            </p>
          </div>

          {/* EXISTING WINNERS COMPONENT */}
          <SeasonWinners season={4} />
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
