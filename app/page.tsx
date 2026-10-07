export default function Home() {
  const results = [
    { home: "Andrew_SM", score: "3 : 1", away: "Valdemar" },
    { home: "TheLP9", score: "2 : 2", away: "Soga" },
    { home: "4ydeca", score: "1 : 0", away: "Deyl_23" },
  ];

  const divisions = [
    { name: "1 ДИВІЗІОН", leader: "Andrew_SM", points: 24 },
    { name: "2 ДИВІЗІОН", leader: "4ydeca", points: 21 },
    { name: "3 ДИВІЗІОН", leader: "Valdemar", points: 19 },
    { name: "4 ДИВІЗІОН", leader: "Soga", points: 18 },
  ];

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050914]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-2xl font-black tracking-[0.2em] text-blue-400">
              IRON LEAGUE
            </div>
            <div className="text-xs uppercase tracking-[0.35em] text-white/40">
              більше ніж гра
            </div>
          </div>

          <nav className="hidden gap-8 text-sm font-semibold text-white/70 lg:flex">
            <a href="#" className="text-white hover:text-blue-400">
              Головна
            </a>
            <a href="#matches" className="hover:text-blue-400">
              Матчі
            </a>
            <a href="#divisions" className="hover:text-blue-400">
              Дивізіони
            </a>
            <a href="#tournaments" className="hover:text-blue-400">
              Турніри
            </a>
            <a href="#" className="hover:text-blue-400">
              Гравці
            </a>
            <a href="#" className="hover:text-blue-400">
              Історія
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#123b75_0%,#071426_35%,#050914_70%)]" />

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-block rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
              eFootball Competition
            </div>

            <h1 className="text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-8xl">
              IRON
              <span className="block text-blue-400">LEAGUE</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
              Турнір, де кожен матч має значення. Дивізіони, єврокубки,
              статистика, результати та головні події Iron League в одному місці.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#matches"
                className="rounded-xl bg-blue-500 px-6 py-3 font-bold transition hover:bg-blue-400"
              >
                Переглянути матчі
              </a>

              <a
                href="#divisions"
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition hover:bg-white/10"
              >
                Турнірні таблиці
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 text-center text-xs font-bold uppercase tracking-[0.3em] text-blue-300">
              Матч дня
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-[#071326] p-8">
              <div className="text-center text-sm text-white/40">
                1 Дивізіон
              </div>

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-2xl font-black">
                    AS
                  </div>
                  <div className="text-xl font-black">Andrew_SM</div>
                </div>

                <div className="text-3xl font-black text-blue-400">VS</div>

                <div>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-2xl font-black">
                    VD
                  </div>
                  <div className="text-xl font-black">Valdemar</div>
                </div>
              </div>

              <div className="mt-8 text-center text-sm text-white/40">
                Найближчий центральний матч Iron League
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="matches" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-400">
            Результати
          </p>
          <h2 className="mt-2 text-3xl font-black">Останні матчі</h2>
        </div>

        <div className="grid gap-4">
          {results.map((match) => (
            <div
              key={`${match.home}-${match.away}`}
              className="grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5"
            >
              <div className="text-right font-bold">{match.home}</div>
              <div className="mx-6 rounded-lg bg-blue-500/15 px-4 py-2 text-xl font-black text-blue-300">
                {match.score}
              </div>
              <div className="font-bold">{match.away}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="divisions" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-400">
              Чемпіонат
            </p>
            <h2 className="mt-2 text-3xl font-black">Дивізіони</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {divisions.map((division) => (
              <div
                key={division.name}
                className="rounded-2xl border border-white/10 bg-[#08111f] p-6 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-sm font-black tracking-wider text-blue-400">
                  {division.name}
                </div>

                <div className="mt-8 text-xs uppercase tracking-[0.2em] text-white/40">
                  Лідер
                </div>

                <div className="mt-2 text-2xl font-black">{division.leader}</div>

                <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                  <span className="text-sm text-white/40">Очки</span>
                  <span className="text-3xl font-black">{division.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tournaments" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </p>
          <h2 className="mt-2 text-3xl font-black">Турніри</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            "Ліга чемпіонів",
            "Ліга Європи",
            "Ліга конференцій",
            "Кубки дивізіонів",
            "League of Associations",
            "Iron Co-op Cup",
          ].map((name) => (
            <div
              key={name}
              className="flex min-h-40 items-end rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-white/[0.03] p-6"
            >
              <div className="text-xl font-black">{name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <div>© Iron League</div>
          <div>Більше ніж гра</div>
        </div>
      </footer>
    </main>
  );
}