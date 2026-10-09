import { players } from "../../../data/players";

import { supabase } from "../../../lib/supabase";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type SeasonNumber =
  | 1
  | 2
  | 3
  | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

type SuperCupMatch = {
  id: string;

  season: number;

  competition: string;

  stage: string | null;

  home_id: string;
  away_id: string;

  home_goals:
    | number
    | null;

  away_goals:
    | number
    | null;

  status: string;

  played_at:
    | string
    | null;
};

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ??
    playerId
  );
}

function getPlayerAccount(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.account ??
    null
  );
}

export default async function EuropeanSuperCupPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedSeason =
    Number(
      params.season
    );

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  /*
    ========================================
    ФІНАЛЬНИЙ МАТЧ
    ========================================
  */

  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        season,
        competition,
        stage,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status,
        played_at
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      "european-super-cup"
    )
    .eq(
      "stage",
      "final"
    )
    .limit(1);

  if (error) {
    console.error(
      "EUROPEAN SUPER CUP PUBLIC ERROR:",
      error
    );
  }

  const match =
    (
      data ??
      []
    )[0] as
      | SuperCupMatch
      | undefined;

  const finished =
    match &&
    match.home_goals !==
      null &&
    match.away_goals !==
      null;

  let winnerId:
    | string
    | null = null;

  if (finished) {
    if (
      match.home_goals! >
      match.away_goals!
    ) {
      winnerId =
        match.home_id;
    }

    if (
      match.away_goals! >
      match.home_goals!
    ) {
      winnerId =
        match.away_id;
    }
  }

  const homeName =
    match
      ? getPlayerName(
          match.home_id
        )
      : null;

  const awayName =
    match
      ? getPlayerName(
          match.away_id
        )
      : null;

  const homeAccount =
    match
      ? getPlayerAccount(
          match.home_id
        )
      : null;

  const awayAccount =
    match
      ? getPlayerAccount(
          match.away_id
        )
      : null;

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

              <div className="text-xs text-white/40">
                Суперкубок Європи
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← На головну
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/90 to-[#030711]/55" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Суперкубок Європи
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Один вирішальний матч
            між володарями головних
            європейських трофеїв
            Iron League.
          </p>

          {/* SEASONS */}

          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {(
                [
                  1,
                  2,
                  3,
                  4,
                ] as const
              ).map(
                (
                  seasonNumber
                ) => (
                  <a
                    key={
                      seasonNumber
                    }
                    href={`/tournaments/european-super-cup?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season ===
                      seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Сезон{" "}
                    {
                      seasonNumber
                    }
                  </a>
                )
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Сезон
              </span>

              <span className="ml-2 font-black text-blue-300">
                {season}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Формат
              </span>

              <span className="ml-2 font-black">
                1 матч
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                {!match
                  ? "Очікує учасників"
                  : finished
                    ? "Завершено"
                    : "Матч сформовано"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MATCH */}

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Суперкубок
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Фінальний матч
          </h2>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center text-red-200">
            Не вдалося
            завантажити дані
            Суперкубка Європи.
          </div>
        ) : !match ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                VS
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Учасники ще не
                визначені
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
                Фінальний матч
                з&apos;явиться тут
                після визначення
                учасників і
                створення матчу
                через адмін-панель.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
            <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 px-6 py-4 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                Сезон {season}
              </div>

              <div className="mt-1 font-black">
                Суперкубок Європи
              </div>
            </div>

            <div className="grid gap-8 px-6 py-12 md:grid-cols-[1fr_auto_1fr] md:items-center">
              {/* HOME */}

              <a
                href={`/players/${match.home_id}`}
                className={`rounded-2xl border p-6 text-center transition hover:bg-white/[0.04] ${
                  winnerId ===
                  match.home_id
                    ? "border-green-400/30 bg-green-500/[0.06]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                  {homeName
                    ?.slice(
                      0,
                      2
                    )
                    .toUpperCase()}
                </div>

                <div className="mt-5 text-2xl font-black">
                  {homeName}
                </div>

                {homeAccount && (
                  <div className="mt-2 text-xs text-white/35">
                    ({homeAccount})
                  </div>
                )}
              </a>

              {/* SCORE */}

              <div className="text-center">
                {finished ? (
                  <>
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                      Фінальний
                      рахунок
                    </div>

                    <div className="mt-3 text-5xl font-black text-blue-300">
                      {
                        match.home_goals
                      }
                      :
                      {
                        match.away_goals
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">
                      Фінал
                    </div>

                    <div className="mt-3 text-4xl font-black text-blue-400">
                      VS
                    </div>
                  </>
                )}
              </div>

              {/* AWAY */}

              <a
                href={`/players/${match.away_id}`}
                className={`rounded-2xl border p-6 text-center transition hover:bg-white/[0.04] ${
                  winnerId ===
                  match.away_id
                    ? "border-green-400/30 bg-green-500/[0.06]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                  {awayName
                    ?.slice(
                      0,
                      2
                    )
                    .toUpperCase()}
                </div>

                <div className="mt-5 text-2xl font-black">
                  {awayName}
                </div>

                {awayAccount && (
                  <div className="mt-2 text-xs text-white/35">
                    ({awayAccount})
                  </div>
                )}
              </a>
            </div>

            {winnerId && (
              <div className="border-t border-green-400/15 bg-green-500/[0.06] px-6 py-5 text-center">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
                  Переможець
                </div>

                <div className="mt-2 text-2xl font-black">
                  {getPlayerName(
                    winnerId
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* FORMAT */}

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Один матч за трофей
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-white/40">
            Суперкубок Європи
            проводиться у форматі
            одного фінального
            матчу. Переможець
            матчу стає володарем
            трофея.
          </p>
        </div>
      </section>
    </main>
  );
}