import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
const root = process.cwd();
const read = (name) => readFileSync(join(root,name),'utf8');
test('server checks owner before parsing/uploading result',()=>{
 const source=read('app/api/player-account/result-submissions/route.ts');
 assert.match(source,/checkPlayerOwnershipForRequest\(request, playerId\)/);
 assert.ok(source.indexOf('const denied = deny') < source.indexOf('request\.formData()'));
 assert.doesNotMatch(source,/\.from\(["']matches["']\)[\s\S]*?\.update\(/);
 assert.match(source,/\.rpc\("submit_player_result_requests"/);
});
test('server validates each screenshot before upload',()=>{
 const source=read('app/api/player-account/result-submissions/route.ts');
 assert.ok(source.indexOf('validateResultEvidence(') < source.indexOf('.upload(path,'));
 assert.match(source,/get\(`evidence_\$\{item\.match_id\}`\)/);
 assert.match(source,/await cleanup\(\)/);
});
test('database function can only run with service_role, checks every real match',()=>{
 const source=read('sql/TEST_ONLY_PLAYER_RESULT_SUBMISSIONS.sql');
 assert.match(source,/REVOKE ALL ON FUNCTION public\.submit_player_result_requests\(uuid,text,jsonb\) FROM PUBLIC, anon, authenticated/);
 assert.match(source,/GRANT EXECUTE ON FUNCTION public\.submit_player_result_requests\(uuid,text,jsonb\) TO service_role/);
 assert.match(source,/FOR UPDATE/);
 assert.match(source,/m\.id::text = v_match_id/);
 assert.match(source,/auth\.identities i/);
});
test('panel integrates real form and the server ownership check exports verified auth id',()=>{
 const panel=read('components/player-account/PlayerAccountPanel.tsx');
 const owner=read('lib/player-account-ownership-server.ts');
 assert.match(panel,/<PlayerResultSubmissionForm/);
 assert.match(owner,/authUserId: authData\.user\.id/);
 assert.doesNotMatch(panel,/setIsOwner/);
});
