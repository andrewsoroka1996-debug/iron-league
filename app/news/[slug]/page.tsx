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

export default async function NewsArticlePage({
  params,
}: PageProps) {
  const resolvedParams =
    await params;

  const slug =
    decodeURIComponent(
      resolvedParams.slug
    );

  const {
    data,
    error,
  } = await supabase
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
      "slug",
      slug
    )
    .eq(
      "published",
      true
    )
    .maybeSingle();

  if (error) {
    console.error(
      "NEWS ARTICLE ERROR:",
      error
    );
  }

  if (!data) {
    console.error(
      "NEWS ARTICLE NOT FOUND:",
      slug
    );

    notFound();
  }

  const news =
    data as NewsItem;

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

          <div className="flex gap-3">
            <a
              href="/news"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-blue-300"
            >
              ← Усі новини
            </a>

            <a
              href="/"
              className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/40 sm:block"
            >
              Головна
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        {news.image_url ? (
          <img
            src={
              news.image_url
            }
            alt={
              news.title
            }
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
                "url('/stadium-bg.jpg')",
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/92 to-[#030711]/70" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-300">
              {
                news.category
              }
            </div>

            <div className="text-sm text-white/35">
              {formatDate(
                news.published_at
              )}
            </div>
          </div>

          <h1 className="mt-7 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            {
              news.title
            }
          </h1>

          {news.excerpt && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/55">
              {
                news.excerpt
              }
            </p>
          )}
        </div>
      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-5xl px-6 py-16">
        {news.image_url && (
          <div className="mb-12 overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
            <img
              src={
                news.image_url
              }
              alt={
                news.title
              }
              className="max-h-[620px] w-full object-cover"
            />
          </div>
        )}

        <article className="rounded-3xl border border-white/10 bg-[#07101d] p-7 sm:p-10">
          <div className="whitespace-pre-wrap break-words text-base leading-8 text-white/70 sm:text-lg">
            {
              news.content
            }
          </div>
        </article>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/news"
            className="rounded-xl bg-blue-500 px-6 py-3 font-black transition hover:bg-blue-400"
          >
            ← Усі новини
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 font-black text-white/55"
          >
            На головну
          </a>
        </div>
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