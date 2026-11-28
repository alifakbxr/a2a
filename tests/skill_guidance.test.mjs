import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {authorizeWorkspace} from '../src/security.mjs';
import {recommendSkillGuidance} from '../src/skill-guidance.mjs';

function fixture(){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pilah-guidance-hook-')));
 const home=path.join(root,'home'),workspace=path.join(home,'project'),baseDir=path.join(root,'state');
 fs.mkdirSync(workspace,{recursive:true});
 fs.mkdirSync(path.join(home,'.config','a2a'),{recursive:true});
 fs.writeFileSync(path.join(home,'.config','a2a','settings.json'),JSON.stringify({mode:'always-on'}));
 const oldHome=process.env.HOME,oldUser=process.env.USERPROFILE;
 process.env.HOME=home;process.env.USERPROFILE=home;
 authorizeWorkspace(workspace);
 const skill=(name,description)=>{const dir=path.join(workspace,'.agents','skills',name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: '+name+'\ndescription: '+description+'\n---\n')};
 skill('laravel-api','Laravel PHP REST API controllers request validation authorization middleware backend endpoints');
 skill('vue-ui','Vue JavaScript frontend components reactive state composables user interface interactions');
 return{root,home,workspace,baseDir,restore(){if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;if(oldUser===undefined)delete process.env.USERPROFILE;else process.env.USERPROFILE=oldUser;fs.rmSync(root,{recursive:true,force:true})}};
}
function payload(f,task){return{conversationId:'conv-guidance-1',workspacePaths:[f.workspace],transcriptPath:path.join(f.home,'.gemini','antigravity','brain','conv-guidance-1','.system_generated','logs','transcript.jsonl'),lastUserInput:task}}

test('PreInvocation injects only high-confidence relevant Skills and suppresses repeated hints',()=>{
 const f=fixture();try{
  const laravel='Implement Laravel REST API controllers with request validation and authorization middleware for backend endpoints';
  const first=recommendSkillGuidance(payload(f,laravel),f.baseDir);
  assert.equal(first.injectSteps.length,1);
  assert.match(first.injectSteps[0].systemMessage.systemMessage,/laravel-api/);
  assert.deepEqual(recommendSkillGuidance(payload(f,laravel),f.baseDir),{});
  const vue='Build Vue reactive components and composables for frontend user interface interactions';
  const second=recommendSkillGuidance(payload(f,vue),f.baseDir);
  assert.equal(second.injectSteps.length,1);
  assert.match(second.injectSteps[0].systemMessage.systemMessage,/vue-ui/);
  assert.deepEqual(recommendSkillGuidance(payload(f,laravel),f.baseDir),{},'third distinct injection is capped');
 }finally{f.restore()}
});

test('PreInvocation is silent when learning is on-demand or workspace is not authorized',()=>{
 const f=fixture();try{
  const task='Implement Laravel REST API controllers with request validation and authorization middleware for backend endpoints';
  fs.writeFileSync(path.join(f.home,'.config','a2a','settings.json'),JSON.stringify({mode:'on-demand'}));
  assert.deepEqual(recommendSkillGuidance(payload(f,task),f.baseDir),{});
  fs.writeFileSync(path.join(f.home,'.config','a2a','settings.json'),JSON.stringify({mode:'always-on'}));
  assert.deepEqual(recommendSkillGuidance({...payload(f,task),workspacePaths:[path.join(f.root,'other')]},f.baseDir),{});
 }finally{f.restore()}
});

test('infers CLI surface from the documented transcript path on Windows and POSIX',()=>{
 const f=fixture();try{
  const cliDir=path.join(f.home,'.gemini','antigravity-cli','skills','cli-helper');
  fs.mkdirSync(cliDir,{recursive:true});
  fs.writeFileSync(path.join(cliDir,'SKILL.md'),'---\nname: cli-helper\ndescription: CLI terminal command workflow helper\n---\n');
  const task='Create a CLI terminal command workflow helper for shell automation';
  const transcript=path.join(f.home,'.gemini','antigravity-cli','brain','conv-guidance-1','logs','transcript.jsonl');
  const result=recommendSkillGuidance({...payload(f,task),transcriptPath:transcript},f.baseDir);
  assert.equal(result.injectSteps.length,1);
  assert.match(result.injectSteps[0].systemMessage.systemMessage,/cli-helper/);
 }finally{f.restore()}
});
