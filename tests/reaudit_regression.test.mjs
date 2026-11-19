import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,sha256,getArtifactAutoSnapshotMode,setArtifactAutoSnapshotMode} from '../src/security.mjs';
import {handleHookEvent,nativeProcessExitStatus} from '../scripts/hook.mjs';
import {classifyNativeToolFailure} from '../src/native-tool-recovery.mjs';

function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-reaudit-'));
  const saved=Object.fromEntries(['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'].map(k=>[k,process.env[k]]));
  const home=path.join(dir,'home'),workspace=path.join(dir,'workspace');
  fs.mkdirSync(home);fs.mkdirSync(path.join(workspace,'src'),{recursive:true});
  process.env.HOME=home;process.env.USERPROFILE=home;
  process.env.A2A_DATA_DIR=path.join(dir,'private-data');
  delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
  fs.writeFileSync(path.join(workspace,'package.json'),JSON.stringify({name:'reaudit-fixture'}));
  fs.writeFileSync(path.join(workspace,'src','checkin.js'),'export const noDuplicatePrint = true;\n');
  authorizeWorkspace(workspace);
  const engine=new Engine();
  const end=()=>{
    engine.close();
    for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
    fs.rmSync(dir,{recursive:true,force:true});
  };
  return {dir,home,workspace,engine,end};
}
const baseCriteria={
  id:'second-qr',given:'Guest has checked in',when:'Same QR is scanned again',
  then:'No second print job is created',evidence_type:'integration',negative:true
};
const visualCriteria={
  id:'figma-visual',given:'Vendor data is loaded',when:'Delete button is hovered',
  then:'Button remains visible',evidence_type:'visual',negative:true,
  viewport:'375x812',ui_state:'hover',reference:'figma-node-42'
};
const hardwareCriteria={
  id:'printer',given:'Guest checked in',when:'Same QR is scanned twice',
  then:'One paper ticket is printed',evidence_type:'hardware'
};
function report(f){
  fs.mkdirSync(path.join(f.workspace,'reports'),{recursive:true});
  const rel='reports/report.json';
  const bytes=JSON.stringify({format:'a2a-test-report-v1',completed:true,
    cases:[{name:'build',state:'passed'},{name:'second QR does not print',state:'passed'}]});
  fs.writeFileSync(path.join(f.workspace,rel),bytes);
  return rel;
}
function attestLocalNativeRun(f,rel){
  const conversationId='reaudit-native-run';
  fs.writeFileSync(path.join(f.engine.store.base,'active-session.json'),
    JSON.stringify({latest:{conversationId,workspacePaths:[f.workspace]}}));
  fs.writeFileSync(path.join(f.engine.store.base,'last-test-run.json'),JSON.stringify({
    kind:'native-test-tool-completed',succeeded:true,
    workspace:f.workspace,conversationId,updatedAt:new Date().toISOString(),
    source_hashes:{'src/checkin.js':sha256(fs.readFileSync(path.join(f.workspace,'src','checkin.js')))},
    report_hashes:{[rel]:sha256(fs.readFileSync(path.join(f.workspace,rel)))}
  }));
}

test('P0 #38: even fresh native hook provenance cannot attest local build as visual/hardware acceptance',()=>{
  const f=fixture();
  try{
    const rel=report(f);attestLocalNativeRun(f,rel);
    for(const criterion of [visualCriteria,hardwareCriteria]){
      const r=f.engine.verify({workspace:f.workspace,operation:'verify_handoff',
        worker_name:'independent-reviewer',changed:['src/checkin.js'],artifact:rel,
        criteria:[{...criterion,test_name:'build'}]});
      assert.equal(r.tests_passed,true);
      assert.equal(r.verified,false);
      assert.equal(r.deliverable_verified,false);
      assert.equal(r.independently_attested,false);
      assert.equal(r.status,'inconclusive');
      assert.equal(r.criteria[0].status,'inconclusive');
      assert.match(r.criteria[0].reason,/cannot independently attest/);
    }
    const actual=f.engine.verify({workspace:f.workspace,operation:'verify_handoff',
      changed:['src/checkin.js'],artifact:rel,
      criteria:[{...baseCriteria,test_name:'second QR does not print'}]});
    assert.equal(actual.verified,true); // only *named local integration assertions*
    assert.equal(actual.verified_scope,'local-named-machine-assertions-only');
    assert.equal(actual.independently_attested,false);
    assert.match(actual.summary,/not independent/);
    assert.throws(()=>f.engine.verify({workspace:f.workspace,operation:'verify_handoff',
      changed:['src/checkin.js'],artifact:rel,
      criteria:[{...visualCriteria,ui_state:undefined,test_name:'build'}]}),/ui_state/);
  }finally{f.end()}
});

test('P0 #39: hook needs confirmed process exit status, never assumes successful absence of tool error',()=>{
  const variants=[
    [{exitCode:1},'failed',false],
    [{toolCallResult:{exitCode:2}},'failed',false],
    [{toolResponse:{exit_code:0}},'passed',true],
    [{exitCode:0,toolCallResult:{exitCode:1}},'unknown',false],
    [{toolCallResult:{success:true}},'unknown',false],
    [{exitCode:0,error:{message:'native failure'}},'failed',false],
    [{exitCode:0},'passed',true]
  ];
  for(const [payload,wantStatus,wantPass] of variants){
    const r=nativeProcessExitStatus(payload);
    assert.equal(r.status,wantStatus);
    assert.equal(r.status==='passed',wantPass);
  }
});

test('P1 #40: permission denied takes priority over page IDs, error codes and caller hints',()=>{
  for(const params of [
    {error_hint:'browser pageId=17 returned 403 Permission denied',error_class:'invalid_arguments'},
    {error_hint:'Invalid pageId but authorization forbidden'},
    {error_hint:'-32602 invalid param',error_class:'permission_denied'},
    {error_hint:'access denied (EACCES)'}
  ]){
    const r=classifyNativeToolFailure({...params,tool_family:'browser'});
    assert.equal(r.category,'permission_denied');
    assert.equal(r.requires_user_approval,true);
    assert.equal(r.retry_same_input,false);
    assert.equal(r.automatic_execution,false);
    assert.ok(!JSON.stringify(r).includes(params.error_hint));
  }
  assert.equal(classifyNativeToolFailure({error_hint:'-32602 invalid pageId'}).category,'invalid_arguments');
  assert.equal(classifyNativeToolFailure({error_hint:'Request failed with HTTP 403',tool_family:'browser'}).requires_user_approval,true);
});

test('P1 #41: persisted acceptance plan retains omitted mandatory scenarios and is revision bound',()=>{
  const f=fixture();
  try{
    const rel=report(f);
    const plan=f.engine.verify({workspace:f.workspace,operation:'plan',persist_plan:true,
      criteria:[baseCriteria,visualCriteria]});
    assert.match(plan.plan_id,/^apl-/);
    assert.equal(plan.scope_bound,true);
    assert.equal(plan.scope_persisted,true);
    const assess=f.engine.verify({workspace:f.workspace,operation:'assess',plan_id:plan.plan_id,
      criteria:[{id:baseCriteria.id,artifact:rel,test_name:'second QR does not print'}]});
    assert.equal(assess.scope_bound,true);
    assert.equal(assess.plan_id,plan.plan_id);
    assert.equal(assess.completion.total,2);
    assert.equal(assess.completion.counts.passed,1);
    assert.equal(assess.completion.counts.not_tested,1);
    assert.equal(assess.completion.fully_verified,false);
    assert.ok(assess.criteria.some(c=>c.id===visualCriteria.id&&c.status==='not_tested'));
    assert.throws(()=>f.engine.verify({workspace:f.workspace,operation:'assess',plan_id:plan.plan_id,
      criteria:[{id:baseCriteria.id,evidence_type:'visual',artifact:rel,test_name:'build'}]}),/contract changed/);
    assert.throws(()=>f.engine.verify({workspace:f.workspace,operation:'assess',plan_id:plan.plan_id,
      criteria:[{id:'new-requirement',artifact:rel,test_name:'build'}]}),/not part of/);
    const simple=f.engine.verify({workspace:f.workspace,operation:'assess',
      criteria:[{id:'legacy-local',artifact:rel,test_name:'build'}]});
    assert.equal(simple.scope_bound,false);
    assert.equal(simple.completion.total,1);
    assert.ok(simple.limits.some(x=>/scope is unbound/.test(x)));
    const pinnedRevision=f.engine.context({workspace:f.workspace}).revision;
    const pinned=f.engine.verify({workspace:f.workspace,operation:'plan',persist_plan:true,
      criteria:[{...baseCriteria,source_revision:pinnedRevision}]});
    fs.writeFileSync(path.join(f.workspace,'src','checkin.js'),'export const noDuplicatePrint = false;\n');
    const stale=f.engine.verify({workspace:f.workspace,operation:'assess',plan_id:plan.plan_id,
      criteria:[{id:baseCriteria.id,artifact:rel,test_name:'second QR does not print'}]});
    assert.equal(stale.scope_bound,true);
    assert.equal(stale.completion.counts.stale,2);
    assert.equal(stale.completion.fully_verified,false);
    // Reissue the *same* required scope at the updated source revision rather
    // than silently overriding or losing old required acceptance criteria.
    const renewed=f.engine.verify({workspace:f.workspace,operation:'plan',
      plan_id:plan.plan_id,persist_plan:true,criteria:[]});
    assert.notEqual(renewed.plan_id,plan.plan_id);
    assert.equal(renewed.reissued_from,plan.plan_id);
    assert.equal(renewed.criteria.length,2);
    assert.equal(renewed.completion.counts.not_tested,2);
    assert.equal(renewed.completion.fully_verified,false);
    assert.throws(()=>f.engine.verify({workspace:f.workspace,operation:'plan',
      plan_id:plan.plan_id,persist_plan:true,criteria:[baseCriteria]}),/no replacement criteria/);
    const renewedResult=f.engine.verify({workspace:f.workspace,operation:'assess',
      plan_id:renewed.plan_id,criteria:[]});
    assert.equal(renewedResult.completion.counts.not_tested,2);
    assert.equal(renewedResult.scope_bound,true);
    assert.throws(()=>f.engine.verify({workspace:f.workspace,operation:'plan',
      plan_id:pinned.plan_id,persist_plan:true,criteria:[]}),/pins a different source_revision/);
  }finally{f.end()}
});

test('P2 #42: automatic brain Markdown retention is disabled by default, requires opt-in and can be disabled',()=>{
  const f=fixture();
  try{
    const conv='reaudit-brain-1234';
    const brain=path.join(f.home,'.gemini','antigravity','brain',conv);
    fs.mkdirSync(brain,{recursive:true});
    const artifact=path.join(brain,'walkthrough.md');
    fs.writeFileSync(artifact,'# Public synthetic checklist\n- Pending test\n');
    const event={hookEventName:'PostToolUse',conversationId:conv,workspacePaths:[f.workspace],
      toolCall:{name:'write_to_file',args:{TargetFile:artifact}}};
    const list=()=>f.engine.store.listArtifactVersions({
      workspaceId:f.engine.store.register(f.workspace),conversationId:conv});
    assert.equal(getArtifactAutoSnapshotMode(),false);
    handleHookEvent(event,{baseDir:f.engine.store.base});
    assert.equal(list().length,0);
    assert.equal(setArtifactAutoSnapshotMode('on'),true);
    handleHookEvent(event,{baseDir:f.engine.store.base});
    assert.equal(list().length,1);
    assert.equal(setArtifactAutoSnapshotMode('off'),false);
    fs.writeFileSync(artifact,'# Public synthetic checklist\n- Different state\n');
    handleHookEvent(event,{baseDir:f.engine.store.base});
    assert.equal(list().length,1);
    const cli=spawnSync(process.execPath,['scripts/a2a.mjs','artifact-autosnapshot','status'],
      {cwd:process.cwd(),encoding:'utf8'});
    assert.equal(cli.status,0,cli.stderr);
    assert.equal(JSON.parse(cli.stdout).artifact_auto_snapshot,'disabled');
  }finally{f.end()}
});
