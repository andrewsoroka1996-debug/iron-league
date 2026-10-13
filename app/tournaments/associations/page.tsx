import Link from "next/link";
import SiteHeader from "../../../components/public/SiteHeader";

import { players } from "../../../data/players";

import {
  season2AssociationLeague,
} from "../../../data/associations/season-2-league";

import {
  getSeasonAssociationSquads,
} from "../../../lib/association-squads";

import {
  getAssociationLeague,
  type AssociationLeagueRow,
} from "../../../lib/association-league";

import AssociationCupMatches from "../../../components/AssociationCupMatches";
import AssociationCupPlayoffBracket from "../../../components/AssociationCupPlayoffBracket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeasonNumber =
  | 2
  | 3
  | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

/*
  ========================================
  НАЗВА ГРАВЦЯ
  ========================================
*/

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

/*
  ========================================
  ФОРМАТ ЧИСЕЛ
  ========================================
*/

function formatPoints(
  value: number
) {
  return String(value);
}

/*
  ========================================
  СТИЛЬ МІСЦЯ
  ========================================
*/

function getPlaceStyle(
  place: number
) {
  if (place === 1) {
    return {
      row:
        "bg-yellow-400/[0.07]",

      place:
        "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (place === 2) {
    return {
      row:
        "bg-slate-300/[0.045]",

      place:
        "border-slate-300/20 bg-slate-300/[0.06] text-slate-200",
    };
  }

  if (place === 3) {
    return {
      row:
        "bg-orange-400/[0.045]",

      place:
        "border-orange-400/25 bg-orange-400/[0.07] text-orange-300",
    };
  }

  return {
    row: "",

    place:
      "border-white/10 bg-white/[0.03] text-white/35",
  };
}

/*
  ========================================
  СЕЗОН 2
  БАЗОВИЙ РЕЙТИНГ
  ========================================
*/


function Season2BaseRanking() {
  const rows = [
    ...season2AssociationLeague,
  ].sort(
    (a, b) =>
      b.baseCoefficient -
      a.baseCoefficient
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <table className="w-full table-fixed border-collapse sm:table-auto">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.08em] text-white/40 sm:text-[11px] sm:tracking-[0.14em]">
            <th className="w-12 px-2 py-3 text-center sm:w-auto sm:px-5 sm:py-4">
              М
            </th>

            <th className="px-2 py-3 text-left sm:px-5 sm:py-4">
              Асоціація
            </th>

            <th className="w-20 px-2 py-3 text-right sm:w-auto sm:px-5 sm:py-4">
              Рейтинг
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const place = index + 1;
            const styles = getPlaceStyle(place);

            return (
              <tr
                key={row.associationId}
                className={`border-b border-white/[0.05] last:border-b-0 ${styles.row}`}
              >
                {/* МІСЦЕ */}
                <td className="px-2 py-3 text-center sm:px-5 sm:py-5">
                  <span
                    className={`inline-flex min-w-8 items-center justify-center rounded-lg border px-2 py-1.5 font-black sm:min-w-9 ${styles.place}`}
                  >
                    {place}
                  </span>
                </td>

                {/* АСОЦІАЦІЯ */}
                <td className="min-w-0 break-words px-2 py-3 text-sm font-black text-white sm:px-5 sm:py-5 sm:text-base">
                  {row.associationName}
                </td>

                {/* РЕЙТИНГ */}
                <td className="px-2 py-3 text-right text-lg font-black tabular-nums text-blue-300 sm:px-5 sm:py-5 sm:text-xl">
                  {row.baseCoefficient}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/*
  ========================================
  СЕЗОН 2
  ЛІГА АСОЦІАЦІЙ
  ========================================
*/


function Season2LeagueTable() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse lg:min-w-[900px] lg:table-auto">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.06em] text-white/40 lg:text-[11px] lg:tracking-[0.12em]">
              <th className="w-12 px-2 py-3 text-center lg:w-auto lg:px-5 lg:py-4">
                М
              </th>

              <th className="px-2 py-3 text-left lg:px-5 lg:py-4">
                Асоціація
              </th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
                Рейтинг
              </th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
                Кубок асоціацій
              </th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
                Множник
              </th>

              <th className="w-20 px-2 py-3 text-right lg:w-auto lg:px-6 lg:py-4">
                <span className="lg:hidden">
                  Очки
                </span>
                <span className="hidden lg:inline">
                  Очки Ліги
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {season2AssociationLeague.map((row) => {
              const styles = getPlaceStyle(
                row.place
              );

              return (
                <tr
                  key={row.associationId}
                  className={`border-b border-white/[0.05] last:border-b-0 ${styles.row}`}
                >
                  {/* МІСЦЕ */}
                  <td className="px-2 py-3 text-center align-top lg:px-5 lg:py-5 lg:align-middle">
                    <span
                      className={`inline-flex min-w-8 items-center justify-center rounded-lg border px-2 py-1.5 font-black lg:min-w-9 ${styles.place}`}
                    >
                      {row.place}
                    </span>
                  </td>

                  {/* АСОЦІАЦІЯ */}
                  <td className="min-w-0 px-2 py-3 align-top lg:px-5 lg:py-5 lg:align-middle">
                    <div className="break-words text-sm font-black text-white lg:text-base">
                      {row.associationName}
                    </div>

                    {/* МОБІЛЬНА ДЕТАЛІЗАЦІЯ */}
                    <details className="mt-2 lg:hidden">
                      <summary className="cursor-pointer text-[11px] font-bold text-blue-300/80 transition hover:text-blue-200">
                        Показати розрахунок
                      </summary>

                      <div className="mt-2 grid grid-cols-2 gap-1.5">

                        {/* БАЗОВИЙ РЕЙТИНГ */}
                        <div className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Рейтинг
                          </div>

                          <div className="mt-1 text-sm font-black text-white/80">
                            {row.baseCoefficient}
                          </div>
                        </div>

                        {/* МНОЖНИК */}
                        <div className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Множник
                          </div>

                          <div className="mt-1 text-sm font-black text-blue-300">
                            ×{row.multiplier}
                          </div>
                        </div>

                        {/* РЕЗУЛЬТАТ КУБКА */}
                        <div className="col-span-2 min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Кубок асоціацій
                          </div>

                          <div className="mt-1 break-words text-xs font-bold text-white/80">
                            {row.cupPlacementLabel}
                          </div>
                        </div>

                      </div>
                    </details>
                  </td>

                  {/* РЕЙТИНГ НА ПК */}
                  <td className="hidden px-5 py-5 text-center font-bold text-white/60 lg:table-cell">
                    {row.baseCoefficient}
                  </td>

                  {/* РЕЗУЛЬТАТ КУБКА НА ПК */}
                  <td className="hidden px-5 py-5 text-center font-bold text-white/60 lg:table-cell">
                    {row.cupPlacementLabel}
                  </td>

                  {/* МНОЖНИК НА ПК */}
                  <td className="hidden px-5 py-5 text-center font-black text-blue-300 lg:table-cell">
                    ×{row.multiplier}
                  </td>

                  {/* ПІДСУМКОВІ ОЧКИ */}
                  <td className="px-2 py-3 text-right align-top text-lg font-black tabular-nums text-blue-300 lg:px-6 lg:py-5 lg:text-2xl lg:align-middle">
                    {formatPoints(row.totalPoints)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/*
  ========================================
  СЕЗОН 3+
  LIVE РЕЙТИНГ
  ========================================
*/

function Season3BaseRanking({
  rows,
}: {
  rows:
    AssociationLeagueRow[];
}) {
  const sorted = [
    ...rows,
  ].sort(
    (a, b) =>
      b.baseCoefficient -
      a.baseCoefficient
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse lg:min-w-[850px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.14em] text-white/80">
              <th className="px-2 py-2.5 text-center lg:px-5 lg:py-4">
  М
</th>
              <th className="px-2 py-2.5 text-left lg:px-5 lg:py-4">
  Асоціація
</th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
  Гравців
</th>

              <th className="px-2 py-2.5 text-right lg:px-6 lg:py-4">
  Рейтинг
</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map(
              (
                row,
                index
              ) => {
                const place =
                  index + 1;

                const styles =
                  getPlaceStyle(
                    place
                  );

                return (
                  <tr
                    key={
                      row.associationId
                    }
                    className={`border-b border-white/[0.05] ${styles.row}`}
                  >
                    <td className="px-2 py-3 text-center align-top lg:px-5 lg:py-5 lg:align-middle">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.place}`}
                      >
                        {place}
                      </span>
                    </td>

                    <td className="min-w-0 px-2 py-3 lg:px-5 lg:py-5">
                      <div className="font-black">
                        {
                          row.associationName
                        }
                      </div>
                      <div className="mt-1 text-[11px] text-white/45 lg:hidden">
  Гравців: {row.members.length}
</div>


<details className="mt-2">
  <summary className="cursor-pointer text-xs font-bold text-white/75 transition hover:text-blue-300">
    Показати внесок гравців
  </summary>

  <div className="mt-3 space-y-1.5">
    {row.members.map((member) => {
      const isR1 = member.rank === "R1";

      return (
        <div
          key={member.playerId}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 lg:gap-3 lg:px-3 lg:py-2"
        >
          {/* ГРАВЕЦЬ */}
          <Link
            href={`/players/${member.playerId}`}
            title={member.playerName}
            className="min-w-0 truncate text-xs font-bold text-white/60 transition hover:text-blue-300"
          >
            {member.playerName}
          </Link>

          {/* РАНГ */}
          <span
            className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-black ${
              isR1
                ? "border-red-400/20 bg-red-500/10 text-red-300"
                : "border-blue-400/15 bg-blue-500/[0.07] text-blue-300"
            }`}
          >
            {member.rank ?? "—"}
          </span>

          {/* КОЕФІЦІЄНТ */}
          <div className="shrink-0 whitespace-nowrap text-right text-xs font-black tabular-nums lg:min-w-[75px]">
            {isR1 ? (
              <span>
                <span className="text-white/30 line-through">
                  {member.coefficient}
                </span>

                <span className="ml-1 text-red-300">
                  → 0
                </span>
              </span>
            ) : (
              <span className="text-white/70">
                {member.associationCoefficient}
              </span>
            )}
          </div>
        </div>
      );
    })}
  </div>
</details>

                    </td>

                    <td className="hidden px-5 py-5 text-center text-white/45 lg:table-cell">
  {row.members.length}
</td>

                    <td className="px-2 py-3 text-right align-top text-xl font-black text-blue-300 lg:px-6 lg:py-5 lg:text-2xl lg:align-middle">
  {row.baseCoefficient}
</td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
  ========================================
  СЕЗОН 3+
  LIVE ЛІГА АСОЦІАЦІЙ
  ========================================
*/


function Season3LeagueTable({
  rows,
  cupComplete,
}: {
  rows: AssociationLeagueRow[];
  cupComplete: boolean;
}) {
  const sorted = cupComplete
    ? [...rows].sort(
        (a, b) =>
          (a.leaguePlace ?? 999) -
          (b.leaguePlace ?? 999)
      )
    : [...rows].sort(
        (a, b) =>
          b.baseCoefficient -
          a.baseCoefficient
      );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse lg:min-w-[950px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.08em] text-white/40 lg:text-[11px] lg:tracking-[0.12em]">
              <th className="px-2 py-3 text-center lg:px-5 lg:py-4">
                М
              </th>

              <th className="px-2 py-3 text-left lg:px-5 lg:py-4">
                Асоціація
              </th>

              <th className="px-2 py-3 text-right lg:px-5 lg:py-4 lg:text-center">
                Рейтинг
              </th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
                Кубок
              </th>

              <th className="hidden px-5 py-4 text-center lg:table-cell">
                Множник
              </th>

              <th className="hidden px-6 py-4 text-right lg:table-cell">
                Очки Ліги
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((row, index) => {
              const displayedPlace = cupComplete
                ? row.leaguePlace ?? index + 1
                : index + 1;

              const styles =
                getPlaceStyle(displayedPlace);

              return (
                <tr
                  key={row.associationId}
                  className={`border-b border-white/[0.05] ${
                    cupComplete
                      ? styles.row
                      : ""
                  }`}
                >
                  {/* PLACE */}
                  <td className="px-2 py-3 text-center align-top lg:px-5 lg:py-5 lg:align-middle">
                    {cupComplete ? (
                      <span
                        className={`inline-flex min-w-8 items-center justify-center rounded-lg border px-2 py-1 font-black lg:min-w-9 lg:py-1.5 ${styles.place}`}
                      >
                        {displayedPlace}
                      </span>
                    ) : (
                      <span className="text-white/25">
                        —
                      </span>
                    )}
                  </td>

                  {/* ASSOCIATION */}
                  <td className="min-w-0 px-2 py-3 align-top lg:px-5 lg:py-5 lg:align-middle">
                    <div className="break-words text-sm font-black lg:text-base">
                      {row.associationName}
                    </div>

                    {/* MOBILE DETAILS */}
                    <details className="group mt-2 lg:hidden">
                      <summary className="cursor-pointer text-[11px] font-bold text-blue-300/75 transition hover:text-blue-200">
                        Показати розрахунок
                      </summary>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {/* CUP RESULT */}
                        <div className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Кубок
                          </div>

                          <div className="mt-1 break-words text-xs font-bold text-white/80">
                            {row.cupPlacementLabel}
                          </div>
                        </div>

                        {/* MULTIPLIER */}
                        <div className="min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Множник
                          </div>

                          <div className="mt-1 text-sm font-black text-blue-300">
                            {row.multiplier === null
                              ? "—"
                              : `×${row.multiplier}`}
                          </div>
                        </div>

                        {/* LEAGUE POINTS */}
                        <div className="col-span-2 min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                          <div className="text-[10px] text-white/45">
                            Очки Ліги
                          </div>

                          <div className="mt-1 text-lg font-black text-blue-300">
                            {row.leaguePoints === null
                              ? "—"
                              : formatPoints(
                                  row.leaguePoints
                                )}
                          </div>
                        </div>
                      </div>
                    </details>
                  </td>

                  {/* BASE RATING */}
                  <td className="px-2 py-3 text-right align-top text-base font-black tabular-nums text-white/65 lg:px-5 lg:py-5 lg:text-center lg:align-middle">
                    {row.baseCoefficient}
                  </td>

                  {/* DESKTOP CUP RESULT */}
                  <td className="hidden px-5 py-5 text-center font-bold text-white/50 lg:table-cell">
                    {row.cupPlacementLabel}
                  </td>

                  {/* DESKTOP MULTIPLIER */}
                  <td className="hidden px-5 py-5 text-center font-black text-blue-300 lg:table-cell">
                    {row.multiplier === null
                      ? "—"
                      : `×${row.multiplier}`}
                  </td>

                  {/* DESKTOP LEAGUE POINTS */}
                  <td className="hidden px-6 py-5 text-right text-2xl font-black text-blue-300 lg:table-cell">
                    {row.leaguePoints === null
                      ? "—"
                      : formatPoints(
                          row.leaguePoints
                        )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* LEAGUE STATUS */}
      {!cupComplete && (
        <div className="border-t border-white/10 bg-blue-500/[0.035] px-4 py-4 text-sm leading-6 text-white/45 sm:px-6 sm:py-5">
          Остаточна таблиця Ліги Асоціацій
          буде сформована після завершення
          Кубка асоціацій і визначення
          множника для кожної Асоціації.
        </div>
      )}
    </div>
  );
}


/*
  ========================================
  PAGE
  ========================================
*/

export default async function AssociationsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const season:
    SeasonNumber =
    params.season === "2"
      ? 2
      : params.season === "4"
        ? 4
        : 3;

  /*
    ========================================
    СКЛАДИ АСОЦІАЦІЙ
    ========================================
  */

  const associations =
    await getSeasonAssociationSquads(
      season
    );

  /*
    ========================================
    LIVE ДАНІ СЕЗОНУ 3+
    ========================================
  */

  const liveLeague =
    season >= 3
      ? await getAssociationLeague(
          season
        )
      : null;

  return (
    <main className="min-h-screen bg-[#030711] text-white">

      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">

        {/* BACKGROUND */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711]/60 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">

          {/* BACK LINK */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </Link>

          {/* TITLE */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE ASSOCIATIONS
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Ліга Асоціацій
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Головне командне змагання Асоціацій.
              Базовий рейтинг формується з особистих
              коефіцієнтів членів Асоціації, а результат
              Кубка асоціацій визначає підсумковий множник.
            </p>
          </div>

          {/* SECTION NAVIGATION */}
          <nav
            aria-label="Розділи асоціацій"
            className="mt-5 flex flex-wrap gap-2"
          >
            <a
              href="#league"
              className="inline-flex min-h-9 items-center rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition hover:bg-blue-500/20 sm:text-sm"
            >
              Ліга асоціацій
            </a>

            <a
              href="#cup"
              className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-white/65 transition hover:bg-white/[0.07] hover:text-white sm:text-sm"
            >
              Кубок асоціацій
            </a>
          </nav>

          {/* SEASON SWITCHER */}
          <div className="mt-6 sm:mt-8">

            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">
              Обрати сезон
            </div>

            <nav
              aria-label="Вибір сезону"
              className="grid w-full max-w-md grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#07101d] p-1"
            >
              {([2, 3, 4] as const).map(
                (seasonNumber) => (
                  <Link
                    key={seasonNumber}
                    href={`/tournaments/associations?season=${seasonNumber}`}
                    aria-current={
                      season === seasonNumber
                        ? "page"
                        : undefined
                    }
                    className={`flex min-h-10 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-bold transition-colors sm:text-sm ${
                      season === seasonNumber
                        ? "bg-blue-700 text-white shadow-lg shadow-blue-700/20"
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
                  </Link>
                )
              )}
            </nav>
          </div>

        </div>
      </section>


      {/* BASE RANKING */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Сезон {season}
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Рейтинг Асоціацій
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-white/75">
            {season >= 3
              ? `У Сезоні ${season} до рейтингу Асоціації входять коефіцієнти гравців R2–R6. Коефіцієнт R1 має вагу 0.`
              : "Рейтинг Асоціації сформований відповідно до офіційних підсумків Сезону 2."}
          </p>
        </div>

        {season === 2 ? (
          <Season2BaseRanking />
        ) : liveLeague ? (
          <Season3BaseRanking
            rows={
              liveLeague.rows
            }
          />
        ) : null}
      </section>

      {/* ASSOCIATIONS */}

      <section className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Склад
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Асоціації
            </h2>
          </div>

          <div className="mt-6 grid gap-3 sm:mt-10 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
            {associations.map(
              (association) => (
                <div
                  key={
                    association.id
                  }
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                >
                  <div className="border-b border-white/10 bg-blue-500/[0.07] p-4 sm:p-6">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                      {
                        association.id
                      }
                    </div>

                    <div className="mt-2 text-xl font-black sm:text-2xl">
                      {
                        association.name
                      }
                    </div>

                    <div className="mt-2 text-sm text-white/30">
                      {
                        association.players
                          .length
                      }{" "}
                      гравців
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 sm:space-y-2 sm:p-5">
                    {association.players.map(
                      (
                        playerId,
                        index
                      ) => (
                        <Link
                          key={
                            playerId
                          }
                          href={`/players/${playerId}`}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04] sm:gap-3 sm:px-4 sm:py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-300">
                            {index +
                              1}
                          </div>

                          <div className="min-w-0 font-bold">
                            {getPlayerName(
                              playerId
                            )}
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* LEAGUE */}

      <section
        id="league"
        className="mx-auto max-w-7xl px-6 py-16"
      >
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Головне змагання
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Ліга Асоціацій
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-white/40">
            Підсумкові очки =
            рейтинг Асоціації ×
            коефіцієнт за результат
            у Кубку асоціацій.
          </p>
        </div>

        {season === 2 ? (
          <Season2LeagueTable />
        ) : liveLeague ? (
          <Season3LeagueTable
            rows={
              liveLeague.rows
            }
            cupComplete={
              liveLeague.cupComplete
            }
          />
        ) : null}
      </section>

      {/* RULES */}

      <section className="border-y border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Множники
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Результат Кубка
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 lg:grid-cols-5">
            {[
              [
                "Переможець",
                "×2.0",
              ],
              [
                "Фіналіст",
                "×1.8",
              ],
              [
                "3 місце",
                "×1.7",
              ],
              [
                "4 місце",
                "×1.6",
              ],
              [
                "1/4 фіналу",
                "×1.5",
              ],
            ].map(
              ([
                label,
                multiplier,
              ]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-[#07101d] p-3 last:col-span-2 sm:p-5 lg:last:col-span-1"
                >
                  <div className="text-xs font-bold text-white/45 sm:text-sm">
                    {label}
                  </div>

                  <div className="mt-1 text-2xl font-black text-blue-300 sm:mt-2 sm:text-3xl">
                    {
                      multiplier
                    }
                  </div>
                </div>
              )
            )}
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-7 text-white/35">
            При однаковій
            підсумковій кількості
            очок перевагу має
            Асоціація з кращим
            результатом у Кубку
            асоціацій.
          </p>
        </div>
      </section>

      {/* CUP */}

      <section
        id="cup"
        className="mx-auto max-w-7xl px-6 py-16"
      >
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
            Кубок асоціацій
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Турнірна сітка
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-white/40">
            Кубок визначає
            множник для Ліги
            Асоціацій. Окремий
            трофей за перемогу
            в Кубку не
            присуджується.
          </p>
        </div>

        <AssociationCupPlayoffBracket
          season={season}
        />
      </section>

      {/* CUP MATCHES */}

      <section className="border-t border-white/10 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="mb-8">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Кубок асоціацій
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Матчі
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-white/40">
              Кожне протистояння складається
              з шести матчів — R1 проти R1,
              R2 проти R2, R3 проти R3,
              R4 проти R4, R5 проти R5
              та R6 проти R6.
            </p>
          </div>

          <AssociationCupMatches
            season={season}
          />
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10">
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