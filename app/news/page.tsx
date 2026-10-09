import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

type NewsItem = {
  id: string;

  title: string;

  slug: string;

  excerpt: string | null;

  content: string;

  category: string;

  image_url: string | null;

  published: boolean;

  published_at: string | null;

  created_at: string;
};

const categories = [
  "Сезон",
  "Дивізіони",
  "Єврокубки",
  "Кубки",
  "Кубок асоціацій",
  "Iron Co-op Cup",
  "Матч дня",
  "Оголошення",
];

function formatDate(
  date: string | null
) {
  if (!date) {
    return "";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "uk-UA",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

export default async function NewsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedCategory =
    params.category;

  const selectedCategory =
    requestedCategory &&
    categories.includes(
      requestedCategory
    )
      ? requestedCategory
      : null;

  /*
    ========================================
    ЗАВАНТАЖЕННЯ НОВИН
    ========================================
  */

  let query =
    supabase
      .from("news")
      .select(
        `
          id,
          title,
          slug,
          excerpt,
          content,
          category,
          image_url,
          published,
          published_at,
          created_at
        `
      )
      .eq(
        "published",
        true
      );

  /*
    ФІЛЬТР КАТЕГОРІЇ
  */

  if (selectedCategory) {
    query =
      query.eq(
        "category",
        selectedCategory
      );
  }

  const {
    data,
    error,
  } =
    await query.order(
      "published_at",
      {
        ascending: false,
        nullsFirst: false,
      }
    );

  if (error) {
    console.error(
      "NEWS PAGE ERROR:",
      error
    );
  }

  const news =
    (data ?? []) as NewsItem[];

  const featuredNews =
    news[0] ?? null;

  const otherNews =
    news.slice(1);

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
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
        {/* CATEGORIES */}

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/25">
            Категорії
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/news"
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                !selectedCategory
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                  : "border-white/10 bg-white/[0.03] text-white/40 hover:border-blue-400/30 hover:text-blue-300"
              }`}
            >
              Усі
            </a>

            {categories.map(
              (category) => {
                const active =
                  selectedCategory ===
                  category;

                return (
                  <a
                    key={
                      category
                    }
                    href={`/news?category=${encodeURIComponent(
                      category
                    )}`}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      active
                        ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                        : "border-white/10 bg-white/[0.03] text-white/40 hover:border-blue-400/30 hover:text-blue-300"
                    }`}
                  >
                    {
                      category
                    }
                  </a>
                );
              }
            )}
          </div>
        </div>

        {/* CATEGORY TITLE */}

        {selectedCategory && (
          <div className="mt-12">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Категорія
            </div>

            <h2 className="mt-3 text-4xl font-black">
              {
                selectedCategory
              }
            </h2>
          </div>
        )}

        {/* NEWS */}

        {featuredNews ? (
          <div
            className={
              selectedCategory
                ? "mt-8"
                : "mt-14"
            }
          >
            {/* FEATURED */}

            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              {selectedCategory
                ? "Остання новина"
                : "Головна новина"}
            </div>

            <a
              href={`/news/${featuredNews.slug}`}
              className="group mt-8 block overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition duration-300 hover:border-blue-400/30"
            >
              <div className="grid lg:grid-cols-[1.3fr_1fr]">
                {/* IMAGE */}

                <div className="relative min-h-[340px] overflow-hidden bg-gradient-to-br from-blue-500/10 to-[#030711]">
                  {featuredNews.image_url ? (
                    <>
                      <img
                        src={
                          featuredNews.image_url
                        }
                        alt={
                          featuredNews.title
                        }
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />

                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#07101d]/80" />
                    </>
                  ) : (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30"
                        style={{
                          backgroundImage:
                            "url('/stadium-bg.jpg')",
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-[#07101d]" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 text-3xl font-black text-blue-300">
                          IL
                        </div>
                      </div>
                    </>
                  )}

                  <div className="absolute bottom-7 left-7 rounded-full border border-blue-400/30 bg-[#030711]/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300 backdrop-blur-xl">
                    {
                      featuredNews.category
                    }
                  </div>
                </div>

                {/* TEXT */}

                <div className="flex flex-col justify-center p-8 lg:p-10">
                  <div className="text-sm font-semibold text-white/30">
                    {formatDate(
                      featuredNews.published_at
                    )}
                  </div>

                  <h2 className="mt-4 text-3xl font-black leading-tight lg:text-4xl">
                    {
                      featuredNews.title
                    }
                  </h2>

                  {featuredNews.excerpt && (
                    <p className="mt-5 leading-7 text-white/45">
                      {
                        featuredNews.excerpt
                      }
                    </p>
                  )}

                  <div className="mt-8 font-black text-blue-300 transition group-hover:text-blue-200">
                    Читати новину →
                  </div>
                </div>
              </div>
            </a>

            {/* OTHER NEWS */}

            {otherNews.length >
              0 && (
              <div className="mt-16">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Останні події
                </div>

                <h2 className="mt-3 text-3xl font-black">
                  {selectedCategory
                    ? `Інші новини: ${selectedCategory}`
                    : "Усі новини"}
                </h2>

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {otherNews.map(
                    (item) => (
                      <a
                        key={
                          item.id
                        }
                        href={`/news/${item.slug}`}
                        className="group overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition duration-300 hover:-translate-y-1 hover:border-blue-400/30"
                      >
                        <div className="relative h-52 overflow-hidden bg-[#030711]">
                          {item.image_url ? (
                            <img
                              src={
                                item.image_url
                              }
                              alt={
                                item.title
                              }
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/10 to-[#030711]">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300">
                                IL
                              </div>
                            </div>
                          )}

                          <div className="absolute left-5 top-5 rounded-full border border-blue-400/20 bg-[#030711]/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-300 backdrop-blur">
                            {
                              item.category
                            }
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="text-xs text-white/25">
                            {formatDate(
                              item.published_at
                            )}
                          </div>

                          <h3 className="mt-3 text-2xl font-black leading-tight">
                            {
                              item.title
                            }
                          </h3>

                          {item.excerpt && (
                            <p className="mt-4 line-clamp-3 leading-7 text-white/40">
                              {
                                item.excerpt
                              }
                            </p>
                          )}

                          <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                            <span className="text-sm text-white/30">
                              Детальніше
                            </span>

                            <span className="text-blue-400 transition group-hover:translate-x-1">
                              →
                            </span>
                          </div>
                        </div>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* EMPTY */

          <div className="py-12">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.06] blur-[90px]" />

              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-3xl font-black text-blue-300">
                  IL
                </div>

                <h3 className="mt-6 text-3xl font-black">
                  {selectedCategory
                    ? "У цій категорії новин поки немає"
                    : "Новин поки немає"}
                </h3>

                {selectedCategory ? (
                  <>
                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/40">
                      У категорії{" "}
                      <span className="font-bold text-white/60">
                        {
                          selectedCategory
                        }
                      </span>{" "}
                      ще немає
                      опублікованих
                      матеріалів.
                    </p>

                    <a
                      href="/news"
                      className="mt-7 inline-block font-black text-blue-300"
                    >
                      ← Показати всі
                      новини
                    </a>
                  </>
                ) : (
                  <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/40">
                    Офіційні новини,
                    результати,
                    жеребкування та
                    головні події Iron
                    League
                    з&apos;являться тут
                    після публікації.
                  </p>
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