import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateResultSubmissionItems, validateScreenshotAbsenceReason } from '../lib/player-result-submission-policy.ts';

const item = (reason) => ({ match_id:'iltest-s4-div-16', home_goals:1, away_goals:3, no_screenshot_reason:reason });

test('missing-screenshot reason rejects random one-word text and repeated words', () => {
  for (const text of ['efgergewhrthjjrjyjkjy', 'abcd abcd abcd abcd', '12345678901234567890', 'ааааааааааааааааааа']) {
    assert.equal(validateResultSubmissionItems([item(text)]).ok, false, text);
  }
});

test('ordinary Ukrainian and English explanations are accepted', () => {
  for (const text of ['Скріншот не зберігся через збій гри.', 'Не зміг зробити скріншот після завершення матчу.', 'The screenshot was lost when the game crashed.']) {
    assert.equal(validateScreenshotAbsenceReason(text), null, text);
    assert.equal(validateResultSubmissionItems([item(text)]).ok, true, text);
  }
});

test('no-screenshot reason has bounded length, but screenshot-only submission remains valid', () => {
  assert.match(validateScreenshotAbsenceReason(''), /12 до 1000/);
  assert.match(validateScreenshotAbsenceReason('x'.repeat(1001)), /12 до 1000/);
  assert.equal(validateResultSubmissionItems([item(null)]).ok, true);
});

test('owned result GET is gated before reading private decision history', () => {
  const code = readFileSync(join(process.cwd(),'app/api/player-account/result-submissions/route.ts'),'utf8');
  const getMethod = code.split('export async function GET(')[1].split('export async function POST(')[0];
  assert.ok(getMethod.indexOf('checkPlayerOwnershipForRequest(') < getMethod.indexOf('.from("player_result_submission_decisions")'));
  assert.ok(getMethod.indexOf('.eq("auth_user_id", access.authUserId)') < getMethod.indexOf('.in("submission_id", ownRequestIds)'));
  assert.match(getMethod,/\.eq\("action", "reject"\)/);
  assert.match(getMethod,/last_rejection_reason:/);
  assert.doesNotMatch(getMethod, /evidence_url/);
});

test('player UI displays reason and validates exceptions on the client', () => {
  const code = readFileSync(join(process.cwd(),'components/player-account/PlayerResultSubmissionForm.tsx'),'utf8');
  assert.match(code,/prev\?\.last_rejection_reason/);
  assert.match(code,/Причина відхилення/);
  assert.match(code,/validateScreenshotAbsenceReason\(d.reason\)/);
});
