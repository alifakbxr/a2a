import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {authorizeWorkspace,revokeWorkspace} from '../src/security.mjs';
import {Store} from '../src/storage.mjs';
import {recordObservedSkillUse} from '../src/skill-usage.mjs';

function fixture(){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pilah-observed-skill-')));
 const home=path.join(root,'home'),workspace=path.join(home,'project'),baseDir=path.join(root,'state');
 fs.mkdirSync(workspace,{recursive:true});
 fs.mkdirSync(path.join(home,'.config','a2a'),{recursive:true});
 fs.writeFileSync(path.join(home,'.config','a2a','settings.json'),JSON.stringify({mode:'always-on'}));
 const skillDir=path.join(workspace,'.agents','skills','laravel-api');
 fs.mkdirSync(skillDir,{recursive:true});
 const skillFile=path.join(skillDir,'SKILL.md');
 fs.writeFileSync(skillFile,'---\nname: laravel-api\ndescription: Laravel API implementation guidance\n---\n\n# Instructions\nUse Laravel conventions.\n');
 const oldHome=process.env.HOME,oldUser=process.env.USERPROFILE;
 process.env.HOME=home;process.env.USERPROFILE=home;
 authorizeWorkspace(workspace);
 return{root,home,workspace,baseDir,skillFile,restore(){
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldUser===undefined)delete process.env.USERPROFILE;else process.env.USERPROFILE=oldUser;
  fs.rmSync(root,{recursive:true,force:true});
 }};
}
function event(skillFile,overrides={}){
 return{hookEventName:'PostToolUse',conversationId:'conv-skill-read-1',workspacePaths:[overrides.workspace],toolCall:{name:'view_file',args:{AbsolutePath:skillFile,IsSkillFile:true,...overrides.args}},error:overrides.error||''};
}

test('records only successful full reads of validated Skill files in authorized workspaces',()=>{
 const f=fixture();
 try{
  const payload=event(f.skillFile,{workspace:f.workspace});
  assert.equal(recordObservedSkillUse(payload,f.baseDir),true);
  const store=new Store(f.baseDir);
  try{
   const workspaceId=store.register(f.workspace);
   assert.deepEqual(store.getSkillUsage(workspaceId),{'laravel-api':1});
   const row=store.get('SELECT source,usage_count FROM skill_usage WHERE workspace_id=? AND skill_name=?',workspaceId,'laravel-api');
   assert.deepEqual({...row},{source:'workspace',usage_count:1});
   assert.equal(store.all('PRAGMA table_info(skill_usage)').some(x=>x.name.toLowerCase().includes('path')),false);
  }finally{store.close()}
 }finally{f.restore()}
});

test('ignores partial reads, errors, non-Skill files, and paths outside discovered roots',()=>{
 const f=fixture();
 try{
  const partial=event(f.skillFile,{workspace:f.workspace,args:{StartLine:1}});
  const failed=event(f.skillFile,{workspace:f.workspace,error:'read failed'});
  const ordinary=event(path.join(f.workspace,'README.md'),{workspace:f.workspace});
  const outside=path.join(f.root,'untrusted','SKILL.md');
  fs.mkdirSync(path.dirname(outside),{recursive:true});
  fs.writeFileSync(outside,'---\nname: forged-skill\ndescription: forged\n---\n');
  const forged=event(outside,{workspace:f.workspace});
  const flaggedFalse=event(f.skillFile,{workspace:f.workspace,args:{IsSkillFile:false}});
  for(const payload of [partial,failed,ordinary,forged,flaggedFalse])
   assert.equal(recordObservedSkillUse(payload,f.baseDir),false);
  const store=new Store(f.baseDir);
  try{assert.deepEqual(store.getSkillUsage(store.register(f.workspace)),{})}finally{store.close()}
 }finally{f.restore()}
});

test('usage learning is opt-in and stops immediately after workspace revocation',()=>{
 const f=fixture();
 try{
  const payload=event(f.skillFile,{workspace:f.workspace});
  fs.writeFileSync(path.join(f.home,'.config','a2a','settings.json'),JSON.stringify({mode:'on-demand'}));
  assert.equal(recordObservedSkillUse(payload,f.baseDir),false);
  fs.writeFileSync(path.join(f.home,'.config','a2a','settings.json'),JSON.stringify({mode:'always-on'}));
  revokeWorkspace(f.workspace);
  assert.equal(recordObservedSkillUse(payload,f.baseDir),false);
  assert.equal(fs.existsSync(path.join(f.baseDir,'a2a.sqlite')),false);
 }finally{f.restore()}
});
