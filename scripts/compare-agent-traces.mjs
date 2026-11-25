#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isPilahMcpCall} from '../src/mcp-invocation.mjs';
// Metadata-only; never returns prompts, thinking, arguments or tool outputs.
const check=(x,m)=>{if(!x)throw new Error(m)};
export function classifyTool(call){
 const n=String(call?.name||'').toLowerCase();
 if(isPilahMcpCall(call)||n.startsWith('a2a_')||n.includes('mcp'))return 'mcp';
 if(/browser|playwright|puppeteer|chrome|devtools/.test(n))return 'browser';
 if(/write|create_file|replace|edit|patch/.test(n))return 'write';
 if(/read|search|grep|list|find/.test(n))return 'read';
 if(/run_command|terminal|shell|exec/.test(n))return 'shell';
 return 'other';
}
export function analyzeAgentTrace(records){
 check(Array.isArray(records)&&records.length<=250000,'Invalid or oversized transcript');
 const byStep=new Map(),counts={read:0,write:0,shell:0,browser:0,mcp:0,other:0},names=new Map();
 let first=null,last=null,errors=0,toolErrors=0,capacityHints=0,users=0,malformed=0,pilahMcpCalls=0;
 for(const e of records){
  if(!e||typeof e!=='object'||Array.isArray(e)){malformed++;continue}
  const timestamp=Date.parse(e.created_at||'');
  if(Number.isFinite(timestamp)){first=Math.min(first??timestamp,timestamp);last=Math.max(last??timestamp,timestamp)}
  if(e.type==='USER_INPUT')users++;
  if(e.type==='ERROR_MESSAGE'){errors++;if(/(?:\b503\b|capacity|overloaded)/i.test(String(e.content||'').slice(0,300)))capacityHints++}
  if(e.type==='GENERIC'&&e.status==='ERROR')toolErrors++;
  if(e.type==='PLANNER_RESPONSE'&&Number.isSafeInteger(e.step_index)){
   const old=byStep.get(e.step_index);
   if(!old||Date.parse(e.created_at||'')>=Date.parse(old.created_at||''))byStep.set(e.step_index,e);
  }
 }
 let toolCalls=0,consecutive=0,previous=null;
 for(const e of [...byStep.values()].sort((a,b)=>a.step_index-b.step_index)){
  for(const c of Array.isArray(e.tool_calls)?e.tool_calls:[]){
   toolCalls++;counts[classifyTool(c)]++;
   if(isPilahMcpCall(c))pilahMcpCalls++;
   const candidate=String(c.name||'unknown');
   const known=new Set(['run_command','call_mcp_tool','read_file','write_to_file','edit_file','replace_file','apply_patch','search_files','grep_search','list_dir','find_files','browser','write_file','a2a_context','a2a_impact','a2a_verify','a2a_evidence']);
   const safe=isPilahMcpCall(c)?'pilah-mcp-call':known.has(candidate)?candidate:'other-tool';
   names.set(safe,(names.get(safe)||0)+1);
   if(safe===previous)consecutive++;previous=safe;
  }
 }
 return {schema:'a2a-observable-trace-v1',model_response_steps:byStep.size,user_turn_records:users,tool_calls:toolCalls,tool_categories:counts,pilah_mcp_calls:pilahMcpCalls,other_mcp_calls:counts.mcp-pilahMcpCalls,
  pilah_mcp_availability:'not_observable_from_call_log',most_used_tools:[...names].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([name,calls])=>({name,calls})),observed_elapsed_seconds:first===null?null:Math.round((last-first)/1000),error_records:errors,tool_result_errors:toolErrors,provider_capacity_hints:capacityHints,consecutive_same_tool_name_count:consecutive,malformed_records:malformed,caveats:['Observed elapsed time is not model compute time','Consecutive same-tool calls do not prove retry loops','Provider capacity hints do not prove quota exhaustion','No PILAH calls observed does not establish MCP server availability or failure','A skill file read is not a PILAH MCP invocation','Counts do not establish reasoning quality or application correctness']};
}
export function compareAgentTraces(a,b){
 const native=analyzeAgentTrace(a),a2a=analyzeAgentTrace(b);
 return {schema:'a2a-observable-comparison-v1',native,a2a,delta:{model_response_steps:a2a.model_response_steps-native.model_response_steps,tool_calls:a2a.tool_calls-native.tool_calls,observed_elapsed_seconds:native.observed_elapsed_seconds===null||a2a.observed_elapsed_seconds===null?null:a2a.observed_elapsed_seconds-native.observed_elapsed_seconds},conclusion:'Descriptive only: independent acceptance and provider usage needed for causal or efficiency claims.'};
}
function read(file){const stat=fs.statSync(file);check(stat.isFile()&&stat.size<=128*1024*1024,'Expected transcript file <=128 MiB');return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l))}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===4,'Usage: node scripts/compare-agent-traces.mjs native.jsonl a2a.jsonl');console.log(JSON.stringify(compareAgentTraces(read(process.argv[2]),read(process.argv[3])),null,2))}
 catch(e){console.error('Trace analysis error: '+e.message);process.exitCode=1}
}
