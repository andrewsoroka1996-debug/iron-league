import Link from "next/link";

import { players } from "../data/players";

import type {
  SeasonNumber,
} from "../data/competitions/season-competitions";

import {
  getPlayerHonours,
  type PlayerHonour,
} from "../lib/player-honours";

type Props = {
  season: SeasonNumber;
};

type WinnerPlayer = {
  id: string;
  nickname: string;
};

type WinnerGroup = {
  key: string;
  title: string;
  category: PlayerHonour["category"];
  players: WinnerPlayer[];
};

function getCategoryLabel(
  category: PlayerHonour["category"]
) {
  if (category === "division") {
    return "Чемпіонат";
  }

  if (category === "cup") {
    return "Кубок";
  }

  if (category === "europe") {
    return "Єврокубок";
  }

  if (category === "super-cup") {
    return "Суперкубок";
  }

  if (category === "association") {
    return "Асоціації";
  }

  if (category === "coop") {
    return "Co-op";
  }

  return "Трофей";
}

function getCategoryOrder(
  category: PlayerHonour["category"]
) {
  if (category === "division") {
    return 1;
  }

  if (category === "cup") {
    return 2;
  }

  if (category === "europe") {
    return 3;
  }

  if (category === "super-cup") {
    return 4;
  }

  if (category === "association") {
    return 5;
  }

  if (category === "coop") {
    return 6;
  }

  return 99;
}

export default async function SeasonWinners({
  season,
}: Props) {
  const groups =
    new Map<string, WinnerGroup>();

  /*
    ========================================
    ПЕРЕВІРЯЄМО ДОСЯГНЕННЯ
    ВСІХ ГРАВЦІВ
    ========================================

    Джерело істини —
    getPlayerHonours().

    Тому History і профілі
    гравців завжди використовують
    однакову логіку.
  */

  const BATCH_SIZE = 8;

  for (
    let start = 0;
    start < players.length;
    start += BATCH_SIZE
  ) {
    const batch =
      players.slice(
        start,
        start + BATCH_SIZE
      );

    const results =
      await Promise.all(
        batch.map(
          async (player) => {
            const honours =
              await getPlayerHonours(
                player.id
              );

            return {
              player,
              honours:
                honours.filter(
                  (honour) =>
                    honour.season ===
                    season
                ),
            };
          }
        )
      );

    for (const result of results) {
      for (
        const honour of
        result.honours
      ) {
        const existing =
          groups.get(
            honour.key
          );

        const winner = {
          id: result.player.id,
          nickname:
            result.player.nickname,
        };

        if (existing) {
          const alreadyAdded =
            existing.players.some(
              (player) =>
                player.id ===
                winner.id
            );

          if (!alreadyAdded) {
            existing.players.push(
              winner
            );
          }

          continue;
        }

        groups.set(
          honour.key,
          {
            key: honour.key,
            title: honour.title,
            category:
              honour.category,
            players: [winner],
          }
        );
      }
    }
  }

  const winners =
    Array.from(
      groups.values()
    ).sort(
      (a, b) => {
        const categoryDifference =
          getCategoryOrder(
            a.category
          ) -
          getCategoryOrder(
            b.category
          );

        if (
          categoryDifference !== 0
        ) {
          return categoryDifference;
        }

        return a.title.localeCompare(
          b.title,
          "uk"
        );
      }
    );

  /*
    ========================================
    ПОКИ ПЕРЕМОЖЦІВ НЕМАЄ
    ========================================
  */

  if (winners.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] p-8">
        <h3 className="text-xl font-black">
          Переможці ще не визначені
        </h3>

        <p className="mt-3 max-w-2xl leading-7 text-white/40">
          Переможці Сезону{" "}
          {season} автоматично
          з'являться тут після
          завершення відповідних
          турнірів.
        </p>
      </div>
    );
  }

  /*
    ========================================
    ПЕРЕМОЖЦІ
    ========================================
  */

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {winners.map(
        (winner) => (
          <article
            key={winner.key}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
          >
            <div className="border-b border-white/10 bg-yellow-400/[0.04] px-6 py-5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">
                {getCategoryLabel(
                  winner.category
                )}
              </div>

              <h3 className="mt-2 text-xl font-black">
                {winner.title}
              </h3>
            </div>

            <div className="space-y-2 p-5">
              {winner.players.map(
                (player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}?season=${season}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition hover:border-yellow-400/25 hover:bg-yellow-400/[0.04]"
                  >
                    <span className="font-black">
                      {
                        player.nickname
                      }
                    </span>

                    <span className="text-yellow-300">
                      🏆
                    </span>
                  </Link>
                )
              )}
            </div>
          </article>
        )
      )}
    </div>
  );
}