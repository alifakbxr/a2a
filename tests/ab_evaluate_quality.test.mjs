import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCapture,evaluateManifest} from '../benchmarks/ab-evaluate.mjs';

const setup={task_id:'quality-regression',snapshot_sha:'frozen-sha',model:'fixed-model',effort:'extra',antigravity_version:'fixed-host',permissions:'identical',evaluation_version:'external-v1'};
const usage=(total)=>({input_tokens:total-50,output_tokens:50,total_tokens:total,cache_read_tokens:900});
const terminal=(total=100,extras={})=>({event:'result',result:{status:'SUCCESS',usage:usage(total),response:'task complete',denied_actions:[],...extras}});
const step=(index,state,tool_info={})=>({event:'step_update',step_update:{conversation_id:'c',step_index:index,step_type:'tool',state,tool_info}});
const stream=(...events)=>events.map(e=>JSON.stringify(e)).join('\n');
const manifest=(runs)=>({setup,scenarios:['quality'],runs});

test('case #02: both permission-denied SUCCESS captures count only as attempts',()=>{
  const runs=[
    {variant:'native',repeat:2,capture:'n',acceptance:{quality:'passed'}},
    {variant:'pilah-on-demand',repeat:2,capture:'p',acceptance:{quality:'passed'}}
  ];
  const captures={
    n:stream(terminal(48219,{response:'',denied_actions:[{tool:'command'}]})),
    p:stream(terminal(48465,{response:'',denied_actions:[{tool:'command'}]}))
  };
  const a=evaluateManifest(manifest(runs),name=>captures[name],{
    minRepetitions:1,readStderr:()=>'',verifyAcceptance:()=>true
  });
  assert.equal(a.quality_counts.attempts,2);
  assert.equal(a.quality_counts.independently_accepted,0);
  assert.equal(a.quality_counts.denied,2);
  assert.equal(a.variants.native.attempt_official_tokens.median,48219);
  assert.equal(a.variants.native.official_tokens.median,null);
  assert.equal(a.variants['pilah-on-demand'].attempt_official_tokens.median,48465);
  assert.equal(a.variants['pilah-on-demand'].official_tokens.median,null);
  assert.equal(a.comparability.accepted_pairs,0);
  assert.equal(a.comparability.ready,false);
});

test('case #03: blank PILAH response plus MCP error cannot look like savings',()=>{
  const runs=[
    {variant:'native',repeat:3,capture:'native-03',acceptance:{quality:'passed'}},
    {variant:'pilah-on-demand',repeat:3,capture:'pilah-03',acceptance:{quality:'passed'}}
  ];
  const captures={
    'native-03':stream(step(1,'DONE'),terminal(118792)),
    'pilah-03':stream(step(2,'ERROR',{error:'permission denied'}),
      terminal(59332,{response:'',denied_actions:[{kind:'mcp'}]}))
  };
  const a=evaluateManifest(manifest(runs),name=>captures[name],{
    minRepetitions:1,readStderr:()=>'',verifyAcceptance:()=>true
  });
  assert.equal(a.variants.native.independently_accepted_samples,1);
  assert.equal(a.variants['pilah-on-demand'].independently_accepted_samples,0);
  assert.equal(a.variants['pilah-on-demand'].official_tokens.median,null);
  assert.equal(a.variants['pilah-on-demand'].attempt_official_tokens.median,59332);
  assert.equal(a.comparability.accepted_pairs,0);
  assert.equal(a.runs[1].tool_error_steps,1);
  assert.ok(a.runs[1].mechanical_reasons.includes('fatal_tool_errors'));
});

test('case #04: terminal quota ERROR does not count as completed work',()=>{
  const p=parseCapture(stream(step(1,'DONE'),terminal(65550,{
    status:'ERROR',response:'',error:'Individual quota reached. Resets in 156h51m47s.'
  })),{stderr:''});
  assert.equal(p.usage.total_tokens,65550);
  assert.equal(p.terminal_error_category,'provider_quota');
  assert.equal(p.mechanically_complete,false);
  assert.ok(!JSON.stringify(p).includes('156h'));
});

test('stderr-only permission rejection blocks otherwise successful captures',()=>{
  const p=parseCapture(stream(terminal()),{stderr:'a tool required the command permission, so it was auto-denied'});
  assert.equal(p.stderr_error_category,'permission_denied');
  assert.equal(p.mechanically_complete,false);
  assert.equal(p.response_present,true);
});

test('uncaptured stderr and absent denied_actions cannot be assumed safe',()=>{
  const missingStderr=parseCapture(stream(terminal()));
  assert.equal(missingStderr.mechanically_complete,false);
  assert.ok(missingStderr.mechanical_reasons.includes('stderr_not_captured'));
  const unknownDenials=parseCapture(stream(terminal(100,{denied_actions:undefined})),{stderr:''});
  assert.equal(unknownDenials.denied_actions_count,null);
  assert.ok(unknownDenials.mechanical_reasons.includes('denied_actions_not_reported'));
});

test('recoverable ERROR state requires explicit later DONE for the same step',()=>{
  const p=parseCapture(stream(step(1,'ERROR',{error:'transient'}),step(1,'DONE'),terminal()),{stderr:''});
  assert.equal(p.mechanically_complete,true);
  assert.equal(p.tool_calls,1);
  assert.equal(p.tool_errors,0);
  assert.equal(p.recovered_tool_errors,1);
  const fatal=parseCapture(stream(step(1,'DONE'),step(1,'ERROR',{error:'unrecovered'}),terminal()),{stderr:''});
  assert.equal(fatal.mechanically_complete,false);
  assert.equal(fatal.tool_errors,1);
  assert.equal(fatal.recovered_tool_errors,0);
});

test('unmatched error_message steps remain unverified, not an automatic PASS',()=>{
  const p=parseCapture(stream(
    {event:'step_update',step_update:{step_type:'error_message',state:'DONE',message:'credential REDACTED'}},
    terminal()
  ),{stderr:''});
  assert.equal(p.mechanically_complete,false);
  assert.equal(p.error_message_steps,1);
  assert.ok(!JSON.stringify(p).includes('credential REDACTED'));
});

test('self-reported acceptance cannot create an accepted-task median',()=>{
  const p=evaluateManifest(manifest([{variant:'native',repeat:1,capture:'n',acceptance:{quality:'passed'}}]),
    ()=>stream(terminal()),{minRepetitions:1,readStderr:()=>''});
  assert.equal(p.quality_counts.mechanically_complete,1);
  assert.equal(p.quality_counts.independently_accepted,0);
  assert.equal(p.variants.native.official_tokens.median,null);
  assert.equal(p.variants.native.mechanically_complete_official_tokens.median,100);
});

test('external verifier can count accepted tasks but never certifies environment parity',()=>{
  const runs=[
    {variant:'native',repeat:1,capture:'n',acceptance:{quality:'passed'}},
    {variant:'pilah-on-demand',repeat:1,capture:'p',acceptance:{quality:'passed'}}
  ];
  const captures={n:stream(terminal(100)),p:stream(terminal(80))};
  const output=evaluateManifest(manifest(runs),name=>captures[name],{
    minRepetitions:1,readStderr:()=>'',verifyAcceptance:()=>true
  });
  assert.equal(output.quality_counts.independently_accepted,2);
  assert.equal(output.variants.native.independently_accepted_task_tokens.median,100);
  assert.equal(output.variants['pilah-on-demand'].official_tokens.median,80);
  assert.equal(output.comparability.accepted_pairs,1);
  assert.equal(output.comparability.independent_acceptance_verified,true);
  assert.equal(output.comparability.environment_equivalence_verified,false);
  assert.equal(output.comparability.ready,false);
});

test('provider cache reads never inflate official total tokens',()=>{
  const result=parseCapture(stream(terminal(100)),{stderr:''});
  assert.equal(result.usage.total_tokens,100);
  assert.equal(result.usage.cache_read_tokens,900);
});

test('malformed stream errors never echo captured private transcript text',()=>{
  assert.throws(()=>parseCapture('{"event":"init"}\nSECRET PRIVATE LOG IS NOT JSON'),/Malformed capture JSONL/);
});
