#!/usr/bin/env node
// Allowlist-based local export: raw prompts, paths, tokens, cookies and transcripts never copied.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const variants=new Set(['native','pilah-on-demand','pilah-always-on','native-subagent','pilah-subagent','native-swarm','pilah-swarm','native-teamwork','pilah-teamwork']);
const normalizedVariant=v=>typeof v==='string'?v.replace(/^a2a(?=-)/,'pilah'):v;
const statuses=new Set(['SUCCESS','ERROR','CANCELED','INTERRUPTED','WAITING','INVALID','RUNNING','UNKNOWN']);
const numeric=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e15?v:null;
const check=(v,msg)=>{if(!v)throw new Error(msg)};
export function safeBenchmarkExport(report){
 check(report&&typeof report==='object'&&!Array.isArray(report),'Expected parsed benchmark report');
 check(['pilah-ab-evaluation-v1','a2a-ab-evaluation-v1'].includes(report.schema),'Only known benchmark schemas are supported');
 check(Array.isArray(report.runs)&&report.runs.length<=300,'Invalid or oversized runs');
 const result=[];
 for(let i=0;i<report.runs.length;i++){
  const r=report.runs[i];
  check(r&&variants.has(normalizedVariant(r.variant)),'Unknown benchmark variant');
  const run={run_index:i+1,variant:normalizedVariant(r.variant),status:statuses.has(r.status)?r.status:'UNKNOWN',reported_tokens:numeric(r.usage?.total_tokens),cache_read_tokens:numeric(r.usage?.cache_read_tokens),duration_seconds:numeric(r.duration_seconds),model_turns:numeric(r.num_turns),tool_calls:numeric(r.tool_calls),accepted_scenarios:numeric(r.acceptance_passed),total_scenarios:numeric(r.acceptance_total)};
  result.push(run);
 }
 const clean={schema:'pilah-sanitized-benchmark-v1',source_kind:'pilah-ab-evaluation-v1',runs:result,summary:{runs:result.length,variants:[...new Set(result.map(x=>x.variant))],official_usage_observed_runs:result.filter(x=>x.reported_tokens!==null).length,measured_causal_savings:false},review:{safe_by_default_metadata_only:true,user_review_required:true,auto_uploaded:false,share_authorized:false},warnings:['Source transcript and workspace content intentionally omitted','No free-tier quota or cost claims; official usage records require provider validation','Review this file before sharing; source applications, prompts and raw agent traces must never be attached automatically']};
 return clean;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  check(process.argv.length===3,'Usage: node scripts/export-benchmark.mjs local-aggregated-report.json');
  const stat=fs.statSync(process.argv[2]);check(stat.isFile()&&stat.size<=8*1024*1024,'Expected input <=8 MiB');
  const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  process.stdout.write(JSON.stringify(safeBenchmarkExport(input),null,2)+'\n');
 }catch(e){process.stderr.write('Sanitized export failed: '+e.message+'\n');process.exitCode=1}
}
