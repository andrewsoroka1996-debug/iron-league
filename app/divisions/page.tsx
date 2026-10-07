const divisions = [
  {
    number: "01",
    name: "1 Дивізіон",
    description: "Найвищий дивізіон Iron League",
  },
  {
    number: "02",
    name: "2 Дивізіон",
    description: "Другий рівень чемпіонату Iron League",
  },
  {
    number: "03",
    name: "3 Дивізіон",
    description: "Третій дивізіон Iron League",
  },
  {
    number: "04",
    name: "4 Дивізіон",
    description: "Четвертий дивізіон Iron League",
  },
];

export default function DivisionsPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
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
              Дивізіони
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Чемпіонат Iron League
          </div>

          <h1 className="mt-3 text-5xl font-black">
            Дивізіони
          </h1>

          <p className="mt-5 max-w-2xl text-white/50">
            Турнірні таблиці, матчі, результати та статистика
            всіх чотирьох дивізіонів Iron League.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {divisions.map((division) => (
            <div
              key={division.number}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-8 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="absolute right-5 top-0 text-[100px] font-black text-white/[0.03]">
                {division.number}
              </div>

              <div className="relative">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
                  Division {division.number}
                </div>

                <h2 className="mt-4 text-3xl font-black">
                  {division.name}
                </h2>

                <p className="mt-3 text-white/40">
                  {division.description}
                </p>

                <a
  href={`/divisions/${Number(division.number)}`}
  className="mt-8 inline-block rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 font-bold text-blue-300 transition hover:bg-blue-500/20"
>
  Відкрити дивізіон →
</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}