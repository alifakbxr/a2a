import test from 'node:test';
import assert from 'node:assert/strict';
import {adviseOrchestration} from '../src/orchestration-advisor.mjs';
test('Free Tier never recommends paid tools even if requested',()=>{
 const r=adviseOrchestration({tier:'free',workstreams:['front','back'],dependencies:'low',file_ownership:'independent',available_commands:['/swarm','/teamwork','@subagent']});
 assert.equal(r.recommended,'@subagent');assert.equal(r.automatic_worker_launch,false);
});
test('pro with independent workstreams may suggest swarm with consent',()=>{
 const r=adviseOrchestration({tier:'pro',workstreams:['api','ui','tests'],dependencies:'low',file_ownership:'independent',available_commands:['/swarm']});
 assert.equal(r.recommended,'/swarm');assert.equal(r.user_approval_required,true);
});
test('multi-milestone team preference only with explicit availability',()=>{
 const r=adviseOrchestration({tier:'pro',milestones:3,long_horizon:true,workstreams:['api','frontend'],dependencies:'low',file_ownership:'independent',available_commands:['/teamwork','/swarm']});
 assert.equal(r.recommended,'/teamwork');
});
test('unknown capabilities never invent command access',()=>assert.equal(adviseOrchestration({milestones:5,long_horizon:true}).recommended,'single-agent'));
test('bad input rejected',()=>assert.throws(()=>adviseOrchestration({available_commands:['/system'] }),/Invalid/));
