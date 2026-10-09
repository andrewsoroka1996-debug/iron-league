import { season3 } from "../../../data/seasons/season-3";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const playerIds = Array.from(
  new Set([
    ...season3.division1.players,
    ...season3.division2.players,
    ...season3.division3.players,
    ...season3.division4.players,
  ])
);

const tournaments = [
  {
    category: "Чемпіонат",
    name: "1 Дивізіон",
    href: "/divisions/1?season=3",
  },
  {
    category: "Чемпіонат",
    name: "2 Дивізіон",
    href: "/divisions/2?season=3",
  },
  {
    category: "Чемпіонат",
    name: "3 Дивізіон",
    href: "/divisions/3?season=3",
  },
  {
    category: "Чемпіонат",
    name: "4 Дивізіон",
    href: "/divisions/4?season=3",
  },
  {
    category: "Єврокубок",
    name: "Ліга чемпіонів",
    href: "/tournaments/champions-league?season=3",
  },
  {
    category: "Єврокубок",
    name: "Ліга Європи",
    href: "/tournaments/europa-league?season=3",
  },
  {
    category: "Єврокубок",
    name: "Ліга конференцій",
    href: "/tournaments/conference-league?season=3",
  },
  {
    category: "Суперкубок",
    name: "Суперкубок Європи",
    href: "/tournaments/european-super-cup?season=3",
  },
  {
    category: "Кубки",
    name: "Кубки дивізіонів",
    href: "/tournaments/division-cups?season=3",
  },
  {
    category: "Командний турнір",
    name: "Кубок асоціацій",
    href: "/tournaments/associations?season=3",
  },
  {
    category: "2 × 2",
    name: "Iron Co-op Cup",
    href: "/tournaments/coop-cup?season=3",
  },
];

export default function Season3HistoryPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="border-b border-white/10 bg-[#030711]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="flex items-center gap-4"
          >
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto object-contain"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/35">
                Історія • Сезон 3
              </div>
            </div>
          </a>

          <a
            href="/history"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-blue-300"
          >
            ← Усі сезони
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/90 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Архів Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Сезон 3
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/45">
            Склад учасників,
            дивізіони, єврокубки,
            кубки та командні
            турніри третього сезону
            Iron League.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <span className="text-sm text-white/40">
                Дивізіонів
              </span>

              <span className="ml-2 font-black">
                4
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <span className="text-sm text-white/40">
                Гравців
              </span>

              <span className="ml-2 font-black">
                {playerIds.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <span className="text-sm text-white/40">
                Турнірів
              </span>

              <span className="ml-2 font-black">
                {tournaments.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                Поточний сезон
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Турніри
        </div>

        <h2 className="mt-3 text-4xl font-black">
          Сезон 3
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map(
            (tournament) => (
              <a
                key={tournament.name}
                href={tournament.href}
                className="group rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/30"
              >
                <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                  {tournament.category}
                </div>

                <h3 className="mt-5 text-2xl font-black">
                  {tournament.name}
                </h3>

                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-sm text-white/30">
                    Відкрити
                  </span>

                  <span className="text-blue-400 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </a>
            )
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
            Hall of Fame
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Переможці сезону
          </h2>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-8">
            <p className="leading-7 text-white/40">
              Чемпіони дивізіонів і
              переможці турнірів
              будуть додані після
              завершення Сезону 3.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl justify-between px-6 py-10">
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