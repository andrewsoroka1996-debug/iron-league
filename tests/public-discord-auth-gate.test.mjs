import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(p, 'utf8');
const policy = read('lib/player-public-oauth-policy.ts');
const callback = read('app/auth/public-callback/route.ts');
const page = read('app/auth/discord/page.tsx');
const client = read('app/auth/discord/PublicDiscordLogin.tsx');
const hub = read('app/account/page.tsx');
const old = read('app/auth/callback/route.ts');

// Static regression checks only; actual OAuth and Auth Hook require a gated
// end-to-end test against Supabase before production activation.
test('public auth needs separate explicit opt-in, accounts gate and production origin', () => {
  assert.match(policy, /accountsEnabled !== "true"/);
  assert.match(policy, /publicEnabled !== "true"/);
  assert.match(policy, /pilotEnabled === "true"/);
  assert.match(policy, /localTestEnabled === "true"/);
  assert.match(policy, /requestOrigin !== PUBLIC_ORIGIN/);
  assert.match(policy, /PUBLIC_SUPABASE_ORIGIN/);
});

test('public login page never mounts while gate is disabled', () => {
  assert.match(page, /publicDiscordAuthEnabled\(/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /metadata = \{ robots: \{ index: false, follow: false \} \}/);
  assert.match(page, /host !== "ironleague\.com\.ua"/);
});

test('callback rejects unauthorized deployments and validates provider ID server-side', () => {
  assert.match(callback, /publicDiscordAuthEnabled\(/);
  assert.match(callback, /status: 404/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /client\.auth\.getUser\(\)/);
  assert.match(callback, /getDiscordProviderId\(identity\)/);
  assert.match(callback, /return success/);
  assert.match(callback, /Cache-Control/);
  assert.doesNotMatch(callback, /SUPABASE_SECRET_KEY|ADMIN_PASSWORD|user_metadata|\.insert\(/);
});

test('browser starts OAuth only for fixed callback at production origin', () => {
  assert.match(client, /signInWithOAuth\(/);
  assert.match(client, /provider: "discord"/);
  assert.match(client, /auth\/public-callback/);
  assert.match(client, /PUBLIC_ORIGIN/);
  assert.doesNotMatch(client, /SUPABASE_SECRET_KEY|ADMIN_PASSWORD|service_role/);
});

test('account hub shows login link only with public auth gate and preserves RLS', () => {
  assert.match(hub, /publicDiscordAuthEnabled\(/);
  assert.match(hub, /publicLoginAvailable \?/);
  assert.match(hub, /href="\/auth\/discord"/);
  assert.match(hub, /\.from\("player_discord_links"\)/);
  assert.match(old, /handleProductionPilot/);
  assert.doesNotMatch(old, /IRON_LEAGUE_PUBLIC_DISCORD_AUTH_ENABLED/);
});
