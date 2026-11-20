import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'app/account/page.tsx'), 'utf8');

test('account home is disabled by default, dynamically rendered and no-indexed', () => {
  assert.match(source, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)\) notFound\(\)/);
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /export const revalidate = 0/);
  assert.match(source, /robots: \{ index: false, follow: false \}/);
});

test('account home requires verified Supabase user and validated Discord identity', () => {
  assert.match(source, /client\.auth\.getUser\(\)/);
  assert.match(source, /getDiscordProviderId\(discordIdentity\)/);
  assert.doesNotMatch(source, /getSession\(/);
  assert.doesNotMatch(source, /user_metadata/);
});

test('only RLS-owned, approved links can reach a resolved public profile', () => {
  assert.match(source, /\.from\("player_discord_links"\)/);
  assert.match(source, /\.eq\("auth_user_id", auth\.user\.id\)/);
  assert.match(source, /resolvePublicPlayer\(link\.player_id\)/);
  assert.match(source, /if \(!profile \|\| profile\.id !== link\.player_id\)/);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|ADMIN_PASSWORD|\.insert\(|\.update\(|\.delete\(/);
});

test('applicant pages are gated and no OAuth or account flags are modified', () => {
  assert.match(source, /profileApplicationsEnabled\(\)/);
  assert.match(source, /href="\/account\/link-player"/);
  assert.match(source, /href="\/account\/new-player"/);
  assert.doesNotMatch(source, /signInWithOAuth|exchangeCodeForSession/);
});
