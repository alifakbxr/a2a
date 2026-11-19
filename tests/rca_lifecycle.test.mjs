import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {Store} from '../src/storage.mjs';
import {Database} from '../src/sqlite-compat.mjs';
import {authorizeWorkspace} from '../src/security.mjs';

function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-rca-test-'));
 const vars=['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'];
 const prev=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 const home=path.join(base,'home'),workspace=path.join(base,'work');
 fs.mkdirSync(home);fs.mkdirSync(path.join(workspace,'src'),{recursive:true});
 process.env.HOME=home;process.env.USERPROFILE=home;
 process.env.A2A_DATA_DIR=path.join(base,'private');
 delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
 fs.writeFileSync(path.join(workspace,'package.json'),'{"name":"rca-synthetic"}');
 fs.writeFileSync(path.join(workspace,'src','checkin.js'),'export const canPrint=(repeat)=>!repeat;\n');
 authorizeWorkspace(workspace);
 const engine=new Engine();
 const rel='reports/test.json';
 fs.mkdirSync(path.join(workspace,'reports'));
 fs.writeFileSync(path.join(workspace,rel),JSON.stringify({
  format:'a2a-test-report-v1',completed:true,
  cases:[{name:'second scan does not print twice',state:'passed'},
    {name:'login succeeds',state:'passed'}]
 }));
 const clean=()=>{
  engine.close();
  for(const [key,val] of Object.entries(prev))if(val===undefined)delete process.env[key];else process.env[key]=val;
  fs.rmSync(base,{recursive:true,force:true});
 };
 return {base,workspace,engine,rel,clean};
}
const scenario=(id='repeat-print',kind='integration')=>({
 id,given:'Guest has already checked in',when:'The same QR is scanned again',
 then:'A second print job is not created',evidence_type:kind,negative:true
});
function evaluated(f,id='repeat-print',kind='integration',name='second scan does not print twice'){
 const result=f.engine.verify({workspace:f.workspace,operation:'assess',
  criteria:[{...scenario(id,kind),artifact:f.rel,test_name:name}]});
 assert.equal(result.criteria[0].status,'passed');
 return result.criteria[0].evidence_id;
}
const hypothesized=(f,incident,extra={})=>f.engine.evidence({
 workspace:f.workspace,operation:'add_hypothesis',persist_rca:true,
 incident_id:incident.id,
 hypothesis:'Duplicate printing occurs because the UI handler replays the first check-in',
 experiment:'Replay one UI event with the backend print queue disabled',
 predicted_observation:'One additional print is issued only when the UI handler is enabled',
 disconfirming_test:'Disable UI handler and check whether the queue still prints twice',
 expected_criterion_id:'repeat-print',...extra
});

test('RCA: a passing unrelated test never proves a cause; warnings survive Compact',()=>{
 const f=fixture();try{
  const e=evaluated(f,'login');
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   title:'Repeated QR print after login',paths:['src/checkin.js'],evidence_ids:[e]}),
   /persist_rca/);
  const inc=f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'Repeated QR print after login',
   root_cause:'UI handler may duplicate a print',paths:['src/checkin.js'],evidence_ids:[e]});
  assert.equal(inc.state,'investigating');
  assert.equal(inc.root_cause_verified,false);
  assert.match(inc.warning,/not independently prove/i);
  assert.equal(inc.compact,true);
  const hyp=hypothesized(f,inc);
  assert.equal(hyp.status,'untested');
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,evidence_ids:[e],
   experiment_outcome:'supports',observation:'UI handler is the source of duplicate prints'}),/unrelated acceptance criterion/);
  const state=f.engine.evidence({workspace:f.workspace,operation:'hypotheses',incident_id:inc.id});
  assert.equal(state.items[0].status,'untested');
 }finally{f.clean()}
});

test('RCA: supported, refuted and inconclusive are source-bound local outcomes, never proven',()=>{
 const f=fixture();try{
  const e=evaluated(f);
  const inc=f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'Second scan generates two print jobs',paths:['src/checkin.js']});
  const hyp=hypothesized(f,inc);
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,experiment_outcome:'supports',
   observation:'Observed UI handler duplicate prints'}),/needs fresh named experimental evidence/);
  const supported=f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,evidence_ids:[e],
   experiment_outcome:'supports',observation:'A controlled native test passed on the handler guard'});
  assert.equal(supported.status,'locally_supported');
  assert.equal(supported.root_cause_verified,false);
  assert.equal(supported.independently_attested,false);
  assert.match(supported.warning,/not independently prove/);
  const refuted=f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,evidence_ids:[e],
   experiment_outcome:'refutes',observation:'Backend continues printing when UI is disabled'});
  assert.equal(refuted.status,'refuted');
  const open=f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,experiment_outcome:'inconclusive',
   observation:'Cannot isolate the queue under this environment'});
  assert.equal(open.status,'inconclusive');
  const list=f.engine.evidence({workspace:f.workspace,operation:'hypotheses',incident_id:inc.id});
  assert.equal(list.items[0].status,'inconclusive');
  assert.equal(list.items[0].assessment.independent_causal_proof,false);
  const incidents=f.engine.evidence({workspace:f.workspace,operation:'incidents'});
  assert.equal(incidents.items[0].root_cause_verified,false);
 }finally{f.clean()}
});

test('RCA: rejects stale, tampered and build-only evidence and secret-bearing notes',()=>{
 const f=fixture();try{
  const ev=evaluated(f),inc=f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'QR print repeats after reload',paths:['src/checkin.js']});
  const hyp=hypothesized(f,inc);
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'Private password=FAKE_SYNTHETIC_ONLY'}),/credential/);
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'add_hypothesis',
   persist_rca:true,incident_id:inc.id,hypothesis:'API key=FAKE_SYNTHETIC_ONLY',
   experiment:'Repeat the test with invalid context',
   predicted_observation:'An error is returned',disconfirming_test:'Retry and compare failures',
   expected_criterion_id:'repeat-print'}),/credential|Invalid hypothesis/);
  fs.writeFileSync(path.join(f.workspace,f.rel),'{"format":"a2a-test-report-v1","completed":false,"cases":[]}');
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,experiment_outcome:'supports',evidence_ids:[ev],
   observation:'A local test reproduced the duplicate printing'}),/stale|hash\/path/);
  // Restore report then change source to make all previous observations stale.
  fs.writeFileSync(path.join(f.workspace,'src','checkin.js'),'export const canPrint=()=>true;\n');
  const stale=f.engine.evidence({workspace:f.workspace,operation:'hypotheses',incident_id:inc.id});
  assert.equal(stale.items[0].status,'stale');
  assert.throws(()=>f.engine.evidence({workspace:f.workspace,operation:'assess_hypothesis',
   persist_rca:true,hypothesis_id:hyp.id,experiment_outcome:'supports',evidence_ids:[ev],
   observation:'Old code may have had the original behavior'}),/stale/);
 }finally{f.clean()}
});

test('RCA: branching, bounded Why depth, recurrence hints and plan references',()=>{
 const f=fixture();try{
  const inc=f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'QR prints twice on the second scan',paths:['src/checkin.js']});
  const original=hypothesized(f,inc);
  const alternative=hypothesized(f,inc,{parent_hypothesis_id:original.id,
   hypothesis:'The backend queue may process duplicate events when UI is disabled'});
  assert.equal(alternative.why_depth,2);
  assert.equal(alternative.parent_hypothesis_id,original.id);
  const repeat=f.engine.evidence({workspace:f.workspace,operation:'record_incident',
   persist_rca:true,title:'QR prints twice on the second scan',paths:['src/checkin.js']});
  assert.ok(repeat.related_incident_ids.includes(inc.id));
  assert.equal(repeat.recurrence_is_hypothesis,true);
  const plan=f.engine.verify({workspace:f.workspace,operation:'plan',persist_plan:true,criteria:[scenario()]});
  const bound=hypothesized(f,inc,{plan_id:plan.plan_id});
  assert.equal(bound.status,'untested');
  assert.throws(()=>hypothesized(f,inc,{plan_id:plan.plan_id,expected_criterion_id:'unplanned-id'}),/criterion must exist/);
 }finally{f.clean()}
});

test('RCA: old SQLite incident/hypothesis tables migrate without losing rows',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-rca-legacy-'));
 try{
  const dbRoot=path.join(root,'private');let s=new Store(dbRoot);s.close();
  const db=new Database(path.join(dbRoot,'a2a.sqlite'));
  try{
   db.exec('DROP TABLE hypotheses; DROP TABLE incidents;');
   db.exec('CREATE TABLE incidents (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, title TEXT NOT NULL, root_cause TEXT NOT NULL, state TEXT NOT NULL, revision_id TEXT NOT NULL, related_paths_json TEXT NOT NULL, criteria_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, created_at TEXT NOT NULL);');
   db.exec('CREATE TABLE hypotheses (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, incident_id TEXT, description TEXT NOT NULL, status TEXT NOT NULL, experiment TEXT, evidence_ids_json TEXT NOT NULL, created_at TEXT NOT NULL);');
   db.prepare('INSERT INTO incidents VALUES(?,?,?,?,?,?,?,?,?,?)').run('old-incident','old-ws','Legacy issue','old conjecture','evidence-linked','rev','[]','[]','[]','2026-01-01');
   db.prepare('INSERT INTO hypotheses VALUES(?,?,?,?,?,?,?,?)').run('old-hyp','old-ws','old-incident','Older explanation','untested','Old test','[]','2026-01-01');
  }finally{db.close()}
  s=new Store(dbRoot);try{
   assert.equal(s.get('SELECT root_cause FROM incidents WHERE id=?','old-incident').root_cause,'old conjecture');
   assert.equal(s.get('SELECT description FROM hypotheses WHERE id=?','old-hyp').description,'Older explanation');
   assert.equal(s.get('SELECT why_depth FROM hypotheses WHERE id=?','old-hyp').why_depth,1);
   assert.ok(s.all('PRAGMA index_list(incidents)').some(i=>i.name==='incidents_signature'));
  }finally{s.close()}
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
