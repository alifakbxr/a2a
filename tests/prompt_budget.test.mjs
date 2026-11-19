import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {getCompactMode,setCompactMode,authorizeWorkspace} from '../src/security.mjs';
import {handleHookEvent,ALWAYS_ON_POLICY} from '../scripts/hook.mjs';
import {estimateTokens} from '../src/tokens.mjs';

const read=relative=>fs.readFileSync(new URL('../'+relative,import.meta.url),'utf8');

function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-low-token-'));
 const keys=['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'];
 const env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const home=path.join(base,'home'),root=path.join(base,'work');
 fs.mkdirSync(home);fs.mkdirSync(path.join(root,'src'),{recursive:true});
 process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'data');
 delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
 fs.writeFileSync(path.join(root,'package.json'),'{"name":"token-budget-test"}');
 authorizeWorkspace(root);
 const engine=new Engine();
 return {root,base,engine,close(){
   engine.close();
   for(const [key,value] of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;
   fs.rmSync(base,{recursive:true,force:true});
 }};
}

test('A2A skill, rule and Always-On instruction have tight measured character budgets',()=>{
 const skill=read('skills/a2a/SKILL.md'),rule=read('rules/AGENTS.md');
 assert.ok(skill.length<=3000,'Skill too large: '+skill.length+' chars');
 assert.ok(rule.length<=260,'Permanent rule too large: '+rule.length+' chars');
 assert.ok(ALWAYS_ON_POLICY.length<=350,'Always-On policy too large: '+ALWAYS_ON_POLICY.length+' chars');
 assert.match(skill,/0 calls/);
 assert.match(skill,/Second call only/);
 for(const name of ['a2a_context','a2a_impact','a2a_verify','a2a_evidence'])
   assert.ok(skill.includes(name),'Skill omits public tool '+name);
 assert.match(skill,/persist_plan:true/);
 assert.match(skill,/not.*independent|not.*visual/i);
 assert.match(skill,/auto-snapshots are \*\*off\*\*/i);
 const aggregate=skill.length+rule.length+ALWAYS_ON_POLICY.length;
 // Local estimateTokens is a size heuristic, never provider billing or savings.
 assert.ok(aggregate<3800);
 assert.ok(estimateTokens(aggregate)<1000);
});

test('Default On-Demand emits no instruction; opt-in Always-On is short and occurs only on SessionStart',()=>{
 const f=fixture();
 try{
  assert.equal(getCompactMode(),true);
  const payload={hookEventName:'SessionStart',conversationId:'budget-session-1234',workspacePaths:[f.root],cwd:f.root};
  assert.deepEqual(handleHookEvent(payload,{baseDir:path.join(f.base,'data')}),{});
  const settings=path.join(f.base,'home','.config','a2a','settings.json');
  fs.mkdirSync(path.dirname(settings),{recursive:true});
  fs.writeFileSync(settings,JSON.stringify({mode:'always-on'}));
  const start=handleHookEvent(payload,{baseDir:path.join(f.base,'data')});
  assert.equal(start.injectSteps[0].systemMessage.systemMessage,ALWAYS_ON_POLICY);
  assert.deepEqual(handleHookEvent({...payload,hookEventName:'PostToolUse'},{baseDir:path.join(f.base,'data')}),{});
  assert.equal(setCompactMode('off'),false);
  assert.equal(getCompactMode(),false);
  assert.equal(setCompactMode('on'),true);
  assert.equal(getCompactMode(),true);
 }finally{f.close()}
});

test('Compact skeleton payload has bounded text, explicit omissions and can expand on request',()=>{
 const f=fixture();
 try{
  const files=[];
  for(let i=0;i<8;i++){
    const rel='src/skeleton-'+i+'.js';
    files.push(rel);
    fs.writeFileSync(path.join(f.root,rel),'export const sample'+i+' = "'+'z'.repeat(3850)+'";\n');
  }
  assert.equal(getCompactMode(),true);
  const compact=f.engine.context({workspace:f.root,action:'skeleton',files});
  assert.equal(compact.compact,true);
  assert.equal(compact.summary.preview_char_budget,4800);
  assert.equal(compact.summary.omitted_files,2);
  assert.equal(compact.files.length,8);
  assert.equal(compact.files.filter(item=>item.reason==='compact_file_budget').length,2);
  assert.ok(compact.files.some(item=>item.truncated),'Must disclose incomplete code');
  assert.ok(compact.files.reduce((acc,item)=>acc+(item.skeleton?.length||0),0)<=4800);
  const compactChars=JSON.stringify(compact).length;
  setCompactMode('off');
  const full=f.engine.context({workspace:f.root,action:'skeleton',files});
  assert.equal(full.summary.preview_char_budget,32000);
  assert.equal(full.files.filter(item=>item.skipped).length,0);
  assert.ok(JSON.stringify(full).length>compactChars*2,'Compact output should materially reduce payload');
  assert.equal(compact.summary.estimated_preview_only,true);
  assert.equal(compact.summary.tokens_saved,undefined);
 }finally{f.close()}
});

test('Compact graph query preserves source coverage and explicitly discloses clipped relations',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.root,'src','auth.js'),'export const auth = true;');
  for(let i=0;i<24;i++){
    fs.writeFileSync(path.join(f.root,'src','page'+i+'.js'),
      "import {auth} from './auth.js'; export const page"+i+"=auth;");
  }
  const compact=f.engine.context({workspace:f.root,action:'query',query:'auth',limit:5});
  assert.equal(compact.compact,true);
  assert.ok(compact.relations.length<=12);
  assert.ok(compact.coverage);
  assert.equal(typeof compact.revision,'string');
  assert.ok(Array.isArray(compact.uncertainty));
  if(compact.relations_truncated){
    assert.ok(compact.relations_before_compaction>compact.relations.length);
  }
  setCompactMode('off');
  const full=f.engine.context({workspace:f.root,action:'query',query:'auth',limit:5});
  assert.ok(full.relations.length>=compact.relations.length);
  if(full.relations.length>12){
    assert.equal(compact.relations.length,12);
    assert.equal(compact.relations_truncated,true);
    assert.equal(compact.relations_before_compaction,full.relations.length);
    assert.ok(JSON.stringify(full).length>JSON.stringify(compact).length);
  }
 }finally{f.close()}
});
