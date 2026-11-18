import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const api = readFileSync(new URL('app/api/admin/player-result-submissions/route.ts',root),'utf8');
const sql = readFileSync(new URL('sql/TEST_ONLY_PLAYER_RESULT_ADMIN_APPROVAL.sql',root),'utf8');
const ui = readFileSync(new URL('components/admin/PlayerResultReviewPanel.tsx',root),'utf8');
test('admin API is POST only, gated, password protected and never updates matches directly', () => {
  assert.match(api,/export async function POST/);
  assert.doesNotMatch(api,/export async function GET/);
  assert.match(api,/playerAccountsEnabled/);
  assert.match(api,/validPassword\(body\.password\)/);
  assert.match(api,/\.rpc\("admin_decide_player_result_submission"/);
  assert.doesNotMatch(api,/from\("matches"\)\s*\.update/);
});
test('SQL decision is atomic, row locked, service-role only, and blocks closed_unplayed approval', () => {
  assert.match(sql,/BEGIN;/);
  assert.match(sql,/FOR UPDATE/);
  assert.match(sql,/v_request\.revision <> p_expected_revision/);
  assert.match(api,/p_expected_revision: checked\.expectedRevision/);
  assert.match(sql,/IF v_match\.status <> 'scheduled'/);
  assert.match(sql,/UPDATE public\.matches/);
  assert.match(sql,/UPDATE public\.player_result_submissions/);
  assert.match(sql,/UNIQUE \(submission_id, revision\)/);
  assert.match(sql,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]+?TO service_role/);
  assert.match(sql,/COMMIT;/);
});
test('private screenshot signed server-side, password not in query string, UI rejects without reason', () => {
  assert.match(api,/createSignedUrl/);
  assert.match(api,/createSignedUrl\(item\.screenshot_path, 300\)/);
  assert.match(api,/"Cache-Control", "private, no-store"/);
  assert.match(ui,/type="password"/);
  assert.match(ui,/reason\[item\.id\]/);
  assert.match(ui,/window\.confirm/);
});
