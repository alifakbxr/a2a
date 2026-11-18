#!/usr/bin/env node
// Explicit independent review annotations; no hidden thinking inspection or weighted ranking.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const areas=new Set(['planning','diagnosis','tool-selection','verification','error-recovery','handoff']);
const grades=new Set(['supported','incomplete','contradicted','not-observable']);
const validRef=x=>typeof x==='string'&&/^(?:ci|trace|review|test)[-:][a-zA-Z0-9_.-]{1,80}$/.test(x)&&!x.includes('..');
const check=(ok,m)=>{if(!ok)throw new Error(m)};
export function assessReviewedDecisions(transcript,review){
 check(Array.isArray(transcript)&&transcript.length<=250000,'Invalid transcript');
 check(review&&review.reviewer?.role==='independent'&&Array.isArray(review.annotations)&&review.annotations.length<=200,'Independent reviewer and <=200 annotations required');
 const steps=new Set(transcript.filter(x=>x?.type==='PLANNER_RESPONSE'&&Number.isSafeInteger(x.step_index)).map(x=>x.step_index));
 const counts=Object.fromEntries([...areas].map(k=>[k,{supported:0,incomplete:0,contradicted:0,'not-observable':0}]));
 const seen=new Set(),items=[];
 for(const a of review.annotations){
  check(a&&Number.isSafeInteger(a.step_index)&&areas.has(a.area)&&grades.has(a.grade)&&validRef(a.evidence_ref),'Invalid or unsafe review annotation');
  const key=a.step_index+':'+a.area;check(!seen.has(key),'Duplicate reviewed step and area');seen.add(key);
  const tracePresent=steps.has(a.step_index);
  const status=tracePresent?a.grade:'not-observable';
  counts[a.area][status]++;
  items.push({step_index:a.step_index,area:a.area,assessment:status,evidence_ref:a.evidence_ref,...(!tracePresent?{reason:'Referenced planner step not present in input transcript'}:{})});
 }
 return {schema:'a2a-independent-decision-review-v1',annotated_decisions:items.length,areas:counts,annotations:items,limits:['Independent reviewer role is declared by the file; identity and evidence are not cryptographically attested','Only observable decisions are reviewable; hidden chain-of-thought is not accessed','No scalar reasoning score or causal claims are generated','Reviews require examining original local evidence privately']};
}
function readJson(p,limit){const stat=fs.statSync(p);check(stat.isFile()&&stat.size<=limit,'Input exceeds size limit');return fs.readFileSync(p,'utf8')}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  check(process.argv.length===4,'Usage: node scripts/review-agent-decisions.mjs transcript.jsonl review.json');
  const log=readJson(process.argv[2],128*1024*1024).split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const review=JSON.parse(readJson(process.argv[3],1024*1024));
  console.log(JSON.stringify(assessReviewedDecisions(log,review),null,2));
 }catch(e){console.error('Review validation failed: '+e.message);process.exitCode=1}
}
