import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {scanConversationHistory,formatConversationReport,attachReportSize} from '../src/conversations.mjs';

function fixture(t){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-history-'));
  const app=path.join(base,'antigravity'),brain=path.join(app,'brain'),data=path.join(base,'a2a-data');
  fs.mkdirSync(brain,{recursive:true});
  fs.mkdirSync(data,{recursive:true});
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  function write(id,records,{subagent=false}={}){
    const dir=path.join(brain,id,'.system_generated','logs');
    fs.mkdirSync(dir,{recursive:true});
    const lines=subagent?[{type:'SYSTEM_MESSAGE',content:'<subagent_reminder>worker</subagent_reminder>'},...records]:records;
    const file=path.join(dir,'transcript.jsonl');
    fs.writeFileSync(file,lines.map(r=>JSON.stringify(r)).join('\n')+'\n');
    return file;
  }
  return {base,app,brain,data,write};
}
const prev='old-conv-without-a2a';
const current='current-conv-with-a2a';

test('historical conversations count before A2A installation, with no assumed model billing',t=>{
  const x=fixture(t);
  x.write(prev,[
    {type:'USER_INPUT',step_index:0},
    {type:'PLANNER_RESPONSE',step_index:1,model:'gemini-3.8-flash-medium',input_tokens:2000,cache_read_tokens:1200,output_tokens:300},
    {type:'PLANNER_RESPONSE',step_index:1,model:'gemini-3.8-flash-medium',input_tokens:2000,cache_read_tokens:1200,output_tokens:300}, // replay/update deduped
    {type:'PLANNER_RESPONSE',step_index:2,input_tokens:1500,cache_read_tokens:1400,output_tokens:100}
  ]);
  x.write(current,[
    {type:'USER_INPUT',step_index:0},
    {type:'PLANNER_RESPONSE',step_index:1,model:'gemini-3.8-flash-medium',input_tokens:500,cache_read_tokens:400,output_tokens:70,
      tool_calls:[{name:'call_mcp_tool',args:{ServerName:'a2a_a2a',ToolName:'a2a_context'}},{name:'read_file'}]}
  ]);
  fs.writeFileSync(path.join(x.data,'active-session.json'),JSON.stringify({
    latest:{conversationId:current,workspacePaths:[x.base]}
  }));
  const report=scanConversationHistory({brainRoots:[x.brain],dataDirPath:x.data});
  assert.equal(report.scans.conversations,2);
  assert.equal(report.official_usage.total_tokens,null);
  assert.equal(report.historical_log_counters.input,4000);
  assert.equal(report.historical_log_counters.cache_read,3000);
  assert.equal(report.historical_log_counters.output,470);
  assert.equal(report.historical_log_counters.alternative_total_if_cache_included,4470);
  assert.equal(report.historical_log_counters.alternative_total_if_cache_separate,7470);
  assert.equal(report.a2a_calls_seen,1);
  assert.equal(report.latest_conversation.conversation_id,current);
  assert.equal(report.latest_conversation.active,true);
  const old=report.recent_conversations.find(r=>r.conversation_id===prev);
  assert.equal(old.a2a_calls,0);
  assert.equal(old.steps,2); // duplicate step_index ignored
  assert.equal(report.self_report.included_in_model_usage,false);
  attachReportSize(report);
  const printed=formatConversationReport(report);
  assert.ok(printed.includes('before A2A was installed'));
  assert.ok(printed.includes('not confirmed totals'));
  assert.ok(report.self_report.response_bytes>0);
  assert.ok(report.self_report.estimated_text_tokens>0);
});

test('subagent is excluded from normal conversation totals, but can be included explicitly',t=>{
  const x=fixture(t);
  x.write(prev,[{type:'PLANNER_RESPONSE',step_index:1,input_tokens:100,cache_read_tokens:80,output_tokens:10}]);
  x.write('worker-subagent',[
    {type:'PLANNER_RESPONSE',step_index:1,input_tokens:999999,cache_read_tokens:0,output_tokens:1}
  ],{subagent:true});
  const a=scanConversationHistory({brainRoots:[x.brain]});
  const b=scanConversationHistory({brainRoots:[x.brain],includeSubagents:true});
  assert.equal(a.scans.conversations,1);
  assert.equal(a.scans.excluded_subagents,1);
  assert.equal(b.scans.conversations,2);
  assert.equal(b.historical_log_counters.input,1000099);
});

test('official cumulative usage supersedes same-conversation local logs; never sum results twice',t=>{
  const x=fixture(t);
  x.write(prev,[{type:'PLANNER_RESPONSE',step_index:1,input_tokens:99999,cache_read_tokens:0,output_tokens:2}]);
  const report=scanConversationHistory({brainRoots:[x.brain],officialRuns:[
    {conversation_id:prev,num_turns:1,usage:{input_tokens:10418,output_tokens:589,cache_read_tokens:8113,total_tokens:11007}},
    {conversation_id:prev,num_turns:2,usage:{input_tokens:20000,output_tokens:1000,cache_read_tokens:17000,total_tokens:21000}}
  ]});
  assert.equal(report.official_usage.total_tokens,21000);
  assert.equal(report.historical_log_counters.conversations,0);
  assert.equal(report.recent_conversations[0].official_tokens,21000);
});

test('size limit is explained rather than showing a falsely complete all-time total',t=>{
  const x=fixture(t);
  const file=x.write(prev,[{type:'PLANNER_RESPONSE',step_index:1,input_tokens:100,cache_read_tokens:10,output_tokens:5}]);
  const s=fs.statSync(file).size;
  const r=scanConversationHistory({brainRoots:[x.brain],maxTotalBytes:s-1});
  assert.equal(r.status,'partial');
  assert.equal(r.scans.skipped,1);
  assert.ok(r.warnings.length);
});

test('CLI defaults to human-readable global history, with JSON available on request',t=>{
  const x=fixture(t);
  x.write(prev,[{type:'PLANNER_RESPONSE',step_index:1,model:'gemini-3.8-flash-medium',input_tokens:100,cache_read_tokens:70,output_tokens:5}]);
  const env={...process.env,ANTIGRAVITY_APP_DATA_DIR:x.app,A2A_DATA_DIR:x.data,HOME:x.base,USERPROFILE:x.base};
  const exe=process.execPath;
  const json=spawnSync(exe,['scripts/a2a.mjs','tokens','--json'],{env,encoding:'utf8'});
  assert.equal(json.status,0,json.stderr);
  const data=JSON.parse(json.stdout);
  assert.equal(data.scans.conversations,1);
  assert.equal(data.official_usage.total_tokens,null);
  const pretty=spawnSync(exe,['scripts/a2a.mjs','tokens'],{env,encoding:'utf8'});
  assert.equal(pretty.status,0,pretty.stderr);
  assert.ok(pretty.stdout.includes('A2A | Conversation Token Usage'));
  assert.ok(pretty.stdout.includes('Conversations found: 1'));
  assert.equal(pretty.stdout.includes('"session_usage"'),false);
});

test('historical accounting handles quoted lazy parameters and excludes foreign explicit server metadata',t=>{
 const x=fixture(t);
 x.write('quoted-mcp-001',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
   {name:'call_mcp_tool',args:{ServerName:'"a2a_a2a"',ToolName:'"a2a_context"'}},
   {name:'a2a_context',args:{ServerName:'unrelated'}},
   {name:'a2a_context',args:{ServerName:'a2a_a2a'}},
   {name:'mcp_a2a_a2a_a2a_context'},
   {name:'call_mcp_tool',args:{ServerName:'"foreign"',ToolName:'"a2a_context"'}}
  ]}
 ]);
 const r=scanConversationHistory({brainRoots:[x.brain]});
 assert.equal(r.latest_conversation.tool_calls,5);
 assert.equal(r.a2a_calls_seen,3);
 assert.equal(r.usage_accounting.a2a_calls_detected,3);
});

test('conversation history detects eager and lazy A2A calls without inflating CLI or unrelated MCP',t=>{
 const x=fixture(t);
 x.write('eager-mcp-001',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
   {name:'mcp_a2a_a2a_a2a_context'},
   {name:'mcp_a2a_a2a_a2a_impact'},
   {name:'mcp__a2a_a2a__a2a_verify'},
   {name:'a2a_a2a/a2a_evidence'},
   {name:'call_mcp_tool',args:{ServerName:'a2a_a2a',ToolName:'a2a_context'}},
   {name:'call_mcp_tool',args:{ServerName:'other',ToolName:'a2a_context'}},
   {name:'read_file',args:{Path:'a2a_context'}},
   {name:'run_command',args:{CommandLine:'node a2a.mjs tokens'}},
   {name:'mcp_other_a2a_context'}
  ]}
 ]);
 const report=scanConversationHistory({brainRoots:[x.brain]});
 assert.equal(report.scans.conversations,1);
 assert.equal(report.latest_conversation.tool_calls,9);
 assert.equal(report.a2a_calls_seen,5);
 assert.equal(report.usage_accounting.a2a_calls_detected,5);
});
