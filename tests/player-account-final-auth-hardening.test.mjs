import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getDiscordProviderId } from "../lib/discord-identity-provider-id.ts";

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ownership = file("lib/player-account-ownership-server.ts");
const hub = file("app/account/page.tsx");
const links = file("lib/player-account-link-server.ts");
const newcomers = file("lib/player-profile-request-server.ts");
const policy = file("lib/player-account-access-policy.ts");

const goodId = "123456789012345678";

test("provider identity must be canonical, valid and metadata-consistent", () => {
  assert.equal(getDiscordProviderId({ provider: "discord", id: goodId, identity_data: { sub: goodId } }), goodId);
  assert.equal(getDiscordProviderId({ provider: "discord", id: "non-numeric" }), null);
  assert.equal(getDiscordProviderId({ provider: "google", id: goodId }), null);
  assert.equal(getDiscordProviderId({ provider: "discord", id: goodId, identity_data: { sub: "999999999999999999" } }), null);
});

test("private owner API validates current Discord identity AND approved binding", () => {
  assert.match(ownership, /supabase\.auth\.getUser\(\)/);
  assert.match(ownership, /getDiscordProviderId\(discordIdentity\)/);
  assert.match(ownership, /\.select\("auth_user_id, player_id, discord_user_id"\)/);
  assert.match(ownership, /verifiedDiscordId,/);
  assert.match(policy, /link\.discord_user_id !== input\.verifiedDiscordId/);
  assert.doesNotMatch(ownership, /auth\.getSession\(\)/);
});

test("account hub rejects a linked profile when current Discord ID differs", () => {
  assert.match(hub, /const verifiedDiscordId = getDiscordProviderId\(discordIdentity\)/);
  assert.match(hub, /\.select\("player_id, discord_user_id"\)/);
  assert.match(hub, /link\.discord_user_id !== verifiedDiscordId/);
  assert.match(hub, /return \{ kind: "discord-required" \}/);
});

test("both application endpoints block a pending request of the other type", () => {
  assert.match(links, /client\.from\("player_profile_creation_requests"\)/);
  assert.match(links, /\.eq\("auth_user_id", auth\.user\.id\)\.eq\("status", "pending"\)/);
  assert.match(links, /pendingNewPlayer\.error/);
  assert.match(links, /Boolean\(pending\.data\?\.length \|\| pendingNewPlayer\.data\?\.length\)/);
  assert.match(newcomers, /client\.from\("player_discord_link_requests"\)/);
  assert.match(newcomers, /pendingLink: Boolean\(existingLinkRequest\.data\?\.length\)/);
});

test("legacy link endpoint uses the same strict helper as newcomer intake", () => {
  assert.match(links, /getDiscordProviderId\(discordIdentity\)/);
  assert.doesNotMatch(links, /containsDiscordIdentity/);
  assert.match(newcomers, /getDiscordProviderId\(discordIdentity\)/);
});

test("the hardened patch does not alter SQL, OAuth callbacks or feature flags", () => {
  assert.match(ownership, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
  assert.match(hub, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)\) notFound\(\)/);
  assert.match(links, /dynamicLinkFeatureEnabled\(\)/);
  assert.match(links, /adminPasswordValid\(input\.password\)/);
  assert.match(links, /admin\.rpc\("admin_decide_player_discord_link"/);
});
