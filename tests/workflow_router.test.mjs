import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {routeWorkflow} from '../src/workflow-router.mjs';

test('zero-call native path across all policy profiles',()=>{
 for(const profile of ['economy','balanced','deep-review']){
  const r=routeWorkflow({profile,task:'simple',risk:'critical',uncertainty:true});
  assert.equal(r.proposal,'native-only');assert.equal(r.max_initial_a2a_calls,0);
  assert.equal(r.automatic_tool_calls,0);assert.equal(r.estimated_token_savings,null);
  assert.equal(r.model_switch,false);
 }
});

test('routing is bounded, precise, and never claims outcome',()=>{
 assert.equal(routeWorkflow({task:'cross-file',uncertainty:true}).proposal,'pilah_context');
 assert.equal(routeWorkflow({task:'change-impact',risk:'high',uncertainty:false}).proposal,'pilah_impact');
 assert.equal(routeWorkflow({task:'verification',risk:'critical',profile:'deep-review'}).proposal,'pilah_verify');
 const plan=routeWorkflow({task:'verification',risk:'critical',profile:'deep-review',hasNamedEvidence:false});
 assert.equal(plan.needs_named_test_evidence,false,'Creating a plan must not require a preexisting named test report');
 assert.equal(plan.named_evidence_required_for_assessment,true,'A later assess must use an actual named report');
 assert.equal(routeWorkflow({task:'verification',risk:'critical',profile:'economy'}).proposal,'native-only');
 assert.equal(routeWorkflow({task:'recovery',risk:'high',profile:'deep-review'}).proposal,'pilah_evidence');
 assert.equal(routeWorkflow({task:'change-impact',risk:'high',scopeKnown:false}).proposal,'pilah_context');
 for(const profile of ['economy','balanced','deep-review']){
  for(const task of ['simple','cross-file','change-impact','verification','recovery']){
   const r=routeWorkflow({profile,task,risk:'critical',uncertainty:true});
   assert.ok(r.max_initial_a2a_calls<=1);assert.equal(r.automatic_tool_calls,0);
   assert.equal(r.provider_usage,null);assert.equal(r.estimated_token_savings,null);
  }
 }
 assert.throws(()=>routeWorkflow({profile:'max-quality'}),/Invalid/);
 assert.throws(()=>routeWorkflow({risk:'severe'}),/Invalid/);
});

test('uncertainty does not suppress scoped high-risk deep-review guidance',()=>{
 for(const task of ['verification','recovery']){
  const expected=task==='verification'?'pilah_verify':'pilah_evidence';
  const r=routeWorkflow({profile:'deep-review',task,risk:'critical',uncertainty:true,scopeKnown:true});
  assert.equal(r.proposal,expected);
  assert.equal(r.max_initial_a2a_calls,1);
  assert.equal(r.automatic_tool_calls,0);
  assert.equal(routeWorkflow({profile:'economy',task,risk:'critical',uncertainty:true}).proposal,'native-only');
  assert.equal(routeWorkflow({profile:'deep-review',task,risk:'critical',uncertainty:true,scopeKnown:false}).proposal,'pilah_context');
 }
 const simple=routeWorkflow({profile:'deep-review',task:'simple',risk:'critical',uncertainty:true,scopeKnown:false});
 assert.equal(simple.proposal,'native-only');
 assert.match(simple.reason,/native-only/);
 assert.doesNotMatch(simple.reason,/graph query/);
});

test('CLI route is one-shot and does not write user settings',()=>{
 const out=spawnSync(process.execPath,['scripts/a2a.mjs','route','--profile','economy','--task','cross-file','--uncertain'],
  {encoding:'utf8',timeout:12000});
 assert.equal(out.status,0,out.stderr);
 const obj=JSON.parse(out.stdout);assert.equal(obj.proposal,'pilah_context');
 assert.equal(obj.automatic_tool_calls,0);
 const fail=spawnSync(process.execPath,['scripts/a2a.mjs','route','--profile','unknown'],{encoding:'utf8',timeout:12000});
 assert.notEqual(fail.status,0);
});
