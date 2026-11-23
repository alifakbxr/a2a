import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReviewedDecisions} from '../scripts/review-agent-decisions.mjs';
const log=[{type:'PLANNER_RESPONSE',step_index:10,thinking:'very private',tool_calls:[{name:'run_command'}]},{type:'GENERIC',step_index:11,status:'ERROR',content:'api_key=private'}];
test('independent review links evidence to observed planner steps',()=>{
 const r=assessReviewedDecisions(log,{reviewer:{role:'independent'},annotations:[{step_index:10,area:'diagnosis',grade:'incomplete',evidence_ref:'trace:step10'},{step_index:99,area:'verification',grade:'supported',evidence_ref:'ci:run4'}]});
 assert.equal(r.areas.diagnosis.incomplete,1);assert.equal(r.areas.verification['not-observable'],1);
 assert.equal(JSON.stringify(r).includes('very private'),false);assert.equal(JSON.stringify(r).includes('api_key='),false);
});
test('self-reported review and unsafe references are rejected',()=>{
 assert.throws(()=>assessReviewedDecisions(log,{reviewer:{role:'coding-agent'},annotations:[]}),/Independent/);
 assert.throws(()=>assessReviewedDecisions(log,{reviewer:{role:'independent'},annotations:[{step_index:10,area:'planning',grade:'supported',evidence_ref:'/private/.env'}]}),/unsafe/);
});
test('duplicate human judgment cannot inflate counts',()=>{
 const r={reviewer:{role:'independent'},annotations:[{step_index:10,area:'planning',grade:'supported',evidence_ref:'review:one'},{step_index:10,area:'planning',grade:'supported',evidence_ref:'review:two'}]};
 assert.throws(()=>assessReviewedDecisions(log,r),/Duplicate/);
});
