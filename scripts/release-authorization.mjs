#!/usr/bin/env node
// Fail-closed publishing gate. External acceptance material is supplied by an
// independently controlled CI environment, not read from repository sources.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assessRelease} from './evaluate-acceptance.mjs';

const SHA=/^[a-f0-9]{40}$/;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const EXPECTED_REPO='alifakbxr/a2a';
const REQUIRED_SCENARIOS=Array.from({length:18},(_,i)=>'F'+String(i+1).padStart(2,'0'));

export function releaseApprovalPayload({release_target,revision,approved_at}){
 return JSON.stringify({
   schema:'a2a-release-approval-v1',
   repository:release_target.repository,commit_sha:release_target.commit_sha,
   version:release_target.version,revision,
   acceptance_registry_sha256:release_target.acceptance_registry_sha256,
   real_antigravity_validation:release_target.real_antigravity_validation,
   privacy_reviewed:release_target.privacy_reviewed,
   repeated_benchmark_verified:release_target.repeated_benchmark_verified,
   approved_at
 });
}
function validReleaseApproval(manifest,trustKeys){
 const approval=manifest.release_approval,keys=trustKeys;
 if(!isObject(approval)||typeof approval.key_id!=='string'||
    typeof approval.signature!=='string'||!/^[a-zA-Z0-9+/]{85,86}==$/.test(approval.signature)||
    typeof approval.approved_at!=='string'||!Number.isFinite(Date.parse(approval.approved_at)))return false;
 const key=keys[approval.key_id];
 if(typeof key!=='string')return false;
 const approvedAt=Date.parse(approval.approved_at);
 if(approvedAt>Date.now()+5*60_000||approvedAt<Date.now()-90*24*60*60_000)return false;
 try{
   const publicKey=crypto.createPublicKey(key);
   if(publicKey.asymmetricKeyType!=='ed25519')return false;
   const signature=Buffer.from(approval.signature,'base64');
   return signature.length===64&&crypto.verify(
     null,Buffer.from(releaseApprovalPayload({
       release_target:manifest.release_target,revision:manifest.revision,
       approved_at:approval.approved_at
     })),publicKey,signature);
 }catch{return false}
}

export function assertPublishAuthorized({
 repository,eventName,ref,checkoutSha,mainSha,approvedSha,packageVersion,
 manifest,trustKeys,registry
}={}){
 check(repository===EXPECTED_REPO,'Publishing permitted only from the canonical repository');
 check(SHA.test(checkoutSha||'')&&SHA.test(mainSha||'')&&checkoutSha===mainSha,'Release must exactly match the current main HEAD');
 check(SHA.test(approvedSha||'')&&approvedSha===checkoutSha,'Independent maintainer-approved release commit is missing or differs');
 check(typeof packageVersion==='string'&&/^\d+\.\d+\.\d+$/.test(packageVersion),'Invalid package version');
 if(eventName==='push'||eventName==='release'){
   check(ref==='refs/tags/v'+packageVersion,'Published tag must exactly match the package version');
 }else{
   check(eventName==='workflow_dispatch'&&ref==='refs/heads/main','Manual publishing is permitted only from main');
 }
 check(isObject(manifest)&&isObject(manifest.release_target),'Externally supplied release evidence is required');
 check(manifest.release_target.repository===repository&&
   manifest.release_target.commit_sha===checkoutSha&&
   manifest.release_target.version===packageVersion,'Release evidence does not bind to the exact commit and version');
 check(isObject(registry)&&registry.schema==='a2a-acceptance-registry-v1'&&
   Array.isArray(registry.scenarios),'Independent frozen acceptance registry missing');
 const ids=registry.scenarios.map(x=>x?.id);
 check(ids.length>=REQUIRED_SCENARIOS.length&&REQUIRED_SCENARIOS.every(x=>ids.includes(x)),
   'External acceptance registry must include all 18 required STOCKROOM scenarios');
 check(isObject(trustKeys)&&Object.keys(trustKeys).length>0,'External evaluator trust keys required');
 check(digest(manifest.release_target.acceptance_registry_sha256),
   'Acceptance registry digest must be pinned to release evidence');
 const registryDigest=crypto.createHash('sha256').update(JSON.stringify(registry)).digest('hex');
 check(manifest.release_target.acceptance_registry_sha256===registryDigest,
   'External registry differs from the release evidence binding');
 const assessment=assessRelease(manifest,{trustKeys,requiredScenarios:registry.scenarios});
 check(assessment.release_ready===true&&assessment.scope_verified===true,
   'Independent machine-evidence assessment is not release eligible');
 check(assessment.scenarios.total>=REQUIRED_SCENARIOS.length,'Missing required acceptance cases');
 check(manifest.release_target.real_antigravity_validation===true &&
       manifest.release_target.privacy_reviewed===true &&
       manifest.release_target.repeated_benchmark_verified===true,
   'Release lacks externally approved Antigravity, privacy or repeated benchmark gates');
 check(validReleaseApproval(manifest,trustKeys),
   'Missing, expired or invalid independent Ed25519 release approval for this exact candidate');
 return {status:'authorized',release_commit:checkoutSha,package_version:packageVersion,
   verified_scenarios:assessment.scenarios.passed,registry_sha256:registryDigest,
   note:'This verifies externally supplied attestations, not the honesty of test execution.'};
}

function readExternalJson(name,{maxBytes=64*1024}={}){
 const encoded=process.env[name];
 check(typeof encoded==='string'&&encoded.length>0&&encoded.length<=maxBytes*2,
   'Missing or oversized external secret: '+name);
 check(/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)&&encoded.length%4===0,
   'Invalid base64 secret: '+name);
 const raw=Buffer.from(encoded,'base64');
 check(raw.length<=maxBytes,'External JSON secret too large: '+name);
 try{return JSON.parse(raw.toString('utf8'))}
 catch{throw new Error('Malformed external JSON secret: '+name)}
}

export function authorizeFromEnvironment(){
 const repository=process.env.GITHUB_REPOSITORY,eventName=process.env.GITHUB_EVENT_NAME,
   ref=process.env.GITHUB_REF,approvedSha=process.env.A2A_RELEASE_APPROVED_SHA;
 const checkoutSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000}).trim();
 const mainSha=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8',timeout:5000}).trim();
 const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 return assertPublishAuthorized({repository,eventName,ref,checkoutSha,mainSha,approvedSha,
   packageVersion:pkg.version,
   manifest:readExternalJson('A2A_RELEASE_EVIDENCE_B64',{maxBytes:128*1024}),
   trustKeys:readExternalJson('A2A_RELEASE_TRUST_KEYS_B64'),
   registry:readExternalJson('A2A_RELEASE_REGISTRY_B64')});
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{
   const result=authorizeFromEnvironment();
   process.stdout.write(JSON.stringify(result)+'\n');
 }catch(error){
   // Never print supplied secrets, source reports or raw crypto exceptions to CI logs.
   process.stderr.write('Release authorization DENIED: '+String(error.message).slice(0,160)+'\n');
   process.exitCode=1;
 }
}
