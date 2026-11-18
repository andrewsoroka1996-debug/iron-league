import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(file) { return readFileSync(new URL(`../${file}`, import.meta.url), "utf8"); }

test("local OAuth page is server gated by dev mode, test host, port and feature flag", () => {
  const page = source("app/auth-test/page.tsx");
  assert.match(page, /NODE_ENV[^\n]*development/);
  assert.match(page, /PLAYER_ACCOUNTS_ENABLED[^\n]*true/);
  assert.match(page, /localhost:3001/);
  assert.match(page, /knrdsraydifnnbqycird\.supabase\.co/);
  assert.match(page, /notFound\(\)/);
});
test("OAuth callback is dev-only, test-host-only and session is validated by getUser", () => {
  const route = source("app/auth/callback/route.ts");
  assert.match(route, /NODE_ENV[^\n]*development/);
  assert.match(route, /PLAYER_ACCOUNTS_ENABLED[^\n]*true/);
  assert.match(route, /request\.nextUrl\.origin !== LOCAL_ORIGIN/);
  assert.match(route, /knrdsraydifnnbqycird\.supabase\.co/);
  assert.match(route, /exchangeCodeForSession/);
  assert.match(route, /auth\.getUser/);
});
test("no production admin Supabase client is overwritten", () => {
  const auth = source("app/auth-test/AuthTestClient.tsx");
  assert.match(auth, /createBrowserClient/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /\/players\/\$\{encodeURIComponent\(linkedPlayerId\)\}/);
});
test("Discord admin list uses provider ID, not identity UUID", () => {
  const link = source("lib/player-account-link-server.ts");
  assert.match(link, /discordId: getDiscordProviderId\(discord\)/);
  assert.doesNotMatch(link, /discordId: discord\?\.id/);
});
