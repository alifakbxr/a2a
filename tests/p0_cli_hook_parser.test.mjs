import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArtifact,verifyHandoff} from '../src/verification.mjs';
import {isDirectTestCommand,handleHookEvent,detectSideQuestionInfo} from '../scripts/hook.mjs';\nimport {recommendSkills} from '../src/skill-discovery.mjs';
import {sha256,authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';
import {Store} from '../src/storage.mjs';

const cwd=fileURLToPath(new URL('../',import.meta.url));
const testId='p0-native-tests';
function setup(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-p0-test-'));
 const saved=Object.fromEntries(['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'].map(k=>[k,process.env[k]]));
 const home=path.join(base,'home'),work=path.join(base,'work'),data=path.join(base,'data');
 fs.mkdirSync(home);fs.mkdirSync(work);
 process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=data;
 delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
 invalidateWorkspaceCache();
 authorizeWorkspace(work);
 return {base,home,work,data,env:{...process.env},clean(){
  for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  invalidateWorkspaceCache();
  fs.rmSync(base,{recursive:true,force:true});
 }};
}
const cli=(env,args)=>spawnSync(process.execPath,['scripts/a2a.mjs',...args],{
 cwd,env,encoding:'utf8',timeout:20000,windowsHide:true
});

test('#50: tokens positional authorized workspace and artifact CLI operations do not crash or misroute',()=>{
 const x=setup();
 try{
  const conv='conv-p0-cli-1234';
  fs.mkdirSync(x.data,{recursive:true});
  fs.writeFileSync(path.join(x.data,'active-session.json'),JSON.stringify({
    latest:{conversationId:conv,workspacePaths:[x.work],cwd:x.work}
  }));
  const notes=path.join(x.work,'walkthrough.md');
  fs.writeFileSync(notes,'# Synthetic A2A CLI test\n');
  const tokens=cli(x.env,['tokens',x.work,'--json']);
  assert.equal(tokens.status,0,tokens.stderr);
  assert.doesNotMatch(tokens.stderr,/ReferenceError|path is not defined/);
  assert.ok(JSON.parse(tokens.stdout));
  const snapshot=cli(x.env,['artifacts','snapshot',notes,'--workspace',x.work]);
  assert.equal(snapshot.status,0,snapshot.stderr);
  assert.equal(JSON.parse(snapshot.stdout).status,'snapshotted');
  const list=cli(x.env,['artifacts','list']);
  assert.equal(list.status,0,list.stderr);
  const entries=JSON.parse(list.stdout);
  assert.equal(entries.conversation_id,conv);
  assert.ok(entries.versions.some(v=>v.artifact_name==='walkthrough.md'));
  const show=cli(x.env,['artifacts','show','walkthrough.md']);
  assert.equal(show.status,0,show.stderr);
  assert.equal(JSON.parse(show.stdout).content,'# Synthetic A2A CLI test\n');
  fs.writeFileSync(notes,'# Synthetic A2A CLI modified\n');
  const next=cli(x.env,['artifacts','snapshot',notes]);
  assert.equal(next.status,0,next.stderr);
  const diff=cli(x.env,['artifacts','diff','walkthrough.md']);
  assert.equal(diff.status,0,diff.stderr);
  assert.ok(JSON.parse(diff.stdout).diff.includes('modified'));
 }finally{x.clean()}
});

test('#51: hook manifest registers native edit and PreInvocation events',()=>{
 const hooks=JSON.parse(fs.readFileSync(path.join(cwd,'hooks.json'),'utf8'));
 const groups=Object.values(hooks);
 const triggers=groups.flatMap(g=>Object.keys(g));
 assert.equal(triggers.includes('PreInvocation'),true);
 const matchers=groups.flatMap(g=>g.PostToolUse||[]).map(x=>x.matcher);
 for(const tool of ['write_file','edit_file','write_to_file','replace_file_content','multi_replace_file_content'])
  assert.ok(matchers.some(m=>new RegExp(m).test(tool)),tool);
});

test('#51: hook parses snake-case event and alternative command argument shapes',()=>{
 const x=setup();
 try{
  const conv='conv-p0-host-shapes';
  handleHookEvent({hook_event_name:'SessionStart',conversationId:conv,workspacePaths:[x.work]},
    {baseDir:x.data});
  assert.equal(JSON.parse(fs.readFileSync(path.join(x.data,'active-session.json'),'utf8')).latest.conversationId,conv);
  for(const input of ['toolInput','toolArgs','arguments']){
   const event={hook_event_name:'PostToolUse',conversationId:conv,workspacePaths:[x.work],
    exit_code:0,[input]:{command:'npm test',cwd:x.work}};
   handleHookEvent(event,{baseDir:x.data});
   const record=JSON.parse(fs.readFileSync(path.join(x.data,'last-test-run.json'),'utf8'));
   assert.equal(record.succeeded,true,input);
  }
 }finally{x.clean()}
});

test('#51: symlinked and oversized conversation metadata do not enable side question recording',()=>{
 const x=setup();
 try{
  const metaDir=path.join(x.home,'.gemini','antigravity-cli','cache');
  fs.mkdirSync(metaDir,{recursive:true});
  const meta=path.join(metaDir,'conversation_metadata.json'),conv='conv-p0-private';
  fs.writeFileSync(meta,JSON.stringify({conversations:{[conv]:{is_internal:true}}}));
  assert.equal(detectSideQuestionInfo({conversationId:conv},null).isSideQuestion,true);
  fs.writeFileSync(meta,'X'.repeat(70*1024));
  assert.equal(detectSideQuestionInfo({conversationId:conv},null).isSideQuestion,false);
  fs.rmSync(meta);
  const source=path.join(x.home,'metadata-secret.json');
  fs.writeFileSync(source,JSON.stringify({conversations:{[conv]:{is_internal:true}}}));
  try{
   fs.symlinkSync(source,meta);
   assert.equal(detectSideQuestionInfo({conversationId:conv},null).isSideQuestion,false);
  }catch(e){if(e.code!=='EPERM'&&e.code!=='EACCES')throw e}
 }finally{x.clean()}
});

test('#52: direct test command must not be spoofable by shell wrappers, comments or masked exit',()=>{
 const bad=['echo "npm test"','git commit -m "fix pytest"','cat report.xml # pytest',
  'npm test || true','npm test || :','pytest; echo ok','npm test && echo ok',
  'echo pytest\nnpm test','printf "npm test"','git log --oneline | grep pytest',
  'NODE_ENV=test npm test; true','npm test > report.txt','echo $(npm test)'];
 const good=['npm test','npm run test:unit','pnpm test','yarn test','bun test','node --test',
  'pytest --junitxml=report.xml','php artisan test --log-junit=report.xml',
  'cd src && node --test','NODE_ENV=test npx vitest run','python3 -m pytest'];
 for(const value of bad)assert.equal(isDirectTestCommand(value),false,value);
 for(const value of good)assert.equal(isDirectTestCommand(value),true,value);
});

test('#52: spoofed test commands cannot grant verify_handoff even with existing passing report',()=>{
 const x=setup();
 try{
  const conv='conv-p0-native-attestation';
  const git=(...args)=>{const p=spawnSync('git',args,{cwd:x.work,encoding:'utf8'});assert.equal(p.status,0,p.stderr)};
  git('init');git('config','user.name','A2A Test');git('config','user.email','test@example.com');
  fs.mkdirSync(path.join(x.work,'src'));
  fs.writeFileSync(path.join(x.work,'src','auth.js'),'export const safe=true;\n');
  git('add','src/auth.js');git('commit','-m','baseline');
  fs.writeFileSync(path.join(x.work,'src','auth.js'),'export const safe=Boolean(1);\n');
  const report='<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="auth safe"/></testsuite>';
  fs.writeFileSync(path.join(x.work,'report.xml'),report);
  handleHookEvent({hookEventName:'SessionStart',conversationId:conv,workspacePaths:[x.work]},{baseDir:x.data});
  const store=new Store(x.data);
  try{
   const wsId=store.register(x.work);
   const verify=()=>{
     const recent=JSON.parse(fs.readFileSync(path.join(x.data,'last-test-run.json'),'utf8'));
     return verifyHandoff(store,wsId,x.work,recent.source_revision||'missing-revision',{
       changed:['src/auth.js'],artifact:'report.xml',criteria:['auth safe']});
    };
   for(const cmd of ['echo "npm test"','git commit -m "fix pytest"','npm test || true','pytest; echo ok']){
     handleHookEvent({hookEventName:'PostToolUse',conversationId:conv,workspacePaths:[x.work],
       toolCall:{name:'run_command',args:{CommandLine:cmd,Cwd:x.work}},exitCode:0},{baseDir:x.data});
     assert.equal(verify().verified,false,cmd);
   }
   const pre=handleHookEvent({hookEventName:'PreToolUse',stepIdx:99,conversationId:conv,workspacePaths:[x.work],
     toolCall:{name:'run_command',args:{CommandLine:'pytest --junitxml=report.xml',Cwd:x.work}}},{baseDir:x.data});
   assert.equal(pre.decision,'allow');
   fs.writeFileSync(path.join(x.work,'report.xml'),report+'\n');
   handleHookEvent({hookEventName:'PostToolUse',stepIdx:99,conversationId:conv,workspacePaths:[x.work],
     toolCall:{name:'run_command',args:{CommandLine:'pytest --junitxml=report.xml',Cwd:x.work}},exitCode:0},{baseDir:x.data});
   assert.equal(verify().verified,true,'A genuine local direct test still counts as locally attested');
   handleHookEvent({hookEventName:'PostToolUse',conversationId:conv,workspacePaths:[x.work],
     toolCall:{name:'run_command',args:{CommandLine:'npm test || true',Cwd:x.work}},exitCode:0},{baseDir:x.data});
   assert.equal(verify().verified,false,'A later spoofed run invalidates previous positive provenance');
  }finally{store.close()}
 }finally{x.clean()}
});

test('#53: comment and CDATA spoofed JUnit reports cannot pass',()=>{
 const comment='<testsuite tests="1" failures="0" errors="0" skipped="0"><!-- <testcase name="fake"/> --></testsuite>';
 assert.notEqual(parseArtifact(comment,'report.xml').status,'passed');
 const bad='<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="x"><system-out><![CDATA[log </testcase>]]></system-out><failure>boom</failure></testcase></testsuite>';
 assert.notEqual(parseArtifact(bad,'report.xml').status,'passed');
 const real='<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="works"/></testsuite>';
 assert.equal(parseArtifact(real,'report.xml').status,'passed');
 const single="<testsuite tests='1' failures='0' errors='0' skipped='0'><testcase name='works'/></testsuite>";
 assert.equal(parseArtifact(single,'report.xml').status,'passed');
 const genuineFailure='<testsuite tests="1" failures="1" errors="0" skipped="0"><testcase name="x"><system-out><![CDATA[log </testcase>]]></system-out><failure>bad</failure></testcase></testsuite>';
 assert.equal(parseArtifact(genuineFailure,'report.xml').status,'failed');
});

test('#53: TAP bailout, missing plan, TODO and duplicate assertion IDs cannot pass',()=>{
 const data=[
 'TAP version 13\nok 1 - booted\nBail out! DB crashed\n',
 'TAP version 13\nok 1 - booted\n',
 'TAP version 13\n1..1\nok 1 - wip # TODO later\n',
 'TAP version 13\n1..2\nok 1 - a\nok 1 - a again\n',
 'TAP version 13\n1..1\nok 1 - skipped # SKIP\n'
 ];
 for(const source of data)assert.notEqual(parseArtifact(source,'results.tap').status,'passed',source);
 assert.equal(parseArtifact('TAP version 13\n1..1\nok 1 - fine\n','results.tap').status,'passed');
});

test('PreInvocation injects one high-confidence Skill hint per changed recommendation only',()=>{
 const x=setup();
 try{
  const skillDir=path.join(x.work,'.agents','skills','laravel-api');
  fs.mkdirSync(skillDir,{recursive:true});
  fs.writeFileSync(path.join(skillDir,'SKILL.md'),'---\\nname: laravel-api\\ndescription: Laravel API endpoint validation and authorization\\n---\\n');
  const payload={hookEventName:'PreInvocation',conversationId:'conv-pilah-skill-hook',workspacePaths:[x.work],lastUserInput:'Implement Laravel API endpoint validation and authorization'};
  const first=handleHookEvent(payload,{baseDir:x.data});
  assert.equal(first.injectSteps.length,1);
  assert.match(first.injectSteps[0].systemMessage.systemMessage,/laravel-api/);
  assert.doesNotMatch(first.injectSteps[0].systemMessage.systemMessage,/Laravel API endpoint validation and authorization/);
  const repeated=handleHookEvent(payload,{baseDir:x.data});
  assert.deepEqual(repeated,{});
  const simple=handleHookEvent({...payload,lastUserInput:'Thanks'}, {baseDir:x.data});
  assert.deepEqual(simple,{});
 }finally{x.clean()}
});

test('PreInvocation fails closed for untrusted workspaces and missing task input',()=>{
 const x=setup();
 try{
  const untrusted=path.join(x.base,'untrusted');fs.mkdirSync(untrusted);
  assert.deepEqual(handleHookEvent({hookEventName:'PreInvocation',conversationId:'conv-untrusted',workspacePaths:[untrusted],lastUserInput:'Implement Laravel API endpoint validation'},{baseDir:x.data}),{});
  assert.deepEqual(handleHookEvent({hookEventName:'PreInvocation',conversationId:'conv-empty',workspacePaths:[x.work]},{baseDir:x.data}),{});
 }finally{x.clean()}
});
