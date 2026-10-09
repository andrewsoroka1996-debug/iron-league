import { players } from "../../../data/players";

import { supabase } from "../../../lib/supabase";

import CoopCupPlayoffBracket from "../../../components/CoopCupPlayoffBracket";

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

type CoopTeam = {
  id: string;

  name: string;

  players: string[];
};

type DatabaseTeam = {
  id: string;

  name: string;

  player_1_id:
    | string
    | null;

  player_2_id:
    | string
    | null;

  created_at: string;
};

export default async function CoopCupPage({
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
    КОМАНДИ
    ========================================
  */

  let teams: CoopTeam[] = [];

  let teamsLoadError =
    false;

  if (
    season === 3 ||
    season === 4
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("coop_teams")
      .select(
        `
          id,
          name,
          player_1_id,
          player_2_id,
          created_at
        `
      )
      .eq(
        "season",
        season
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      teamsLoadError =
        true;

      console.error(
        "COOP TEAMS PUBLIC ERROR:",
        error
      );
    }

    const databaseTeams =
      (data ??
        []) as DatabaseTeam[];

    teams =
      databaseTeams.map(
        (team) => ({
          id:
            team.id,

          name:
            team.name,

          players: [
            team.player_1_id,
            team.player_2_id,
          ].filter(
            (
              playerId
            ): playerId is string =>
              typeof playerId ===
                "string" &&
              playerId.length > 0
          ),
        })
      );
  }

  /*
    ========================================
    ЧИ Є РЕАЛЬНЕ ЖЕРЕБКУВАННЯ
    ========================================

    Сітку показуємо тільки тоді,
    коли реально створено хоча б
    одну пару Iron Co-op Cup.
  */

  let hasPlayoff =
    false;

  if (
    season === 3 ||
    season === 4
  ) {
    const {
      count,
      error,
    } = await supabase
      .from("matches")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "season",
        season
      )
      .eq(
        "competition",
        "iron-coop-cup"
      )
      .not(
        "series_id",
        "is",
        null
      );

    if (error) {
      console.error(
        "COOP PLAYOFF PUBLIC ERROR:",
        error
      );
    } else {
      hasPlayoff =
        (count ?? 0) > 0;
    }
  }

  /*
    ========================================
    СКЛАДИ
    ========================================
  */

  const completeRosters =
    teams.filter(
      (team) =>
        team.players.length ===
        2
    ).length;

  /*
    ========================================
    СТАТУС
    ========================================
  */

  let seasonStatus =
    "Підготовка";

  if (
    season === 1 ||
    season === 2
  ) {
    seasonStatus =
      "Турнір не проводився";
  }

  if (
    season === 3
  ) {
    if (hasPlayoff) {
      seasonStatus =
        "Плей-оф";
    } else if (
      teams.length === 16 &&
      completeRosters === 16
    ) {
      seasonStatus =
        "Готовий до жеребкування";
    } else if (
      teams.length === 16
    ) {
      seasonStatus =
        "Формування складів";
    } else {
      seasonStatus =
        "Формування команд";
    }
  }

  if (
    season === 4
  ) {
    seasonStatus =
      hasPlayoff
        ? "Плей-оф"
        : "Підготовка";
  }

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
                Iron Co-op Cup
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

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Iron Co-op Cup
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Командний турнір
            Iron League у форматі
            2 на 2. Кожну команду
            представляють два
            гравці, а команди
            отримують назви
            футбольних клубів УПЛ.
          </p>

          {/* SEASON SWITCHER */}

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
                    href={`/tournaments/coop-cup?season=${seasonNumber}`}
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

          {/* INFO */}

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

              <span className="ml-2 font-black text-blue-300">
                2 × 2
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Команд
              </span>

              <span className="ml-2 font-black">
                {teams.length}
              </span>
            </div>

            {(season === 3 ||
              season === 4) &&
              teams.length >
                0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
                  <span className="text-sm text-white/40">
                    Складів
                  </span>

                  <span className="ml-2 font-black">
                    {
                      completeRosters
                    }
                    /16
                  </span>
                </div>
              )}

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                {
                  seasonStatus
                }
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TEAMS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Учасники
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Команди
          </h2>

          {(season === 3 ||
            season === 4) &&
            teams.length >
              0 && (
              <p className="mt-3 max-w-2xl leading-7 text-white/40">
                Клуби вже
                визначені. Склади
                команд будуть
                доповнюватися після
                призначення
                учасників.
              </p>
            )}
        </div>

        {/* SEASONS 1–2 */}

        {season === 1 ||
        season === 2 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-[80px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl font-black text-white/25">
                —
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Iron Co-op Cup
                ще не проводився
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
                У Сезонах 1 та 2
                цього турніру ще
                не існувало.
                Iron Co-op Cup
                вперше
                з&apos;явився у
                Сезоні 3
                Iron League.
              </p>

              <a
                href="/tournaments/coop-cup?season=3"
                className="mt-8 inline-block rounded-xl bg-blue-500 px-6 py-3 font-bold transition hover:bg-blue-400"
              >
                Перейти до
                першого
                розіграшу →
              </a>
            </div>
          </div>
        ) : teamsLoadError ? (
          /* LOAD ERROR */

          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-8 py-12 text-center text-red-200">
            Не вдалося
            завантажити команди
            Iron Co-op Cup.
          </div>
        ) : teams.length ===
          0 ? (
          /* NO TEAMS */

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[80px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                2×2
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Команди ще не
                сформовано
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/45">
                {season === 3
                  ? "Команди першого розіграшу Iron Co-op Cup будуть додані після затвердження складу турніру."
                  : "Команди Iron Co-op Cup Сезону 4 будуть додані після формування нового сезону."}
              </p>
            </div>
          </div>
        ) : (
          /* TEAMS */

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {teams.map(
              (
                team,
                teamIndex
              ) => {
                const teamPlayers =
                  team.players
                    .map(
                      (
                        playerId
                      ) =>
                        players.find(
                          (
                            player
                          ) =>
                            player.id ===
                            playerId
                        )
                    )
                    .filter(
                      (
                        player
                      ): player is (typeof players)[number] =>
                        player !==
                        undefined
                    );

                const missingPlayers =
                  Math.max(
                    0,
                    2 -
                      teamPlayers.length
                  );

                return (
                  <div
                    key={
                      team.id
                    }
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                  >
                    <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                            Iron
                            Co-op Cup
                          </div>

                          <h3 className="mt-2 text-2xl font-black">
                            {
                              team.name
                            }
                          </h3>
                        </div>

                        <div className="text-xs font-black text-white/20">
                          {String(
                            teamIndex +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {teamPlayers.map(
                        (
                          player,
                          index
                        ) => (
                          <a
                            key={
                              player.id
                            }
                            href={`/players/${player.id}`}
                            className="flex items-center gap-4 border-b border-white/5 px-6 py-5 transition hover:bg-white/[0.04]"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 font-black text-blue-300">
                              {index +
                                1}
                            </div>

                            <div>
                              <div className="font-bold">
                                {
                                  player.nickname
                                }
                              </div>

                              {player.account && (
                                <div className="mt-1 text-xs text-white/35">
                                  (
                                  {
                                    player.account
                                  }
                                  )
                                </div>
                              )}
                            </div>
                          </a>
                        )
                      )}

                      {Array.from(
                        {
                          length:
                            missingPlayers,
                        },
                        (
                          _,
                          index
                        ) => (
                          <div
                            key={`empty-${index}`}
                            className="flex items-center gap-4 border-b border-white/5 px-6 py-5 last:border-b-0"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] font-black text-white/20">
                              {teamPlayers.length +
                                index +
                                1}
                            </div>

                            <div>
                              <div className="font-bold text-white/30">
                                Ще не
                                визначено
                              </div>

                              <div className="mt-1 text-xs text-white/20">
                                Учасник
                                команди
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {teamPlayers.length ===
                      0 && (
                      <div className="border-t border-blue-400/10 bg-blue-500/[0.04] px-6 py-3 text-xs font-bold text-blue-300/60">
                        Склад
                        команди ще
                        не визначено
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* PLAYOFF */}

      {hasPlayoff && (
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Плей-оф
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Турнірна сітка
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-white/40">
              Кожне
              протистояння
              складається з
              двох матчів.
              Переможці
              переходять у
              наступну стадію
              відповідно до
              турнірної сітки.
            </p>

            <div className="mt-8">
              <CoopCupPlayoffBracket
                season={
                  season
                }
                teams={
                  teams
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* TOURNAMENT HISTORY */}

      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Історія турніру
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Iron Co-op Cup
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 1
              </div>

              <div className="mt-4 text-lg font-black text-white/40">
                Не проводився
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 2
              </div>

              <div className="mt-4 text-lg font-black text-white/40">
                Не проводився
              </div>
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] p-6">
              <div className="text-sm font-bold text-blue-300">
                Сезон 3
              </div>

              <div className="mt-4 text-lg font-black">
                Перший
                розіграш
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 4
              </div>

              <div className="mt-4 text-lg font-black text-white/60">
                Підготовка
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORMAT */}

      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Формат Iron
            Co-op Cup
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                01
              </div>

              <h3 className="mt-5 text-xl font-black">
                Клуб УПЛ
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Кожна команда
                отримує назву
                футбольного клубу
                Української
                Прем&apos;єр-ліги.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                02
              </div>

              <h3 className="mt-5 text-xl font-black">
                Два гравці
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Кожну команду
                представляють два
                учасники
                Iron League.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                03
              </div>

              <h3 className="mt-5 text-xl font-black">
                2 × 2
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Матчі проводяться
                у кооперативному
                форматі двоє
                проти двох.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}