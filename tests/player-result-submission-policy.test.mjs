import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResultSubmissionItems, validateResultEvidence, eligibleForPlayerResultRequest } from '../lib/player-result-submission-policy.ts';
const item = (id='match-1') => ({match_id:id,home_goals:3,away_goals:2,no_screenshot_reason:null});
test('one or two independently identified matches accepted',()=>{
 assert.equal(validateResultSubmissionItems([item()]).ok,true);
 assert.equal(validateResultSubmissionItems([item(),item('match-2')]).ok,true);
});
test('no duplicate match ID even if users played a double-header',()=>{
 assert.equal(validateResultSubmissionItems([item(),item()]).ok,false);
});
test('zero or more than two submissions are rejected',()=>{
 assert.equal(validateResultSubmissionItems([]).ok,false);
 assert.equal(validateResultSubmissionItems([item('a'),item('b'),item('c')]).ok,false);
});
test('strict whole-number scores from 0 to 99 only',()=>{
 for (const bad of [-1,100,2.5,'3',null,Infinity]) assert.equal(validateResultSubmissionItems([{...item(),home_goals:bad}]).ok,false);
});
test('reject non-string, too-short or too-long optional explanation',()=>{
 assert.equal(validateResultSubmissionItems([{...item(),no_screenshot_reason:'short'}]).ok,false);
 assert.equal(validateResultSubmissionItems([{...item(),no_screenshot_reason:42}]).ok,false);
 assert.equal(validateResultSubmissionItems([{...item(),no_screenshot_reason:'x'.repeat(1001)}]).ok,false);
 assert.equal(validateResultSubmissionItems([{...item(),no_screenshot_reason:'Скріншот не зберігся через збій гри.'}]).ok,true);
});
test('file extension and content type are not enough; validate signature',()=>{
 assert.equal(validateResultEvidence({size:4,type:'image/jpeg',bytes:new Uint8Array([0xff,0xd8,0xff,0])}),null);
 assert.match(validateResultEvidence({size:4,type:'image/png',bytes:new Uint8Array([0xff,0xd8,0xff,0])}),/не відповідає/);
 assert.match(validateResultEvidence({size:4,type:'text/plain',bytes:new Uint8Array([0,0,0,0])}),/JPG/);
});
test('size limit applies to screenshots',()=>{
 assert.match(validateResultEvidence({size:8*1024*1024+1,type:'image/jpeg',bytes:new Uint8Array([0xff,0xd8,0xff])}),/8 МБ/);
});
test('player cannot submit for another player or season, but can for eligible scheduled match',()=>{
 const m = {id:'m',season:4,status:'scheduled',participant_type:'player',home_id:'a',away_id:'b'};
 assert.equal(eligibleForPlayerResultRequest(m,'a'),true);
 assert.equal(eligibleForPlayerResultRequest(m,'b'),true);
 assert.equal(eligibleForPlayerResultRequest(m,'x'),false);
 assert.equal(eligibleForPlayerResultRequest({...m,status:'finished'},'a'),false);
 assert.equal(eligibleForPlayerResultRequest({...m,participant_type:'team'},'a'),false);
 assert.equal(eligibleForPlayerResultRequest({...m,season:3},'a'),false);
 assert.equal(eligibleForPlayerResultRequest({...m,status:'closed_unplayed'},'a'),true);
});
