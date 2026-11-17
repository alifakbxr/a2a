#!/usr/bin/env node
// Local transcript analysis; outcome attribution is observational, never causal.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const check=(v,m)=>{if(!v)throw new Error(m)};
function plain(v){return String(v||'').replace(/^["']|["']$/g,'').slice(0,120)}
export function isA2AInvocation(call){
 const name=plain(call?.name);
 if(name.startsWith('a2a_')||name.startsWith('verifykit_'))return name;
 if(name!=='call_mcp_tool')return null;
 const tool=plain(call?.args?.ToolName),server=plain(call?.args?.ServerName);
 return (server.includes('a2a')||tool.startsWith('a2a_')||tool.startsWith('verifykit_'))?tool||'unknown-a2a-tool':null;
}
function resultOf(e){
 if(!e)return 'no-result';
 if(e.status==='ERROR'){
  const excerpt=String(e.content||'').slice(0,4000);
  if(/unknown argument|invalid (type|value|integer)|missing [a-z_]+/i.test(excerpt))return 'invalid-arguments';
  if(/not authorized|authorization required|permission denied/i.test(excerpt))return 'authorization-denied';
  return 'tool-error';
 }
 if(e.status==='DONE')return 'succeeded';
 return 'incomplete';
}
export function buildInterventionLedger(records){
 check(Array.isArray(records)&&records.length<=250000,'Invalid or oversized transcript');
 const events=records.filter(e=>e&&typeof e==='object'&&Number.isSafeInteger(e.step_index)).sort((a,b)=>a.step_index-b.step_index);
 const ledger=[],counts={succeeded:0,'invalid-arguments':0,'authorization-denied':0,'tool-error':0,'no-result':0,incomplete:0};
 for(let i=0;i<events.length;i++){
  const e=events[i];if(e.type!=='PLANNER_RESPONSE')continue;
  const calls=Array.isArray(e.tool_calls)?e.tool_calls:[];
  for(const call of calls){
   const name=isA2AInvocation(call);if(!name)continue;
   // A single planner turn can call multiple tools. Without a call ID, matching is ambiguous.
   const generic=events.slice(i+1,i+6).find(x=>x.type==='GENERIC');
   const outcome=calls.length===1?resultOf(generic):'incomplete';
   counts[outcome]++;
   const nextPlanner=events.slice(i+1).find(x=>x.type==='PLANNER_RESPONSE');
   const ts=Date.parse(e.created_at||'');
   ledger.push({step_index:e.step_index,tool:name,outcome,result_step_index:generic?.step_index??null,next_model_step_index:nextPlanner?.step_index??null,timestamp:Number.isFinite(ts)?new Date(ts).toISOString():null,observable_result_bytes:generic?.content?Buffer.byteLength(String(generic.content),'utf8'):null,attributed_model_tokens:null,attributed_token_savings:null,caused_quality_improvement:null});
  }
 }
 return {schema:'a2a-intervention-ledger-v1',total_invocations:ledger.length,counts,interventions:ledger,caveats:['A completed tool invocation does not prove a downstream quality improvement','Result association is heuristic if more than one tool was used in a planner step','No raw prompts, commands, arguments, paths, thinking or result bodies are exported','Model tokens caused by plugin calls are not separately attributable from these records']};
}
function read(file){const st=fs.statSync(file);check(st.isFile()&&st.size<=128*1024*1024,'Expected JSONL transcript <=128 MiB');return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(l=>JSON.parse(l))}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===3,'Usage: node scripts/intervention-ledger.mjs transcript.jsonl');console.log(JSON.stringify(buildInterventionLedger(read(process.argv[2])),null,2))}
 catch(e){console.error('Ledger failed: '+e.message);process.exitCode=1}
}
