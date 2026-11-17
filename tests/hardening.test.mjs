import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/storage.mjs';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,safeArtifactPath,invalidateWorkspaceCache,sha256} from '../src/security.mjs';
import {verifyHandoff} from '../src/verification.mjs';
import {handleHookEvent} from '../scripts/hook.mjs';
import {getSessionTokenUsage} from '../src/tokens.mjs';

function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-hardening-'));
  const keys=['HOME','USERPROFILE','APPDATA','A2A_DATA_DIR','VERIFYKIT_DATA_DIR','PLUGIN_DATA','ANTIGRAVITY_APP_DATA_DIR'];
  const backup=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const home=path.join(base,'home');
  const ws1=path.join(base,'ws1'),ws2=path.join(base,'ws2');
  fs.mkdirSync(home);fs.mkdirSync(ws1);fs.mkdirSync(ws2);
  process.env.HOME=home;process.env.USERPROFILE=home;
  process.env.APPDATA=path.join(home,'AppData','Roaming');
  process.env.A2A_DATA_DIR=path.join(base,'data');
  delete process.env.VERIFYKIT_DATA_DIR;delete process.env.PLUGIN_DATA;
  delete process.env.ANTIGRAVITY_APP_DATA_DIR;
  invalidateWorkspaceCache();
  authorizeWorkspace(ws1);authorizeWorkspace(ws2);
  const cleanup=()=>{
    for(const [k,v] of Object.entries(backup))if(v===undefined)delete process.env[k];else process.env[k]=v;
    invalidateWorkspaceCache();
    fs.rmSync(base,{recursive:true,force:true});
  };
  return {base,home,ws1,ws2,cleanup};
}

test('security: workspace A cannot snapshot workspace B even if both are authorized',t=>{
  const x=fixture();
  const file=path.join(x.ws2,'notes.md');
  fs.writeFileSync(file,'workspace B private notes');
  assert.throws(()=>safeArtifactPath(x.ws1,'conv-isolation-11',file),/escapes authorized/);
  const store=new Store();t.after(()=>{store.close();x.cleanup()});
  const a=store.register(x.ws1),b=store.register(x.ws2);
  assert.throws(()=>store.snapshotArtifact({workspaceId:a,workspaceRoot:x.ws1,conversationId:'conv-isolation-11',artifactPath:file}),/escapes authorized/);
  const bSnap=store.snapshotArtifact({workspaceId:b,workspaceRoot:x.ws2,conversationId:'conv-isolation-11',artifactPath:file});
  assert.equal(bSnap.version_number,1);
  assert.equal(store.listArtifactVersions({workspaceId:a,conversationId:'conv-isolation-11'}).length,0);
  assert.equal(store.listArtifactVersions({workspaceId:b,conversationId:'conv-isolation-11'}).length,1);
  assert.equal(store.getArtifactVersion({workspaceId:a,conversationId:'conv-isolation-11',artifactName:'notes.md'}),null);
  assert.equal(store.getArtifactDiff({workspaceId:a,conversationId:'conv-isolation-11',artifactName:'notes.md'}),null);
  assert.throws(()=>store.snapshotArtifact({workspaceId:a,workspaceRoot:x.ws2,conversationId:'conv-isolation-11',artifactPath:file}),/identity mismatch/);
});

test('security: same conversation and artifact name remain isolated across workspaces',t=>{
  const x=fixture();
  const store=new Store();t.after(()=>{store.close();x.cleanup()});
  const a=store.register(x.ws1),b=store.register(x.ws2),id='conv-both-workspaces';
  const p1=path.join(x.ws1,'status.md'),p2=path.join(x.ws2,'status.md');
  fs.writeFileSync(p1,'Workspace A only');fs.writeFileSync(p2,'Workspace B only');
  const first=store.snapshotArtifact({workspaceId:a,workspaceRoot:x.ws1,conversationId:id,artifactPath:p1});
  const second=store.snapshotArtifact({workspaceId:b,workspaceRoot:x.ws2,conversationId:id,artifactPath:p2});
  assert.equal(first.version_number,1);assert.equal(second.version_number,1);
  assert.notEqual(first.id,second.id);
  assert.equal(store.getArtifactVersion({workspaceId:a,conversationId:id,artifactName:'status.md'}).content,'Workspace A only');
  assert.equal(store.getArtifactVersion({workspaceId:b,conversationId:id,artifactName:'status.md'}).content,'Workspace B only');
});

test('verification: a passed report is not a verified handoff without native-run proof',t=>{
  const x=fixture();
  const store=new Store();t.after(()=>{store.close();x.cleanup()});
  const wsId=store.register(x.ws1);
  fs.writeFileSync(path.join(x.ws1,'math.js'),'export const add=(a,b)=>a+b;\n');
  fs.writeFileSync(path.join(x.ws1,'report.xml'),'<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="addition works"/></testsuite>');
  const reportOnly=verifyHandoff(store,wsId,x.ws1,'rev-a',{changed:['math.js'],artifact:'report.xml',criteria:['addition works']});
  assert.equal(reportOnly.tests_passed,true);
  assert.equal(reportOnly.verified,false);
  assert.equal(reportOnly.status,'unattested_report');
  const broad=verifyHandoff(store,wsId,x.ws1,'rev-a',{changed:['math.js'],artifact:'report.xml',criteria:['*']});
  assert.equal(broad.verified,false);
});

test('verification: native-run report + source hashes permit local PASS; changed source invalidates it',t=>{
  const x=fixture();
  const {ws1}=x;
  const git=(...args)=>{const z=spawnSync('git',args,{cwd:ws1,encoding:'utf8'});assert.equal(z.status,0,z.stderr)};
  git('init');git('config','user.name','A2A Test');git('config','user.email','test@example.com');
  fs.mkdirSync(path.join(ws1,'src'));fs.writeFileSync(path.join(ws1,'src','math.js'),'export const add=(a,b)=>a+b;\n');
  git('add','src/math.js');git('commit','-m','initial');
  fs.writeFileSync(path.join(ws1,'src','math.js'),'export const add=(a,b)=>a+b+0;\n');
  const xml='<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="addition works"/></testsuite>';
  fs.writeFileSync(path.join(ws1,'report.xml'),xml);
  handleHookEvent({hookEventName:'SessionStart',conversationId:'conv-native-test-11',workspacePaths:[ws1],cwd:ws1},{baseDir:process.env.A2A_DATA_DIR});
  const hook=handleHookEvent({hookEventName:'PostToolUse',conversationId:'conv-native-test-11',workspacePaths:[ws1],
    toolCall:{name:'run_command',args:{Cwd:ws1,CommandLine:'npm test'}},error:''},{baseDir:process.env.A2A_DATA_DIR});
  assert.deepEqual(hook,{});
  const run=JSON.parse(fs.readFileSync(path.join(process.env.A2A_DATA_DIR,'last-test-run.json'),'utf8'));
  assert.equal(run.report_hashes['report.xml'],sha256(xml));
  assert.equal(run.source_hashes['src/math.js'],sha256(fs.readFileSync(path.join(ws1,'src','math.js'))));
  assert.equal(run.command,undefined,'Never persist raw shell commands');
  const store=new Store();t.after(()=>{store.close();x.cleanup()});const wsId=store.register(ws1);
  const good=verifyHandoff(store,wsId,ws1,'rev-a',{changed:['src/math.js'],artifact:'report.xml',criteria:['addition works']});
  assert.equal(good.verified,true);
  fs.writeFileSync(path.join(ws1,'src','math.js'),'export const add=(a,b)=>a-b+0;\n');
  const compromised=verifyHandoff(store,wsId,ws1,'rev-b',{changed:['src/math.js'],artifact:'report.xml',criteria:['addition works'],allow_stale:true});
  assert.equal(compromised.verified,false);
});

test('context: skeleton output is bounded and warns when truncated',t=>{
  const x=fixture();
  fs.writeFileSync(path.join(x.ws1,'long.js'),'export const content = "'+'a'.repeat(45000)+'";');
  const engine=new Engine();t.after(()=>{engine.close();x.cleanup()});
  const result=engine.context({workspace:x.ws1,action:'skeleton',file:'long.js'});
  assert.equal(result.files.length,1);
  assert.equal(result.files[0].truncated,true);
  assert.ok(result.files[0].skeleton.length<=6000);
  assert.ok(result.summary.truncated_files>=1);
  assert.equal(result.summary.estimated_preview_only,true);
});

test('telemetry: cannot read arbitrary named transcript or infer another active session',t=>{
  const x=fixture();t.after(x.cleanup);
  const file=path.join(x.base,'transcript.jsonl');
  fs.writeFileSync(file,'{"type":"PLANNER_RESPONSE","input_tokens":1}\n');
  assert.equal(getSessionTokenUsage(null,{dataDirPath:process.env.A2A_DATA_DIR}),null);
  assert.equal(getSessionTokenUsage(null,{transcriptPath:file,dataDirPath:process.env.A2A_DATA_DIR}),null);
});

test('native hooks: match documented Antigravity file-edit operations',()=>{
  const config=JSON.parse(fs.readFileSync(new URL('../hooks.json',import.meta.url),'utf8'));
  const matcher=config['a2a-session-telemetry'].PostToolUse.map(x=>x.matcher).join('|');
  for(const name of ['write_to_file','replace_file_content','multi_replace_file_content']){
    assert.match(name,new RegExp(matcher));
  }
});
