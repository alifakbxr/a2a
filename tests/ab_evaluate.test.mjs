import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateManifest,parseCapture} from '../benchmarks/ab-evaluate.mjs';
const final={status:'SUCCESS',duration_seconds:12,num_turns:2,usage:{input_tokens:70,output_tokens:30,total_tokens:100,cache_read_tokens:400,thinking_tokens:25}};
const stream=[{event:'init',conversation_id:'c'},{event:'step_update',step_update:{conversation_id:'c',step_index:2,step_type:'tool',state:'ACTIVE'}},{event:'step_update',step_update:{conversation_id:'c',step_index:2,step_type:'tool',state:'DONE'}},{event:'result',result:{...final,usage:{input_tokens:25,output_tokens:15,total_tokens:40}}},{event:'result',result:final}].map(x=>JSON.stringify(x)).join('\n');
const setup={task_id:'stockroom-1',snapshot_sha:'deadbeef',model:'gemini-3.8-flash',effort:'high',antigravity_version:'1.5.7',permissions:'request-review',evaluation_version:'stockroom-e2e-v1'};
test('uses final cumulative result without adding step or cached usage',()=>{const r=parseCapture(stream);assert.equal(r.usage.total_tokens,100);assert.equal(r.usage.cache_read_tokens,400);assert.equal(r.tool_calls,1);assert.equal(r.num_turns,2)});
test('rejects inconsistent official usage',()=>assert.throws(()=>parseCapture(JSON.stringify({...final,usage:{input_tokens:70,output_tokens:30,total_tokens:500}})),/Inconsistent/));
test('requires independent acceptance evidence and matched repetitions',()=>{
 const m={setup,scenarios:['stock','offline'],runs:[{variant:'native',repeat:1,capture:'n.json',acceptance:{stock:'passed',offline:'not-tested'}},{variant:'a2a-on-demand',repeat:1,capture:'a.json',acceptance:{stock:'partial',offline:'failed'}}]};
 const r=evaluateManifest(m,()=>JSON.stringify(final));
 assert.equal(r.comparability.ready,false);assert.equal(r.variants.native.acceptance_passed.median,1);
 assert.equal(r.variants['a2a-on-demand'].acceptance_passed.median,0);
 assert.equal(r.variants.native.official_tokens.median,100);
 assert.equal(evaluateManifest(m,()=>JSON.stringify(final),{minRepetitions:1}).comparability.ready,true);
 assert.throws(()=>evaluateManifest({...m,runs:[m.runs[0],m.runs[0]]},()=>JSON.stringify(final)),/Duplicate/);
 assert.throws(()=>evaluateManifest({...m,runs:[{...m.runs[0],acceptance:{stock:'passed'}}]},()=>JSON.stringify(final)),/every independent/);
});
test('incomplete stream cannot be scored as success',()=>assert.throws(()=>parseCapture('{"event":"init"}\n'),/no terminal result/));
