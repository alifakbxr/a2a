#!/usr/bin/env node
// Local-only, explicit checkpoint generation. Does not run or resume any agent.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const MAX=8*1024*1024;
const states=new Set(['passed','failed','blocked','partial','not-tested','running','stale']);
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{3,127}$/.test(s);
const check=(ok,message)=>{if(!ok)throw new Error(message)};
const count=(arr,s)=>arr.filter(x=>x.status===s).length;
export function checkpointFromStream(events,scenarioRecord){
 check(Array.isArray(events)&&events.length<=40000,'Expected bounded events array');
 check(scenarioRecord&&Array.isArray(scenarioRecord.scenarios)&&scenarioRecord.scenarios.length<=150,'Expected bounded scenarios');
 const seen=new Set(),scenarios=[];
 for(const s of scenarioRecord.scenarios){
  check(s&&typeof s.id==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(s.id)&&!seen.has(s.id)&&states.has(s.status),'Invalid or duplicate scenario');
  seen.add(s.id);
  scenarios.push({id:s.id,status:s.status,evidence_trust:'self-reported',...(typeof s.evidence_ref==='string'&&/^(?:ci|test|run|evidence)[/-][a-zA-Z0-9_.-]{1,100}$/.test(s.evidence_ref)&&!s.evidence_ref.includes('..')?{evidence_ref:s.evidence_ref}:{}),...((s.status==='failed'||s.status==='blocked')&&typeof s.reason_code==='string'&&/^[a-z][a-z0-9_-]{1,59}$/.test(s.reason_code)?{reason_code:s.reason_code}:{})});
 }
 let lastResult=null,active=new Set(),closed=new Set(),lastId=null,completed=0;
 for(const event of events){
  if(event?.event==='init'&&validId(event.conversation_id))lastId=event.conversation_id;
  if(event?.event==='result'&&event.result&&typeof event.result==='object'){
   lastResult=event.result;
   if(validId(lastResult.conversation_id))lastId=lastResult.conversation_id;
  }
  const s=event?.step_update;
  if(event?.event!=='step_update'||!s||!Number.isSafeInteger(s.step_index))continue;
  if(s.state==='ACTIVE')active.add(s.step_index);
  if(s.state==='DONE'){active.delete(s.step_index);if(!closed.has(s.step_index)){closed.add(s.step_index);completed++}}
 }
 const status=['SUCCESS','ERROR','CANCELED','INTERRUPTED','INVALID','WAITING','RUNNING'].includes(lastResult?.status)?lastResult.status:(active.size?'INTERRUPTED_OR_INCOMPLETE':'UNKNOWN');
 const usage=lastResult?.usage;
 const official=usage&&Number.isSafeInteger(usage.input_tokens)&&Number.isSafeInteger(usage.output_tokens)&&Number.isSafeInteger(usage.total_tokens)&&usage.total_tokens===usage.input_tokens+usage.output_tokens?usage.total_tokens:null;
 const classified=status==='SUCCESS'?'completed':status==='ERROR'?'provider-or-agent-error':status==='INTERRUPTED'?'interrupted':status==='CANCELED'?'cancelled':status==='WAITING'?'awaiting-input':status==='UNKNOWN'?'no-terminal-state':'other';
 const sourceVersion=typeof scenarioRecord.revision==='string'&&/^[a-zA-Z0-9._:-]{4,160}$/.test(scenarioRecord.revision)?scenarioRecord.revision:null;
 const servedVersion=typeof scenarioRecord.served_build_revision==='string'&&/^[a-zA-Z0-9._:-]{4,160}$/.test(scenarioRecord.served_build_revision)?scenarioRecord.served_build_revision:null;
 const mismatch=sourceVersion&&servedVersion&&sourceVersion!==servedVersion;
 return {schema:'a2a-checkpoint-v1',conversation_id:lastId,run_state:status,category:classified,reported_revision:sourceVersion,reported_served_build_revision:servedVersion,reported_build_mismatch:!!mismatch,revision_authenticated:false,completed_steps:completed,unfinished_step_count:active.size,official_total_tokens:official,scenarios,summary:{reported_passed:count(scenarios,'passed'),verified_passed:0,failed:count(scenarios,'failed'),partial:count(scenarios,'partial'),blocked:count(scenarios,'blocked'),not_tested:count(scenarios,'not-tested'),running:count(scenarios,'running')},resume_suggestion:validId(lastId)?{manual_command:'agy --conversation '+lastId,requires_user_approval:true,auto_executed:false}:{manual_command:'Use Antigravity /resume to select the session after verifying it still exists.',requires_user_approval:true,auto_executed:false},limitations:['Scenario evidence is supplied externally and is NOT independently verified; reported passed is not accepted for release','No raw prompts, stdout, tokens, or browser session secrets are stored','A lack of terminal result cannot prove a particular quota or provider failure']};
}
export function checkpointFromFiles(streamFile,scenarioFile){
 const read=(p,limit)=>{const s=fs.statSync(p);check(s.isFile()&&s.size<=limit,'File exceeds allowed size');return fs.readFileSync(p,'utf8')};
 const stream=read(streamFile,MAX),scenario=JSON.parse(read(scenarioFile,1024*1024));
 const events=stream.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
 return checkpointFromStream(events,scenario);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{check(process.argv.length===4,'Usage: node scripts/checkpoint.mjs stream.jsonl scenarios.json');process.stdout.write(JSON.stringify(checkpointFromFiles(process.argv[2],process.argv[3]),null,2)+'\n')}
 catch(e){process.stderr.write('Checkpoint unavailable: '+e.message+'\n');process.exitCode=1}
}
