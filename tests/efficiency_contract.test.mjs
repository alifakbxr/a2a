import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {TOOLS,validateArgs} from '../src/tools.mjs';
import {getA2AMode,authorizeWorkspace} from '../src/security.mjs';
import {Engine} from '../src/engine.mjs';
import {handleHookEvent} from '../scripts/hook.mjs';

test('MCP verify_handoff is available in the published contract',()=>{
  const tool=TOOLS.find(t=>t.name==='a2a_verify');
  assert.ok(tool);
  assert.ok(tool.inputSchema.properties.operation.enum.includes('verify_handoff'));
  assert.ok(tool.inputSchema.properties.worker_name);
  assert.ok(tool.inputSchema.properties.artifact);
  assert.ok(tool.inputSchema.properties.allow_stale);
  assert.ok(TOOLS.find(t=>t.name==='a2a_impact').inputSchema.properties.summary);
  assert.doesNotThrow(()=>validateArgs('a2a_verify',{
    workspace:process.cwd(),operation:'verify_handoff',
    worker_name:'worker-1',artifact:'report.xml',
    criteria:[{id:'required',test_name:'feature works'}]
  }));
  assert.throws(()=>validateArgs('a2a_verify',{
    workspace:process.cwd(),operation:'verify_handoff',unknown:true
  }),/Unknown argument/);
  assert.doesNotThrow(()=>validateArgs('a2a_impact',{workspace:process.cwd(),changed:['src/test.js'],summary:true}));
  assert.throws(()=>validateArgs('a2a_impact',{workspace:process.cwd(),summary:'yes'}),/Invalid boolean/);
});

test('file URL conversion preserves OS-native paths including encoded spaces',()=>{
  const dir=path.join(os.tmpdir(),'a2a filename with spaces','unicode-é');
  const url=pathToFileURL(dir).href;
  assert.equal(fileURLToPath(url),dir);
});

test('fresh installations default to on-demand with no SessionStart instruction injection',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-opt-in-'));
  const keys=['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    process.env.HOME=base;
    process.env.USERPROFILE=base;
    process.env.A2A_DATA_DIR=path.join(base,'data');
    delete process.env.PLUGIN_DATA;
    delete process.env.VERIFYKIT_DATA_DIR;
    assert.equal(getA2AMode(),'on-demand');
    const args={hookEventName:'SessionStart',conversationId:'test-session-1234',workspacePaths:[],cwd:base};
    assert.deepEqual(handleHookEvent(args,{baseDir:path.join(base,'data')}),{});
    const settings=path.join(base,'.config','a2a','settings.json');
    fs.mkdirSync(path.dirname(settings),{recursive:true});
    fs.writeFileSync(settings,JSON.stringify({mode:'always-on'}));
    assert.ok(Array.isArray(handleHookEvent(args,{baseDir:path.join(base,'data')}).injectSteps));
  }finally{
    for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
    fs.rmSync(base,{recursive:true,force:true});
  }
});

test('Always-On bounded impact summary preserves risk, uncertainty and full counts',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-impact-summary-'));
  const keys=['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  let engine;
  try{
    process.env.HOME=path.join(base,'home');
    process.env.USERPROFILE=process.env.HOME;
    process.env.A2A_DATA_DIR=path.join(base,'data');
    delete process.env.PLUGIN_DATA;
    delete process.env.VERIFYKIT_DATA_DIR;
    fs.mkdirSync(process.env.HOME);
    const root=path.join(base,'work');
    fs.mkdirSync(path.join(root,'src'),{recursive:true});
    fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'test-project'}));
    fs.writeFileSync(path.join(root,'src','auth.js'),'export const auth = true;');
    for(let i=0;i<15;i++){
      fs.writeFileSync(path.join(root,'src',`page${i}.js`),`import {auth} from './auth.js'; export const value=${i};`);
    }
    authorizeWorkspace(root);
    engine=new Engine();
    const full=engine.impact({workspace:root,changed:['src/auth.js']});
    const quick=engine.impact({workspace:root,changed:['src/auth.js'],summary:true});
    assert.equal(quick.summary,true);
    assert.equal(quick.risk,full.risk);
    assert.equal(quick.coverage.static_only,true);
    assert.equal(quick.coverage.output_bounded,true);
    assert.deepEqual(quick.uncertainty,full.uncertainty);
    assert.equal(quick.affected_total,full.affected_total);
    assert.ok(quick.affected_total>=full.affected.length);
    assert.ok(quick.affected.length<=8);
    assert.ok(quick.affected.length<=full.affected.length);
    assert.ok(quick.related_tests.length<=5);
    assert.ok(JSON.stringify(quick).length<JSON.stringify(full).length);
    assert.equal(quick.tokens_affected,undefined);
    assert.ok(full.teamwork_advisory, 'Broad dependency changes may justify Teamwork advisory');
    assert.equal(full.teamwork_advisory.capability_confirmed,false);
    assert.equal(full.teamwork_advisory.user_approval_required,true);
    assert.equal(full.teamwork_advisory.automatic_worker_launch,false);
    // Sensitive risk alone is not evidence that parallel execution is beneficial.
    const solo=path.join(root,'src','payments.js');
    fs.writeFileSync(solo,'export const payment = true;');
    const highRisk=engine.impact({workspace:root,changed:['src/payments.js']});
    assert.equal(highRisk.risk,'high');
    assert.equal(highRisk.teamwork_advisory,undefined);
  }finally{
    try{engine?.close()}catch{}
    for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
    fs.rmSync(base,{recursive:true,force:true});
  }
});

test('permanent plugin rule stays tiny and PreInvocation hook is absent',()=>{
  const rule=fs.readFileSync(new URL('../rules/AGENTS.md',import.meta.url),'utf8');
  const hooks=JSON.parse(fs.readFileSync(new URL('../hooks.json',import.meta.url),'utf8'));
  assert.ok(rule.length<400,'Persistent rule must not carry full always-on policy on each turn');
  for(const group of Object.values(hooks)) assert.equal(group.PreInvocation,undefined);
});
