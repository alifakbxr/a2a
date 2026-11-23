import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {authorizeWorkspace,isWorkspaceAuthorized,invalidateWorkspaceCache} from '../src/security.mjs';
import {Engine} from '../src/engine.mjs';
import {ALWAYS_ON_POLICY} from '../scripts/hook.mjs';

test('A2A always-on asks for a trusted project workspace in under 350 characters',()=>{
 assert.ok(ALWAYS_ON_POLICY.length<=350);
 assert.match(ALWAYS_ON_POLICY,/workspace=/);
 assert.match(ALWAYS_ON_POLICY,/Native first/);
});

test('IDE Workspace Trust revocation takes effect without the 10s cached grant',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-native-trust-revoke-'));
 const old=process.env.HOME, home=path.join(temp,'home'),project=path.join(temp,'project');
 try{
  fs.mkdirSync(home);fs.mkdirSync(project);
  process.env.HOME=home;
  const config=path.join(home,'.gemini','antigravity','settings.json');
  fs.mkdirSync(path.dirname(config),{recursive:true});
  fs.writeFileSync(config,JSON.stringify({trustedWorkspaces:[project]}));
  invalidateWorkspaceCache();
  assert.equal(isWorkspaceAuthorized(project),true);
  fs.writeFileSync(config,JSON.stringify({trustedWorkspaces:[]}));
  assert.equal(isWorkspaceAuthorized(project),false,'A2A kept a revoked native trust grant');
 }finally{
  if(old===undefined)delete process.env.HOME;else process.env.HOME=old;
  invalidateWorkspaceCache();
  fs.rmSync(temp,{recursive:true,force:true});
 }
});

test('checkpoint mutations require an explicit conversation ID',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-session-isolation-'));
 const oldHome=process.env.HOME,oldData=process.env.A2A_DATA_DIR;
 const home=path.join(temp,'home'),project=path.join(temp,'project');let engine;
 try{
  fs.mkdirSync(home);fs.mkdirSync(project);
  fs.writeFileSync(path.join(project,'package.json'),'{"name":"isolation"}');
  process.env.HOME=home;process.env.A2A_DATA_DIR=path.join(temp,'store');
  authorizeWorkspace(project);engine=new Engine();
  assert.throws(()=>engine.evidence({workspace:project,operation:'save_checkpoint',task_summary:'Review auth and ledger'}),/Explicit conversation_id/);
 }finally{
  engine?.close();
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldData===undefined)delete process.env.A2A_DATA_DIR;else process.env.A2A_DATA_DIR=oldData;
  invalidateWorkspaceCache();fs.rmSync(temp,{recursive:true,force:true});
 }
});
