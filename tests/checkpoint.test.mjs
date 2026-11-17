import test from 'node:test';
import assert from 'node:assert/strict';
import {checkpointFromStream} from '../scripts/checkpoint.mjs';
const c='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
test('captures interrupted browser step and distinguishes unverified scenario',()=>{
 const ev=[{event:'init',conversation_id:c},{event:'step_update',step_update:{step_index:1,state:'DONE'}},{event:'step_update',step_update:{step_index:2,state:'ACTIVE'}}];
 const out=checkpointFromStream(ev,{scenarios:[{id:'online-pos',status:'passed',evidence_ref:'ci/1'},{id:'offline-restart',status:'not-tested'}]});
 assert.equal(out.completed_steps,1);assert.equal(out.unfinished_step_count,1);
 assert.equal(out.summary.passed,1);assert.equal(out.summary.not_tested,1);
 assert.equal(out.resume_suggestion.manual_command,'agy --conversation '+c);
 assert.equal(out.resume_suggestion.auto_executed,false);
});
test('completed errors not mislabeled as quota exhaustion',()=>{
 const out=checkpointFromStream([{event:'result',result:{conversation_id:c,status:'ERROR',usage:{input_tokens:12,output_tokens:3,total_tokens:15},error:'this is private'}}],{scenarios:[]});
 assert.equal(out.category,'provider-or-agent-error');assert.equal(out.official_total_tokens,15);
 assert.equal(JSON.stringify(out).includes('this is private'),false);
});
test('unknown or malicious conversation ids are never embedded in commands',()=>{
 const out=checkpointFromStream([{event:'init',conversation_id:'x; rm -rf /'}],{scenarios:[]});
 assert.equal(out.conversation_id,null);assert.equal(out.resume_suggestion.auto_executed,false);
});
test('duplicate scenario IDs are rejected',()=>assert.throws(()=>checkpointFromStream([],{scenarios:[{id:'a',status:'passed'},{id:'a',status:'passed'}]}),/duplicate/));
