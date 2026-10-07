import { season4 } from "../../../data/seasons/season-4";

const sections = [
  { title: "1 Дивізіон", category: "Чемпіонат" },
  { title: "2 Дивізіон", category: "Чемпіонат" },
  { title: "3 Дивізіон", category: "Чемпіонат" },
  { title: "4 Дивізіон", category: "Чемпіонат" },
  { title: "Ліга чемпіонів", category: "Єврокубок" },
  { title: "Ліга Європи", category: "Єврокубок" },
  { title: "Ліга конференцій", category: "Єврокубок" },
  { title: "Кубки дивізіонів", category: "Кубки" },
  { title: "Ліга асоціацій", category: "Командний турнір" },
  { title: "Iron Co-op Cup", category: "2 × 2" },
];

export default function SeasonFourPage() {
  const totalPlayers =
    season4.division1.players.length +
    season4.division2.players.length +
    season4.division3.players.length +
    season4.division4.players.length;

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
                Сезон 4
              </div>
            </div>
          </a>

          <a
            href="/history"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300"
          >
            ← Усі сезони
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/stadium-bg.jpg')" }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Наступний сезон Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Сезон 4
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Підготовка структури наступного сезону. Склади дивізіонів,
            жеребкування та турнірні сітки будуть додаватися поступово.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">Статус</span>
              <span className="ml-2 font-black text-blue-300">
                Підготовка
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">Гравців</span>
              <span className="ml-2 font-black">{totalPlayers}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Структура сезону
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Турніри
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-3xl border border-white/10 bg-[#07101d] p-7"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                {section.category}
              </div>

              <h3 className="mt-4 text-2xl font-black">
                {section.title}
              </h3>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/35">
                Очікує наповнення
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}