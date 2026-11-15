/* Єдине зіставлення історичних імен для рейтингу та профілю. */
import { players } from "../data/players";

export function normalizePlayerName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-zа-яіїєґ0-9]/g,
      ""
    );
}

/*
  Старі варіанти нікнеймів,
  які відрізняються від
  сучасних внутрішніх ID.
*/

const ARCHIVE_PLAYER_ALIASES:
  Record<string, string> = {
  alexliv530: "alexliv",

  taraasykunl:
    "taraaasyk-unl",

  holyholy28:
    "holy",

  deyl:
    "deyl",

  vdodessaua:
    "d-odessaua",

  cahb14:
    "canb14",

  "6abobha":
    "6abovha",

  voidex:
    "v0id-ex",

  nostress23:
    "no-stress23",

  awpfun:
    "awp-fun",

  kol3nbka:
    "kol3nbka",

  thelp9:
    "thelp9",

  vovamonte:
    "vovamonte",

  zidane4423:
    "zidane4423",

  ruslanuapes:
    "ruslanuapes",

  arthurchamp07:
    "arthurchamp07",

  antidemon39:
    "antidemon39",

  as0910:
    "as0910",

  olejose11:
    "olejose11",

  verhor28:
    "verhor28",

  vladiken7:
    "vladiken7",

  soga:
    "soga",

  fourydeca:
    "4ydeca",
};

export function findArchivePlayerId(
  playerName: string
) {
  const normalized =
    normalizePlayerName(
      playerName
    );

  /*
    Спочатку шукаємо
    по актуальному nickname або id.
  */

  const direct =
    players.find(
      (player) =>
        normalizePlayerName(
          player.nickname
        ) === normalized ||
        normalizePlayerName(
          player.id
        ) === normalized
    );

  if (direct) {
    return direct.id;
  }

  /*
    Потім перевіряємо
    старі варіанти.
  */

  return (
    ARCHIVE_PLAYER_ALIASES[
      normalized
    ] ?? null
  );
}
