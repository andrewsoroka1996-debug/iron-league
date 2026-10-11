import Link from "next/link";

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.14em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Асоціація
              </th>

              <th className="px-5 py-4 text-right">
                Рейтинг
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
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
                    <td className="px-5 py-5 text-center">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.place}`}
                      >
                        {place}
                      </span>
                    </td>

                    <td className="px-5 py-5 font-black">
                      {
                        row.associationName
                      }
                    </td>

                    <td className="px-5 py-5 text-right text-xl font-black text-blue-300">
                      {
                        row.baseCoefficient
                      }
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
  СЕЗОН 2
  ЛІГА АСОЦІАЦІЙ
  ========================================
*/

function Season2LeagueTable() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.12em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Асоціація
              </th>

              <th className="px-5 py-4 text-center">
                Рейтинг
              </th>

              <th className="px-5 py-4 text-center">
                Кубок асоціацій
              </th>

              <th className="px-5 py-4 text-center">
                Множник
              </th>

              <th className="px-6 py-4 text-right">
                Очки Ліги
              </th>
            </tr>
          </thead>

          <tbody>
            {season2AssociationLeague.map(
              (row) => {
                const styles =
                  getPlaceStyle(
                    row.place
                  );

                return (
                  <tr
                    key={
                      row.associationId
                    }
                    className={`border-b border-white/[0.05] ${styles.row}`}
                  >
                    <td className="px-5 py-5 text-center">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.place}`}
                      >
                        {
                          row.place
                        }
                      </span>
                    </td>

                    <td className="px-5 py-5 font-black">
                      {
                        row.associationName
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.baseCoefficient
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.cupPlacementLabel
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-black text-blue-300">
                      ×
                      {
                        row.multiplier
                      }
                    </td>

                    <td className="px-6 py-5 text-right text-2xl font-black text-blue-300">
                      {formatPoints(
                        row.totalPoints
                      )}
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
  СЕЗОН 3
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
        <table className="w-full min-w-[850px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.14em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Асоціація
              </th>

              <th className="px-5 py-4 text-center">
                Гравців
              </th>

              <th className="px-6 py-4 text-right">
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
                    <td className="px-5 py-5 text-center">
                      <span
                        className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.place}`}
                      >
                        {place}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <div className="font-black">
                        {
                          row.associationName
                        }
                      </div>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-white/25 transition hover:text-blue-300">
                          Показати внесок
                          гравців
                        </summary>

                        <div className="mt-4 space-y-2">
                          {row.members.map(
                            (
                              member
                            ) => {
                              const isR1 =
                                member.rank ===
                                "R1";

                              return (
                                <div
                                  key={
                                    member.playerId
                                  }
                                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                                >
                                  <Link
                                    href={`/players/${member.playerId}`}
                                    className="min-w-0 truncate text-xs font-bold text-white/60 transition hover:text-blue-300"
                                  >
                                    {
                                      member.playerName
                                    }
                                  </Link>

                                  <span
                                    className={`rounded-md border px-2 py-1 text-[10px] font-black ${
                                      isR1
                                        ? "border-red-400/20 bg-red-500/10 text-red-300"
                                        : "border-blue-400/15 bg-blue-500/[0.07] text-blue-300"
                                    }`}
                                  >
                                    {
                                      member.rank ??
                                      "—"
                                    }
                                  </span>

                                  <div className="min-w-[75px] text-right text-xs font-black">
                                    {isR1 ? (
                                      <span>
                                        <span className="text-white/30 line-through">
                                          {
                                            member.coefficient
                                          }
                                        </span>

                                        <span className="ml-2 text-red-300">
                                          → 0
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-white/70">
                                        {
                                          member.associationCoefficient
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </details>
                    </td>

                    <td className="px-5 py-5 text-center text-white/45">
                      {
                        row.members.length
                      }
                    </td>

                    <td className="px-6 py-5 text-right text-2xl font-black text-blue-300">
                      {
                        row.baseCoefficient
                      }
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
  СЕЗОН 3
  LIVE ЛІГА АСОЦІАЦІЙ
  ========================================
*/

function Season3LeagueTable({
  rows,
  cupComplete,
}: {
  rows:
    AssociationLeagueRow[];

  cupComplete: boolean;
}) {
  const sorted =
    cupComplete
      ? [...rows].sort(
          (a, b) =>
            (a.leaguePlace ??
              999) -
            (b.leaguePlace ??
              999)
        )
      : [...rows].sort(
          (a, b) =>
            b.baseCoefficient -
            a.baseCoefficient
        );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-black uppercase tracking-[0.12em] text-white/30">
              <th className="px-5 py-4 text-center">
                М
              </th>

              <th className="px-5 py-4 text-left">
                Асоціація
              </th>

              <th className="px-5 py-4 text-center">
                Рейтинг
              </th>

              <th className="px-5 py-4 text-center">
                Кубок
              </th>

              <th className="px-5 py-4 text-center">
                Множник
              </th>

              <th className="px-6 py-4 text-right">
                Очки Ліги
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map(
              (
                row,
                index
              ) => {
                const displayedPlace =
                  cupComplete
                    ? row.leaguePlace ??
                      index + 1
                    : index + 1;

                const styles =
                  getPlaceStyle(
                    displayedPlace
                  );

                return (
                  <tr
                    key={
                      row.associationId
                    }
                    className={`border-b border-white/[0.05] ${
                      cupComplete
                        ? styles.row
                        : ""
                    }`}
                  >
                    <td className="px-5 py-5 text-center">
                      {cupComplete ? (
                        <span
                          className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2 py-1.5 font-black ${styles.place}`}
                        >
                          {
                            displayedPlace
                          }
                        </span>
                      ) : (
                        <span className="text-white/25">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-5 font-black">
                      {
                        row.associationName
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/60">
                      {
                        row.baseCoefficient
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-bold text-white/50">
                      {
                        row.cupPlacementLabel
                      }
                    </td>

                    <td className="px-5 py-5 text-center font-black text-blue-300">
                      {row.multiplier ===
                      null
                        ? "—"
                        : `×${row.multiplier}`}
                    </td>

                    <td className="px-6 py-5 text-right text-2xl font-black text-blue-300">
                      {row.leaguePoints ===
                      null
                        ? "—"
                        : formatPoints(
                            row.leaguePoints
                          )}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {!cupComplete && (
        <div className="border-t border-white/10 bg-blue-500/[0.035] px-6 py-5 text-sm leading-6 text-white/45">
          Остаточна таблиця
          Ліги Асоціацій буде
          сформована після
          завершення Кубка
          асоціацій і визначення
          множника для кожної
          Асоціації.
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
    LIVE ДАНІ СЕЗОНУ 3
    ========================================
  */

  const liveLeague =
    season === 3
      ? await getAssociationLeague(
          3
        )
      : null;

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
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
                Ліга Асоціацій
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-bold text-white/40 transition hover:text-white"
            >
              Головна
            </Link>

            <a
              href="#league"
              className="text-sm font-bold text-blue-300"
            >
              Ліга Асоціацій
            </a>

            <a
              href="#cup"
              className="hidden text-sm font-bold text-white/40 transition hover:text-white md:block"
            >
              Кубок
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-3 text-5xl font-black">
            Ліга Асоціацій
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/50">
            Головне командне
            змагання Асоціацій.
            Базовий рейтинг
            формується з особистих
            коефіцієнтів членів
            Асоціації, а результат
            Кубка асоціацій визначає
            підсумковий множник.
          </p>

          {/* SEASONS */}

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/tournaments/associations?season=2"
              className={`rounded-xl border px-5 py-3 text-sm font-black transition ${
                season === 2
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                  : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white"
              }`}
            >
              Сезон 2
            </Link>

            <Link
              href="/tournaments/associations?season=3"
              className={`rounded-xl border px-5 py-3 text-sm font-black transition ${
                season === 3
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                  : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white"
              }`}
            >
              Сезон 3
            </Link>

            <Link
              href="/tournaments/associations?season=4"
              className={`rounded-xl border px-5 py-3 text-sm font-black transition ${
                season === 4
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                  : "border-white/10 bg-white/[0.025] text-white/45 hover:text-white"
              }`}
            >
              Сезон 4
            </Link>
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

          <p className="mt-3 max-w-3xl leading-7 text-white/40">
            {season === 2
              ? "Рейтинг Асоціації сформований відповідно до офіційних підсумків Сезону 2."
              : season === 3
                ? "У Сезоні 3 до рейтингу Асоціації входять коефіцієнти гравців R2–R6. Коефіцієнт R1 має вагу 0."
                : "Сезон 4 перебуває у підготовці. Рейтинг Асоціацій буде активований після старту сезону."}
          </p>
        </div>

        {season === 2 ? (
          <Season2BaseRanking />
        ) : season === 3 &&
          liveLeague ? (
          <Season3BaseRanking
            rows={
              liveLeague.rows
            }
          />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] p-8">
            <div className="text-sm font-black text-blue-300">
              Сезон 4 — підготовка
            </div>

            <div className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
              Ранги R1–R6 та склади
              Асоціацій будуть сформовані
              перед початком сезону.
              Після старту тут
              автоматично зʼявиться
              рейтинг Асоціацій.
            </div>
          </div>
        )}
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

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {associations.map(
              (association) => (
                <div
                  key={
                    association.id
                  }
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                >
                  <div className="border-b border-white/10 bg-blue-500/[0.07] p-6">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                      {
                        association.id
                      }
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {
                        association.name
                      }
                    </div>

                    <div className="mt-2 text-sm text-white/30">
                      {
                        association
                          .players
                          .length
                      }{" "}
                      гравців
                    </div>
                  </div>

                  <div className="space-y-2 p-5">
                    {association.players
                      .length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/30">
                        Склад ще не
                        визначено
                      </div>
                    ) : (
                      association.players.map(
                        (
                          playerId,
                          index
                        ) => (
                          <Link
                            key={
                              playerId
                            }
                            href={`/players/${playerId}`}
                            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04]"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-300">
                              {season === 4
                                ? `R${index + 1}`
                                : index + 1}
                            </div>

                            <div className="min-w-0 font-bold">
                              {getPlayerName(
                                playerId
                              )}
                            </div>
                          </Link>
                        )
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
        ) : season === 3 &&
          liveLeague ? (
          <Season3LeagueTable
            rows={
              liveLeague.rows
            }
            cupComplete={
              liveLeague.cupComplete
            }
          />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] p-8">
            <div className="text-lg font-black">
              Ліга Асоціацій ще не
              розпочалася
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
              Після старту Сезону 4
              рейтинг та очки Ліги
              зʼявляться тут
              автоматично.
            </p>
          </div>
        )}
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

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                  className="rounded-2xl border border-white/10 bg-[#07101d] p-5"
                >
                  <div className="text-sm font-bold text-white/45">
                    {label}
                  </div>

                  <div className="mt-2 text-3xl font-black text-blue-300">
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

        {season === 2 ||
        season === 3 ? (
          <AssociationCupPlayoffBracket
            season={season}
          />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] p-8">
            <div className="font-black text-white/70">
              Сітка ще не
              сформована
            </div>

            <p className="mt-3 text-sm text-white/35">
              Кубок асоціацій
              Сезону 4 буде
              сформований після
              жеребкування складів.
            </p>
          </div>
        )}
      </section>

      {/* CUP MATCHES */}

      <section className="border-t border-white/10 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
              Кубок асоціацій
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Матчі
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-white/40">
              Кожне протистояння
              складається з шести
              матчів — R1 проти R1,
              R2 проти R2, R3 проти
              R3, R4 проти R4, R5
              проти R5 та R6 проти
              R6.
            </p>
          </div>

          {season === 2 ||
          season === 3 ? (
            <AssociationCupMatches
              season={season}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#07101d] p-8 text-sm text-white/35">
              Матчів Сезону 4
              поки немає.
            </div>
          )}
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