#!/usr/bin/env node
// Conservative scenario-level evidence assessor. Tests must declare what they actually exercised.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const BUILTIN={
 'true-concurrency':['parallel_clients','shared_stock_record','atomic_commit','one_winner_asserted'],
 'offline-restart':['network_disconnected','durable_queue_written','browser_closed','browser_reopened','queue_recovered','sync_exactly_once'],
 'lost-response-retry':['first_commit_persisted','response_loss_simulated','same_operation_id_retried','no_duplicate_asserted'],
 'double-refund':['initial_refund_persisted','second_refund_rejected','stock_not_duplicated','money_not_duplicated']
};
const valid=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{2,80}$/.test(x);
const check=(v,m)=>{if(!v)throw new Error(m)};
export function evaluateSemanticClaims(data){
 check(data&&typeof data==='object'&&typeof data.revision==='string'&&data.revision,'Code revision required');
 check(Array.isArray(data.claims)&&data.claims.length>0&&data.claims.length<=100,'Expected 1-100 claims');
 const out=[];
 for(const c of data.claims){
  check(c&&valid(c.id)&&Array.isArray(c.evidence),'Invalid claim');
  const required=c.required_capabilities??BUILTIN[c.scenario];
  check(Array.isArray(required)&&required.length>0&&required.every(valid),'Required capabilities must be explicit');
  const witnesses=new Set();const sources=[];
  for(const e of c.evidence){
   check(e&&typeof e==='object','Invalid evidence item');
   if(e.revision!==data.revision||e.verdict!=='passed')continue;
   // Only machine evidence explicitly recorded by a named external test harness counts.
   if(e.origin!=='external-test-harness'||!e.reference||!e.checked_at||Number.isNaN(Date.parse(e.checked_at)))continue;
   for(const capability of e.witnessed_capabilities||[])if(valid(capability))witnesses.add(capability);
   sources.push(e.reference);
  }
  const missing=required.filter(k=>!witnesses.has(k));
  out.push({id:c.id,scenario:c.scenario??'custom',status:missing.length?'insufficient-evidence':'evidence-reported',witnessed:required.filter(k=>witnesses.has(k)),missing,external_evidence_references:[...new Set(sources)].slice(0,20),limitations:['External harness attestations are user-supplied and not cryptographically verified','Named passing unit tests alone do not prove required behavior']});
 }
 return {schema:'a2a-semantic-evidence-v1',revision:data.revision,accepted:out.filter(x=>x.status==='evidence-reported').length,total:out.length,claims:out,report_status:out.every(x=>x.status==='evidence-reported')?'evidence-present':'insufficient-evidence'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===3,'Usage: node scripts/semantic-evidence.mjs <claim-report.json>');const file=process.argv[2],st=fs.statSync(file);check(st.isFile()&&st.size<1024*1024,'Report must be <=1 MiB');console.log(JSON.stringify(evaluateSemanticClaims(JSON.parse(fs.readFileSync(file,'utf8'))),null,2))}
 catch(e){console.error('Semantic evidence invalid: '+e.message);process.exitCode=1}
}
