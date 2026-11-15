import Link from "next/link";
import PlayerEmblem from "./PlayerEmblem";
import { getPlayerEmblemUrls } from "../lib/player-emblem-urls";

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

function getInitials(nickname: string) {
  const pieces = nickname.split(/[\s_-]+/).filter(Boolean);
  const letters = pieces.slice(0, 2).map((word) => word.charAt(0)).join("");
  return (letters || nickname.slice(0, 2) || "IL").toUpperCase();
}

function TrophyOutline({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M14 9h20v12c0 7-4 12-10 12s-10-5-10-12V9Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M14 13H8v6c0 6 5 10 11 10M34 13h6v6c0 6-5 10-11 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 33v7m-9 0h18M18 44h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

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
    player.id,
    season
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

  // Актуальні емблеми, як у профілі гравця: історичні нагороди не змінюємо.
  const emblemUrls = await getPlayerEmblemUrls();

  const uniqueChampions = new Set(
    winners.flatMap((winner) => winner.players.map((player) => player.id))
  ).size;

  if (winners.length === 0) {
    return (
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-[#182333] to-[#0b1624] px-4 py-5 sm:mt-6 sm:px-6 sm:py-7">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/25 bg-yellow-500/[0.08] text-yellow-300/70 sm:h-16 sm:w-16">
          <TrophyOutline className="h-9 w-9 sm:h-11 sm:w-11" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-black text-white sm:text-lg">Підтверджених переможців поки немає</h3>
          <p className="mt-1 text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
            Трофеї сезону {season} з'являться після офіційного визначення переможців турнірів.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-400/15 bg-gradient-to-r from-[#191d25] to-[#0b1522] px-4 py-3 sm:mt-6 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] text-yellow-300">
            <TrophyOutline className="h-7 w-7" />
          </span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.17em] text-yellow-300/80">ОФІЦІЙНІ НАГОРОДИ</div>
            <div className="mt-0.5 text-xs text-white/55 sm:text-sm">За підтвердженими результатами турнірів</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold text-white/75">
          <span><strong className="mr-1 text-xl font-black tabular-nums text-yellow-300">{winners.length}</strong> трофеїв</span>
          <span className="h-6 w-px bg-white/10" aria-hidden="true" />
          <span><strong className="mr-1 text-xl font-black tabular-nums text-yellow-300">{uniqueChampions}</strong> гравців</span>
        </div>
      </div>

      <div className="mt-3 grid items-start gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {winners.map((winner, index) => (
          <article
            key={winner.key}
            className="group relative min-w-0 overflow-hidden rounded-[20px] border border-yellow-400/20 bg-gradient-to-br from-[#1b2736] via-[#0e1928] to-[#15150f] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-400/45 hover:shadow-[0_18px_35px_rgba(0,0,0,0.22)] sm:p-5"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-yellow-300/80 via-yellow-500/35 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-7 text-[116px] font-black leading-none tabular-nums text-yellow-100/[0.025]">{String(index + 1).padStart(2, "0")}</div>
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-500/[0.09] text-yellow-300 sm:h-14 sm:w-14">
                <TrophyOutline className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300/85 sm:text-[11px]">
                  {getCategoryLabel(winner.category)}
                </div>
                <h3 className="mt-0.5 text-base font-black leading-snug text-white sm:mt-1 sm:text-lg">
                  {winner.title}
                </h3>
              </div>
            </div>

            <div className="relative mt-3 space-y-2 border-t border-yellow-400/10 pt-3 sm:mt-4 sm:pt-4">
              {winner.players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}?season=${season}`}
                  title={player.nickname}
                  className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 transition hover:border-yellow-400/30 hover:bg-yellow-400/[0.055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-yellow-400/20 bg-[#071426] [&>*]:!h-full [&>*]:!w-full [&_img]:!h-full [&_img]:!w-full [&_img]:!object-cover">
                    <PlayerEmblem
                      nickname={player.nickname}
                      initials={getInitials(player.nickname)}
                      src={emblemUrls[player.id]}
                      variant="profile"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-white">
                    {player.nickname}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-base font-black text-yellow-300 transition group-hover:translate-x-0.5">→</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
