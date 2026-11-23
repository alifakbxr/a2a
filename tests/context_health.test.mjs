import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assessContextHealth} from '../src/context-health.mjs';

test('milestone advisor never invents active context tokens or automatically compacts',()=>{
 const normal=assessContextHealth({steps:79});
 const deferred=assessContextHealth({steps:140});
 const review=assessContextHealth({steps:80,milestoneComplete:true});
 const handoff=assessContextHealth({steps:140,milestoneComplete:true});
 const partial=assessContextHealth({steps:999,complete:false,milestoneComplete:true});
 assert.deepEqual([normal.status,deferred.status,review.status,handoff.status,partial.status],
  ['normal','defer_until_milestone','compact_review','handoff_review','insufficient_evidence']);
 for(const result of [normal,deferred,review,handoff,partial]){
  assert.equal(result.automatic_compaction,false);
  assert.equal(result.active_context_tokens,null);
  assert.equal(result.measured_token_savings,null);
 }
 assert.throws(()=>assessContextHealth({steps:-1}),/Invalid planner/);
 assert.throws(()=>assessContextHealth({steps:NaN}),/Invalid planner/);
});

test('context-health CLI scopes to explicit session; no writes and no private path leak',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-context-health-'));
 const conversation='context-health-0001';
 const logdir=path.join(home,'.gemini','antigravity','brain',conversation,'.system_generated','logs');
 fs.mkdirSync(logdir,{recursive:true});
 fs.writeFileSync(path.join(logdir,'transcript.jsonl'),
  Array.from({length:85},(_,i)=>JSON.stringify({type:'PLANNER_RESPONSE',step_index:i,tool_calls:[]})).join('\n')+'\n');
 const env={...process.env,HOME:home,USERPROFILE:home,A2A_DATA_DIR:path.join(home,'data')};
 delete env.ANTIGRAVITY_APP_DATA_DIR;
 const run=(...args)=>spawnSync(process.execPath,['scripts/a2a.mjs','context-health',...args],
  {cwd:path.resolve('.'),env,encoding:'utf8',timeout:20000});
 try{
  const a=run('--conversation',conversation);
  assert.equal(a.status,0,a.stderr);
  const first=JSON.parse(a.stdout);
  assert.equal(first.status,'defer_until_milestone');
  assert.equal(first.planner_steps_since_conversation_start,85);
  const second=run('--conversation',conversation,'--milestone-complete');
  assert.equal(second.status,0,second.stderr);
  assert.equal(JSON.parse(second.stdout).status,'compact_review');
  assert.notEqual(run().status,0,'Implicit latest-session fallback must be denied');
  const missing=run('--conversation','other-valid-session');
  assert.equal(missing.status,0,missing.stderr);
  assert.equal(JSON.parse(missing.stdout).status,'insufficient_evidence');
  assert.equal(fs.existsSync(env.A2A_DATA_DIR),false,'No A2A data writes permitted');
  assert.equal(second.stdout.includes(home),false,'Do not disclose source path');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
