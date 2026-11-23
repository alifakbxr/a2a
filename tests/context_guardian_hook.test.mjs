import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {adviseInvocation} from '../scripts/context-guardian.mjs';

const script=new URL('../scripts/context-guardian.mjs',import.meta.url);
const sample=(steps,turn)=>({hookEventName:'PreInvocation',initialNumSteps:steps,invocationNum:turn});

test('advisories require measured native steps and use cooldown, never auto-compact',()=>{
 for(const p of [sample(79,0),sample(80,1),sample(140,1),sample(500,21),
   {hookEventName:'PreInvocation',initialNumSteps:-1,invocationNum:0},
   {hookEventName:'PreInvocation',initialNumSteps:'140',invocationNum:0}])
  assert.deepEqual(adviseInvocation(p),{});
 for(const p of [sample(80,0),sample(140,0),sample(150,25),sample(110,35)]){
  const out=adviseInvocation(p);
  assert.equal(out.injectSteps.length,1);
  assert.match(out.injectSteps[0].ephemeralMessage,/heuristic only/);
  assert.match(out.injectSteps[0].ephemeralMessage,/Never compact mid-task/);
  assert.doesNotMatch(JSON.stringify(out),/terminate|force_continue|tool_calls|total_tokens/);
 }
 assert.deepEqual(adviseInvocation({hookEventName:'SessionStart',initialNumSteps:150,invocationNum:0}),{});
});

test('opt-in hook installer preserves unrelated hooks; disabled costs no recurring invocations',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-guardian-'));
 const manifest=path.join(home,'.gemini','config','hooks.json');
 const env={...process.env,HOME:home,USERPROFILE:home};
 const run=(arg,input)=>spawnSync(process.execPath,[fileURLToPath(script),arg],{env,encoding:'utf8',input,timeout:20000});
 try{
  const defaultState=JSON.parse(run('status').stdout);
  assert.equal(defaultState.enabled,false);
  assert.equal(fs.existsSync(manifest),false);
  fs.mkdirSync(path.dirname(manifest),{recursive:true});
  const foreign={other:{PostToolUse:[{type:'command',command:'safe-non-A2A-user-hook',timeout:5}]}};
  fs.writeFileSync(manifest,JSON.stringify(foreign));
  const enabled=run('enable');
  assert.equal(enabled.status,0,enabled.stderr);
  const configured=JSON.parse(fs.readFileSync(manifest,'utf8'));
  assert.deepEqual(configured.other,foreign.other);
  assert.equal(configured['a2a-context-guardian'].PreInvocation.length,1);
  assert.equal(JSON.parse(run('status').stdout).enabled,true);
  const hook=run('hook',JSON.stringify(sample(140,0)));
  assert.equal(hook.status,0,hook.stderr);
  assert.match(JSON.parse(hook.stdout).injectSteps[0].ephemeralMessage,/handoff/);
  const disabled=run('disable');
  assert.equal(disabled.status,0,disabled.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(manifest,'utf8')),foreign);
  assert.equal(JSON.parse(run('status').stdout).no_recurring_hook_when_disabled,true);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('conflicting guardian key and malformed global hooks fail closed without writes',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-guardian-deny-'));
 const manifest=path.join(home,'.gemini','config','hooks.json');
 const env={...process.env,HOME:home,USERPROFILE:home};
 const run=arg=>spawnSync(process.execPath,[fileURLToPath(script),arg],{env,encoding:'utf8',timeout:20000});
 try{
  fs.mkdirSync(path.dirname(manifest),{recursive:true});
  const original='{"a2a-context-guardian":{"PreInvocation":[{"type":"command","command":"other-owner"}]}}';
  fs.writeFileSync(manifest,original);
  assert.notEqual(run('enable').status,0);
  assert.notEqual(run('disable').status,0);
  assert.equal(fs.readFileSync(manifest,'utf8'),original);
  fs.writeFileSync(manifest,'{bad-json');
  assert.notEqual(run('enable').status,0);
  assert.equal(fs.readFileSync(manifest,'utf8'),'{bad-json');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
