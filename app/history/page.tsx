const seasons = [
  {
    id: 1,
    name: "Сезон 1",
    status: "Дані буде додано",
    href: "/history/season-1",
  },
  {
    id: 2,
    name: "Сезон 2",
    status: "Дані буде додано",
    href: "/history/season-2",
  },
  {
    id: 3,
    name: "Сезон 3",
    status: "Поточний сезон",
    href: "/history/season-3",
  },
  {
  id: 4,
  name: "Сезон 4",
  status: "Підготовка",
  href: "/history/season-4",
},
];

export default function HistoryPage() {
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
                Історія
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300"
          >
            ← На головну
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
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Історія ліги
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Архів сезонів Iron League: склади, таблиці, турніри,
            переможці, статистика та головні події.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Архів
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Сезони
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {seasons.map((season) => (
            <a
              key={season.id}
              href={season.href}
              className="group relative min-h-64 overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="absolute -right-5 -top-8 text-[130px] font-black text-white/[0.025]">
                {season.id}
              </div>

              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Iron League
                  </div>

                  <h3 className="mt-4 text-3xl font-black">
                    {season.name}
                  </h3>

                  <div className="mt-3 text-sm text-white/40">
                    {season.status}
                  </div>
                </div>

                <div className="mt-10 font-bold text-blue-300">
                  Відкрити сезон →
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}