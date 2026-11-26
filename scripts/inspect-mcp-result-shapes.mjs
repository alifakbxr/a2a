#!/usr/bin/env node
// Read-only, privacy-safe structural probe for Antigravity JSONL tool results.
// Exports ONLY allowlisted field-name frequencies, not values or event contents.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {classifyInvocation,pilahOperation} from './audit-mcp-adoption.mjs';

const MAX_FILES=10000, MAX_BYTES=512*1024*1024, MAX_LINE=16*1024*1024, MAX_DEPTH=9;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,12);
const CALL_FIELDS=['name','toolName','args','arguments','id','tool_call_id','toolCallId','call_id','callId',
 'invocationId','invocation_id','tool_use_id','toolUseId','function_call_id','functionCallId',
 'execution_id','executionId','function','metadata','tool','step_index'];
const EVENT_FIELDS=['type','status','step_index','parent_step_index','tool_call_id','toolCallId','call_id','callId',
 'tool_result','toolResult','result','isError','is_error','tool_name','toolName','name',
 'tool','tool_call','function','function_response','metadata','content','error','execution_id','executionId'];
const RESPONSE_TYPES=new Set(['GENERIC','TOOL_RESULT','TOOL_RESPONSE','FUNCTION_RESULT',
 'TOOL_EXECUTION','TOOL_OUTPUT','MCP_TOOL_RESULT','MCP_TOOL_RESPONSE','ERROR_MESSAGE']);
const NESTS=['tool_result','toolResult','result','tool_call','tool','metadata','function_response'];
const IDS=['id','tool_call_id','toolCallId','call_id','callId','invocationId','invocation_id',
 'tool_use_id','toolUseId','execution_id','executionId'];
const empty=()=>Object.create(null);
function increment(map,name){map[name]=(map[name]||0)+1}
function keysPresent(obj,allow,into){
 if(!object(obj))return;
 for(const key of allow)if(Object.prototype.hasOwnProperty.call(obj,key))increment(into,key);
}
function candidateIdShape(obj,counts){
 if(!object(obj))return;
 for(const key of IDS)if(Object.prototype.hasOwnProperty.call(obj,key)){
  const v=obj[key];
  increment(counts,'root.'+key);
  increment(counts,'type.'+(typeof v==='string'?'string':Number.isSafeInteger(v)?'integer':v===null?'null':'other'));
 }
 for(const parent of NESTS)if(object(obj[parent])){
  for(const key of IDS)if(Object.prototype.hasOwnProperty.call(obj[parent],key))
   increment(counts,parent+'.'+key);
 }
}
function resultType(e){
 return RESPONSE_TYPES.has(e.type)?e.type:null;
}
function filesUnder(root){
 const abs=path.resolve(root),stat=fs.lstatSync(abs);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Invalid input directory');
 const todo=[{dir:abs,depth:0}],paths=[],skipped={symlinks:0,oversize:0};
 while(todo.length){
  const {dir,depth}=todo.pop();
  for(const x of fs.readdirSync(dir,{withFileTypes:true})){
   if(x.isSymbolicLink()){skipped.symlinks++;continue}
   const p=path.join(dir,x.name);
   if(x.isDirectory()){if(depth<MAX_DEPTH)todo.push({dir:p,depth:depth+1});continue}
   if(x.name!=='transcript_full.jsonl'||!x.isFile())continue;
   if(fs.statSync(p).size>MAX_BYTES){skipped.oversize++;continue}
   if(paths.length>=MAX_FILES)throw new Error('Too many transcript files');
   paths.push(p);
  }
 }
 return {paths:paths.sort(),skipped};
}
export async function profileTranscript(file,sessionHash){
 const callFields=empty(),callIds=empty(),responseFields=empty(),responseIds=empty();
 const responseTypes=empty(),operations=empty();
 let attempted=0,candidateEvents=0,malformed=0,oversizeLines=0;
 const input=readline.createInterface({input:fs.createReadStream(file,{encoding:'utf8'}),crlfDelay:Infinity});
 for await(const line of input){
  if(line.length>MAX_LINE){oversizeLines++;continue}
  let e;try{e=JSON.parse(line)}catch{malformed++;continue}
  if(!object(e))continue;
  if(e.type==='PLANNER_RESPONSE'){
   const calls=Array.isArray(e.tool_calls)?e.tool_calls.slice(0,2500):[];
   for(const c of calls)if(classifyInvocation(c)==='pilah'){
    attempted++;
    increment(operations,pilahOperation(c)||'unknown');
    keysPresent(c,CALL_FIELDS,callFields);
    candidateIdShape(c,callIds);
   }
  }else if(resultType(e)){
   candidateEvents++;
   increment(responseTypes,resultType(e));
   keysPresent(e,EVENT_FIELDS,responseFields);
   candidateIdShape(e,responseIds);
  }
 }
 return {session_hash:sessionHash,pilah_calls:attempted,pilah_operations:operations,
  observed_call_fields:callFields,observed_call_id_shapes:callIds,
  candidate_result_events:candidateEvents,candidate_event_types:responseTypes,
  observed_result_event_fields:responseFields,observed_result_id_shapes:responseIds,
  malformed_lines:malformed,oversize_lines:oversizeLines};
}
export async function inspectLogShapes(root){
 const {paths,skipped}=filesUnder(root),sessions=[];
 let malformed=0,oversizeLines=0;
 for(const file of paths){
  const session=path.basename(path.dirname(path.dirname(path.dirname(file))));
  const r=await profileTranscript(file,hash(session));
  malformed+=r.malformed_lines;oversizeLines+=r.oversize_lines;
  if(r.pilah_calls)sessions.push(r);
 }
 sessions.sort((a,b)=>b.pilah_calls-a.pilah_calls);
 const total=sessions.reduce((n,x)=>n+x.pilah_calls,0);
 return {schema:'pilah-antigravity-result-shape-v1',
  note:'Structural metadata only; candidate result events are NOT verified PILAH results, and no call has been marked succeeded or failed.',
  transcripts_scanned:paths.length,sessions_with_pilah:sessions.length,pilah_calls:total,
  malformed_lines:malformed,oversize_lines:oversizeLines,skipped,sessions,
  interpretation:'Compare allowlisted call/result field names to identify whether Antigravity stores correlation metadata outside the existing ID parser. No result contents, prompts, tool arguments or identifiers are exported.'
 };
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const args=process.argv.slice(2);
 if(args.length!==3||args[1]!=='--out'){
  process.stderr.write('Usage: node scripts/inspect-mcp-result-shapes.mjs <extracted-logs-dir> --out <new-private-report.json>\n');
  process.exitCode=2;
 }else{
  try{
   const report=await inspectLogShapes(args[0]);
   fs.writeFileSync(args[2],JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
   process.stdout.write('Redacted structural report generated; review privately before sharing.\n');
   if(report.malformed_lines||report.oversize_lines||report.skipped.oversize)process.exitCode=2;
  }catch{
   process.stderr.write('Structural inspection failed; check input and output paths (no raw log data printed).\n');
   process.exitCode=1;
  }
 }
}
