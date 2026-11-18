#!/usr/bin/env node
// Allowlist-based local export: raw prompts, paths, tokens, cookies and transcripts never copied.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const variants=new Set(['native','a2a-on-demand','a2a-always-on','native-subagent','a2a-subagent','native-swarm','a2a-swarm','native-teamwork','a2a-teamwork']);
const statuses=new Set(['SUCCESS','ERROR','CANCELED','INTERRUPTED','WAITING','INVALID','RUNNING','UNKNOWN']);
const numeric=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e15?v:null;
const check=(v,msg)=>{if(!v)throw new Error(msg)};
export function safeBenchmarkExport(report){
 check(report&&typeof report==='object'&&!Array.isArray(report),'Expected parsed benchmark report');
 check(report.schema==='a2a-ab-evaluation-v1','Only the known benchmark schema is supported');
 check(Array.isArray(report.runs)&&report.runs.length<=300,'Invalid or oversized runs');
 const result=[];
 for(let i=0;i<report.runs.length;i++){
  const r=report.runs[i];
  check(r&&variants.has(r.variant),'Unknown benchmark variant');
  const run={run_index:i+1,variant:r.variant,status:statuses.has(r.status)?r.status:'UNKNOWN',reported_tokens:numeric(r.usage?.total_tokens),cache_read_tokens:numeric(r.usage?.cache_read_tokens),duration_seconds:numeric(r.duration_seconds),model_turns:numeric(r.num_turns),tool_calls:numeric(r.tool_calls),accepted_scenarios:numeric(r.acceptance_passed),total_scenarios:numeric(r.acceptance_total)};
  result.push(run);
 }
 const clean={schema:'a2a-sanitized-benchmark-v1',source_kind:'a2a-ab-evaluation-v1',runs:result,summary:{runs:result.length,variants:[...new Set(result.map(x=>x.variant))],measured_causal_savings:false},review:{safe_by_default_metadata_only:true,user_review_required:true,auto_uploaded:false,share_authorized:false},warnings:['Source transcript and workspace content intentionally omitted','No free-tier quota or cost claims; official usage records require provider validation','Review this file before sharing; source applications, prompts and raw agent traces must never be attached automatically']};
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
