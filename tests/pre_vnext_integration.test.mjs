import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {TOOLS,validateArgs} from '../src/tools.mjs';
import {assessRelease,attestationPayload} from '../scripts/evaluate-acceptance.mjs';
import {evaluateSemanticClaims} from '../src/semantic-evidence.mjs';
import {assessBrowserEvidence} from '../src/browser-evidence.mjs';
import {proposeRiskTests} from '../src/risk-guidance.mjs';
import {adviseOrchestration} from '../src/orchestration-advisor.mjs';

const rev='revision-test-1';
const sha='a'.repeat(64);
const at='2026-11-18T09:00:00Z';

test('all independently developed MCP actions survive integration',()=>{
  const names=TOOLS.map(t=>t.name);
  assert.deepEqual(names,['a2a_context','a2a_impact','a2a_verify','a2a_evidence']);
  const verify=TOOLS.find(x=>x.name==='a2a_verify').inputSchema.properties.operation.enum;
  for(const op of ['plan','assess','verify_handoff','assess_release','assess_semantic','assess_browser']){
    assert.ok(verify.includes(op),op);
    assert.doesNotThrow(()=>validateArgs('a2a_verify',{workspace:'/authorized-project',operation:op}));
  }
  assert.doesNotThrow(()=>validateArgs('a2a_context',{workspace:'/authorized-project',action:'orchestration',task:{tier:'free',available_commands:['@subagent']}}));
  assert.throws(()=>validateArgs('a2a_verify',{workspace:'/authorized-project',operation:'disable-security'}));
});

test('all known STOCKROOM critical risk domains remain in integrated plan',()=>{
  const r=proposeRiskTests({paths:['routes/web.php','app/Services/PosCheckoutService.php','app/Services/RefundService.php','app/Services/InventoryService.php','public/sw.js','resources/js/offline/db.ts']});
  const required=new Set(r.suggested_test_ids);
  assert.deepEqual(r.required_test_ids,[],'Suggestions are not accepted as mandatory scenarios until user reviews them');
  for(const check of ['auth-entry-points','auth-store-link','finance-line-reconcile','finance-paid-reconcile','refund-duplicate-lines','refund-amount-only','transfer-race','offline-process-restart','offline-user-switch','idem-response-loss','idem-payload-conflict']){
    assert.ok(required.has(check),check);
  }
  assert.equal(r.coverage_assurance,'none');
});

test('fabricated independent and all-green test report never passes release gate',()=>{
  const fake={revision:rev,evaluator:{name:'untrusted-agent',independent:true},scenarios:[{
    id:'checkout',requirement:'True parallel stock checkout',critical:true,verdict:'passed',
    evidence:[{type:'integration',outcome:'passed',revision:rev,reference:'ci/job/1',checked_at:at,artifact_sha256:sha,assertion_count:100,key_id:'untrusted',signature:'a'.repeat(88)}]
  }],critical_defects:[]};
  const out=assessRelease(fake);
  assert.equal(out.release_ready,false);
  assert.equal(out.scenarios.results[0].verdict,'not-tested');
});

test('even a signature does not prove a different scenario or revision',()=>{
  const keys=crypto.generateKeyPairSync('ed25519');
  const evidence={type:'security',outcome:'passed',revision:rev,reference:'ci/job/2',checked_at:at,artifact_sha256:sha,assertion_count:3,key_id:'ci'};
  evidence.signature=crypto.sign(null,Buffer.from(attestationPayload({revision:rev,scenarioId:'correct',evidence})),keys.privateKey).toString('base64');
  const manifest={revision:rev,evaluator:{name:'ci',independent:true},scenarios:[{id:'different',requirement:'Tenant isolation',critical:true,verdict:'passed',evidence:[evidence]}],critical_defects:[]};
  assert.equal(assessRelease(manifest,{trustKeys:{ci:keys.publicKey.export({type:'spki',format:'pem'})}}).release_ready,false);
});

test('self-reported concurrency observations are never independently verified',()=>{
  const facts={requests:[{connection_id:'db1',resource_id:'last',started_at_ms:0,completed_at_ms:10,outcome:'success'},{connection_id:'db2',resource_id:'last',started_at_ms:3,completed_at_ms:12,outcome:'failed'}],database_dialect:'postgres',database_transactions_observed:true,orders_created:1,stock_after:0};
  const data={revision:rev,claims:[{id:'parallel-stock',scenario:'true-concurrency',evidence:[{revision:rev,verdict:'passed',origin:'external-test-harness',reference:'ci:test-1',checked_at:at,observations:facts,witnessed_capabilities:['parallel_clients','atomic_commit']}]}]};
  const r=evaluateSemanticClaims(data);
  assert.equal(r.release_verified,false);
  assert.equal(r.accepted,0);
  assert.equal(r.report_status,'evidence-present-unattested');
});

test('browser report with stale build or tab-only reopen cannot claim independently verified',()=>{
  const data={schema:'a2a-browser-evidence-v1',scenario_id:'offline-restart',source:{revision:rev},build:{artifact_sha256:sha,served_sha256:'b'.repeat(64),source_revision:rev},environment:{browser:'Chrome',version:'150'},runner:{name:'playwright',version:'1'},started_at:at,finished_at:'2026-11-18T09:01:00Z',assertions:[{id:'queue-present',status:'passed',executed:true,expected:1,observed:1}]};
  const r=assessBrowserEvidence(data,{expectedRevision:rev});
  assert.equal(r.status,'inconclusive');
  assert.equal(r.independently_verified,false);
  assert.ok(r.problem_codes.includes('served-build-not-matched'));
  const offline=evaluateSemanticClaims({revision:rev,claims:[{id:'offline-restart',scenario:'offline-restart',evidence:[{revision:rev,verdict:'passed',origin:'external-test-harness',reference:'ci:test-2',checked_at:at,observations:{browser_process_terminated:false,process_before:'p1',process_after:'p1'}}]}]});
  assert.equal(offline.release_verified,false);
  assert.ok(offline.claims[0].missing.includes('browser_reopened'));
});

test('orchestration advice remains opt-in and cannot spawn paid workers on Free Tier',()=>{
  const r=adviseOrchestration({tier:'free',available_commands:['/swarm','/teamwork','@subagent'],workstreams:['api','ui'],dependencies:'low',file_ownership:'independent'});
  assert.equal(r.recommended,'@subagent');
  assert.equal(r.automatic_worker_launch,false);
  assert.equal(r.user_approval_required,true);
});
