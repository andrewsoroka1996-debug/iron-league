import StadiumBackground from "../../components/StadiumBackground";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";
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
      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        {/* BACKGROUND OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK LINK */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </a>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · NEWS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Новини
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Усі події Iron League в одному місці.
              Результати матчів, жеребкування, турнірні
              новини та офіційні оголошення ліги.
            </p>
          </div>
        </div>
      </section>

{/* CONTENT */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* CATEGORIES */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Категорії новин
          </div>

          <nav
            aria-label="Категорії новин"
            className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"
          >
            {/* ALL NEWS */}
            <a
              href="/news"
              aria-current={
                !selectedCategory ? "page" : undefined
              }
              className={`flex min-h-10 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-xs font-bold transition sm:px-5 sm:text-sm ${
                !selectedCategory
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                  : "border-white/10 bg-[#07101d] text-white/55 hover:border-blue-400/25 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              Усі новини
            </a>

            {/* CATEGORY LINKS */}
            {categories.map((category) => {
              const active =
                selectedCategory === category;

              return (
                <a
                  key={category}
                  href={`/news?category=${encodeURIComponent(
                    category
                  )}`}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={`flex min-h-10 min-w-0 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-xs font-bold leading-5 transition sm:px-5 sm:text-sm ${
                    active
                      ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-[#07101d] text-white/55 hover:border-blue-400/25 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span className="break-words">
                    {category}
                  </span>
                </a>
              );
            })}
          </nav>
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
              className="group mt-6 block overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] transition duration-300 hover:border-blue-400/30 sm:rounded-3xl"
            >
              <div className="grid lg:grid-cols-[1.3fr_1fr]">
                {/* FEATURED IMAGE */}
                <div className="relative h-52 overflow-hidden bg-[#030711] sm:h-64 lg:h-auto lg:min-h-[340px]">
                  {featuredNews.image_url ? (
                    <>
                      <img
                        src={featuredNews.image_url}
                        alt={featuredNews.title}
                        className="absolute inset-0 h-full w-full object-contain transition duration-700 group-hover:scale-[1.02] lg:object-cover"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101d]/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#07101d]/80" />
                    </>
                  ) : (
                    <>
                      <StadiumBackground
                        opacity="30"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-[#07101d]/70" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300 sm:h-20 sm:w-20 sm:text-2xl">
                          IL
                        </div>
                      </div>
                    </>
                  )}

                  {/* CATEGORY */}
                  <div className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] rounded-full border border-blue-400/30 bg-[#030711]/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-300 backdrop-blur-xl sm:bottom-5 sm:left-5 sm:text-xs">
                    {featuredNews.category}
                  </div>
                </div>

                {/* FEATURED TEXT */}
                <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6 lg:p-10">
                  <div className="text-xs font-semibold text-white/40 sm:text-sm">
                    {formatDate(featuredNews.published_at)}
                  </div>

                  <h2 className="mt-3 break-words text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                    {featuredNews.title}
                  </h2>

                  {featuredNews.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/50 sm:line-clamp-4 sm:text-base sm:leading-7">
                      {featuredNews.excerpt}
                    </p>
                  )}

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-300 transition group-hover:text-blue-200 sm:text-base">
                    Читати новину

                    <span
                      aria-hidden="true"
                      className="transition group-hover:translate-x-1"
                    >
                      →
                    </span>
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

                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {otherNews.map((item) => (
                    <a
                      key={item.id}
                      href={`/news/${item.slug}`}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-[#0a1729]"
                    >
                      {/* IMAGE — ONLY WHEN AVAILABLE */}
                      {item.image_url && (
                        <div className="relative h-44 overflow-hidden bg-[#030711] sm:h-48">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      )}

                      {/* NEWS CONTENT */}
                      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                        {/* CATEGORY AND DATE */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="inline-flex max-w-full items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-300">
                            {item.category}
                          </span>

                          <span className="text-[11px] text-white/40">
                            {formatDate(item.published_at)}
                          </span>
                        </div>

                        {/* TITLE */}
                        <h3 className="mt-3 break-words text-lg font-black leading-snug text-white sm:text-xl">
                          {item.title}
                        </h3>

                        {/* EXCERPT */}
                        {item.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">
                            {item.excerpt}
                          </p>
                        )}

                        {/* READ LINK */}
                        <div className="mt-auto pt-4">
                          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                            <span className="text-xs font-bold text-blue-300 transition group-hover:text-blue-200 sm:text-sm">
                              Читати новину
                            </span>

                            <span
                              aria-hidden="true"
                              className="text-base text-blue-400 transition group-hover:translate-x-1"
                            >
                              →
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
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

            {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}