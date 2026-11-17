import test from 'node:test';
import assert from 'node:assert/strict';
import {isA2AInvocation,buildInterventionLedger} from '../scripts/intervention-ledger.mjs';
const p=(i)=>({type:'PLANNER_RESPONSE',step_index:i,created_at:'2026-11-17T09:00:00Z',tool_calls:[{name:'call_mcp_tool',args:{ServerName:'"a2a_a2a"',ToolName:'"a2a_impact"',Arguments:'{"workspace":"/private/data"}'}}]});
test('classifies invalid, denied and successful interventions without leaking text',()=>{
 const events=[p(1),{type:'GENERIC',step_index:2,status:'ERROR',content:'Unknown argument: files /secret'},p(3),{type:'GENERIC',step_index:4,status:'ERROR',content:'Workspace is not authorized /secret'},p(5),{type:'GENERIC',step_index:6,status:'DONE',content:'{"risk":"high","workspace":"/secret"}'}];
 const r=buildInterventionLedger(events);
 assert.equal(r.total_invocations,3);
 assert.equal(r.counts['invalid-arguments'],1);assert.equal(r.counts['authorization-denied'],1);assert.equal(r.counts.succeeded,1);
 assert.equal(JSON.stringify(r).includes('/secret'),false);
 assert.equal(r.interventions[2].attributed_model_tokens,null);
});
test('no result is unknown rather than success',()=>assert.equal(buildInterventionLedger([p(1)]).counts['no-result'],1));
test('generic non-A2A tool does not count',()=>assert.equal(isA2AInvocation({name:'run_command'}),null));


test('replayed planner events count once and unknown tool names never leak',()=>{
 const replay={type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'call_mcp_tool',args:{ServerName:'a2a_a2a',ToolName:'a2a_token-containing-secret'}}]};
 const output=buildInterventionLedger([replay,{...replay},{type:'GENERIC',step_index:2,status:'DONE',content:'success'}]);
 assert.equal(output.total_invocations,1);
 assert.equal(output.interventions[0].tool,'unknown-a2a-tool');
 assert.equal(JSON.stringify(output).includes('secret'),false);
});
