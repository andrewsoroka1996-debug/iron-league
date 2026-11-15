import Link from "next/link";

import StadiumBackground from "../../components/StadiumBackground";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Статуси сезонів редакційні: завершені 1–2 не перераховуємо,
// сезон 3 активний, сезон 4 лише готується.
const seasons = [
  {
    number: 3,
    title: "Сезон 3",
    status: "Триває",
    href: "/history/season-3",
    description: "Актуальна боротьба, результати матчів та вже підтверджені трофеї.",
    kicker: "СЬОГОДНІ",
  },
  {
    number: 2,
    title: "Сезон 2",
    status: "Завершений",
    href: "/history/season-2",
    description: "Другий розділ історії: зафіксовані турнірні таблиці та чемпіони.",
    kicker: "АРХІВ",
  },
  {
    number: 1,
    title: "Сезон 1",
    status: "Завершений",
    href: "/history/season-1",
    description: "Точка відліку Iron League. Перші змагання й перші переможці.",
    kicker: "ПОЧАТОК",
  },
  {
    number: 4,
    title: "Сезон 4",
    status: "Підготовка",
    href: "/history/season-4",
    description: "Наступна сторінка історії. Склади й календарі ще формуються.",
    kicker: "ПОПЕРЕДУ",
  },
] as const;

const summary = [
  { value: "04", label: "Сезони у розділі", note: "Від початку до планів" },
  { value: "02", label: "Завершені сезони", note: "Результати в архіві" },
  { value: "01", label: "Активний сезон", note: "Триває боротьба" },
  { value: "01", label: "У підготовці", note: "Майбутні турніри" },
];

export default function HistoryPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030711] text-white">
      <SiteHeader />

      {/* EDITORIAL OPENING — історія ліги, а не просто список сторінок */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#06101f]/95 to-[#071629]/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl sm:h-[430px] sm:w-[430px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 lg:pb-14">
          <Link href="/" className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-blue-300 transition hover:text-white sm:text-sm">
            <span aria-hidden="true">←</span> На головну
          </Link>

          <div className="mt-5 grid items-stretch gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(290px,0.7fr)] lg:gap-7">
            <div className="relative flex min-w-0 flex-col justify-center py-1 sm:py-4">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.23em] text-yellow-300 sm:text-xs">
                <span className="h-px w-8 bg-yellow-300/80" aria-hidden="true" />
                LEGACY OF IRON LEAGUE
              </div>
              <h1 className="mt-4 w-full min-w-0 max-w-full box-border pb-2 pr-2 font-black leading-[1.12] tracking-tight text-[clamp(1.875rem,8.4vw,2.6rem)] sm:text-[clamp(2.5rem,5.4vw,4.1rem)] lg:text-[clamp(2.75rem,3.8vw,3.8rem)] xl:text-[clamp(3.25rem,4vw,4.35rem)]">
                <span className="block">Історія</span>
                <span className="block max-w-full bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">Iron League</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300/80 sm:text-base sm:leading-8">
                Кожен сезон залишає свій слід: суперництво, нові імена та трофеї, які стають частиною історії ліги.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/history/season-3"
                  className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-blue-400/60 bg-blue-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_30px_rgba(37,99,235,0.20)] transition hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                >
                  Поточний сезон <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/history/overall" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/[0.08] px-4 py-2.5 text-sm font-black text-yellow-200 transition hover:border-yellow-400/60 hover:text-white">
                  Загальна історія <span aria-hidden="true">↗</span>
                </Link>
                <a href="#history-chronicle" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:border-blue-300/30 hover:text-white">
                  Хронологія <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>

            <Link
              href="/history/season-3"
              aria-label="Переглянути актуальний сезон 3"
              className="group history-v7-featured-season relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-[22px] border border-blue-400/30 bg-gradient-to-br from-[#142b47] via-[#0b1d32] to-[#07111f] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.20)] transition hover:border-blue-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 sm:p-6 lg:min-h-[260px] lg:justify-between lg:p-7"
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-400 via-blue-400/70 to-transparent" />
              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-200 sm:text-[11px]">АКТУАЛЬНИЙ СЕЗОН</span>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-bold text-emerald-200 sm:text-[11px]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Триває
                </span>
              </div>
              <div className="relative min-w-0">
                <h2 className="text-[clamp(1.9rem,7vw,2.5rem)] font-black leading-tight tracking-tight text-white sm:text-4xl">Сезон 3</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100/70">
                  Поточний розіграш Iron League. Результати, таблиці та боротьба за нові трофеї.
                </p>
              </div>
              <div className="relative flex items-center justify-between gap-3 border-t border-blue-200/15 pt-4 text-sm font-bold text-blue-200 transition group-hover:text-white">
                <span>Переглянути сезон</span>
                <span aria-hidden="true" className="text-lg transition-transform group-hover:translate-x-1">↗</span>
              </div>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-white/10 pt-4 text-[11px] font-semibold text-slate-400 sm:mt-7 sm:justify-start sm:gap-x-4 sm:text-xs">
            <span className="whitespace-nowrap"><span className="font-black text-white">{Number(summary[0]?.value ?? 0)}</span> сезони</span>
            <span aria-hidden="true" className="text-blue-300/40">·</span>
            <span className="whitespace-nowrap"><span className="font-black text-white">{Number(summary[1]?.value ?? 0)}</span> завершені</span>
            <span aria-hidden="true" className="text-blue-300/40">·</span>
            <span className="whitespace-nowrap"><span className="font-black text-white">{Number(summary[3]?.value ?? 0)}</span> у підготовці</span>
          </div>
        </div>
      </section>

      {/* CHRONICLE — статус сезону читається одразу, але дані не підміняються */}
      <section id="history-chronicle" className="scroll-mt-24 mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400 sm:text-xs">ХРОНІКА ЗМАГАНЬ</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Чотири розділи однієї історії</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/50 sm:text-sm">Обери сезон, щоб переглянути турніри, результати та Зал слави.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55">01 — 04</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
          {seasons.map((season) => {
            const isCurrent = season.number === 3;
            const isPreparing = season.number === 4;
            const isArchive = season.number <= 2;
            return (
              <Link
                key={season.number}
                href={season.href}
                aria-label={`Відкрити ${season.title}`}
                className={`group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border p-5 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 sm:p-6 ${
                  isCurrent
                    ? "min-h-[240px] border-blue-400/35 bg-gradient-to-br from-[#17385b] via-[#0b1e34] to-[#06101e] shadow-[0_18px_45px_rgba(3,7,18,0.25)] lg:col-span-7 lg:row-span-2 lg:min-h-[380px] lg:p-8"
                    : isPreparing
                      ? "min-h-[158px] border-white/10 bg-gradient-to-r from-[#111c2a] to-[#0a111c] lg:col-span-12 lg:min-h-[144px]"
                      : "min-h-[164px] border-white/10 bg-gradient-to-br from-[#111e2d] to-[#07111f] hover:border-amber-300/30 lg:col-span-5"
                }`}
              >
                <span aria-hidden="true" className={`pointer-events-none absolute -bottom-8 right-2 select-none font-black leading-none tracking-tighter ${isCurrent ? "text-[190px] text-blue-200/[0.045] lg:text-[270px]" : "text-[135px] text-white/[0.035]"}`}>
                  {String(season.number).padStart(2, "0")}
                </span>
                <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${isCurrent ? "from-sky-400 via-blue-500/60" : isPreparing ? "from-slate-500/50 via-slate-400/15" : "from-yellow-300/70 via-yellow-500/15"} to-transparent`} />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isArchive ? "text-yellow-300/80" : "text-blue-300"}`}>{season.kicker} · {String(season.number).padStart(2, "0")}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${isCurrent ? "border-blue-400/30 bg-blue-400/10 text-blue-200" : isPreparing ? "border-white/10 bg-white/[0.035] text-white/55" : "border-yellow-300/15 bg-yellow-300/[0.06] text-yellow-100/70"}`}>
                    {season.status}
                  </span>
                </div>
                <div className="relative mt-6 flex items-center gap-4 lg:mt-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-2xl font-black tabular-nums sm:h-16 sm:w-16 ${isCurrent ? "border-blue-300/40 bg-blue-300/10 text-blue-100" : isPreparing ? "border-white/10 bg-white/[0.025] text-white/50" : "border-yellow-400/20 bg-yellow-400/[0.04] text-yellow-200/90"}`}>
                    {String(season.number).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-black tracking-tight text-white ${isCurrent ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl sm:text-2xl"}`}>{season.title}</h3>
                    <p className="mt-1 max-w-md text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">{season.description}</p>
                  </div>
                </div>
                <div className="relative mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs font-bold text-blue-200/80 transition group-hover:text-white">
                  <span>{isCurrent ? "Поточні турніри й нагороди" : isPreparing ? "Переглянути підготовку" : "Турніри та чемпіони"}</span>
                  <span aria-hidden="true" className="text-lg transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ALL SEASONS: one official record, across every competition */}
      <section className="border-t border-yellow-400/10 bg-gradient-to-r from-[#111b28] via-[#0b1829] to-[#061121]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          <Link href="/history/overall" className="group flex flex-col gap-4 rounded-[22px] border border-yellow-400/25 bg-gradient-to-br from-[#172536] to-[#0a1524] p-5 transition hover:border-yellow-400/55 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 sm:text-xs">ЗАГАЛЬНИЙ АРХІВ · ALL SEASONS</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Усі чемпіони. Усі турніри. Вся історія.</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-white/55 sm:text-sm">Зведений Зал слави, найтитулованіші гравці, переможці турнірів за сезонами та повний каталог змагань.</p>
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-yellow-300/25 bg-yellow-400/[0.12] px-4 text-sm font-black text-yellow-200 transition group-hover:bg-yellow-400/20 sm:self-auto">Загальна історія <span aria-hidden="true">→</span></span>
          </Link>
        </div>
      </section>

      {/* ACCESS TO REAL HALLS OF FAME — без дублювання чи вигаданих нагород */}
      <section className="border-t border-white/10 bg-gradient-to-b from-[#08111d]/90 to-[#030711]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.21em] text-yellow-300 sm:text-xs">
            <span aria-hidden="true">✦</span> HALL OF FAME
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-4xl">Імена, що залишили слід</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-white/50 sm:text-sm">Зал слави кожного сезону містить лише підтверджені трофеї. Емблеми гравців залишаються актуальними.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {([1, 2, 3] as const).map((number) => (
              <Link
                key={number}
                href={`/history/season-${number}#history-winners`}
                className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-yellow-400/15 bg-gradient-to-r from-[#172130] to-[#0b1422] px-4 py-3 transition hover:border-yellow-400/40 hover:bg-[#192536] sm:min-h-[100px] sm:px-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-300/20 bg-yellow-400/[0.06] text-lg font-black text-yellow-300">{String(number).padStart(2, "0")}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-yellow-300/75">ЗАЛ СЛАВИ</div>
                  <div className="mt-1 text-sm font-black text-white sm:text-base">Сезон {number}</div>
                  <div className="mt-0.5 text-[11px] text-white/45">{number === 3 ? "Підтверджені нагороди" : "Архів чемпіонів"}</div>
                </div>
                <span aria-hidden="true" className="text-lg text-yellow-300 transition group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
