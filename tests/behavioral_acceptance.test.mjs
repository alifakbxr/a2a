import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace} from '../src/security.mjs';
import {TOOLS,validateArgs} from '../src/tools.mjs';
import {adviseOrchestration} from '../src/orchestration-advisor.mjs';
import {classifyNativeToolFailure} from '../src/native-tool-recovery.mjs';

function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-ba-'));
 const env=Object.fromEntries(['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'].map(k=>[k,process.env[k]]));
 const home=path.join(base,'home'),work=path.join(base,'app');
 fs.mkdirSync(home);fs.mkdirSync(path.join(work,'src'),{recursive:true});
 process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'a2a-store');
 delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
 fs.writeFileSync(path.join(work,'package.json'),'{"name":"behavioral-regression"}');
 fs.writeFileSync(path.join(work,'src','checkin.js'),'export const allowSecondPrint = false;');
 authorizeWorkspace(work);
 const engine=new Engine();
 return {work,engine,close(){
  engine.close();
  for(const [k,v] of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;
  fs.rmSync(base,{force:true,recursive:true});
 }};
}

const visual={
 id:'wedding-planner-hover',description:'Footer aligns with referenced Figma node',
 given:'Dynamic vendor data is loaded',when:'User hovers delete at mobile viewport',
 then:'Delete remains visible and usable',evidence_type:'visual',
 viewport:'375x812',ui_state:'hover',reference:'figma-node-123',negative:true
};
const backend={
 id:'usherapp-second-scan',description:'No reprint after duplicate check-in',
 given:'Guest already checked in',when:'The same QR is scanned a second time',
 then:'No print job is created',evidence_type:'integration',negative:true
};
test('plan generates evidence-specific Given/When/Then matrix; missing viewport is rejected',()=>{
 const f=fixture();
 try{
  const result=f.engine.verify({workspace:f.work,operation:'plan',criteria:[visual,backend]});
  assert.equal(result.criteria.length,2);
  assert.equal(result.criteria[0].status,'not_tested');
  assert.equal(result.criteria[0].viewport,'375x812');
  assert.equal(result.completion.fully_verified,false);
  assert.equal(result.completion.counts.not_tested,2);
  assert.equal(result.completion.status,'not_tested');
  assert.throws(()=>f.engine.verify({workspace:f.work,operation:'plan',criteria:[{...visual,viewport:undefined}]}),/viewport/);
  assert.throws(()=>f.engine.verify({workspace:f.work,operation:'plan',criteria:[{...backend,given:''}]}),/given/);
  assert.throws(()=>f.engine.verify({workspace:f.work,operation:'plan',criteria:[visual,visual]}),/Duplicate/);
 }finally{f.close()}
});

test('false completion negative controls: build and backend testcase cannot prove Figma UI parity',()=>{
 const f=fixture();
 try{
  const revision=f.engine.context({workspace:f.work}).revision;
  fs.mkdirSync(path.join(f.work,'reports'));
  fs.writeFileSync(path.join(f.work,'reports','local.json'),JSON.stringify({
   format:'a2a-test-report-v1',completed:true,
   cases:[{name:'production build',state:'passed'},{name:'second QR checkin',state:'passed'}]
  }));
  const data=f.engine.verify({workspace:f.work,operation:'assess',criteria:[
   {...visual,artifact:'reports/local.json',test_name:'production build'},
   {...backend,artifact:'reports/local.json',test_name:'second QR checkin'},
   {id:'caseverity-navigation',given:'Panel open',when:'Navigation clicked',then:'Route loads',
    evidence_type:'browser',viewport:'desktop',ui_state:'active',reference:'UI spec'},
   {id:'print-device',given:'Printer connected',when:'QR scanned',then:'Only one printed',
    evidence_type:'hardware',blocked:true}
  ]});
  assert.equal(data.revision,revision);
  assert.equal(data.completion.fully_verified,false);
  assert.equal(data.completion.local_report_passes,1);
  assert.equal(data.completion.counts.inconclusive,1);
  assert.equal(data.completion.counts.not_tested,1);
  assert.equal(data.completion.counts.blocked,1);
  assert.equal(data.criteria[0].status,'inconclusive');
  assert.equal(data.criteria[1].status,'passed'); // named LOCAL integration assertion only
  assert.equal(data.criteria[2].status,'not_tested');
  assert.equal(data.criteria[3].status,'blocked');
  assert.equal(data.release_ready,false);
  assert.equal(data.semantic_requirements_proven,false);
  const wrong=f.engine.verify({workspace:f.work,operation:'assess',criteria:[
   {...backend,source_revision:'stale-before-change',artifact:'reports/local.json',test_name:'second QR checkin'}
  ]});
  assert.equal(wrong.criteria[0].status,'stale');
  assert.equal(wrong.completion.fully_verified,false);
 }finally{f.close()}
});

test('failing sibling testcase stops passing subset from masking suite failure',()=>{
 const f=fixture();
 try{
  fs.mkdirSync(path.join(f.work,'reports'));
  fs.writeFileSync(path.join(f.work,'reports','suite.json'),JSON.stringify({
   format:'a2a-test-report-v1',completed:true,
   cases:[{name:'second QR checkin',state:'passed'},{name:'refund doubles stock',state:'failed'}]
  }));
  const data=f.engine.verify({workspace:f.work,operation:'assess',criteria:[
   {...backend,artifact:'reports/suite.json',test_name:'second QR checkin'}
  ]});
  assert.equal(data.criteria[0].status,'failed');
  assert.equal(data.completion.fully_verified,false);
 }finally{f.close()}
});

test('decision checkpoint retains pending tests, becomes stale on source change and refuses secrets',()=>{
 const f=fixture();
 try{
  const conv='conv-behavioral-2026';
  const saved=f.engine.evidence({workspace:f.work,operation:'save_checkpoint',conversation_id:conv,
   task_summary:'Repair guest check-in without reprinting',
   completed:['Changed the server QR handler; not independently tested'],
   next_steps:['Run physical printer test'],
   decisions:['Second scan must not print','Preserve original first-checkin behavior'],
   pending_tests:['All enabled','Selfie only','Verification only']
  });
  assert.equal(saved.status,'saved');
  const current=f.engine.evidence({workspace:f.work,operation:'model_recovery',conversation_id:conv});
  assert.equal(current.checkpoint.source_revision_matches,true);
  assert.equal(current.checkpoint.decisions.length,2);
  assert.equal(current.checkpoint.pending_tests.length,3);
  assert.equal(current.checkpoint.verified,false);
  assert.throws(()=>f.engine.evidence({workspace:f.work,operation:'save_checkpoint',conversation_id:conv,
   task_summary:'password=supersecret'}),/credential/);
  fs.writeFileSync(path.join(f.work,'src','checkin.js'),'export const allowSecondPrint = true;');
  const stale=f.engine.evidence({workspace:f.work,operation:'model_recovery',conversation_id:conv});
  assert.equal(stale.checkpoint.source_freshness,'stale');
  assert.equal(stale.checkpoint.source_revision_matches,false);
 }finally{f.close()}
});

test('native tool recovery is guidance only, does not echo secrets or blind retry',()=>{
 const cases=[
  ['-32602 missing pageId','invalid_arguments'],
  ['Execution context was destroyed','context_lost'],
  ['Chrome DevTools timeout','timeout'],
  ['403 permission denied','permission_denied'],
  ['ENOENT no such file','missing_file'],
  ['old string not found in file','edit_conflict']
 ];
 for(const [error_hint,category] of cases){
  const result=classifyNativeToolFailure({error_hint:error_hint+' password=THIS_IS_PRIVATE',tool_family:'browser',retry_count:3});
  assert.equal(result.category,category);
  assert.equal(result.retry_same_input,false);
  assert.equal(result.automatic_execution,false);
  assert.ok(result.escalation);
  assert.ok(!JSON.stringify(result).includes('THIS_IS_PRIVATE'));
 }
 assert.throws(()=>classifyNativeToolFailure({error_hint:'x'.repeat(500)}),/bounded/);
});

test('teamwork only suggested for explicitly independent file ownership with user approval',()=>{
 const base={tier:'pro',available_commands:['/swarm','/teamwork'],
  workstreams:['backend','frontend'],dependencies:'low',long_horizon:true,milestones:3};
 assert.equal(adviseOrchestration(base).recommended,'single-agent');
 assert.equal(adviseOrchestration({...base,file_ownership:'shared'}).recommended,'single-agent');
 assert.equal(adviseOrchestration({...base,file_ownership:'independent'}).recommended,'/teamwork');
 assert.equal(adviseOrchestration({...base,file_ownership:'independent',dependencies:'high'}).recommended,'single-agent');
 assert.equal(adviseOrchestration({...base,file_ownership:'independent'}).automatic_worker_launch,false);
});

test('four-tool contract accepts typed scenarios and remains bounded',()=>{
 const tools=TOOLS.map(x=>x.name);
 assert.deepEqual(tools,['a2a_context','a2a_impact','a2a_verify','a2a_evidence']);
 assert.doesNotThrow(()=>validateArgs('a2a_verify',{workspace:'/tmp/not-authorized',operation:'plan',criteria:[visual]}));
 assert.doesNotThrow(()=>validateArgs('a2a_evidence',{workspace:'/tmp/not-authorized',operation:'tool_recovery',tool_family:'browser',error_hint:'context destroyed',retry_count:2}));
 assert.throws(()=>validateArgs('a2a_evidence',{workspace:'/tmp',operation:'tool_recovery',error_hint:'x'.repeat(500)}),/too long/i);
});
