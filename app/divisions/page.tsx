
import Link from "next/link";

import StadiumBackground from "../../components/StadiumBackground";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";

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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK LINK */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </Link>

          {/* PAGE TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · CHAMPIONSHIP
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Дивізіони
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Чотири дивізіони — одна футбольна ліга.
              Переглядай турнірні таблиці, календарі,
              результати та статистику чемпіонату Iron League.
            </p>
          </div>

          {/* DIVISIONS COUNT */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-blue-400/15 bg-[#07101d]/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-xl font-black text-blue-300">
              4
            </div>

            <div>
              <div className="text-sm font-black text-white">
                Дивізіони Iron League
              </div>

              <div className="mt-0.5 text-xs text-white/40">
                Обери дивізіон для перегляду
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVISIONS SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* SECTION HEADER */}
        <div className="mb-6 sm:mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
            ЧЕМПІОНАТ
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Обрати дивізіон
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Перейди до потрібного дивізіону та переглянь
            інформацію про його сезон.
          </p>
        </div>

        {/* DIVISIONS GRID */}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {divisions.map((division) => (
            <Link
              key={division.number}
              href={`/divisions/${Number(division.number)}`}
              aria-label={`Відкрити ${division.name}`}
              className="group relative flex min-h-[182px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/40 hover:bg-[#0a1729] hover:shadow-[0_18px_45px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:min-h-[200px] sm:p-6"
            >
              {/* BACKGROUND ACCENT */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-full bg-blue-500/[0.07] blur-3xl"
              />

              {/* CARD CONTENT */}
              <div className="relative flex flex-1 flex-col">
                {/* TOP LABEL */}
                <div className="flex items-center gap-3">
                  <div className="h-7 w-1 rounded-full bg-blue-400" />

                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-400">
                    DIVISION {division.number}
                  </span>
                </div>

                {/* NAME AND DESCRIPTION */}
                <div className="mt-4">
                  <h3 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {division.name}
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
                    {division.description}
                  </p>
                </div>

                {/* CARD FOOTER */}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-xs font-bold text-blue-300 transition group-hover:text-blue-200 sm:text-sm">
                    Переглянути дивізіон
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

      {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}
