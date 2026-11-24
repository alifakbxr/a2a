#!/usr/bin/env node
// Offline, read-only A/B evaluation. Does not execute Antigravity or export transcripts.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const MAX=8*1024*1024;
const VARIANTS=new Set(['native','pilah-on-demand','pilah-always-on','native-subagent','pilah-subagent','native-swarm','pilah-swarm','native-teamwork','pilah-teamwork']);
const normalizeVariant=value=>typeof value==='string'?value.replace(/^a2a(?=-)/,'pilah'):value; // imported historical captures only
const VERDICTS=new Set(['passed','failed','partial','not-tested','blocked']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nat=x=>Number.isSafeInteger(x)&&x>=0;
const check=(ok,message)=>{if(!ok)throw new Error(message)};
export function parseCapture(source){
  check(typeof source==='string'&&Buffer.byteLength(source)<=MAX,'Capture must be UTF-8 <=8 MiB');
  let result,events=[];
  try{result=JSON.parse(source)}catch{
    events=source.split(/\r?\n/).filter(x=>x.trim()).map(line=>JSON.parse(line));
    const results=events.filter(x=>x?.event==='result'&&object(x.result));
    check(results.length>0,'Incomplete stream: no terminal result');
    result=results.at(-1).result;
  }
  if(result?.event==='result')result=result.result;
  if(result?.event==='init'||result?.event==='step_update')throw new Error('Incomplete stream: no terminal result');
  check(object(result)&&object(result.usage),'Missing final result or official usage');
  const u=result.usage;
  for(const k of ['input_tokens','output_tokens','total_tokens'])check(nat(u[k]),'Invalid official usage.'+k);
  for(const k of ['cache_read_tokens','cache_write_tokens','cache_creation_tokens','cache_miss_tokens','thinking_tokens'])if(u[k]!==undefined)check(nat(u[k]),'Invalid official usage.'+k);
  check(u.total_tokens===u.input_tokens+u.output_tokens,'Inconsistent official usage total');
  check(typeof result.status==='string','Missing terminal status');
  const done=new Set();let calls=0,errors=0;
  for(const event of events){
    const s=event.step_update;
    if(event.event!=='step_update'||s?.step_type!=='tool'||s.state!=='DONE')continue;
    const key=String(s.conversation_id||'')+':'+s.step_index;
    if(done.has(key))continue;done.add(key);calls++;
    if(s.tool_info?.error)errors++;
  }
  return {status:result.status,usage:{input_tokens:u.input_tokens,output_tokens:u.output_tokens,total_tokens:u.total_tokens,cache_read_tokens:u.cache_read_tokens??null,cache_write_tokens:u.cache_write_tokens??null,cache_creation_tokens:u.cache_creation_tokens??null,cache_miss_tokens:u.cache_miss_tokens??null,thinking_tokens:u.thinking_tokens??null},duration_seconds:typeof result.duration_seconds==='number'&&Number.isFinite(result.duration_seconds)&&result.duration_seconds>=0?result.duration_seconds:null,num_turns:nat(result.num_turns)?result.num_turns:null,tool_calls:events.length?calls:null,tool_errors:events.length?errors:null};
}
function median(values){const s=values.filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);if(!s.length)return null;let m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function summary(records,key){const v=records.map(x=>x[key]).filter(x=>typeof x==='number'&&Number.isFinite(x));return {median:median(v),min:v.length?Math.min(...v):null,max:v.length?Math.max(...v):null}}
export function evaluateManifest(manifest,readCapture,{minRepetitions=5}={}){
  check(object(manifest)&&object(manifest.setup),'Manifest requires setup');
  for(const k of ['task_id','snapshot_sha','model','effort','antigravity_version','permissions','evaluation_version'])check(typeof manifest.setup[k]==='string'&&manifest.setup[k].length>0,'Missing setup.'+k);
  check(Array.isArray(manifest.scenarios)&&manifest.scenarios.length>0&&new Set(manifest.scenarios).size===manifest.scenarios.length,'Unique scenario IDs required');
  check(Array.isArray(manifest.runs)&&manifest.runs.length>0&&manifest.runs.length<=300,'Expected 1-300 runs');
  const seen=new Set(),capturesSeen=new Set(),runs=[];
  for(const item of manifest.runs){
    const variant=normalizeVariant(item?.variant);
    check(object(item)&&VARIANTS.has(variant),'Unknown variant');
    check(nat(item.repeat)&&item.repeat>0,'Invalid repeat');
    const key=variant+':'+item.repeat;check(!seen.has(key),'Duplicate variant/repeat');seen.add(key);
    check(typeof item.capture==='string'&&item.capture.length>0,'Missing capture');
    check(object(item.acceptance)&&Object.keys(item.acceptance).length===manifest.scenarios.length&&manifest.scenarios.every(s=>VERDICTS.has(item.acceptance[s])),'Provide every independent acceptance verdict');
    if(item.setup&&Object.entries(item.setup).some(([k,v])=>k in manifest.setup&&manifest.setup[k]!==v))throw Error('Per-run environment differs from fixed setup');
    const raw=readCapture(item.capture);
    const captureSha=crypto.createHash('sha256').update(raw).digest('hex');
    check(!capturesSeen.has(captureSha),'Duplicated capture bytes across supposed independent runs');
    capturesSeen.add(captureSha);
    const p=parseCapture(raw);
    runs.push({variant,repeat:item.repeat,status:p.status,capture_sha256:captureSha,usage:p.usage,duration_seconds:p.duration_seconds,num_turns:p.num_turns,tool_calls:p.tool_calls,tool_errors:p.tool_errors,acceptance_passed:manifest.scenarios.filter(s=>item.acceptance[s]==='passed').length,acceptance_total:manifest.scenarios.length});
  }
  const grouped={};for(const r of runs)(grouped[r.variant]??=[]).push(r);
  const variants={};
  for(const [name,items]of Object.entries(grouped)){
    const stats=items.map(r=>({tokens:r.usage.total_tokens,seconds:r.duration_seconds,turns:r.num_turns,tools:r.tool_calls,accepted:r.acceptance_passed}));
    variants[name]={runs:items.length,successful_runs:items.filter(r=>r.status==='SUCCESS').length,ready_for_comparison:items.length>=minRepetitions,official_tokens:summary(stats,'tokens'),duration_seconds:summary(stats,'seconds'),model_turns:summary(stats,'turns'),tool_calls:summary(stats,'tools'),acceptance_passed:summary(stats,'accepted')};
  }
  const repeated=Object.keys(grouped).length>=2&&Object.values(variants).every(x=>x.ready_for_comparison);
  return {schema:'pilah-ab-evaluation-v1',setup:manifest.setup,scenarios:manifest.scenarios,variants,runs,comparability:{ready:false,capture_repetitions_ready:repeated,independent_acceptance_verified:false,minimum_repetitions:minRepetitions,quota_comparable:false,reason:repeated?'Repeated distinct captures are present, but independent evaluator and runtime equivalence have not been attested; no causal conclusion.':'Insufficient repetitions or variants; no causal A/B savings claim supported.'},caveats:['Only independently verified acceptance verdicts count','Free Tier percentages are not fixed token budgets','Cache-read/thinking must not be added to official total_tokens','No causal benefit or cost savings inferred']};
}
function safeCapture(root,name){
  const file=path.resolve(root,name),rel=path.relative(root,file);
  check(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),'Capture must stay inside manifest directory');
  const real=fs.realpathSync(file),resolved=path.relative(fs.realpathSync(root),real);
  check(resolved&&resolved!=='..'&&!resolved.startsWith('..'+path.sep)&&!path.isAbsolute(resolved),'Capture symlink escapes manifest directory');
  const st=fs.statSync(real);check(st.isFile()&&st.size<=MAX,'Capture must be a regular file <=8 MiB');
  return fs.readFileSync(real,'utf8');
}
export function evaluateFile(manifestFile){
  const full=path.resolve(manifestFile),stat=fs.statSync(full);
  check(stat.isFile()&&stat.size<=1024*1024,'Manifest must be a file <=1 MiB');
  const root=path.dirname(full),manifest=JSON.parse(fs.readFileSync(full,'utf8'));
  return evaluateManifest(manifest,name=>safeCapture(root,name));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{check(process.argv.length===3,'Usage: node benchmarks/ab-evaluate.mjs <manifest.json>');process.stdout.write(JSON.stringify(evaluateFile(process.argv[2]),null,2)+'\n')}
  catch(e){process.stderr.write('Benchmark validation failed: '+e.message+'\n');process.exitCode=1}
}
