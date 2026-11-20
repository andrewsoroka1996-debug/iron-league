import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');

test('new account intake requires two server-only feature gates', () => {
  const server = read('lib/player-profile-request-server.ts');
  assert.match(server, /IRON_LEAGUE_NEW_PLAYER_APPLICATIONS_ENABLED === "true"/);
  assert.match(server, /if \(!profileApplicationsEnabled\(\)\) return respond\(\{ error: "Недоступно" \}, 404\)/);
  assert.doesNotMatch(server, /knrdsraydifnnbqycird|APPLICATIONS_TEST|TEST_SUPABASE_URL/);
  assert.match(server, /playerAccountsEnabled\(process\.env\.PLAYER_ACCOUNTS_ENABLED\)/);
});

test('only Supabase-verified Discord identity may submit, no arbitrary auth_user_id', () => {
  const server = read('lib/player-profile-request-server.ts');
  assert.match(server, /client\.auth\.getUser\(\)/);
  assert.match(server, /getDiscordProviderId\(discordIdentity\)/);
  assert.match(server, /auth_user_id: auth\.user\.id/);
  assert.doesNotMatch(server, /auth_user_id: input\./);
  assert.match(server, /canSubmitProfileRequest/);
});

test('applicant endpoint cannot create profile; admin approval is a separately gated RPC', () => {
  const server = read('lib/player-profile-request-server.ts');
  assert.doesNotMatch(server, /admin_decide_player_discord_link/);
  assert.doesNotMatch(server, /\.from\("players"\)\.insert/);
  assert.doesNotMatch(server, /\.from\("player_discord_links"\)\.insert/);
  assert.match(server, /IRON_LEAGUE_NEW_PLAYER_APPROVAL_ENABLED === "true"/);
  assert.match(server, /input\.action !== "list" && input\.action !== "reject" && input\.action !== "approve"/);
  assert.match(server, /client\.rpc\(APPROVAL_RPC/);
});

test('admin action remains password-gated; approval independently disabled by default', () => {
  const server = read('lib/player-profile-request-server.ts');
  assert.match(server, /timingSafeEqual/);
  assert.match(server, /adminPasswordValid\(input\.password\)/);
  assert.match(server, /\.eq\("status", "pending"\)\.select\("id"\)/);
  assert.match(server, /\.auth\.admin\.getUserById/);
  assert.match(server, /if \(input\.action === "approve" && !playerApprovalEnabled\(\)\)/);
  const route = read('app/api/admin/player-profile-requests/route.ts');
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
});

test('SQL protects applicant ownership with RLS, restrictive grants, uniqueness', () => {
  const sql = read('sql/REVIEW-ONLY-player-profile-requests.sql');
  assert.match(sql, /DO NOT RUN YET/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL .* FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT INSERT \(auth_user_id, desired_nickname, note\)/);
  assert.match(sql, /USING \(\(SELECT auth\.uid\(\)\) = auth_user_id\)/);
  assert.match(sql, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = auth_user_id/);
  assert.match(sql, /WHERE status = 'pending'/);
  assert.doesNotMatch(sql, /GRANT UPDATE .* TO authenticated/);
});

test('newcomer form and existing admin page remain separate from old link API', () => {
  const form = read('components/player-account/NewPlayerApplicationForm.tsx');
  const admin = read('components/admin/NewProfileRequestsAdminPanel.tsx');
  assert.match(form, /\/api\/player-account\/profile-requests/);
  assert.match(admin, /\/api\/admin\/player-profile-requests/);
  assert.match(admin, /Завантажити заявки новачків/);
  assert.doesNotMatch(form, /\/auth-test|TEST ONLY/);
  assert.match(admin, /Схвалити та створити профіль/);
  assert.match(admin, /window\.prompt/);
});
