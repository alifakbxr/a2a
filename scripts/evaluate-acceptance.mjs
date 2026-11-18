#!/usr/bin/env node
// Release eligibility review from independently signed machine evidence.
// Signature proves possession of a pinned reviewer key, NOT correctness of executed tests.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const check=(v,m)=>{if(!v)throw new Error(m)};
const statuses=new Set(['passed','failed','partial','blocked','not-tested']);
const types=new Set(['junit','tap','browser','security','performance','accessibility','manual','integration']);
const digest=v=>typeof v==='string'&&/^[0-9a-f]{64}$/i.test(v);
export function attestationPayload({revision,scenarioId,evidence}){
 return JSON.stringify({revision,scenario_id:scenarioId,type:evidence.type,reference:evidence.reference,checked_at:evidence.checked_at,artifact_sha256:evidence.artifact_sha256,assertion_count:evidence.assertion_count});
}
export function validateEvidenceSignature({revision,scenarioId,evidence,trustKeys={}}){
 if(!isObj(evidence)||evidence.outcome!=='passed'||evidence.revision!==revision||!types.has(evidence.type)||!digest(evidence.artifact_sha256)||!Number.isSafeInteger(evidence.assertion_count)||evidence.assertion_count<1||typeof evidence.reference!=='string'||!evidence.reference.trim()||typeof evidence.checked_at!=='string'||Number.isNaN(Date.parse(evidence.checked_at)))return false;
 const key=trustKeys[evidence.key_id];
 if(typeof key!=='string'||typeof evidence.signature!=='string'||evidence.signature.length>1024||!/^[A-Za-z0-9+/]+=*$/.test(evidence.signature))return false;
 try{
  const parsed=crypto.createPublicKey(key);
  if(parsed.asymmetricKeyType!=='ed25519')return false;
  const bytes=Buffer.from(evidence.signature,'base64');
  return bytes.length===64&&crypto.verify(null,Buffer.from(attestationPayload({revision,scenarioId,evidence}),'utf8'),parsed,bytes);
 }catch{return false}
}
export function assessRelease(input,{trustKeys={}}={}){
 check(isObj(input)&&Array.isArray(input.scenarios)&&input.scenarios.length>0&&input.scenarios.length<=100,'Expected 1-100 scenarios');
 check(isObj(input.evaluator)&&input.evaluator.independent===true&&typeof input.evaluator.name==='string'&&input.evaluator.name.trim(),'Explicit independent evaluator required');
 check(typeof input.revision==='string'&&input.revision.trim(),'Code revision is required');
 check(isObj(trustKeys),'Trusted keys must be explicitly configured outside implementation inputs');
 const ids=new Set(),results=[],blockers=[];
 for(const s of input.scenarios){
  check(isObj(s)&&typeof s.id==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(s.id)&&!ids.has(s.id),'Invalid or duplicate scenario ID');
  ids.add(s.id);
  check(typeof s.requirement==='string'&&s.requirement.trim()&&statuses.has(s.verdict),'Scenario requires description and valid verdict');
  check(typeof s.critical==='boolean','critical must be explicit');
  check(Array.isArray(s.evidence)&&s.evidence.length<=40,'Every scenario needs a bounded evidence array');
  const verified=s.evidence.filter(e=>validateEvidenceSignature({revision:input.revision,scenarioId:s.id,evidence:e,trustKeys}));
  let note=null,verdict=s.verdict;
  if(verdict==='passed'){
   if(verified.length===0){verdict='not-tested';note='No independently key-verified machine evidence for this revision and scenario';}
   else if(Array.isArray(s.required_evidence_types)&&s.required_evidence_types.some(t=>!verified.some(e=>e.type===t))){
    verdict='partial';note='Missing independently verified required evidence type(s)';
   }
   else if(s.critical&&verified.every(e=>e.type==='manual')){
    verdict='partial';note='Critical machine scenario cannot be verified by manual prose alone';
   }
  }
  const row={id:s.id,requirement:s.requirement,critical:s.critical,verdict,evidence_count:s.evidence.length,signature_verified_evidence:verified.length,...(note?{note}:{})};results.push(row);
  if(s.critical&&verdict!=='passed')blockers.push({scenario_id:s.id,verdict,reason:note||'Critical scenario not verified'});
 }
 const defects=Array.isArray(input.critical_defects)?input.critical_defects:[];
 for(const d of defects){check(isObj(d)&&typeof d.id==='string'&&d.id.trim(),'Invalid critical defect record');if(d.status!=='resolved-and-retested')blockers.push({defect_id:d.id,reason:'Unresolved or unverified critical defect'});}
 const passed=results.filter(x=>x.verdict==='passed').length;
 const release_ready=passed===results.length&&blockers.length===0;
 return {schema:'a2a-release-gate-v2',revision:input.revision,verdict:release_ready?'eligible-for-review':'blocked',release_ready,scenarios:{passed,total:results.length,results},blockers,limits:['Key verification attests the claimed issuer, not that tests were executed honestly','An independent assessor must review runner provenance, scenario semantics, browser/build identity and hidden dependencies','Missing or untrusted evidence never counts as passed','An eligible-for-review result is NOT production security certification']};
}
export function assessFile(file,{trustKeyFile=null}={}){
 const st=fs.statSync(file);check(st.isFile()&&st.size<=1024*1024,'Evaluation file must be <=1 MiB');
 let keys={};
 if(trustKeyFile){
  const info=fs.statSync(trustKeyFile);check(info.isFile()&&info.size<=64*1024,'Trust config too large');
  keys=JSON.parse(fs.readFileSync(trustKeyFile,'utf8'));
  check(isObj(keys)&&Object.keys(keys).length<=20,'Invalid public-key trust config');
 }
 return assessRelease(JSON.parse(fs.readFileSync(file,'utf8')),{trustKeys:keys});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===3||process.argv.length===4,'Usage: node scripts/evaluate-acceptance.mjs <evidence.json> [trusted-public-keys.json]');process.stdout.write(JSON.stringify(assessFile(process.argv[2],{trustKeyFile:process.argv[3]}),null,2)+'\n')}
 catch(e){process.stderr.write('Acceptance evaluation failed: '+e.message+'\n');process.exitCode=1}
}
