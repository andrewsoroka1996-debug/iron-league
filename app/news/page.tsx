export const dynamic = "force-dynamic";
export const revalidate = 0;

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  href: string;
};

const news: NewsItem[] = [];

export default function NewsPage() {
  const featuredNews =
    news[0] ?? null;

  const otherNews =
    news.slice(1);

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
                Новини
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
            Новини
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/45">
            Головні події Iron League:
            результати, жеребкування,
            турніри, матчі дня та
            офіційні оголошення.
          </p>
        </div>
      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        {featuredNews ? (
          <>
            {/* FEATURED NEWS */}

            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Головна новина
            </div>

            <a
              href={featuredNews.href}
              className="group mt-8 block overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition hover:border-blue-400/30"
            >
              <div className="grid lg:grid-cols-[1.4fr_1fr]">
                <div className="relative min-h-[320px] overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage:
                        "url('/stadium-bg.jpg')",
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-[#07101d]/20 to-[#07101d]" />

                  <div className="absolute bottom-8 left-8">
                    <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                      {featuredNews.category}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-8 lg:p-10">
                  <div className="text-sm font-semibold text-white/30">
                    {featuredNews.date}
                  </div>

                  <h2 className="mt-4 text-3xl font-black leading-tight">
                    {featuredNews.title}
                  </h2>

                  <p className="mt-5 leading-7 text-white/45">
                    {featuredNews.excerpt}
                  </p>

                  <div className="mt-8 font-black text-blue-300">
                    Читати новину →
                  </div>
                </div>
              </div>
            </a>

            {/* OTHER NEWS */}

            {otherNews.length > 0 && (
              <div className="mt-16">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Останні події
                </div>

                <h2 className="mt-3 text-3xl font-black">
                  Усі новини
                </h2>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {otherNews.map(
                    (item) => (
                      <a
                        key={item.id}
                        href={item.href}
                        className="group rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/30"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
                            {item.category}
                          </div>

                          <div className="text-xs text-white/25">
                            {item.date}
                          </div>
                        </div>

                        <h3 className="mt-5 text-2xl font-black leading-tight">
                          {item.title}
                        </h3>

                        <p className="mt-4 leading-7 text-white/40">
                          {item.excerpt}
                        </p>

                        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                          <span className="text-sm text-white/30">
                            Детальніше
                          </span>

                          <span className="text-blue-400 transition group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* EMPTY STATE */

          <div className="py-8">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Новини Iron League
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Останні події
            </h2>

            <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.06] blur-[90px]" />

              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-3xl">
                  IL
                </div>

                <h3 className="mt-6 text-3xl font-black">
                  Новин поки немає
                </h3>

                <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/40">
                  Офіційні новини,
                  результати,
                  жеребкування та
                  головні події Iron League
                  з&apos;являться тут після
                  публікації.
                </p>
              </div>
            </div>

            {/* CATEGORIES */}

            <div className="mt-12">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/25">
                Категорії
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  "Сезон",
                  "Дивізіони",
                  "Єврокубки",
                  "Кубки",
                  "Кубок асоціацій",
                  "Iron Co-op Cup",
                  "Матч дня",
                  "Оголошення",
                ].map(
                  (category) => (
                    <div
                      key={category}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/40"
                    >
                      {category}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
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