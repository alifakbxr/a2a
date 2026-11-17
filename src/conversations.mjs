// Historical Antigravity usage reader. Purely local, read-only, and metadata-only.
// Internal transcript token counters are not provider-verified billing figures.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseOfficialAgyUsage} from './tokens.mjs';

const VALID_ID=/^[a-zA-Z0-9._-]{4,128}$/;
const safeCount=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const blank=()=>({input:0,cache:0,output:0,steps:0,tools:0,a2a:0});
function add(a,b){for(const k of Object.keys(a))a[k]+=b[k]||0}
export function localBrainRoots(){
  return process.env.ANTIGRAVITY_APP_DATA_DIR
    ? [path.join(path.resolve(process.env.ANTIGRAVITY_APP_DATA_DIR),'brain')]
    : ['antigravity','antigravity-cli','antigravity-ide'].map(n=>path.join(os.homedir(),'.gemini',n,'brain'));
}
function isA2ACall(tc){
  const name=String(tc?.name||tc?.toolName||''),tool=String(tc?.args?.ToolName||''),server=String(tc?.args?.ServerName||'');
  if(/^(a2a_|verifykit_)/.test(name))return true;
  if(/mcp/i.test(name)&&(/^(a2a_|verifykit_)/.test(tool)||/^a2a(?:_|$)/.test(server)))return true;
  const cmd=name==='run_command'?String(tc?.args?.CommandLine||''):'';
  return /(?:a2a\s+tokens|a2a\.mjs\s+tokens)/i.test(cmd);
}
function safeLog(file,root){
  try{
    if(!fs.lstatSync(file).isFile())return false; // reject symlinks
    const real=fs.realpathSync(file),rel=path.relative(root,real);
    return rel&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);
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
      output:safeCount(x.output_tokens),steps:1,tools:calls.length,a2a:calls.filter(isA2ACall).length};
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
  includeSubagents=false,conversationId=null,officialRuns=[],maxConversations=3000,maxTotalBytes=1024*1024*1024}={}){
  const active=activeConversationId(dataDirPath),records=new Map();
  const warnings=[];
  let found=0,skipped=0,bytes=0,partial=0;
  for(const dir of [...new Set(brainRoots.map(x=>path.resolve(x)))]){
    let root,entries;
    try{
      if(!fs.lstatSync(dir).isDirectory())continue;
      root=fs.realpathSync(dir);entries=fs.readdirSync(root,{withFileTypes:true});
    }catch{continue}
    for(const entry of entries){
      if(!entry.isDirectory()||!VALID_ID.test(entry.name))continue;
      found++;
      if(conversationId&&entry.name!==conversationId)continue;
      if(found>maxConversations){skipped++;continue}
      const file=path.join(root,entry.name,'.system_generated','logs','transcript.jsonl');
      if(!safeLog(file,root))continue;
      try{
        const stat=fs.statSync(file);
        if(stat.size>128*1024*1024||bytes+stat.size>maxTotalBytes){skipped++;continue}
        bytes+=stat.size;
        const r=parseLocalLog(file,entry.name);
        if(!r.complete)partial++;
        const value={...r,date:stat.mtime.toISOString(),mtime:stat.mtimeMs,active:entry.name===active};
        if(!records.has(entry.name)||records.get(entry.name).mtime<value.mtime)records.set(entry.name,value);
      }catch{skipped++}
    }
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
  if(skipped)warnings.push('Ada file tidak terbaca atau melewati batas pemindaian; laporan belum mencakup semuanya.');
  if(partial)warnings.push('Ada transcript rusak atau terpotong, sehingga angka lokal bisa tidak lengkap.');
  if(!sessions.length)warnings.push('Belum ada percakapan dengan data yang bisa dibaca.');
  const last=sessions[0]||null;
  return {
    title:'Pemakaian token percakapan Antigravity',
    status:skipped||partial?'partial':'available_local_history',
    scans:{found_dirs:found,conversations:sessions.length,skipped,partial,bytes_scanned:bytes,
      excluded_subagents:all.filter(r=>r.subagent).length},
    official_usage:{conversations:officialSessions,total_tokens:officialSessions?official:null,
      input_tokens:officialSessions?officialInput:null,output_tokens:officialSessions?officialOutput:null,
      cache_read_tokens:officialSessions?officialCache:null,
      note:'Hanya dari laporan penggunaan resmi, bukan seluruh percakapan tanpa ekspor resmi.'},
    historical_log_counters:{conversations:internalSessions,input:internal.input,
      cache_read:internal.cache,output:internal.output,
      alternative_total_if_cache_included:internal.input+internal.output,
      alternative_total_if_cache_separate:internal.input+internal.cache+internal.output,
      note:'Counter transcript lama belum punya kontrak resmi; dua angka ini kemungkinan interpretasi, bukan token tagihan.'},
    latest_conversation:last?view(last):null,
    recent_conversations:sessions.slice(0,Math.min(30,Math.max(1,limit))).map(view),
    a2a_calls_seen:sessions.reduce((n,r)=>n+r.totals.a2a,0),
    conversations_without_counts:noCounts,
    self_report:{current_invocation:1,response_bytes:null,estimated_text_tokens:null,
      included_in_model_usage:false,note:'Laporan ini tidak memanggil Gemini. Jika dibaca model, token barunya baru terlihat setelah giliran model selesai.'},
    warnings,
  };
}
export function formatConversationReport(r){
  const num=x=>Number(x||0).toLocaleString('id-ID');
  const o=r.official_usage,h=r.historical_log_counters,l=r.latest_conversation;
  const lines=[
    'A2A • Pemakaian token percakapan',
    '─────────────────────────────────',
    'Riwayat ditemukan: '+num(r.scans.conversations)+' percakapan (termasuk yang belum pernah memakai A2A).',
    '',
    'Penggunaan yang dikonfirmasi Antigravity:',
    o.conversations?'• '+num(o.total_tokens)+' token dari '+num(o.conversations)+' percakapan yang memiliki data resmi.':'• Belum ada angka token resmi untuk riwayat ini.',
    '',
    'Riwayat lama dari log lokal (belum pasti sama dengan tagihan):',
    '• '+num(h.conversations)+' percakapan; input '+num(h.input)+', cache '+num(h.cache_read)+', output '+num(h.output)+'.',
    '• Bila cache sudah masuk input: '+num(h.alternative_total_if_cache_included)+' token.',
    '• Bila cache terpisah dari input: '+num(h.alternative_total_if_cache_separate)+' token.',
    '• Angka di atas adalah dua cara membaca log, bukan total resmi.',
    '',
  ];
  if(l){
    lines.push('Percakapan terakhir: '+l.short_id+(l.active?' (tercatat aktif)':' (terakhir diperbarui)'));
    lines.push('• Model: '+(l.model||'tidak tercatat')+' · langkah model '+num(l.steps)+' · panggilan alat '+num(l.tool_calls));
    if(l.official_tokens!==null)lines.push('• Pemakaian resmi: '+num(l.official_tokens)+' token.');
    else if(l.latest_step)lines.push('• Langkah terakhir: input '+num(l.latest_step.input)+', cache '+num(l.latest_step.cache)+', output '+num(l.latest_step.output)+' (counter internal).');
    lines.push('');
  }
  lines.push('Penggunaan A2A:');
  lines.push('• Pemanggilan A2A yang terlihat di log: '+num(r.a2a_calls_seen)+'.');
  lines.push('• Laporan ini sendiri: sekitar '+num(r.self_report.estimated_text_tokens)+' token teks ('+num(r.self_report.response_bytes)+' byte).');
  lines.push('• Ini hanya ukuran laporan, bukan token yang sudah ditagihkan ke Gemini.');
  if(r.recent_conversations.length){
    lines.push('','Percakapan terbaru:');
    for(const c of r.recent_conversations.slice(0,10)){
      const v=c.official_tokens!==null?num(c.official_tokens)+' token resmi'
        :num(c.local_counters?.input)+' input, '+num(c.local_counters?.cache)+' cache (log)';
      lines.push('• '+c.short_id+' · '+v+(c.a2a_calls===0?' · belum terlihat panggilan A2A':''));
    }
  }
  if(r.warnings.length)lines.push('','Catatan: '+r.warnings.join(' '));
  lines.push('','Untuk angka resmi: a2a tokens --usage-file laporan-agy.json');
  lines.push('Semua dibaca secara lokal; isi percakapan tidak disalin atau dikirim.');
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
