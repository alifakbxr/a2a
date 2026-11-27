#!/usr/bin/env node
// Offline, read-only A/B evaluation. Does not execute Antigravity or export transcripts.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureQuality} from './capture-quality.mjs';
const MAX=8*1024*1024;
const VARIANTS=new Set(['native','pilah-on-demand','pilah-always-on','native-subagent','pilah-subagent','native-swarm','pilah-swarm','native-teamwork','pilah-teamwork']);
const normalizeVariant=value=>typeof value==='string'?value.replace(/^a2a(?=-)/,'pilah'):value; // imported historical captures only
const VERDICTS=new Set(['passed','failed','partial','not-tested','blocked']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const nat=x=>Number.isSafeInteger(x)&&x>=0;
const check=(ok,message)=>{if(!ok)throw new Error(message)};
export function parseCapture(source,{stderr=null}={}){
  check(typeof source==='string'&&Buffer.byteLength(source)<=MAX,'Capture must be UTF-8 <=8 MiB');
  let result,events=[];
  try{result=JSON.parse(source)}catch{
    try{events=source.split(/\r?\n/).filter(x=>x.trim()).map(line=>JSON.parse(line))}
    catch{throw Error('Malformed capture JSONL')}
    const results=events.filter(x=>x?.event==='result'&&object(x.result));
    check(results.length>0,'Incomplete stream: no terminal result');
    result=results.at(-1).result;
  }
  if(result?.event==='result')result=result.result;
  if(result?.event==='init'||result?.event==='step_update')throw new Error('Incomplete stream: no terminal result');
  check(object(result),'Missing final result');
  // Provider-reported total_tokens is the only official token denominator.
  // Missing official usage is unknown; cache/read/thinking counters are separate.
  const u=result.usage,hasOfficialUsage=object(u);
  if(!hasOfficialUsage&&u!==null&&u!==undefined)throw Error('Invalid official usage envelope');
  if(hasOfficialUsage){
    for(const k of ['input_tokens','output_tokens','total_tokens'])check(nat(u[k]),'Invalid official usage.'+k);
    for(const k of ['cache_read_tokens','cache_write_tokens','cache_creation_tokens','cache_miss_tokens','thinking_tokens'])if(u[k]!==undefined)check(nat(u[k]),'Invalid official usage.'+k);
    check(u.total_tokens===u.input_tokens+u.output_tokens,'Inconsistent official usage total');
  }
  check(typeof result.status==='string','Missing terminal status');
  const q=captureQuality(events,result,hasOfficialUsage?u:null,{stderr});
  return {
    status:['SUCCESS','ERROR','INTERRUPTED','CANCELLED'].includes(result.status)?result.status:'OTHER',
    official_usage_status:hasOfficialUsage?'reported':'unavailable',
    usage:{input_tokens:u?.input_tokens??null,output_tokens:u?.output_tokens??null,total_tokens:u?.total_tokens??null,cache_read_tokens:u?.cache_read_tokens??null,cache_write_tokens:u?.cache_write_tokens??null,cache_creation_tokens:u?.cache_creation_tokens??null,cache_miss_tokens:u?.cache_miss_tokens??null,thinking_tokens:u?.thinking_tokens??null},
    duration_seconds:typeof result.duration_seconds==='number'&&Number.isFinite(result.duration_seconds)&&result.duration_seconds>=0?result.duration_seconds:null,
    num_turns:nat(result.num_turns)?result.num_turns:null,
    tool_calls:q.tool_calls,tool_errors:q.tool_errors,
    tool_error_steps:q.tool_error_steps,recovered_tool_errors:q.recovered_tool_errors,
    unfinished_tool_steps:q.unfinished_tool_steps,error_message_steps:q.error_message_steps,
    response_present:q.response_present,denied_actions_count:q.denied_actions_count,
    stderr_captured:q.stderr_captured,stderr_error_category:q.stderr_error_category,
    terminal_error_category:q.terminal_error_category,
    mechanical_status:q.status,mechanical_reasons:q.reasons,
    mechanically_complete:q.status==='mechanically_complete'
  };
}
function median(values){const s=values.filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);if(!s.length)return null;let m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function summary(records,key){const v=records.map(x=>x[key]).filter(x=>typeof x==='number'&&Number.isFinite(x));return {median:median(v),min:v.length?Math.min(...v):null,max:v.length?Math.max(...v):null}}
export function evaluateManifest(manifest,readCapture,{minRepetitions=5,readStderr=null,verifyAcceptance=null}={}){
  check(nat(minRepetitions)&&minRepetitions>0&&minRepetitions<=100,'Invalid minRepetitions');
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
    const stderr=typeof readStderr==='function'?readStderr(item.capture):null;
    const p=parseCapture(raw,{stderr});
    // A manifest's own acceptance verdicts are observations, not independent
    // evidence. An externally owned verifier must explicitly accept each run.
    const independentlyAccepted=p.mechanically_complete &&
      typeof verifyAcceptance==='function' &&
      manifest.scenarios.every(s=>item.acceptance[s]==='passed') &&
      verifyAcceptance({variant,repeat:item.repeat,capture:item.capture,scenarios:[...manifest.scenarios]})===true;
    runs.push({
      variant,repeat:item.repeat,status:p.status,official_usage_status:p.official_usage_status,
      capture_sha256:captureSha,usage:p.usage,duration_seconds:p.duration_seconds,
      num_turns:p.num_turns,tool_calls:p.tool_calls,tool_errors:p.tool_errors,
      tool_error_steps:p.tool_error_steps,recovered_tool_errors:p.recovered_tool_errors,
      error_message_steps:p.error_message_steps,denied_actions_count:p.denied_actions_count,
      response_present:p.response_present,stderr_captured:p.stderr_captured,
      stderr_error_category:p.stderr_error_category,terminal_error_category:p.terminal_error_category,
      mechanical_status:p.mechanical_status,mechanical_reasons:p.mechanical_reasons,
      mechanically_complete:p.mechanically_complete,independently_accepted:independentlyAccepted,
      acceptance_verification:independentlyAccepted?'external_callback':'not_verified',
      acceptance_passed:manifest.scenarios.filter(s=>item.acceptance[s]==='passed').length,
      acceptance_total:manifest.scenarios.length
    });
  }
  const grouped={};for(const r of runs)(grouped[r.variant]??=[]).push(r);
  const variants={};
  for(const [name,items]of Object.entries(grouped)){
    const attempts=items.map(r=>({tokens:r.usage.total_tokens,seconds:r.duration_seconds,turns:r.num_turns,tools:r.tool_calls,accepted:r.acceptance_passed}));
    const mechanicallyComplete=items.filter(r=>r.mechanically_complete);
    const independentlyAccepted=items.filter(r=>r.independently_accepted);
    const mechanicalStats=mechanicallyComplete.map(r=>({tokens:r.usage.total_tokens}));
    const acceptedStats=independentlyAccepted.map(r=>({tokens:r.usage.total_tokens}));
    variants[name]={
      runs:items.length,successful_runs:items.filter(r=>r.status==='SUCCESS').length,
      ready_for_comparison:independentlyAccepted.length>=minRepetitions,
      captured_repetitions_ready:items.length>=minRepetitions,
      official_usage_samples:attempts.filter(x=>x.tokens!==null).length,
      mechanically_complete_samples:mechanicallyComplete.length,
      independently_accepted_samples:independentlyAccepted.length,
      attempt_official_tokens:summary(attempts,'tokens'),
      mechanically_complete_official_tokens:summary(mechanicalStats,'tokens'),
      independently_accepted_task_tokens:summary(acceptedStats,'tokens'),
      // Legacy key now intentionally excludes failed/blocked/unaccepted runs.
      official_tokens:summary(acceptedStats,'tokens'),
      duration_seconds:summary(attempts,'seconds'),model_turns:summary(attempts,'turns'),
      tool_calls:summary(attempts,'tools'),acceptance_passed:summary(attempts,'accepted')
    };
  }
  const repeated=Object.keys(grouped).length>=2&&Object.values(variants).every(x=>x.captured_repetitions_ready);
  const acceptedRepetitions=Object.keys(grouped).length>=2&&Object.values(variants).every(x=>x.ready_for_comparison);
  const officialUsageComplete=runs.every(x=>x.official_usage_status==='reported');
  const variantNames=Object.keys(grouped);
  // Counterbalance is observable from capture order only for a two-variant
  // matched-pair experiment; this does not certify independent execution.
  const repeats=[...new Set(runs.map(r=>r.repeat))].sort((a,b)=>a-b);
  const paired=variantNames.length===2 && repeats.length>=minRepetitions &&
    runs.length===2*repeats.length &&
    repeats.every(rep=>variantNames.every(v=>runs.some(r=>r.repeat===rep&&r.variant===v)));
  const firstCounts=Object.fromEntries(variantNames.map(v=>[v,0]));
  if(paired)for(const repeat of repeats){
    const first=runs.find(r=>r.repeat===repeat);
    firstCounts[first.variant]++;
  }
  const orderCounterbalanced=paired&&Math.abs(firstCounts[variantNames[0]]-firstCounts[variantNames[1]])<=1;
  const acceptedPairs=paired?repeats.filter(rep=>variantNames.every(v=>runs.some(r=>r.repeat===rep&&r.variant===v&&r.independently_accepted))).length:0;
  const qualityCounts={
    attempts:runs.length,
    mechanically_complete:runs.filter(x=>x.mechanically_complete).length,
    independently_accepted:runs.filter(x=>x.independently_accepted).length,
    invalid_or_unverified:runs.filter(x=>!x.mechanically_complete).length,
    no_stderr:runs.filter(x=>!x.stderr_captured).length,
    denied:runs.filter(x=>x.denied_actions_count>0).length,
    quota_blocked:runs.filter(x=>x.terminal_error_category==='provider_quota'||x.stderr_error_category==='provider_quota').length
  };
  return {
    schema:'pilah-ab-evaluation-v1',setup:manifest.setup,scenarios:manifest.scenarios,
    variants,runs,quality_counts:qualityCounts,
    comparability:{
      ready:false,capture_repetitions_ready:repeated,
      accepted_repetitions_ready:acceptedRepetitions,
      paired_repetitions:paired,accepted_pairs:acceptedPairs,
      order_counterbalanced:orderCounterbalanced,
      official_usage_complete:officialUsageComplete,
      independent_acceptance_verified:acceptedPairs>=minRepetitions&&paired,
      minimum_repetitions:minRepetitions,quota_comparable:false,
      environment_equivalence_verified:false,
      reason:qualityCounts.invalid_or_unverified?
        'One or more runs are invalid/unverified (including stderr or permissions); attempt usage is not completed-task efficiency.':
        !officialUsageComplete?
        'One or more captures lack provider-reported usage; total tokens are unknown.':
        !acceptedRepetitions?
        'Independent task acceptance was not verified for enough runs.':
        'External environment and quota equivalence were not independently attested; no causal claim.'
    },
    caveats:[
      'attempt_official_tokens includes failed runs; do not interpret as task-completion efficiency',
      'official_tokens includes only externally accepted, mechanically complete tasks; null if no acceptance',
      'Self-reported manifest acceptance is not an independent quality pass',
      'Free Tier percentages are not fixed token budgets',
      'Cache-read/thinking must not be added to provider usage.total_tokens',
      'No causal benefit or cost savings inferred'
    ]
  };
}
function safeCapture(root,name,maxBytes=MAX){
  const file=path.resolve(root,name),rel=path.relative(root,file);
  check(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),'Capture must stay inside manifest directory');
  const real=fs.realpathSync(file),resolved=path.relative(fs.realpathSync(root),real);
  check(resolved&&resolved!=='..'&&!resolved.startsWith('..'+path.sep)&&!path.isAbsolute(resolved),'Capture symlink escapes manifest directory');
  const st=fs.statSync(real);check(st.isFile()&&st.size<=maxBytes,'Input must be a regular file within size limit');
  return fs.readFileSync(real,'utf8');
}
export function evaluateFile(manifestFile){
  const full=path.resolve(manifestFile),stat=fs.statSync(full);
  check(stat.isFile()&&stat.size<=1024*1024,'Manifest must be a file <=1 MiB');
  const root=path.dirname(full),manifest=JSON.parse(fs.readFileSync(full,'utf8'));
  return evaluateManifest(manifest,name=>safeCapture(root,name),{
    readStderr:name=>{
      const sidecar=name.replace(/\.jsonl$/,'')+'.stderr';
      const full=path.resolve(root,sidecar);
      if(!fs.existsSync(full))return null;
      return safeCapture(root,sidecar,1024*1024);
    }
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{check(process.argv.length===3,'Usage: node benchmarks/ab-evaluate.mjs <manifest.json>');process.stdout.write(JSON.stringify(evaluateFile(process.argv[2]),null,2)+'\n')}
  catch(e){process.stderr.write('Benchmark validation failed: '+e.message+'\n');process.exitCode=1}
}
