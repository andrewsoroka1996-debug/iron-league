export default function SeasonTwoPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-4">
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/40">
                Історія • Сезон 2
              </div>
            </div>
          </a>

          <a
            href="/history"
            className="font-bold text-blue-300"
          >
            ← Усі сезони
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Архів Iron League
        </div>

        <h1 className="mt-4 text-5xl font-black">
          Сезон 2
        </h1>

        <div className="mt-12 rounded-3xl border border-white/10 bg-[#07101d] p-10">
          <h2 className="text-3xl font-black">
            Дані буде додано
          </h2>

          <p className="mt-4 text-white/45">
            Склади, результати, таблиці, турніри та переможці
            другого сезону Iron League будуть внесені пізніше.
          </p>
        </div>
      </section>
    </main>
  );
}