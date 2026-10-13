
import StadiumBackground from "../../../components/StadiumBackground";
import SiteHeader from "../../../components/public/SiteHeader";
import SiteFooter from "../../../components/public/SiteFooter";

import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    slug: string;
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

/*
  ========================================
  FORMAT DATE
  ========================================
*/

function formatDate(date: string | null) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/*
  ========================================
  NEWS ARTICLE PAGE
  ========================================
*/

export default async function NewsArticlePage({
  params,
}: PageProps) {
  const resolvedParams = await params;

  const slug = decodeURIComponent(resolvedParams.slug);

  /*
    ========================================
    LOAD PUBLISHED ARTICLE
    ========================================
  */

  const { data, error } = await supabase
    .from("news")
    .select(`
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
    `)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("NEWS ARTICLE ERROR:", error);
  }

  if (!data) {
    console.error("NEWS ARTICLE NOT FOUND:", slug);
    notFound();
  }

  const news = data as NewsItem;

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* GLOBAL HEADER */}
      <SiteHeader />

      {/* ARTICLE HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        {/* BACKGROUND OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/75" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/80" />

        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          {/* BACK TO NEWS */}
          <a
            href="/news"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            Усі новини
          </a>

          {/* ARTICLE EYEBROW */}
          <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
            IRON LEAGUE · NEWS
          </div>

          {/* CATEGORY AND DATE */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex max-w-full items-center rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-blue-300 sm:text-xs">
              {news.category}
            </span>

            {news.published_at && (
              <span className="text-xs font-medium text-white/45 sm:text-sm">
                {formatDate(news.published_at)}
              </span>
            )}
          </div>

          {/* ARTICLE TITLE */}
          <h1 className="mt-5 max-w-4xl break-words text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {news.title}
          </h1>

          {/* ARTICLE EXCERPT */}
          {news.excerpt && (
            <p className="mt-4 max-w-3xl whitespace-pre-line break-words text-sm leading-7 text-white/55 sm:text-base sm:leading-8">
              {news.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        {/* ARTICLE IMAGE */}
        {news.image_url && (
          <figure className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] sm:mb-8 sm:rounded-3xl">
            <img
              src={news.image_url}
              alt={news.title}
              className="mx-auto block max-h-[620px] h-auto w-full object-contain"
            />
          </figure>
        )}

        {/* ARTICLE TEXT */}
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] px-5 py-6 sm:rounded-3xl sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
              <div
                aria-hidden="true"
                className="h-6 w-1 shrink-0 rounded-full bg-blue-400"
              />

              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Матеріал Iron League
              </span>
            </div>

            <div className="whitespace-pre-wrap break-words text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
              {news.content}
            </div>
          </div>
        </article>

        {/* ARTICLE NAVIGATION */}
        <nav
          aria-label="Навігація після статті"
          className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8"
        >
          <a
            href="/news"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <span aria-hidden="true">←</span>
            Усі новини
          </a>

          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            На головну
          </a>
        </nav>
      </section>

      {/* GLOBAL FOOTER */}
      <SiteFooter />
    </main>
  );
}
