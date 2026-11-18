import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {assessRelease,attestationPayload} from '../scripts/evaluate-acceptance.mjs';
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const trustKeys={'ci-reviewer':publicKey.export({type:'spki',format:'pem'})};
const rev='sha-123';
function entry(type='integration'){
 const e={type,outcome:'passed',revision:rev,reference:'ci/job/123',checked_at:'2026-11-18T09:00:00Z',artifact_sha256:'a'.repeat(64),assertion_count:4,key_id:'ci-reviewer'};
 e.signature=crypto.sign(null,Buffer.from(attestationPayload({revision:rev,scenarioId:'checkout',evidence:e})),privateKey).toString('base64');
 return e;
}
const basic=()=>({revision:rev,evaluator:{name:'external-ci',independent:true},scenarios:[{id:'checkout',requirement:'Retry commit exactly once',critical:true,verdict:'passed',required_evidence_types:['integration'],evidence:[entry()]}],critical_defects:[]});
test('untrusted self asserted independent:true cannot pass a release gate',()=>{
 const r=assessRelease(basic());assert.equal(r.release_ready,false);assert.equal(r.scenarios.results[0].verdict,'not-tested');
});
test('pinned trusted key validates only correct signed rev/scenario/evidence bytes',()=>{
 assert.equal(assessRelease(basic(),{trustKeys}).release_ready,true);
 const a=basic();a.scenarios[0].evidence[0].revision='old';assert.equal(assessRelease(a,{trustKeys}).release_ready,false);
 const b=basic();b.scenarios[0].evidence[0].artifact_sha256='b'.repeat(64);assert.equal(assessRelease(b,{trustKeys}).release_ready,false);
});
test('required browser evidence cannot be substituted with integration tests',()=>{
 const a=basic();a.scenarios[0].required_evidence_types=['browser'];const r=assessRelease(a,{trustKeys});assert.equal(r.scenarios.results[0].verdict,'partial');
});
test('critical unresolved defect blocks even signed tests',()=>{
 const a=basic();a.critical_defects=[{id:'SEC-01',status:'open'}];assert.equal(assessRelease(a,{trustKeys}).release_ready,false);
});
test('other signer cannot forge trusted signature',()=>{
 const a=basic();const other=crypto.generateKeyPairSync('ed25519');
 a.scenarios[0].evidence[0].signature=crypto.sign(null,Buffer.from(attestationPayload({revision:rev,scenarioId:'checkout',evidence:a.scenarios[0].evidence[0]})),other.privateKey).toString('base64');
 assert.equal(assessRelease(a,{trustKeys}).release_ready,false);
});
test('no machine evidence or self-review declaration fails closed',()=>{
 const a=basic();a.scenarios[0].evidence=[];
 assert.equal(assessRelease(a,{trustKeys}).release_ready,false);
 assert.throws(()=>assessRelease({...a,evaluator:{independent:false,name:'agent'}},{trustKeys}),/independent/);
});

test('release assessment does not export untrusted private requirement text',()=>{
 const a=basic();a.scenarios[0].requirement='Secret=/home/user/.env API_KEY=abc';
 const text=JSON.stringify(assessRelease(a,{trustKeys}));
 assert.equal(text.includes('/home/user'),false);assert.equal(text.includes('API_KEY=abc'),false);
});
