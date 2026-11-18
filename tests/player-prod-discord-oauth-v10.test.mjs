import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRODUCTION_ORIGIN,
  PRODUCTION_SUPABASE_ORIGIN,
  getAllowedDiscordIds,
  productionPilotEnabled,
  isApprovedPilotDiscordIdentity,
} from '../lib/player-prod-oauth-pilot-policy.ts';

const base = {
  nodeEnv: 'production',
  pilotEnabled: 'true',
  accountsEnabled: undefined,
  localTestEnabled: undefined,
  requestOrigin: PRODUCTION_ORIGIN,
  supabaseUrl: PRODUCTION_SUPABASE_ORIGIN,
  supabasePublishableKey: 'public-key-for-test',
  allowedDiscordIds: '157269493342352588',
};
const file = (path) => readFileSync(join(process.cwd(), path), 'utf8');

test('production pilot is disabled by default and rejects dev/preview/test hosts', () => {
  assert.equal(productionPilotEnabled(base), true);
  for (const patch of [
    { pilotEnabled: undefined },
    { pilotEnabled: 'false' },
    { nodeEnv: 'development' },
    { requestOrigin: 'https://preview.vercel.app' },
    { requestOrigin: 'http://localhost:3001' },
    { localTestEnabled: 'true' },
    { accountsEnabled: 'true' },
    { supabasePublishableKey: undefined },
    { allowedDiscordIds: undefined },
  ]) assert.equal(productionPilotEnabled({ ...base, ...patch }), false, JSON.stringify(patch));
});

test('production pilot refuses the test or malformed Supabase URL', () => {
  for (const url of [
    'https://knrdsraydifnnbqycird.supabase.co',
    'http://mrihbcbmpzenhepaglcm.supabase.co',
    'https://mrihbcbmpzenhepaglcm.supabase.co.attacker.test',
    'not a URL',
    '',
  ]) assert.equal(productionPilotEnabled({ ...base, supabaseUrl: url }), false, url);
});

test('Discord pilot allowlist accepts only complete numeric snowflake IDs', () => {
  const allowed = getAllowedDiscordIds('157269493342352588, invalid, 157269493342352588,  123456789012345678 ');
  assert.equal(allowed.size, 2);
  assert.equal(isApprovedPilotDiscordIdentity('157269493342352588', base.allowedDiscordIds), true);
  assert.equal(isApprovedPilotDiscordIdentity('999999999999999999', base.allowedDiscordIds), false);
  assert.equal(isApprovedPilotDiscordIdentity(null, base.allowedDiscordIds), false);
});

test('the old local callback remains available in source behind original strict guards', () => {
  const code = file('app/auth/callback/route.ts');
  assert.match(code, /const TEST_HOST = "knrdsraydifnnbqycird\.supabase\.co"/);
  assert.match(code, /const LOCAL_ORIGIN = "http:\/\/localhost:3001"/);
  assert.match(code, /process\.env\.NODE_ENV !== "development"/);
  assert.match(code, /process\.env\.IRON_LEAGUE_E2E_TEST_ONLY !== "true"/);
  assert.match(code, /new URL\(url\)\.hostname !== TEST_HOST/);
});

test('production callback accepts only checked Discord identity and fixed redirects', () => {
  const code = file('app/auth/callback/route.ts');
  assert.match(code, /productionPilotEnabled\(/);
  assert.match(code, /exchangeCodeForSession\(code\)/);
  assert.match(code, /getDiscordProviderId\(discordIdentity\)/);
  assert.match(code, /isApprovedPilotDiscordIdentity\(/);
  assert.match(code, /process\.env\.IRON_LEAGUE_PROD_DISCORD_ALLOWED_IDS/);
  assert.match(code, /response\.cookies\.set\(name, value, options\)/);
  assert.match(code, /\$\{PRODUCTION_ORIGIN\}\/auth\/discord-pilot\?oauth=success/);
  assert.doesNotMatch(code, /searchParams\.get\(["']next["']\)/);
});

test('pilot page has a server-side feature gate and is hidden from preview hosts', () => {
  const code = file('app/auth/discord-pilot/page.tsx');
  assert.match(code, /notFound\(\)/);
  assert.match(code, /productionPilotEnabled\(/);
  assert.match(code, /requestHeaders\.get\("host"\)/);
  assert.match(code, /host !== "ironleague\.com\.ua"/);
});

test('login starts browser-based PKCE through Discord and cannot grant admin rights', () => {
  const code = file('app/auth/discord-pilot/DiscordPilotClient.tsx');
  assert.match(code, /createBrowserClient/);
  assert.match(code, /auth\.signInWithOAuth\(/);
  assert.match(code, /provider: "discord"/);
  assert.match(code, /redirectTo: `\$\{ORIGIN\}\/auth\/callback`/);
  assert.doesNotMatch(code, /supabaseAdmin|ADMIN_PASSWORD|\/api\/admin\//);
});
