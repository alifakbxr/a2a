// Historical Antigravity usage reader. Purely local, read-only, and metadata-only.
// Internal transcript token counters are not provider-verified billing figures.
import fs from 'node:fs';
import {getHomeDir} from './security.mjs';
import path from 'node:path';
import {parseOfficialAgyUsage} from './tokens.mjs';
import {isPilahMcpCall} from './mcp-invocation.mjs';

const VALID_ID=/^[a-zA-Z0-9._-]{4,128}$/;
const safeCount=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const blank=()=>({input:0,cache:0,output:0,steps:0,tools:0,a2a:0});
function add(a,b){for(const k of Object.keys(a))a[k]+=b[k]||0}
export function localBrainRoots(){
  return process.env.ANTIGRAVITY_APP_DATA_DIR
    ? [path.join(path.resolve(process.env.ANTIGRAVITY_APP_DATA_DIR),'brain')]
    : ['antigravity','antigravity-cli','antigravity-ide'].map(n=>path.join(getHomeDir(),'.gemini',n,'brain'));
}
function safeLog(file,root){
  try{
    const base=fs.realpathSync(root),requested=path.resolve(file),rel=path.relative(path.resolve(root),requested);
    if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))return false;
    let cursor=path.resolve(root);
    for(const segment of rel.split(path.sep)){
      cursor=path.join(cursor,segment);
      if(fs.lstatSync(cursor).isSymbolicLink())return false;
    }
    const real=fs.realpathSync(requested);
    return path.relative(base,real)===rel&&fs.statSync(real).isFile();
  }catch{return false}
}
function parseLocalLog(file,id){
  const byStep=new Map(),loose=[];
  let userTurns=0,model=null,last=null,official=null,lines=0,bad=0,tooLong=0,subagent=false,partial=false;
  const userSeen=new Set();
  function consume(line){
    if(++lines>150000){partial=true;return}
    if(line.length>1024*1024){tooLong++;partial=true;return}
    if(line.includes('<subagent_reminder>'))subagent=true;
    let x;try{x=JSON.parse(line)}catch{bad++;partial=true;return}
    if(!x||typeof x!=='object')return;
    if(x.model&&typeof x.model==='string')model=x.model.slice(0,100);
    if(x.event==='result'){
      try{
        const p=parseOfficialAgyUsage(x);
        if(p.conversation_id===id&&(!official||p.usage.total_tokens>=official.usage.total_tokens))official=p;
      }catch{}
    }else if(x?.usage?.total_tokens!==undefined&&x.conversation_id===id){
      try{
        const p=parseOfficialAgyUsage(x);
        if(!official||p.usage.total_tokens>=official.usage.total_tokens)official=p;
      }catch{}
    }
    if(x.type==='USER_INPUT'){
      if(Number.isSafeInteger(x.step_index)){if(!userSeen.has(x.step_index)){userTurns++;userSeen.add(x.step_index)}}
      else userTurns++;
    }
    if(x.type!=='PLANNER_RESPONSE'&&!(x.input_tokens!==undefined&&!x.type))return;
    const calls=Array.isArray(x.tool_calls)?x.tool_calls.slice(0,2000):[];
    const c={input:safeCount(x.input_tokens),cache:safeCount(x.cache_read_tokens),
      output:safeCount(x.output_tokens),steps:1,tools:calls.length,a2a:calls.filter(isPilahMcpCall).length};
    last={input:c.input,cache:c.cache,output:c.output};
    if(Number.isSafeInteger(x.step_index)){
      if(byStep.size<50000||byStep.has(x.step_index))byStep.set(x.step_index,c);
      else partial=true;
    }else if(loose.length<50000)loose.push(c);
    else partial=true;
  }
  // Stream through a bounded buffer, without loading prompts or transcripts into a database.
  const fd=fs.openSync(file,'r'),buf=Buffer.alloc(65536),decoder=new TextDecoder('utf-8');
  try{
    let tail='',size=0;
    while(!partial){
      const n=fs.readSync(fd,buf,0,buf.length,null);
      if(!n)break;
      size+=n;
      if(size>128*1024*1024){partial=true;break}
      const bits=(tail+decoder.decode(buf.subarray(0,n),{stream:true})).split('\n');
      tail=bits.pop()||'';
      for(const bit of bits){consume(bit.replace(/\r$/,''));if(partial)break}
      if(tail.length>1024*1024){tooLong++;partial=true;break}
    }
    tail+=decoder.decode();
    if(!partial&&tail.trim())consume(tail);
  }finally{fs.closeSync(fd)}
  const totals=blank();
  for(const v of byStep.values())add(totals,v);
  for(const v of loose)add(totals,v);
  return {id,model,official,totals,last,userTurns,subagent,lines,bad,tooLong,complete:!partial};
}
function activeConversationId(base){
  if(!base)return null;
  try{
    const file=path.join(base,'active-session.json');
    if(!fs.lstatSync(file).isFile()||fs.statSync(file).size>131072)return null;
    const id=JSON.parse(fs.readFileSync(file,'utf8'))?.latest?.conversationId;
    return typeof id==='string'&&VALID_ID.test(id)?id:null;
  }catch{return null}
}
function view(r){
  return {
    conversation_id:r.id,short_id:r.id.slice(0,8),last_modified:r.date,active:r.active,
    model:r.model,subagent:r.subagent,steps:r.totals.steps,user_turns:r.userTurns,
    a2a_calls:r.totals.a2a,tool_calls:r.totals.tools,complete:r.complete,
    official_tokens:r.official?.usage?.total_tokens??null,
    local_counters:r.official?null:{input:r.totals.input,cache:r.totals.cache,output:r.totals.output},
    latest_step:r.last,
  };
}
export function scanConversationHistory({brainRoots=localBrainRoots(),dataDirPath=null,limit=10,
  includeSubagents=false,conversationId=null,onlyLatest=false,officialRuns=[],maxConversations=3000,maxTotalBytes=1024*1024*1024}={}){
  const active=activeConversationId(dataDirPath),records=new Map();
  const warnings=[];
  let found=0,skipped=0,bytes=0,partial=0;
  const candidates=[];
  for(const dir of [...new Set(brainRoots.map(x=>path.resolve(x)))]) {
    let root,entries;
    try{
      if(!fs.lstatSync(dir).isDirectory())continue;
      root=fs.realpathSync(dir);entries=fs.readdirSync(root,{withFileTypes:true});
    }catch{continue}
    for(const entry of entries){
      if(!entry.isDirectory()||!VALID_ID.test(entry.name))continue;
      if(conversationId&&entry.name!==conversationId)continue;
      found++;
      if(found>maxConversations){skipped++;continue}
      const file=path.join(root,entry.name,'.system_generated','logs','transcript.jsonl');
      if(!safeLog(file,root))continue;
      try{
        const stat=fs.statSync(file);
        candidates.push({id:entry.name,file,stat});
      }catch{skipped++}
    }
  }
  // A request for the current session should not read all historical transcripts.
  // Stat the directories, prefer the active hook session, then the freshest file.
  if(onlyLatest){
    candidates.sort((a,b)=>Number(b.id===active)-Number(a.id===active)||b.stat.mtimeMs-a.stat.mtimeMs);
    candidates.splice(1);
  }
  for(const candidate of candidates){
    const {id,file,stat}=candidate;
    if(stat.size>128*1024*1024||bytes+stat.size>maxTotalBytes){skipped++;continue}
    try{
      bytes+=stat.size;
      const r=parseLocalLog(file,id);
      if(!r.complete)partial++;
      const value={...r,date:stat.mtime.toISOString(),mtime:stat.mtimeMs,active:id===active};
      if(!records.has(id)||records.get(id).mtime<value.mtime)records.set(id,value);
    }catch{skipped++}
  }
  // User-supplied official result supersedes, rather than double-counts, an internal transcript.
  for(const report of officialRuns){
    if(!report?.usage||!VALID_ID.test(report.conversation_id||''))continue;
    const r=records.get(report.conversation_id);
    if(r)r.official=report;
    else records.set(report.conversation_id,{id:report.conversation_id,model:null,official:report,
      totals:blank(),last:null,userTurns:report.num_turns||0,subagent:false,complete:true,
      date:null,mtime:0,active:report.conversation_id===active});
  }
  const all=[...records.values()].sort((a,b)=>Number(b.active)-Number(a.active)||b.mtime-a.mtime);
  const sessions=all.filter(r=>(includeSubagents||!r.subagent)&&(!conversationId||r.id===conversationId));
  const internal=blank();
  let official=0,officialInput=0,officialOutput=0,officialCache=0,officialSessions=0,
    internalSessions=0,noCounts=0;
  for(const r of sessions){
    if(r.official){
      officialSessions++;official+=r.official.usage.total_tokens;
      officialInput+=r.official.usage.input_tokens;officialOutput+=r.official.usage.output_tokens;
      officialCache+=r.official.usage.cache_read_tokens||0;
    }else if(r.totals.steps){internalSessions++;add(internal,r.totals)}
    else noCounts++;
  }
  if(skipped)warnings.push('Some files could not be read or exceeded scan limits. This report may not include your entire history.');
  if(partial)warnings.push('Some conversation logs are damaged or incomplete, so their local counts may be partial.');
  if(!sessions.length)warnings.push('No readable conversations were found in the local Antigravity history.');
  const subagentSessions=sessions.filter(r=>r.subagent);
  const parentSessions=sessions.filter(r=>!r.subagent);
  if(subagentSessions.length)warnings.push('Included worker/subagent logs may overlap parent conversation usage. Do not add worker totals to parent totals or interpret their sum as billing.');
  const usageAccounting={
    source_priority:['official-cli-result','internal-local-log','unknown'],
    official_conversations:officialSessions,
    internal_only_conversations:internalSessions,
    conversations_missing_counts:noCounts,
    parent_conversations:parentSessions.length,
    worker_conversations:subagentSessions.length,
    overlapping_worker_accounting:subagentSessions.length?'possible':'excluded-from-aggregate',
    safe_to_combine_worker_and_parent_totals:subagentSessions.length===0,
    missing_or_partial_records:skipped+partial,
    pilah_calls_detected:sessions.reduce((n,r)=>n+r.totals.a2a,0),
    a2a_calls_detected:sessions.reduce((n,r)=>n+r.totals.a2a,0), // compatibility
    a2a_attributable_model_tokens:null,
    current_in_progress_step_tokens:null,
    weekly_quota_consumption:null,
    measured_token_savings:null,
    note:'Tool-call frequency is observable; model tokens caused by PILAH are not independently attributable. Free Tier quota is not a fixed token budget.'
  };
  const last=sessions[0]||null;
  return {
    title:'Antigravity conversation token usage',
    status:skipped||partial?'partial':'available_local_history',
    scans:{found_dirs:found,conversations:sessions.length,skipped,partial,bytes_scanned:bytes,
      excluded_subagents:all.filter(r=>r.subagent).length},
    official_usage:{conversations:officialSessions,total_tokens:officialSessions?official:null,
      input_tokens:officialSessions?officialInput:null,output_tokens:officialSessions?officialOutput:null,
      cache_read_tokens:officialSessions?officialCache:null,
      note:'Only conversations with an official Antigravity usage report are included in this confirmed total.'},
    historical_log_counters:{conversations:internalSessions,input:internal.input,
      cache_read:internal.cache,output:internal.output,
      alternative_total_if_cache_included:internal.input+internal.output,
      alternative_total_if_cache_separate:internal.input+internal.cache+internal.output,
      note:'These are counters found in older local logs. Cache accounting is undocumented; neither interpretation is a confirmed usage total or bill.'},
    latest_conversation:last?view(last):null,
    recent_conversations:sessions.slice(0,Math.min(30,Math.max(1,limit))).map(view),
    pilah_calls_seen:sessions.reduce((n,r)=>n+r.totals.a2a,0),
    a2a_calls_seen:sessions.reduce((n,r)=>n+r.totals.a2a,0), // compatibility
    conversations_without_counts:noCounts,
    usage_accounting:usageAccounting,
    self_report:{current_invocation:1,response_bytes:null,estimated_text_tokens:null,
      included_in_model_usage:false,note:'Running this report does not call Gemini. If an AI agent reads it, any additional model usage can only be observed after the model turn completes.'},
    warnings,
  };
}
export function formatConversationReport(r){
  const num=x=>Number(x||0).toLocaleString('en-US');
  const official=r.official_usage,logs=r.historical_log_counters,last=r.latest_conversation;
  const lines=[
    'PILAH | Conversation Token Usage',
    '-----------------------------------',
    'Conversations found: '+num(r.scans.conversations)+' (including chats from before PILAH was installed).',
    '',
    'Confirmed by Antigravity:',
    official.conversations
      ? '- '+num(official.total_tokens)+' tokens from '+num(official.conversations)+' conversations with official usage data.'
      : '- No official token totals were available for these conversations.',
    '',
    'From local conversation logs (not confirmed billing usage):',
    '- '+num(logs.conversations)+' conversations | Input: '+num(logs.input)+' | Cache reads: '+num(logs.cache_read)+' | Output: '+num(logs.output),
    '- If cache reads are already included in input: '+num(logs.alternative_total_if_cache_included)+' tokens.',
    '- If cache reads are counted separately: '+num(logs.alternative_total_if_cache_separate)+' tokens.',
    '- Both figures are interpretations of local logs, not confirmed totals.',
    '- Workers included: '+(r.usage_accounting?.worker_conversations??0)+(r.usage_accounting?.overlapping_worker_accounting==='possible'?' (possible overlap; do not sum with parent)':' (excluded by default)'),
    "- PILAH-specific model tokens: unknown; CLI counts do not isolate the plugin's contribution.",
    '',
  ];
  if(last){
    lines.push('Latest conversation: '+last.short_id+(last.active?' (marked active)':' (most recently updated)'));
    lines.push('- Model: '+(last.model||'not recorded')+' | Model steps: '+num(last.steps)+' | Tool calls: '+num(last.tool_calls));
    if(last.official_tokens!==null)lines.push('- Official usage: '+num(last.official_tokens)+' tokens.');
    else if(last.latest_step){
      lines.push('- Latest completed step: Input '+num(last.latest_step.input)+', Cache reads '+num(last.latest_step.cache)+', Output '+num(last.latest_step.output)+' (local log counters).');
    }
    lines.push('');
  }
  lines.push('PILAH activity:');
  lines.push('- A2A tool calls found in these logs: '+num(r.a2a_calls_seen)+'.');
  lines.push('- Size of this report: about '+num(r.self_report.estimated_text_tokens)+' estimated text tokens ('+num(r.self_report.response_bytes)+' bytes).');
  lines.push('- This is the report\'s approximate size, not tokens already billed by Gemini.');
  if(r.recent_conversations.length){
    lines.push('','Recent conversations:');
    for(const c of r.recent_conversations.slice(0,10)){
      const usage=c.official_tokens!==null
        ? num(c.official_tokens)+' confirmed tokens'
        : num(c.local_counters?.input)+' input / '+num(c.local_counters?.cache)+' cache-read (local logs)';
      lines.push('- '+c.short_id+' | '+usage+(c.a2a_calls===0?' | No A2A tool calls found':''));
    }
  }
  if(r.warnings.length)lines.push('','Notes: '+r.warnings.join(' '));
  lines.push('','For confirmed run usage: a2a tokens --usage-file agy-result.json');
  lines.push('Your conversations are read locally. Their contents are not copied or sent anywhere.');
  return lines.join('\n');
}
export function attachReportSize(report,{format='text'}={}){
  for(let i=0;i<6;i++){
    const text=format==='json'?JSON.stringify(report,null,2):formatConversationReport(report);
    const bytes=Buffer.byteLength(text,'utf8'),estimate=Math.max(1,Math.round(text.length/3.8));
    if(report.self_report.response_bytes===bytes&&report.self_report.estimated_text_tokens===estimate)break;
    report.self_report.response_bytes=bytes;
    report.self_report.estimated_text_tokens=estimate;
  }
  return report;
}
