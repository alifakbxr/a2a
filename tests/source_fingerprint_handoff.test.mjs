import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';
import {handleHookEvent} from '../scripts/hook.mjs';

function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-source-fingerprint-'));
 const home=path.join(dir,'home'),project=path.join(dir,'project');
 fs.mkdirSync(home);fs.mkdirSync(project);return {dir,home,project};
}

test('large unindexed project source invalidates the integrity revision',()=>{
 const f=fixture(),oldHome=process.env.HOME,oldData=process.env.A2A_DATA_DIR;let engine;
 try{
  process.env.HOME=f.home;process.env.A2A_DATA_DIR=path.join(f.dir,'store');authorizeWorkspace(f.project);
  fs.mkdirSync(path.join(f.project,'src'));
  const large=path.join(f.project,'src','oversized.js');
  fs.writeFileSync(large,'a'.repeat(161*1024));
  fs.writeFileSync(path.join(f.project,'package.json'),'{"name":"fingerprint-test"}');
  engine=new Engine();
  const before=engine.context({workspace:f.project,action:'inspect'});
  assert.equal(before.coverage.incomplete,true);
  assert.equal(before.coverage.source_integrity_complete,true);
  fs.writeFileSync(large,'b'.repeat(161*1024));
  const after=engine.context({workspace:f.project,action:'inspect'});
  assert.notEqual(after.revision,before.revision,'Oversized source update retained old revision');
 }finally{
  engine?.close();
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldData===undefined)delete process.env.A2A_DATA_DIR;else process.env.A2A_DATA_DIR=oldData;
  invalidateWorkspaceCache();fs.rmSync(f.dir,{recursive:true,force:true});
 }
});

test('native test hook does not reattest an old report from unrelated command',()=>{
 const f=fixture(),oldHome=process.env.HOME,oldData=process.env.A2A_DATA_DIR;
 try{
  process.env.HOME=f.home;process.env.A2A_DATA_DIR=path.join(f.dir,'data');authorizeWorkspace(f.project);
  fs.writeFileSync(path.join(f.project,'package.json'),'{"name":"test"}');
  const report=path.join(f.project,'report.xml');
  fs.writeFileSync(report,'<testsuite tests="1" failures="0"><testcase name="old"/></testsuite>');
  const past=(Date.now()-3600_000)/1000;fs.utimesSync(report,past,past);
  handleHookEvent({hookEventName:'PostToolUse',conversationId:'native-001',
    toolCall:{name:'run_command',args:{CommandLine:'npm test',Cwd:f.project}},exitCode:0},
    {baseDir:process.env.A2A_DATA_DIR});
  const data=JSON.parse(fs.readFileSync(path.join(process.env.A2A_DATA_DIR,'last-test-run.json'),'utf8'));
  assert.equal(data.report_hashes['report.xml'],undefined);
  assert.equal(data.report_bindings['report.xml'],undefined);
 }finally{
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldData===undefined)delete process.env.A2A_DATA_DIR;else process.env.A2A_DATA_DIR=oldData;
  invalidateWorkspaceCache();fs.rmSync(f.dir,{recursive:true,force:true});
 }
});
