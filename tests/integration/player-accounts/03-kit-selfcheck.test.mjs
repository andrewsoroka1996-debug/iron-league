import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(dir, '02-verify.sql'), 'utf8');
const ps = readFileSync(path.join(dir, 'run-local-tests.ps1'), 'utf8');

function authenticatedSections(source) {
  const rx = /SET ROLE authenticated;([\s\S]*?)RESET ROLE;/g;
  return [...source.matchAll(rx)].map(m => m[1]);
}

test('authenticated inserts never assign the server-generated request UUID', () => {
  const sections = authenticatedSections(sql);
  assert.equal(sections.length, 2);
  assert.match(sections[0], /INSERT INTO public\.player_discord_link_requests\(auth_user_id,player_id\)/);
  assert.match(sections[1], /INSERT INTO public\.player_profile_creation_requests\(auth_user_id,desired_nickname,note\)/);
  for (const sec of sections) {
    assert.doesNotMatch(sec, /INSERT INTO public\.player_(?:discord_link_requests|profile_creation_requests)\(id,/);
  }
});

test('administrative approvals use generated request IDs, never assumptions', () => {
  assert.doesNotMatch(sql, /a1111111-1111-4111-8111-111111111111/);
  assert.doesNotMatch(sql, /b2222222-2222-4222-8222-222222222222/);
  assert.match(sql, /SELECT id FROM public\.player_discord_link_requests WHERE auth_user_id=/);
  assert.match(sql, /SELECT id FROM public\.player_profile_creation_requests WHERE auth_user_id=/);
});

test('resume cannot bootstrap, overwrite or blindly test a previous database', () => {
  assert.match(ps, /\[string\]\$ResumeDatabase = ''/);
  assert.match(ps, /-cnotmatch '\^il_smoke_\[0-9\]/);
  assert.match(ps, /Retained database integrity check/);
  assert.match(ps, /\(SELECT count\(\*\) FROM public\.player_profile_creation_requests\) = 0/);
  assert.match(ps, /\(SELECT count\(\*\) FROM public\.player_discord_link_requests\) = 0/);
  assert.match(ps, /if \(\$resume\) \{/);
  assert.match(ps, /else \{\s*if \(\(\$existing -join ''\)\.Trim\(\) -ne 'f'\)/);
  assert.match(ps, /'127\.0\.0\.1'/);
  assert.match(ps, /'55432'/);
  assert.match(ps, /17-ironleaguetest\/data\|55432\|127\.0\.0\.1\|17\|utf8/);
  assert.match(ps, /Refusing cleanup: unexpected disposable database name/);
});


test('v5 fresh database and concurrent request protection are mandatory', () => {
  assert.match(ps, /prepared-v5\.sql/);
  assert.match(ps, /CREATE TABLE public\\.il_pending_player_request_slots|CREATE TABLE public\.il_pending_player_request_slots/);
  assert.match(ps, /v5 test suite requires a fresh disposable database/);
  assert.match(ps, /04-concurrent-requests\.ps1/);
  assert.match(sql, /il_pending_player_request_slots_pkey/);
  assert.match(sql, /rejected requests release slot/);
});
