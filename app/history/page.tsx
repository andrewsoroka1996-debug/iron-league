export const dynamic = "force-dynamic";
export const revalidate = 0;

const seasons = [
  {
    number: 1,
    title: "Сезон 1",
    status: "Дані буде додано",
    href: "/history/season-1",
  },
  {
    number: 2,
    title: "Сезон 2",
    status: "Дані буде додано",
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
      {/* HEADER */}

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
                Історія
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← На головну
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/70" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/75" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Історія ліги
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/45">
            Архів сезонів Iron League:
            склади, таблиці, турніри,
            переможці, статистика та
            головні події.
          </p>
        </div>
      </section>

      {/* SEASONS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Архів
        </div>

        <h2 className="mt-3 text-3xl font-black">
          Сезони
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {seasons.map((season) => (
            <a
              key={season.number}
              href={season.href}
              className="group relative min-h-[250px] overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-[#091525]"
            >
              {/* BACKGROUND NUMBER */}

              <div className="pointer-events-none absolute right-5 top-0 text-[115px] font-black leading-none text-white/[0.025]">
                {season.number}
              </div>

              {/* CONTENT */}

              <div className="relative flex h-full flex-col">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
                  Iron League
                </div>

                <h3 className="mt-5 text-3xl font-black">
                  {season.title}
                </h3>

                <div className="mt-3 text-sm text-white/35">
                  {season.status}
                </div>

                <div className="mt-auto flex items-center justify-between pt-12">
                  <span className="font-bold text-blue-300">
                    Відкрити сезон
                  </span>

                  <span className="text-blue-400 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="mt-8 border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
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