#!/usr/bin/env node
// Private Antigravity transcript auditor. Streams JSONL, exports ONLY bounded
// non-content metadata; never publishes prompts, tool arguments or tool output.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {isPilahMcpCall} from '../src/mcp-invocation.mjs';

const MAX_FILES=10000, MAX_DEPTH=9, MAX_FILE_SIZE=512*1024*1024;
const MAX_LINE_CHARS=16*1024*1024, MAX_STEPS=100000;
const OPS=['context','impact','verify','evidence'];
const safeInt=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{4,128}$/.test(x)?x:null;
const anonymize=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,12);

export function classifyInvocation(call){
 if(!object(call))return 'native';
 if(isPilahMcpCall(call))return 'pilah';
 const name=String(call.name??call.toolName??'');
 return name==='call_mcp_tool'||name.startsWith('mcp_')?'other_mcp':'native';
}
export function pilahOperation(call){
 if(!isPilahMcpCall(call))return null;
 const name=String(call.name??call.toolName??'');
 const args=object(call.args)?call.args:object(call.arguments)?call.arguments:{};
 const target=name==='call_mcp_tool'?String(args.ToolName??args.tool_name??''):name;
 for(const op of OPS)if(new RegExp('(?:^|[_/])'+op+'$').test(target))return op;
 return 'unknown';
}
function callId(call){
 return id(call?.tool_call_id??call?.toolCallId??call?.id??call?.call_id);
}
function resultId(event){
 return id(event?.tool_call_id??event?.toolCallId??event?.call_id??
  event?.tool_result?.tool_call_id??event?.tool_result?.toolCallId);
}
export function explicitResultStatus(event){
 if(!object(event))return null;
 const val=event.tool_result??event.result;
 if(object(val)&&val.isError===true)return 'failed';
 if(event.isError===true||event.is_error===true)return 'failed';
 const status=String(event.status??(object(val)?val.status:'')??'').toUpperCase();
 if(['ERROR','FAILED','FAILURE','DENIED','TIMEOUT'].includes(status))return 'failed';
 if(['SUCCESS','SUCCEEDED','COMPLETED','OK'].includes(status))return 'succeeded';
 if(object(val)&&val.isError===false)return 'succeeded';
 if(event.isError===false&&['TOOL_RESULT','GENERIC'].includes(event.type))return 'succeeded';
 return null;
}
function isCapacityHint(event){
 if(!object(event))return false;
 const values=[event.status_code,event.error?.status,event.error?.code,
   event.error?.message,event.message,event.content];
 return values.some(v=>typeof v==='string'&&/(?:\b429\b|\b503\b|capacity|overloaded|rate.limit|quota.exceeded)/i.test(v.slice(0,1500))||
   (typeof v==='number'&&(v===429||v===503)));
}
function collectFiles(root){
 const abs=path.resolve(root);
 const s=fs.lstatSync(abs);
 if(!s.isDirectory()||s.isSymbolicLink())throw new Error('Expected a real directory; symlinks not accepted');
 const files=[],limits={skipped_symlinks:0,skipped_oversize:0,skipped_nonregular:0};
 const todo=[{dir:abs,depth:0}];
 while(todo.length){
  const {dir,depth}=todo.pop();
  if(depth>MAX_DEPTH)continue;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   const target=path.join(dir,item.name);
   if(item.isSymbolicLink()){limits.skipped_symlinks++;continue}
   if(item.isDirectory()){if(depth<MAX_DEPTH)todo.push({dir:target,depth:depth+1});continue}
   if(item.name!=='transcript_full.jsonl')continue;
   if(!item.isFile()){limits.skipped_nonregular++;continue}
   if(fs.statSync(target).size>MAX_FILE_SIZE){limits.skipped_oversize++;continue}
   files.push(target);
   if(files.length>=MAX_FILES)throw new Error('Too many transcript files; audit a smaller directory');
  }
 }
 return {files:files.sort(),limits};
}
const zeroCalls=()=>({native:0,other_mcp:0,pilah:0});
const zeroTokens=()=>({input_tokens:0,output_tokens:0,cache_read_tokens:0});

export async function auditTranscript(file,sessionHash){
 const steps=new Map(),loose=[];
 const results=new Map(),opCounts={context:0,impact:0,verify:0,evidence:0,unknown:0};
 let malformed=0,skipped_large_lines=0,errorRecords=0,capacityHints=0,toolErrorRecords=0,lines=0,partial=false;
 const input=fs.createReadStream(file,{encoding:'utf8'});
 const rl=readline.createInterface({input,crlfDelay:Infinity});
 for await(const line of rl){
  lines++;
  if(line.length>MAX_LINE_CHARS){skipped_large_lines++;partial=true;continue}
  let e;
  try{e=JSON.parse(line)}catch{malformed++;partial=true;continue}
  if(!object(e))continue;
  if(e.type==='ERROR_MESSAGE'||e.type==='GENERIC'&&String(e.status).toUpperCase()==='ERROR'){
   errorRecords++;
   if(isCapacityHint(e))capacityHints++;
   if(e.type==='GENERIC')toolErrorRecords++;
  }
  if(e.type!=='PLANNER_RESPONSE'){
   const rid=resultId(e);
   if(rid){
    const state=explicitResultStatus(e);
    if(state)results.set(rid,state);
   }
   continue;
  }
  const calls=Array.isArray(e.tool_calls)?e.tool_calls.slice(0,2500):[];
  const entry={
   calls:calls.map(c=>({
    type:classifyInvocation(c),
    op:pilahOperation(c),
    call_id:callId(c)
   })),
   tokens:{
    input_tokens:safeInt(e.input_tokens),
    output_tokens:safeInt(e.output_tokens),
    cache_read_tokens:safeInt(e.cache_read_tokens)
   }
  };
  if(Number.isSafeInteger(e.step_index)){
   if(steps.size<MAX_STEPS||steps.has(e.step_index))steps.set(e.step_index,entry);
   else partial=true;
  }else if(loose.length<MAX_STEPS)loose.push(entry);
  else partial=true;
 }
 const counts=zeroCalls(),tokens=zeroTokens();
 const status={succeeded:0,failed:0,unmatched:0};
 for(const entry of [...steps.values(),...loose]){
  for(const k of Object.keys(tokens))tokens[k]+=entry.tokens[k];
  for(const c of entry.calls){
   counts[c.type]++;
   if(c.type!=='pilah')continue;
   opCounts[c.op??'unknown']++;
   const observed=c.call_id?results.get(c.call_id):null;
   if(observed)status[observed]++;else status.unmatched++;
  }
 }
 return {session_hash:sessionHash,planner_responses:steps.size+loose.length,
  tool_calls:counts,pilah_operations:opCounts,pilah_results_with_explicit_link:status,
  tool_result_matching:'call_id_only',mcp_availability:'unverified',
  local_token_counters:tokens,error_records:errorRecords,tool_result_error_records:toolErrorRecords,
  capacity_hint_records:capacityHints,malformed_lines:malformed,
  skipped_large_lines,partial,lines_scanned:lines};
}
export async function auditBrainLogs(root,{nonPilahSample=10}={}){
 const {files,limits}=collectFiles(root);
 const totals=zeroCalls(),tokenTotals=zeroTokens(),pilahOps={context:0,impact:0,verify:0,evidence:0,unknown:0};
 const resultTotals={succeeded:0,failed:0,unmatched:0};
 const pilah=[],noPilah=[];
 let steps=0,errorRecords=0,toolErrors=0,capacityHints=0,malformed=0,partial=0,otherMcpSessions=0;
 for(const file of files){
  // Only a salted-free one-way identifier based on session folder, to match
  // previously generated anonymized local summaries. Never reveal the folder.
  const sessionName=path.basename(path.dirname(path.dirname(path.dirname(file))));
  const item=await auditTranscript(file,anonymize(sessionName));
  steps+=item.planner_responses;
  for(const k of Object.keys(totals))totals[k]+=item.tool_calls[k];
  for(const k of Object.keys(tokenTotals))tokenTotals[k]+=item.local_token_counters[k];
  for(const k of Object.keys(pilahOps))pilahOps[k]+=item.pilah_operations[k];
  for(const k of Object.keys(resultTotals))resultTotals[k]+=item.pilah_results_with_explicit_link[k];
  errorRecords+=item.error_records;toolErrors+=item.tool_result_error_records;
  capacityHints+=item.capacity_hint_records;malformed+=item.malformed_lines;
  if(item.partial)partial++;
  if(item.tool_calls.other_mcp)otherMcpSessions++;
  const small={
   session_hash:item.session_hash,
   planner_responses:item.planner_responses,
   pilah_calls:item.tool_calls.pilah,
   other_mcp_calls:item.tool_calls.other_mcp,
   native_calls:item.tool_calls.native,
   pilah_operations:item.pilah_operations,
   pilah_results_with_explicit_link:item.pilah_results_with_explicit_link,
   tool_result_error_records:item.tool_result_error_records,
   capacity_hint_records:item.capacity_hint_records,
   partial:item.partial
  };
  if(item.tool_calls.pilah)pilah.push(small);else noPilah.push(small);
 }
 pilah.sort((a,b)=>b.pilah_calls-a.pilah_calls||a.session_hash.localeCompare(b.session_hash));
 // These are screening candidates, NOT independently proven complex or eligible.
 noPilah.sort((a,b)=>b.native_calls-a.native_calls||b.planner_responses-a.planner_responses);
 return {
  schema:'pilah-private-mcp-forensic-audit-v1',
  disclaimer:'Metadata-only. Call names prove attempted invocation, not availability, success, task eligibility or token savings.',
  transcripts:files.length,planner_responses:steps,tool_calls:totals,
  sessions_with_pilah_calls:pilah.length,sessions_with_other_mcp_calls:otherMcpSessions,
  pilah_operations:pilahOps,pilah_results_with_explicit_link:resultTotals,
  matched_outcome_semantics:'Explicit status on event with exact matching call ID; not independently verified correctness.',
  tool_result_error_records:toolErrors,error_records:errorRecords,capacity_hint_records:capacityHints,
  malformed_lines:malformed,partial_transcripts:partial,skipped:limits,
  local_token_counters:tokenTotals,official_token_usage:null,
  pilah_sessions:pilah,
  non_pilah_screening_candidates:noPilah.slice(0,Math.max(0,Math.min(50,nonPilahSample))),
  host_mcp_inventory:'not_inferred',eligible_sessions:'unknown',
  note:'Tool result shapes vary by host. Unmatched includes missing IDs and is NOT failure; absence of capacity hints is NOT proof of no provider errors.'
 };
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const argv=process.argv.slice(2);
 if(argv.length<1||argv.length>3||argv[1]&&argv[1]!=='--out'){
  process.stderr.write('Usage: node scripts/audit-mcp-adoption.mjs <extracted-logs-dir> [--out report.json]\n');
  process.exitCode=2;
 }else{
  try{
   const report=await auditBrainLogs(argv[0]);
   const text=JSON.stringify(report,null,2)+'\n';
   if(argv[1]==='--out'&&argv[2]){
    fs.writeFileSync(argv[2],text,{flag:'wx',mode:0o600});
    process.stdout.write('Privacy-safe metadata report written (review before sharing).\n');
   }else process.stdout.write(text);
   if(report.partial_transcripts||report.skipped.skipped_oversize||report.malformed_lines)
    process.exitCode=2;
  }catch{
   // Avoid echoing untrusted paths or file content in errors.
   process.stderr.write('Audit failed (invalid root, unreadable logs, or output path). No raw content exported.\n');
   process.exitCode=1;
  }
 }
}
