import StadiumBackground from "../../components/StadiumBackground";
import SiteHeader from "../../components/public/SiteHeader";
import SiteFooter from "../../components/public/SiteFooter";
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
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="20" preload />

        {/* BACKGROUND OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/95 to-[#030711]/70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

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
              IRON LEAGUE · PLAYERS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Гравці
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Учасники Iron League обраного сезону,
              їхні дивізіони та персональні профілі.
              Знаходь гравців і переглядай історію їхніх виступів.
            </p>
          </div>

          {/* SEASON SWITCHER */}
          <div className="mt-6 sm:mt-8">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">
              Обрати сезон
            </div>

            <nav
              aria-label="Вибір сезону"
              className="grid w-full max-w-lg grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#07101d]/90 p-1"
            >
              {([1, 2, 3, 4] as const).map(
                (seasonNumber) => (
                  <a
                    key={seasonNumber}
                    href={`/players?season=${seasonNumber}`}
                    aria-current={
                      season === seasonNumber
                        ? "page"
                        : undefined
                    }
                    className={`flex min-h-10 items-center justify-center rounded-lg px-1 py-2 text-center text-[11px] font-bold transition-colors sm:text-sm ${
                      season === seasonNumber
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
                  </a>
                )
              )}
            </nav>
          </div>

          {/* SEASON INFORMATION */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            {/* PLAYERS COUNT */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Гравців
              </div>

              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {seasonPlayers.length}
              </div>
            </div>

            {/* DIVISIONS COUNT */}
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Дивізіонів
              </div>

              <div className="mt-1 text-xl font-black text-blue-300 sm:text-2xl">
                {availableDivisions.length}
              </div>
            </div>

            {/* SEASON STATUS */}
            <div className="col-span-2 min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:col-span-1 sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Статус
              </div>

              <div className="mt-1 break-words text-base font-black leading-6 text-blue-300 sm:text-lg">
                {seasonStatus}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIVISION FILTER */}
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">
            Фільтр за дивізіоном
          </div>

          <nav
            aria-label="Фільтр гравців за дивізіоном"
            className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3"
          >
            {/* ALL PLAYERS */}
            <a
              href={`/players?season=${season}`}
              aria-current={
                divisionFilter === null ? "page" : undefined
              }
              className={`flex min-h-10 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-xs font-black transition sm:px-5 sm:text-sm ${
                divisionFilter === null
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              Усі гравці
            </a>

            {/* DIVISIONS */}
            {availableDivisions.map((division) => (
              <a
                key={division}
                href={`/players?season=${season}&division=${division}`}
                aria-current={
                  divisionFilter === division
                    ? "page"
                    : undefined
                }
                className={`flex min-h-10 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-xs font-black transition sm:px-5 sm:text-sm ${
                  divisionFilter === division
                    ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {division} Дивізіон
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* PLAYERS */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
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

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePlayers.map((player) => {
              const initials = getInitials(player.nickname);

              return (
                <a
                  key={player.id}
                  href={`/players/${player.id}`}
                  aria-label={`Відкрити профіль ${player.nickname}`}
                  className="group relative block min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:bg-[#0a1628] hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)] sm:p-5"
                >
                  {/* PLAYER INFO */}
                  <div className="relative flex min-w-0 items-center gap-3">
                    {/* AVATAR */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-base font-black text-blue-300 transition group-hover:border-blue-400/45 group-hover:bg-blue-500/15">
                      {initials}
                    </div>

                    {/* NICKNAME AND ACCOUNT */}
                    <div className="min-w-0 flex-1">
                      <h3
                        title={player.nickname}
                        className="truncate text-base font-black leading-6 text-white sm:text-lg"
                      >
                        {player.nickname}
                      </h3>

                      {player.account && (
                        <div
                          title={player.account}
                          className="mt-0.5 truncate text-xs font-medium text-white/40"
                        >
                          ({player.account})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DIVISION AND STATUS */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                      {player.division} Дивізіон
                    </span>

                    <span className="text-xs font-semibold text-white/65">
                      {playerStatus}
                    </span>
                  </div>

                  {/* PROFILE LINK */}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                    <span className="text-[11px] font-semibold text-white/35">
                      Сезон {season}
                    </span>

                    <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 transition group-hover:text-blue-200">
                      Відкрити профіль

                      <span className="text-base leading-none transition group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

        )}
      </section>

            {/* FOOTER */}
      <SiteFooter />
    </main>
  );
}