import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isPilahMcpCall} from '../src/mcp-invocation.mjs';
import {analyzeAgentTrace,classifyTool} from '../scripts/compare-agent-traces.mjs';
import {ALWAYS_ON_POLICY} from '../scripts/hook.mjs';

const known=[
 {name:'pilah_context'},
 {name:'mcp_pilah_pilah_pilah_context'},
 {name:'mcp_pilah_pilah_pilah_impact'},
 {name:'mcp__pilah_pilah__pilah_verify'},
 {name:'pilah_pilah/pilah_evidence'},
 {name:'call_mcp_tool',args:{ServerName:'pilah_pilah',ToolName:'pilah_impact',Arguments:{workspace:'/not-shared'}}},
 {name:'call_mcp_tool',args:{ServerName:'"pilah_pilah"',ToolName:'"pilah_context"'}},
 {name:'mcp_a2a_a2a_a2a_context'},
 {name:'mcp__verifykit_verifykit__verifykit_evidence'}
];
test('strict classifier recognizes PILAH direct, eager, lazy and legacy tool invocations',()=>{
 for(const c of known){
   assert.equal(isPilahMcpCall(c),true,c.name);
   assert.equal(classifyTool(c),'mcp',c.name);
 }
});
test('ordinary file reads, shell mentions and foreign MCP tools never count as PILAH',()=>{
 for(const c of [
   {name:'read_file',args:{path:'skills/pilah/SKILL.md'}},
   {name:'run_command',args:{CommandLine:'node scripts/pilah.mjs doctor'}},
   {name:'call_mcp_tool',args:{ServerName:'foreign',ToolName:'pilah_context'}},
   {name:'call_mcp_tool',args:{ServerName:'pilah_pilah',ToolName:'not_a_pilah_tool'}},
   {name:'pilah_context',args:{ServerName:'foreign'}},
   {name:'mcp_foreign_pilah_context'},
   {name:'mcp_pilah_pilah_not_a_pilah_tool'},
   {name:'pilah_context_hidden'},
   {name:'call_mcp_tool',args:{ToolName:'pilah_context'}},
   {name:'read_file',args:{Path:'mcp_pilah_pilah_pilah_context'}}
 ])assert.equal(isPilahMcpCall(c),false,c.name);
});
test('trace report distinguishes observed calls from tool availability and never leaks arguments',()=>{
 const trace=[
  {type:'USER_INPUT',step_index:0,content:'private password and /pilah'},
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
   {name:'read_file',args:{path:'skills/pilah/SKILL.md',secret:'abcSECRET'}},
   {name:'run_command',args:{CommandLine:'node scripts/pilah.mjs doctor'}},
   {name:'call_mcp_tool',args:{ServerName:'other',ToolName:'pilah_context'}}
  ]},
  {type:'PLANNER_RESPONSE',step_index:2,tool_calls:[
   {name:'mcp_pilah_pilah_pilah_context',args:{workspace:'/private/secret',query:'private-secret'}},
   {name:'call_mcp_tool',args:{ServerName:'pilah_pilah',ToolName:'pilah_verify',Arguments:{api_key:'SECRET'}}}
  ]}
 ];
 const r=analyzeAgentTrace(trace);
 assert.equal(r.tool_calls,5);
 assert.equal(r.tool_categories.mcp,3);
 assert.equal(r.pilah_mcp_calls,2);
 assert.equal(r.other_mcp_calls,1);
 assert.equal(r.pilah_mcp_availability,'not_observable_from_call_log');
 for(const secret of ['abcSECRET','/private/secret','private-secret','api_key','password'])
  assert.ok(!JSON.stringify(r).includes(secret),secret);
 const noCalls=analyzeAgentTrace(trace.slice(0,2));
 assert.equal(noCalls.pilah_mcp_calls,0);
 assert.equal(noCalls.pilah_mcp_availability,'not_observable_from_call_log');
});
test('skill and opt-in hook document real host MCP namespace without forcing use',()=>{
 const skill=fs.readFileSync(new URL('../skills/pilah/SKILL.md',import.meta.url),'utf8');
 assert.match(skill,/mcp_pilah_pilah_pilah_context/);
 assert.match(skill,/call_mcp_tool/);
 assert.match(skill,/discover the actual server from \/mcp/);
 assert.match(skill,/0 calls/);
 assert.match(ALWAYS_ON_POLICY,/mcp_<server>_pilah_context/);
 assert.match(ALWAYS_ON_POLICY,/No chains without new evidence/);
});
