import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAgentTrace,compareAgentTraces,classifyTool} from '../scripts/compare-agent-traces.mjs';
test('replayed step deduplication and metadata-only output',()=>{
 const data=[{type:'USER_INPUT',step_index:0,created_at:'2026-11-17T09:00:00Z',content:'password=hidden'},
  {type:'PLANNER_RESPONSE',step_index:1,created_at:'2026-11-17T09:00:02Z',thinking:'private secret',tool_calls:[{name:'run_command',args:{CommandLine:'secret'}}]},
  {type:'PLANNER_RESPONSE',step_index:1,created_at:'2026-11-17T09:00:03Z',tool_calls:[{name:'write_to_file'}]},
  {type:'ERROR_MESSAGE',step_index:2,created_at:'2026-11-17T09:00:30Z',content:'HTTP 503 private'}];
 const r=analyzeAgentTrace(data);
 assert.equal(r.model_response_steps,1);assert.equal(r.tool_calls,1);assert.equal(r.tool_categories.write,1);
 assert.equal(r.provider_capacity_hints,1);assert.equal(r.observed_elapsed_seconds,30);
 assert.equal(JSON.stringify(r).includes('hidden'),false);assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('two-run comparison is descriptive',()=>{
 const n=[{type:'PLANNER_RESPONSE',step_index:1,created_at:'2026-11-17T09:00:00Z',tool_calls:[{name:'read_file'}]}];
 const a=[...n,{type:'PLANNER_RESPONSE',step_index:2,created_at:'2026-11-17T09:00:01Z',tool_calls:[{name:'call_mcp_tool'}]}];
 assert.equal(compareAgentTraces(n,a).delta.tool_calls,1);
 assert.equal(classifyTool({name:'call_mcp_tool',args:{workspace:'/secret'}}),'mcp');
});


test('unknown tool name containing secrets is never copied into trace report',()=>{
 const sample=[{type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'secret-token-abc123'}]}];
 const report=analyzeAgentTrace(sample);
 assert.equal(report.most_used_tools[0].name,'other-tool');
 assert.equal(JSON.stringify(report).includes('abc123'),false);
});
