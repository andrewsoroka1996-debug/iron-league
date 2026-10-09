import { seasonCompetitions } from "../data/competitions/season-competitions";

const results = [
  {
    home: "Andrew_SM",
    score: "3 : 1",
    away: "Valdemar",
    tournament: "1 Дивізіон",
  },
  {
    home: "TheLP9",
    score: "2 : 2",
    away: "Soga",
    tournament: "Ліга чемпіонів",
  },
  {
    home: "4ydeca",
    score: "1 : 0",
    away: "Deyl_23",
    tournament: "2 Дивізіон",
  },
];

const divisions = [
  {
    number: "01",
    name: "1 Дивізіон",
    leader: "Andrew_SM",
    points: 0,
  },
  {
    number: "02",
    name: "2 Дивізіон",
    leader: "—",
    points: 0,
  },
  {
    number: "03",
    name: "3 Дивізіон",
    leader: "—",
    points: 0,
  },
  {
    number: "04",
    name: "4 Дивізіон",
    leader: "—",
    points: 0,
  },
];

/*
  ========================================
  ПОТОЧНИЙ СЕЗОН
  ========================================
*/

const currentSeason = 3 as const;

/*
  ========================================
  КАРТКИ ТУРНІРІВ
  ========================================

  Тут зберігаємо тільки інформацію,
  потрібну для відображення картки.

  Чи існує турнір у конкретному сезоні,
  визначає seasonCompetitions.
*/

const tournamentCards = [
  {
    id: "champions-league",
    name: "Ліга чемпіонів",
    short: "ЛЧ",
    href: "/tournaments/champions-league",
  },
  {
    id: "europa-league",
    name: "Ліга Європи",
    short: "ЛЄ",
    href: "/tournaments/europa-league",
  },
  {
    id: "conference-league",
    name: "Ліга конференцій",
    short: "ЛК",
    href: "/tournaments/conference-league",
  },
  {
    id: "european-super-cup",
    name: "Суперкубок Європи",
    short: "СК",
    href: "/tournaments/european-super-cup",
  },
  {
    id: "division-cups",
    name: "Кубки дивізіонів",
    short: "КД",
    href: "/tournaments/division-cups",
  },
  {
  id: "associations-cup",
  name: "Кубок асоціацій",
  short: "КА",
  href: "/tournaments/associations",
},
  {
    id: "iron-coop-cup",
    name: "Iron Co-op Cup",
    short: "CO",
    href: "/tournaments/coop-cup",
  },
];

/*
  ========================================
  ТУРНІРИ ПОТОЧНОГО СЕЗОНУ
  ========================================
*/

const currentSeasonCompetitions =
  seasonCompetitions[currentSeason];

const currentCompetitionIds = new Set(
  currentSeasonCompetitions.map(
    (competition) => competition.id
  )
);

/*
  Кубки дивізіонів у реєстрі зберігаються
  окремо:

  division-1-cup
  division-2-cup
  division-3-cup
  division-4-cup

  На головній показуємо їх однією карткою.
*/

const hasDivisionCups =
  currentSeasonCompetitions.some(
    (competition) =>
      competition.category ===
      "division-cup"
  );

const tournaments =
  tournamentCards.filter(
    (tournament) => {
      if (
        tournament.id ===
        "division-cups"
      ) {
        return hasDivisionCups;
      }

      return currentCompetitionIds.has(
        tournament.id
      );
    }
  );

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-16 w-auto object-contain"
            />

            <div>
              <div className="text-xl font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                більше ніж гра
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/60 lg:flex">
            <a
              href="/"
              className="text-white"
            >
              Головна
            </a>

            <a
              href="#matches"
              className="transition hover:text-white"
            >
              Матчі
            </a>

            <a
              href="/divisions"
              className="transition hover:text-white"
            >
              Дивізіони
            </a>

            <a
              href="#tournaments"
              className="transition hover:text-white"
            >
              Турніри
            </a>

            <a
              href="/players"
              className="transition hover:text-white"
            >
              Гравці
            </a>

            <a
              href="/history"
              className="transition hover:text-white"
            >
              Історія
            </a>

            <a
              href="#"
              className="transition hover:text-white"
            >
              Новини
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/95 via-[#030711]/80 to-[#020611]/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/40" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />
              eFootball Competition
            </div>

            <div className="max-w-2xl">
              <img
                src="/iron-league-logo.jpg"
                alt="Iron League"
                className="w-full max-w-[420px] object-contain drop-shadow-[0_0_40px_rgba(59,130,246,0.30)]"
              />
            </div>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/65">
              Єдина платформа Iron League:
              матчі, дивізіони, єврокубки,
              статистика, результати,
              турнірні таблиці та історія
              ліги.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#matches"
                className="rounded-xl bg-blue-500 px-6 py-3.5 font-bold shadow-[0_0_30px_rgba(59,130,246,0.3)] transition hover:bg-blue-400"
              >
                Переглянути матчі
              </a>

              <a
                href="/divisions"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 font-bold backdrop-blur transition hover:bg-white/[0.10]"
              >
                Турнірні таблиці
              </a>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-black">
                  4
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Дивізіони
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  {tournaments.length}+
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Турнірів
                </div>
              </div>

              <div>
                <div className="text-3xl font-black">
                  ∞
                </div>

                <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  Емоцій
                </div>
              </div>
            </div>
          </div>

          {/* MATCH OF THE DAY */}
          <div className="relative">
            <div className="absolute -inset-8 rounded-[40px] bg-blue-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#07101d]/85 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-white/[0.03] px-7 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                      Матч дня
                    </div>

                    <div className="mt-1 text-sm text-white/40">
                      1 Дивізіон
                    </div>
                  </div>

                  <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                    LIVE
                  </div>
                </div>
              </div>

              <div className="px-7 py-10">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-2xl font-black">
                      AS
                    </div>

                    <div className="mt-5 text-xl font-black">
                      Andrew_SM
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/25">
                      versus
                    </div>

                    <div className="mt-2 text-4xl font-black text-blue-400">
                      VS
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-2xl font-black">
                      VD
                    </div>

                    <div className="mt-5 text-xl font-black">
                      Valdemar
                    </div>
                  </div>
                </div>

                <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-sm text-white/45">
                  Центральний матч туру
                  Iron League
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section
        id="matches"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Матч-центр
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Останні результати
            </h2>
          </div>

          <a
            href="#"
            className="hidden text-sm font-bold text-blue-400 sm:block"
          >
            Усі матчі →
          </a>
        </div>

        <div className="grid gap-4">
          {results.map((match) => (
            <div
              key={`${match.home}-${match.away}`}
              className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-5 transition hover:border-blue-400/30 hover:bg-white/[0.04] sm:grid-cols-[140px_1fr_auto_1fr]"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-white/30">
                {match.tournament}
              </div>

              <div className="text-right font-bold">
                {match.home}
              </div>

              <div className="rounded-lg bg-blue-500/15 px-5 py-2 text-xl font-black text-blue-300">
                {match.score}
              </div>

              <div className="font-bold">
                {match.away}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIVISIONS */}
      <section
        id="divisions"
        className="border-y border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Чемпіонат
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Дивізіони
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {divisions.map((division) => (
              <a
                key={division.number}
                href={`/divisions/${Number(
                  division.number
                )}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="absolute right-3 top-0 text-7xl font-black text-white/[0.025]">
                  {division.number}
                </div>

                <div className="relative">
                  <div className="text-sm font-black uppercase tracking-wider text-blue-400">
                    {division.name}
                  </div>

                  <div className="mt-10 text-xs uppercase tracking-[0.2em] text-white/30">
                    Лідер
                  </div>

                  <div className="mt-2 text-2xl font-black">
                    {division.leader}
                  </div>

                  <div className="mt-7 flex items-end justify-between border-t border-white/10 pt-5">
                    <span className="text-sm text-white/35">
                      Очки
                    </span>

                    <span className="text-4xl font-black">
                      {division.points}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* TOURNAMENTS */}
      <section
        id="tournaments"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Турніри
          </h2>

          <div className="mt-2 text-sm text-white/35">
            Сезон {currentSeason}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(
            (tournament) => (
              <a
                key={tournament.id}
                href={tournament.href}
                className="group relative min-h-52 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-[#07101d] to-[#030711] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="absolute -right-5 -top-7 text-[110px] font-black text-white/[0.025]">
                  {tournament.short}
                </div>

                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 font-black text-blue-300">
                    {tournament.short}
                  </div>

                  <div>
                    <div className="text-2xl font-black">
                      {tournament.name}
                    </div>

                    <div className="mt-2 text-sm text-white/35">
                      {tournament.href ===
                      "#"
                        ? "Сторінка буде додана"
                        : "Перейти до турніру →"}
                    </div>
                  </div>
                </div>
              </a>
            )
          )}
        </div>
      </section>

      {/* NEWS */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Новини
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Останні події
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              "Новий сезон Iron League",
              "Єврокубки Iron League",
              "Підготовка до наступного сезону",
            ].map(
              (title, index) => (
                <article
                  key={title}
                  className="rounded-3xl border border-white/10 bg-[#07101d] p-7"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
                    Iron League • 0
                    {index + 1}
                  </div>

                  <h3 className="mt-5 text-2xl font-black leading-tight">
                    {title}
                  </h3>

                  <p className="mt-4 text-sm leading-6 text-white/40">
                    Новини, результати та
                    головні події турнірів
                    Iron League.
                  </p>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-black tracking-[0.16em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/30">
              Більше ніж гра
            </div>
          </div>

          <div className="text-sm text-white/30">
            © 2026 Iron League
          </div>
        </div>
      </footer>
    </main>
  );
}