
import Link from "next/link";
import SiteHeader from "../../components/public/SiteHeader";

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

      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* PAGE CONTENT */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">

        {/* SECTION HEADER */}
        <div className="mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Чемпіонат Iron League
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Дивізіони
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">
            Турнірні таблиці, матчі, результати та
            статистика всіх чотирьох дивізіонів
            Iron League.
          </p>
        </div>

        {/* DIVISIONS GRID */}
        <div className="grid gap-6 md:grid-cols-2">
          {divisions.map((division) => (
            <div
              key={division.number}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:shadow-[0_15px_50px_rgba(59,130,246,0.08)] sm:p-8"
            >

              {/* BACKGROUND NUMBER */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-0 text-[100px] font-black leading-none text-white/[0.03]"
              >
                {division.number}
              </div>

              {/* CARD CONTENT */}
              <div className="relative">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
                  Division {division.number}
                </div>

                <h2 className="mt-4 text-3xl font-black">
                  {division.name}
                </h2>

                <p className="mt-3 min-h-12 text-sm leading-6 text-white/50">
                  {division.description}
                </p>

                {/* DIVISION LINK */}
                <Link
                  href={`/divisions/${Number(division.number)}`}
                  className="mt-8 inline-flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 text-sm font-bold text-blue-300 transition-all duration-200 hover:border-blue-400/40 hover:bg-blue-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                >
                  Відкрити дивізіон

                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
