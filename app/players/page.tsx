import { players } from "../../data/players";

import { season1 } from "../../data/seasons/season-1";
import { season2 } from "../../data/seasons/season-2";
import { season3 } from "../../data/seasons/season-3";
import { season4 } from "../../data/seasons/season-4";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
    division?: string;
  }>;
};

type SeasonPlayer = {
  id: string;
  nickname: string;
  account?: string | null;
  division: DivisionNumber;
};

/*
  ========================================
  СКЛАД ДИВІЗІОНУ
  ========================================
*/

function getDivisionPlayerIds(
  season: SeasonNumber,
  division: DivisionNumber
): readonly string[] {
  /*
    СЕЗОН 1
    Було тільки 3 дивізіони.
  */

  if (season === 1) {
    if (division === 1) {
      return season1.division1.players;
    }

    if (division === 2) {
      return season1.division2.players;
    }

    if (division === 3) {
      return season1.division3.players;
    }

    return [];
  }

  /*
    СЕЗОН 2
  */

  if (season === 2) {
    if (division === 1) {
      return season2.division1.players;
    }

    if (division === 2) {
      return season2.division2.players;
    }

    if (division === 3) {
      return season2.division3.players;
    }

    return season2.division4.players;
  }

  /*
    СЕЗОН 3
  */

  if (season === 3) {
    if (division === 1) {
      return season3.division1.players;
    }

    if (division === 2) {
      return season3.division2.players;
    }

    if (division === 3) {
      return season3.division3.players;
    }

    return season3.division4.players;
  }

  /*
    СЕЗОН 4
  */

  if (division === 1) {
    return season4.division1.players;
  }

  if (division === 2) {
    return season4.division2.players;
  }

  if (division === 3) {
    return season4.division3.players;
  }

  return season4.division4.players;
}

/*
  ========================================
  ДОСТУПНІ ДИВІЗІОНИ
  ========================================
*/

function getAvailableDivisions(
  season: SeasonNumber
): DivisionNumber[] {
  if (season === 1) {
    return [1, 2, 3];
  }

  return [1, 2, 3, 4];
}

/*
  ========================================
  ГРАВЦІ СЕЗОНУ
  ========================================
*/

function getSeasonPlayers(
  season: SeasonNumber
): SeasonPlayer[] {
  const divisions =
    getAvailableDivisions(
      season
    );

  const result =
    new Map<
      string,
      SeasonPlayer
    >();

  for (
    const division of divisions
  ) {
    const ids =
      getDivisionPlayerIds(
        season,
        division
      );

    for (const id of ids) {
      const player =
        players.find(
          (item) =>
            item.id === id
        );

      if (!player) {
        continue;
      }

      /*
        Map не дозволить випадково
        показати одного гравця двічі.
      */

      result.set(
        player.id,
        {
          id:
            player.id,

          nickname:
            player.nickname,

          account:
            player.account,

          division,
        }
      );
    }
  }

  return Array.from(
    result.values()
  ).sort(
    (a, b) =>
      a.nickname.localeCompare(
        b.nickname,
        "uk",
        {
          sensitivity:
            "base",
        }
      )
  );
}

/*
  ========================================
  ІНІЦІАЛИ
  ========================================
*/

function getInitials(
  nickname: string
) {
  const cleaned =
    nickname
      .replace(
        /[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g,
        " "
      )
      .trim();

  if (!cleaned) {
    return "?";
  }

  const words =
    cleaned
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length >= 2
  ) {
    return (
      words[0][0] +
      words[1][0]
    ).toUpperCase();
  }

  /*
    Якщо нік починається
    з цифр — залишаємо до 2 символів.
  */

  return cleaned
    .slice(0, 2)
    .toUpperCase();
}

/*
  ========================================
  СТАТУС
  ========================================
*/

function getSeasonStatus(
  season: SeasonNumber
) {
  if (
    season === 1 ||
    season === 2
  ) {
    return "Архів";
  }

  if (season === 3) {
    return "Поточний сезон";
  }

  return "Підготовка";
}

function getPlayerStatus(
  season: SeasonNumber
) {
  if (
    season === 1 ||
    season === 2
  ) {
    return "Учасник цього сезону";
  }

  if (season === 3) {
    return "Учасник Iron League";
  }

  return "Учасник майбутнього сезону";
}

/*
  ========================================
  PAGE
  ========================================
*/

export default async function PlayersPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  /*
    ========================================
    СЕЗОН
    ========================================
  */

  const requestedSeason =
    Number(
      params.season
    );

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (
          requestedSeason as SeasonNumber
        )
      : 3;

  /*
    ========================================
    ДИВІЗІОН
    ========================================
  */

  const availableDivisions =
    getAvailableDivisions(
      season
    );

  const requestedDivision =
    Number(
      params.division
    );

  const divisionFilter:
    DivisionNumber | null =
    availableDivisions.includes(
      requestedDivision as DivisionNumber
    )
      ? (
          requestedDivision as DivisionNumber
        )
      : null;

  /*
    ========================================
    УЧАСНИКИ СЕЗОНУ
    ========================================
  */

  const seasonPlayers =
    getSeasonPlayers(
      season
    );

  /*
    ========================================
    ФІЛЬТР
    ========================================
  */

  const visiblePlayers =
    divisionFilter
      ? seasonPlayers.filter(
          (player) =>
            player.division ===
            divisionFilter
        )
      : seasonPlayers;

  const seasonStatus =
    getSeasonStatus(
      season
    );

  const playerStatus =
    getPlayerStatus(
      season
    );

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
                Гравці
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/55 transition hover:bg-white/[0.07] hover:text-white"
          >
            ← Головна
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

        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.27em] text-blue-400">
            IRON LEAGUE • СЕЗОН{" "}
            {season}
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Гравці
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Учасники Iron League
            обраного сезону, їхні
            дивізіони та профілі.
          </p>

          {/* SEASON SWITCHER */}

          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d]/90 p-1">
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
                    href={`/players?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season ===
                      seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white"
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
                Гравців
              </span>

              <span className="ml-2 font-black text-white">
                {
                  seasonPlayers.length
                }
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Дивізіонів
              </span>

              <span className="ml-2 font-black text-blue-300">
                {
                  availableDivisions.length
                }
              </span>
            </div>

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

      {/* DIVISION FILTER */}

      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
            Фільтр за дивізіоном
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`/players?season=${season}`}
              className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                divisionFilter ===
                null
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              Усі
            </a>

            {availableDivisions.map(
              (division) => (
                <a
                  key={division}
                  href={`/players?season=${season}&division=${division}`}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                    divisionFilter ===
                    division
                      ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {division}{" "}
                  Дивізіон
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* PLAYERS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Учасники
            </div>

            <h2 className="mt-3 text-3xl font-black">
              {divisionFilter
                ? `${divisionFilter} Дивізіон`
                : "Склад Iron League"}
            </h2>

            <p className="mt-3 text-sm text-white/35">
              Сезон {season}
              {divisionFilter
                ? ` • ${divisionFilter} Дивізіон`
                : ""}
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/40">
            Показано:{" "}
            <span className="font-black text-white">
              {
                visiblePlayers.length
              }
            </span>
          </div>
        </div>

        {/* EMPTY */}

        {visiblePlayers.length ===
        0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                IL
              </div>

              <h3 className="mt-6 text-2xl font-black">
                Склад ще не
                сформовано
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-white/40">
                Учасники
                {divisionFilter
                  ? ` ${divisionFilter} Дивізіону`
                  : ""}
                {" "}Сезону {season}
                будуть показані тут
                після формування
                складу.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePlayers.map(
              (player) => {
                const initials =
                  getInitials(
                    player.nickname
                  );

                return (
                  <a
                    key={
                      player.id
                    }
                    href={`/players/${player.id}`}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition duration-300 hover:-translate-y-1 hover:border-blue-400/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                  >
                    {/* TOP */}

                    <div className="relative border-b border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent px-6 py-6">
                      <div className="absolute -right-4 -top-4 text-7xl font-black text-white/[0.025]">
                        {
                          player.division
                        }
                      </div>

                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-xl font-black text-blue-300 transition group-hover:border-blue-400/45 group-hover:bg-blue-500/15">
                          {
                            initials
                          }
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/45">
                          {
                            player.division
                          }{" "}
                          Дивізіон
                        </div>
                      </div>

                      <div className="relative mt-6 min-w-0">
                        <h3 className="truncate text-xl font-black">
                          {
                            player.nickname
                          }
                        </h3>

                        {player.account && (
                          <div className="mt-2 truncate text-sm text-white/35">
                            (
                            {
                              player.account
                            }
                            )
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STATUS */}

                    <div className="px-6 py-5">
                      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/25">
                        Статус у Сезоні{" "}
                        {season}
                      </div>

                      <div className="mt-2 text-sm font-bold text-blue-300">
                        {
                          playerStatus
                        }
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-sm text-white/30">
                          Відкрити
                          профіль
                        </span>

                        <span className="text-blue-400 transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </a>
                );
              }
            )}
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