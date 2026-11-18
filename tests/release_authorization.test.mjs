import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {assertPublishAuthorized} from '../scripts/release-authorization.mjs';
import {attestationPayload} from '../scripts/evaluate-acceptance.mjs';

const sha='a'.repeat(40);
function fixture(){
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
  const trustKeys={independent:publicKey.export({type:'spki',format:'pem'}).toString()};
  const revision='source-rev-01';
  const scenarios=[],requirements=[];
  for(let i=1;i<=18;i++){
    const id='F'+String(i).padStart(2,'0');
    const requirement='Independent contract '+id;
    const required_evidence_types=['integration'];
    const evidence={
      revision,type:'integration',outcome:'passed',reference:'independent-case-'+id,
      checked_at:'2026-11-18T10:00:00.000Z',artifact_sha256:crypto.createHash('sha256').update(id).digest('hex'),
      assertion_count:1,key_id:'independent'
    };
    evidence.signature=crypto.sign(null,Buffer.from(attestationPayload({revision,scenarioId:id,evidence})),privateKey).toString('base64');
    scenarios.push({id,requirement,critical:true,required_evidence_types,verdict:'passed',evidence:[evidence]});
    requirements.push({id,requirement_sha256:crypto.createHash('sha256').update(requirement).digest('hex'),critical:true,required_evidence_types});
  }
  const registry={schema:'a2a-acceptance-registry-v1',scenarios:requirements};
  const manifest={
    revision,evaluator:{independent:true,name:'independent-fixture'},
    scenarios,critical_defects:[],
    release_target:{
      repository:'alifakbxr/a2a',commit_sha:sha,version:'2.0.1',
      acceptance_registry_sha256:crypto.createHash('sha256').update(JSON.stringify(registry)).digest('hex'),
      real_antigravity_validation:true,privacy_reviewed:true,repeated_benchmark_verified:true
    }
  };
  return {
    repository:'alifakbxr/a2a',eventName:'release',ref:'refs/tags/v2.0.1',
    checkoutSha:sha,mainSha:sha,approvedSha:sha,packageVersion:'2.0.1',
    manifest,trustKeys,registry
  };
}

test('publish gate requires external signature-checked acceptance for all 18 frozen cases',()=>{
  const input=fixture();
  const result=assertPublishAuthorized(input);
  assert.equal(result.status,'authorized');
  assert.equal(result.verified_scenarios,18);
  assert.equal(result.release_commit,sha);
});

test('publish gate rejects unapproved, divergent, forged, incomplete and wrong-revision releases',()=>{
  const cases=[
    x=>{x.approvedSha=null},
    x=>{x.approvedSha='b'.repeat(40)},
    x=>{x.checkoutSha='b'.repeat(40)},
    x=>{x.mainSha='b'.repeat(40)},
    x=>{x.repository='someone/fork'},
    x=>{x.ref='refs/tags/v2.0.0'},
    x=>{x.eventName='pull_request'},
    x=>{x.manifest.release_target.commit_sha='b'.repeat(40)},
    x=>{x.manifest.release_target.acceptance_registry_sha256='b'.repeat(64)},
    x=>{x.manifest.release_target.privacy_reviewed=false},
    x=>{x.manifest.release_target.real_antigravity_validation=false},
    x=>{x.manifest.release_target.repeated_benchmark_verified=false},
    x=>{x.manifest.scenarios[0].evidence[0].signature='AA=='},
    x=>{x.manifest.scenarios[0].verdict='not-tested'},
    x=>{x.registry.scenarios.pop()},
    x=>{x.trustKeys={}},
    x=>{x.manifest.scenarios[0].requirement='Silently changed'},
  ];
  for(const mutate of cases){
    const input=fixture();
    mutate(input);
    assert.throws(()=>assertPublishAuthorized(input),Error,mutate.toString().slice(0,120));
  }
});

test('manual publishing is restricted to main; tags are restricted to package version',()=>{
  const input=fixture();
  input.eventName='workflow_dispatch';input.ref='refs/heads/main';
  assert.equal(assertPublishAuthorized(input).status,'authorized');
  input.ref='refs/heads/v2.0.1';
  assert.throws(()=>assertPublishAuthorized(input),/main/);
});

test('all package workflows run the release gate before publishing',()=>{
  for(const file of ['.github/workflows/publish-npm.yml','.github/workflows/publish-github-package.yml']){
    const txt=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(txt,/node scripts\/release-authorization\.mjs/);
    assert.match(txt,/A2A_RELEASE_APPROVED_SHA/);
    assert.match(txt,/A2A_RELEASE_EVIDENCE_B64/);
    assert.match(txt,/A2A_RELEASE_TRUST_KEYS_B64/);
    assert.match(txt,/A2A_RELEASE_REGISTRY_B64/);
    assert.ok(txt.indexOf('node scripts/release-authorization.mjs')<txt.indexOf('npm publish'));
    assert.ok(!txt.includes('force_publish'));
  }
});
