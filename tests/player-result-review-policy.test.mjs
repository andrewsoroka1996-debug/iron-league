import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResultReviewAction, parseResultReviewFilter } from '../lib/player-result-review-policy.ts';
const id = '123e4567-e89b-42d3-a456-426614174000';
test('valid approval does not require a reason', () => {
  assert.deepEqual(validateResultReviewAction({action:'approve',request_id:id,expected_revision:1}),
    {ok:true,requestId:id,action:'approve',expectedRevision:1,reason:null});
});
test('reject requires meaningful reason', () => {
  assert.equal(validateResultReviewAction({action:'reject',request_id:id,expected_revision:1,reason:'too'}).ok,false);
  assert.equal(validateResultReviewAction({action:'reject',request_id:id,expected_revision:1,reason:'  Причина помилки  '}).ok,true);
});
test('no arbitrary action, invalid request ID or overlong reason', () => {
  assert.equal(validateResultReviewAction({action:'delete',request_id:id,expected_revision:1}).ok,false);
  assert.equal(validateResultReviewAction({action:'approve',request_id:'bad'}).ok,false);
  assert.equal(validateResultReviewAction({action:'approve',request_id:id,expected_revision:1,reason:'x'.repeat(501)}).ok,false);
});
test('revision is required to avoid approving a stale edit', () => {
  assert.equal(validateResultReviewAction({action:'approve',request_id:id}).ok,false);
  assert.equal(validateResultReviewAction({action:'approve',request_id:id,expected_revision:-1}).ok,false);
});
test('only known list filters', () => {
  assert.equal(parseResultReviewFilter('pending'),'pending');
  assert.equal(parseResultReviewFilter('reviewed'),'reviewed');
  assert.equal(parseResultReviewFilter('all'),null);
});
