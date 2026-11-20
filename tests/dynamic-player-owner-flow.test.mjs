import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = (name) => readFileSync(resolve(root, name), "utf8");

test("ownership stays gated by PLAYER_ACCOUNTS_ENABLED and verified Supabase auth", () => {
  const source = file("lib/player-account-ownership-server.ts");
  assert.match(source, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /\.from\("player_discord_links"\)/);
  assert.match(source, /decidePlayerOwnership\(/);
  assert.doesNotMatch(source, /displayName|discordNickname/);
});

test("only validated dynamic public profile IDs extend the owner policy", () => {
  const source = file("lib/player-account-ownership-server.ts");
  assert.match(source, /if \(!dynamicProfilesEnabled\(\)\) return checked\("invalid_profile"\)/);
  assert.match(source, /await resolvePublicPlayer\(requestedPlayerId\)/);
  assert.match(source, /!profile \|\| profile\.source !== "dynamic"/);
  assert.match(source, /validatedPlayerIds = new Set\(\[profile\.id\]\)/);
  assert.match(source, /knownPlayerIds: validatedPlayerIds/);
});

test("player page mounts private panel only behind existing accounts gate", () => {
  const source = file("app/players/[id]/page.tsx");
  assert.match(source, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\) && \(/);
  assert.match(source, /<PlayerAccountPanel key=\{playerId\} playerId=\{playerId\} \/>/);
  assert.doesNotMatch(source, /player\.source === "legacy" && playerAccountsEnabled/);
});

test("match source checks real dynamic records and never bypasses owner API", () => {
  const source = file("lib/player-account-matches-server.ts");
  assert.match(source, /await resolvePublicPlayer\(playerId\)/);
  assert.match(source, /profile\.source !== "dynamic"/);
  assert.match(file("app/api/player-account/matches/route.ts"), /checkPlayerOwnershipForRequest\(request, playerId\)/);
  assert.match(file("app/api/player-account/matches/route.ts"), /if \(profile\?\.source === "dynamic"\) playerNames\[playerId\]/);
});

test("dynamic profile data remains separate from historical rosters", () => {
  const source = file("lib/dynamic-player-profiles-server.ts");
  assert.match(source, /IRON_LEAGUE_DYNAMIC_PLAYER_PROFILES_ENABLED/);
  assert.match(source, /const PLAYER_TABLE = "player_profiles"/);
  assert.match(source, /if \(legacyIds\.has\(row\.id\.toLowerCase\(\)\)/);
  assert.match(source, /return data \? fromDatabase/);
});
