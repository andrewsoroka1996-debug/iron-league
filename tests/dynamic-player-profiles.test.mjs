import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const base = process.cwd();
const read = (name) => readFileSync(path.join(base, name), "utf8");

const list = read("app/players/page.tsx");
const page = read("app/players/[id]/page.tsx");
const server = read("lib/dynamic-player-profiles-server.ts");
const newcomer = read("components/player-account/NewPlayerPublicProfile.tsx");
const sql = read("sql/REVIEW-ONLY-dynamic-player-profiles.sql");

test("dynamic profile reader is explicitly opt-in and uses public RLS credentials", () => {
  assert.match(server, /IRON_LEAGUE_DYNAMIC_PLAYER_PROFILES_ENABLED === "true"/);
  assert.match(server, /if \(!dynamicProfilesEnabled\(\)\) return \[\]/);
  assert.match(server, /if \(!dynamicProfilesEnabled\(\) \|\| !allowedPlayerId\(playerId\)\) return null/);
  assert.match(server, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(server, /process\.env\.SUPABASE_SECRET_KEY|\.from\("auth\.users"\)/);
});

test("legacy lookup takes precedence, including when dynamic feature is disabled", () => {
  const oldIndex = server.indexOf("const legacy = players.find");
  const gateIndex = server.indexOf("if (!dynamicProfilesEnabled() || !allowedPlayerId(playerId)) return null;");
  assert.ok(oldIndex > 0 && gateIndex > oldIndex);
  assert.match(server, /legacyIds\.has\(row\.id\.toLowerCase\(\)\)/);
  assert.match(server, /legacyNames\.has\(nickKey\(row\.nickname\)\)/);
});

test("season roster and season counter remain unchanged", () => {
  assert.match(list, /const seasonPlayers\s*=\s*await getSeasonPlayers\(/);
  assert.match(list, /\{seasonPlayers\.length\}/);
  assert.match(list, /const showDynamicProfiles = dynamicProfilesEnabled\(\) && season >= 3;/);
  assert.match(list, /newRegisteredPlayers\.map\(/);
  assert.match(list, /Історичні гравці відображаються як раніше/);
  assert.doesNotMatch(list, /seasonPlayers\s*=\s*\[\.\.\./);
});

test("historical profile data flow untouched, dynamic profiles show separate empty state", () => {
  assert.match(page, /const player = await resolvePublicPlayer\(playerId\)/);
  assert.match(page, /player\.source === "dynamic" \? \(/);
  assert.match(page, /<NewPlayerPublicProfile nickname=\{player\.nickname\}/);
  assert.match(page, /<PlayerProfileData playerId=\{playerId\} season=\{season\}/);
  assert.match(page, /player\.source === "legacy" && playerAccountsEnabled/);
  assert.match(newcomer, /Матчів/);
  assert.match(newcomer, /Трофеїв/);
  assert.doesNotMatch(newcomer, /supabase|fetch\(/i);
});

test("SQL is review only, and public roles cannot write", () => {
  assert.match(sql, /REVIEW ONLY/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.player_profiles FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT SELECT \(id, nickname\) ON public\.player_profiles TO anon, authenticated/);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE|ALL) ON public\.player_profiles TO (?:anon|authenticated)/);
  assert.match(sql, /CREATE UNIQUE INDEX player_profiles_nickname_ci_unique/);
});
