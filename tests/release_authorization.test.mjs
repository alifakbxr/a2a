import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {assertPublishAuthorized,releaseApprovalPayload,releaseManifestDigest} from '../scripts/release-authorization.mjs';
import {attestationPayload} from '../scripts/evaluate-acceptance.mjs';

const sha='a'.repeat(40);
function fixture(){
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
  const {publicKey:reviewerPub,privateKey:reviewerPriv}=crypto.generateKeyPairSync('ed25519');
  const trustKeys={
    independent:publicKey.export({type:'spki',format:'pem'}).toString(),
    reviewer:reviewerPub.export({type:'spki',format:'pem'}).toString()
  };
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
  const approved_at=new Date().toISOString();
  const manifest_sha256=releaseManifestDigest(manifest);
  manifest.release_approval={
    key_id:'reviewer',approved_at,manifest_sha256,
    signature:crypto.sign(null,Buffer.from(releaseApprovalPayload({
      release_target:manifest.release_target,revision:manifest.revision,approved_at,manifest_sha256
    })),reviewerPriv).toString('base64')
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
    x=>{x.manifest.scenarios[0].evidence[0].outcome='failed'},
    x=>{delete x.manifest.critical_defects},
    x=>{x.manifest.critical_defects.push({id:'NEW-DEFECT',status:'open'})},
    x=>{x.manifest.evaluator.name='different-evaluator'},
    x=>{x.manifest.scenarios[0].evidence[0].assertion_count=2},
    x=>{x.registry.scenarios.pop()},
    x=>{x.trustKeys={}},
    x=>{x.manifest.scenarios[0].requirement='Silently changed'},
    x=>{x.manifest.release_approval.signature='AA=='},
    x=>{x.manifest.release_approval.approved_at='2020-01-01T00:00:00.000Z'},
    x=>{x.manifest.release_target.privacy_reviewed=false},
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


test('publish CLI refuses missing authorization and emits no secret contents',()=>{
  const proc=spawnSync(process.execPath,['scripts/release-authorization.mjs'],{
    cwd:path.resolve('.'),
    env:{
      ...process.env,
      GITHUB_REPOSITORY:'alifakbxr/a2a',
      GITHUB_EVENT_NAME:'workflow_dispatch',
      GITHUB_REF:'refs/heads/v2.0.1',
      A2A_RELEASE_APPROVED_SHA:'',
      A2A_RELEASE_EVIDENCE_B64:'',
      A2A_RELEASE_TRUST_KEYS_B64:'',
      A2A_RELEASE_REGISTRY_B64:''
    },
    encoding:'utf8',timeout:10000
  });
  assert.equal(proc.status,1);
  assert.equal(proc.stdout.trim(),'');
  assert.match(proc.stderr,/Release authorization DENIED/);
});

test('genuine signed FAILED evidence relabeled PASS is not authorized',()=>{
 const input=fixture();
 const e=input.manifest.scenarios[0].evidence[0];
 const keys=crypto.generateKeyPairSync('ed25519');
 input.trustKeys.independent=keys.publicKey.export({type:'spki',format:'pem'}).toString();
 e.outcome='failed';
 e.signature=crypto.sign(null,Buffer.from(attestationPayload({revision:input.manifest.revision,scenarioId:'F01',evidence:e})),keys.privateKey).toString('base64');
 e.outcome='passed';
 assert.throws(()=>assertPublishAuthorized(input),Error);
});

test('publish workflows never skip missing independent release evidence',()=>{
 for(const file of ['.github/workflows/publish-npm.yml','.github/workflows/publish-github-package.yml']){
  const yaml=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(yaml,/skipping external gate|if \[ -n "\$A2A_RELEASE_EVIDENCE_B64" \]/);
  const gates=yaml.match(/node scripts\/release-authorization\.mjs/g)||[];
  assert.ok(gates.length>=1,file+' must invoke authorization');
  assert.match(yaml,/git fetch origin main --no-tags\s*\n\s*node scripts\/release-authorization\.mjs/);
  assert.doesNotMatch(yaml,/npm publish\s*\|\|/);
  assert.match(yaml,/npm view/);
 }
});

test('publishing never suppresses registry errors or republishes the frozen legacy package',()=>{
 const gh=fs.readFileSync(new URL('../.github/workflows/publish-github-package.yml',import.meta.url),'utf8');
 const npm=fs.readFileSync(new URL('../.github/workflows/publish-npm.yml',import.meta.url),'utf8');
 for(const yaml of [gh,npm]){
  assert.match(yaml,/already_published/);
  assert.match(yaml,/E404\|404 Not Found/);
  assert.match(yaml,/exit 1/);
  assert.doesNotMatch(yaml,/npm publish\s*\|\|/);
 }
 assert.doesNotMatch(gh,/pkg\.version = '2\.1\.0'|npm publish \|\|/);
 assert.match(gh,/Verify GitHub Packages version/);
 assert.match(npm,/Verified npmjs registry version/);
});
