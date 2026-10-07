const sections = [
  {
    title: "1 Дивізіон",
    category: "Чемпіонат",
    href: "/divisions/1",
  },
  {
    title: "2 Дивізіон",
    category: "Чемпіонат",
    href: "/divisions/2",
  },
  {
    title: "3 Дивізіон",
    category: "Чемпіонат",
    href: "/divisions/3",
  },
  {
    title: "4 Дивізіон",
    category: "Чемпіонат",
    href: "/divisions/4",
  },
  {
    title: "Ліга чемпіонів",
    category: "Єврокубок",
    href: "/tournaments/champions-league",
  },
  {
    title: "Ліга Європи",
    category: "Єврокубок",
    href: "/tournaments/europa-league",
  },
  {
    title: "Ліга конференцій",
    category: "Єврокубок",
    href: "/tournaments/conference-league",
  },
  {
    title: "Кубки дивізіонів",
    category: "Кубки",
    href: "/tournaments/division-cups",
  },
  {
    title: "Ліга асоціацій",
    category: "Командний турнір",
    href: "/tournaments/associations",
  },
  {
    title: "Iron Co-op Cup",
    category: "2 × 2",
    href: "/tournaments/coop-cup",
  },
];

export default function SeasonThreePage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-4">
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto object-contain"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/40">
                Історія • Сезон 3
              </div>
            </div>
          </a>

          <a
            href="/history"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← Усі сезони
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Архів Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Сезон 3
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Склад учасників, дивізіони, єврокубки, кубки та
            командні турніри третього сезону Iron League.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Дивізіонів
              </span>
              <span className="ml-2 font-black">4</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Гравців
              </span>
              <span className="ml-2 font-black">64</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
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
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Турніри
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Сезон 3
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className="group rounded-3xl border border-white/10 bg-[#07101d] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                {section.category}
              </div>

              <h3 className="mt-4 text-2xl font-black">
                {section.title}
              </h3>

              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="text-sm text-white/35">
                  Відкрити
                </span>

                <span className="font-black text-blue-400 transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Hall of Fame
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Переможці сезону
          </h2>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-8">
            <p className="text-white/45">
              Чемпіони дивізіонів і переможці турнірів будуть
              додані після завершення сезону.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}