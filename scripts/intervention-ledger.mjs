#!/usr/bin/env node
// Local transcript analysis; outcome attribution is observational, never causal.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const check=(v,m)=>{if(!v)throw new Error(m)};
function plain(v){return String(v||'').replace(/^["']|["']$/g,'').slice(0,120)}
const KNOWN=new Set(['a2a_context','a2a_impact','a2a_verify','a2a_evidence','verifykit_context','verifykit_impact','verifykit_verify','verifykit_evidence']);
export function isA2AInvocation(call){
 const name=plain(call?.name);
 if(KNOWN.has(name))return name;
 // Antigravity surfaces MCP calls as both a nested call_mcp_tool event and
 // namespaced direct invocation strings. Normalize only known A2A namespaces.
 const scoped=name.match(/^(?:a2a_a2a|a2a|verifykit_verifykit|verifykit)[/.:]([a-z0-9_]+)$/);
 const encoded=name.match(/^mcp__(?:a2a_a2a|a2a|verifykit_verifykit|verifykit)__([a-z0-9_]+)$/);
 if(scoped||encoded){
   const tool=(scoped||encoded)[1];
   return KNOWN.has(tool)?tool:'unknown-a2a-tool';
 }
 if(name.startsWith('a2a_')||name.startsWith('verifykit_'))return 'unknown-a2a-tool';
 if(name!=='call_mcp_tool')return null;
 const tool=plain(call?.args?.ToolName??call?.args?.tool_name),server=plain(call?.args?.ServerName??call?.args?.server_name);
 if(!(server==='a2a'||server==='a2a_a2a'||server==='verifykit'||server==='verifykit_verifykit'||KNOWN.has(tool)))return null;
 return KNOWN.has(tool)?tool:'unknown-a2a-tool';
}
function resultOf(e){
 if(!e)return 'no-result';
 // A successful JSON-RPC transport can carry a *failed* MCP tool result.
 // Bound parsing and never export the original response or local paths.
 const excerpt=String(e.content||'').slice(0,4000);
 let parsed=null;
 try{parsed=JSON.parse(excerpt)}catch{}
 if(parsed?.content?.[0]?.text&&typeof parsed.content[0].text==='string'){
   try{parsed=JSON.parse(parsed.content[0].text.slice(0,4000))}catch{}
 }
 const code=String(parsed?.code??parsed?.error?.code??'');
 const isError=e.status==='ERROR'||parsed?.isError===true||
   parsed?.status==='error'||parsed?.error!==undefined;
 if(isError){
   if(/invalid[_ -]?(?:tool[_ -]?)?arguments?|invalid_args|^[-]32602$/i.test(code)||
      /unknown argument|invalid (type|value|integer)|missing [a-z_]+/i.test(excerpt))return 'invalid-arguments';
   if(/workspace[_ -]?(?:authorization|required|access|denied)|permission|protected/i.test(code)||
      /not authorized|authorization required|permission denied|protected workspace/i.test(excerpt))return 'authorization-denied';
   return 'tool-error';
 }
 if(e.status==='DONE')return 'succeeded';
 return 'incomplete';
}
export function buildInterventionLedger(records){
 check(Array.isArray(records)&&records.length<=250000,'Invalid or oversized transcript');
 const newestPlanner=new Map();
 for(const e of records)if(e?.type==='PLANNER_RESPONSE'&&Number.isSafeInteger(e.step_index))newestPlanner.set(e.step_index,e);
 const events=records.filter(e=>e&&typeof e==='object'&&Number.isSafeInteger(e.step_index)&&(e.type!=='PLANNER_RESPONSE'||newestPlanner.get(e.step_index)===e)).sort((a,b)=>a.step_index-b.step_index);
 // Precompute the next event of each type once rather than searching the tail for every call.
 const nextPlannerIndex=new Array(events.length),nextGenericIndex=new Array(events.length);
 let nextPlanner=-1,nextGeneric=-1;
 for(let i=events.length-1;i>=0;i--){
  nextPlannerIndex[i]=nextPlanner;nextGenericIndex[i]=nextGeneric;
  if(events[i].type==='PLANNER_RESPONSE')nextPlanner=i;
  if(events[i].type==='GENERIC')nextGeneric=i;
 }
 const ledger=[],counts={succeeded:0,'invalid-arguments':0,'authorization-denied':0,'tool-error':0,'no-result':0,incomplete:0};
 for(let i=0;i<events.length;i++){
  const e=events[i];if(e.type!=='PLANNER_RESPONSE')continue;
  const calls=Array.isArray(e.tool_calls)?e.tool_calls:[];
  for(const call of calls){
   const name=isA2AInvocation(call);if(!name)continue;
   // A single planner turn can call multiple tools. Without a call ID, matching is ambiguous.
   const resultIndex=nextGenericIndex[i],plannerIndex=nextPlannerIndex[i];
   const generic=resultIndex!==-1&&resultIndex<=i+5&&(plannerIndex===-1||resultIndex<plannerIndex)?events[resultIndex]:null;
   const outcome=calls.length===1?resultOf(generic):'incomplete';
   counts[outcome]++;
   const nextPlanner=plannerIndex===-1?null:events[plannerIndex];
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
