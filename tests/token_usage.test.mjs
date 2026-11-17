import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyzeWorkspaceTokens,parseOfficialAgyUsage,readOfficialAgyUsageFile,getSessionTokenUsage} from '../src/tokens.mjs';

const CLI_USAGE={
  conversation_id:'c3b66b04-872b-4fbe-a3a4-058a026ef20a',
  status:'SUCCESS',
  duration_seconds:6.88,
  num_turns:1,
  usage:{input_tokens:10418,output_tokens:589,thinking_tokens:551,cache_read_tokens:8113,total_tokens:11007}
};

test('official agy usage is reported without adding cached or thinking tokens again',()=>{
  const r=parseOfficialAgyUsage(CLI_USAGE);
  assert.equal(r.source,'antigravity-cli-json');
  assert.equal(r.status,'reported');
  assert.equal(r.usage.total_tokens,11007);
  assert.equal(r.usage.cache_read_tokens,8113);
  assert.equal(r.usage.thinking_tokens,551);
  assert.equal(r.net_token_savings,null);
  assert.equal(r.cost_usd,null);
});

test('official CLI usage rejects missing, inconsistent or fabricated totals',()=>{
  assert.throws(()=>parseOfficialAgyUsage({usage:{input_tokens:1000,output_tokens:200,total_tokens:1500}}),/Inconsistent CLI usage total/);
  assert.throws(()=>parseOfficialAgyUsage({usage:{input_tokens:-1,output_tokens:200,total_tokens:199}}),/Invalid usage/);
  assert.throws(()=>parseOfficialAgyUsage({status:'SUCCESS'}),/Missing official/);
  assert.throws(()=>parseOfficialAgyUsage({usage:{input_tokens:'1000',output_tokens:200,total_tokens:1200}}),/Invalid usage/);
});

test('official usage imports both JSON and stream-json final result (not step totals)',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-token-usage-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const jsonFile=path.join(dir,'agy.json');
  fs.writeFileSync(jsonFile,JSON.stringify(CLI_USAGE));
  assert.equal(readOfficialAgyUsageFile(jsonFile).usage.total_tokens,11007);

  const streamFile=path.join(dir,'agy.jsonl');
  const steps=[
    {event:'init',conversation_id:CLI_USAGE.conversation_id},
    {event:'step_update',step_update:{usage:{input_tokens:3000,output_tokens:100,total_tokens:3100}}},
    {event:'result',result:CLI_USAGE},
  ];
  fs.writeFileSync(streamFile,steps.map(x=>JSON.stringify(x)).join('\n')+'\n');
  assert.equal(readOfficialAgyUsageFile(streamFile).usage.total_tokens,11007);
});

test('legacy telemetry cannot make a source inventory claim token savings',()=>{
  const index={files:[{path:'src/a.js',language:'javascript',bytes:3800},{path:'src/b.js',language:'javascript',bytes:7600}]};
  const oldTelemetry={calls:100,raw_scope_tokens:10000000,response_tokens:200,tokens_saved:9999800};
  const output=analyzeWorkspaceTokens(index,[],oldTelemetry);
  assert.equal(output.measurement_status,'source_inventory_only');
  assert.equal(output.total_source_bytes,11400);
  assert.equal(output.tool_payload_estimates.calls,100);
  assert.equal(output.net_token_savings,null);
  assert.equal(output.net_token_savings_pct,null);
  assert.equal(output.efficiency.savings_ratio,null);
  assert.equal(output.efficiency.estimated_tokens_saved,null);
  assert.equal(output.tool_payload_estimates.data_quality,'estimated_character_count');
  assert.equal(JSON.stringify(output).includes('"tokens_saved":9999800'),false);
});

test('internal transcript data is diagnostic only and cannot be labeled actual Gemini usage',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-internal-usage-'));
  try{
    const brain=path.join(root,'brain');
    const target=path.join(brain,'conv-token-diagnostics','.system_generated','logs');
    fs.mkdirSync(target,{recursive:true});
    fs.writeFileSync(path.join(target,'transcript.jsonl'),JSON.stringify({
      type:'PLANNER_RESPONSE',input_tokens:100000000,output_tokens:3000,cache_read_tokens:900000000,
      tool_calls:[{name:'call_mcp_tool',args:{ServerName:'a2a_a2a',ToolName:'a2a_impact'}}]
    })+'\n');
    const old=process.env.ANTIGRAVITY_APP_DATA_DIR;
    try{
      process.env.ANTIGRAVITY_APP_DATA_DIR=root;
      const output=getSessionTokenUsage('conv-token-diagnostics');
      assert.equal(output.status,'diagnostic_only');
      assert.equal(output.usage,null);
      assert.equal(output.total_tokens_consumed,null);
      assert.equal(output.cost_estimate,null);
      assert.equal(output.tool_calls.a2a_calls,1);
      assert.equal(JSON.stringify(output).includes('900000000'),false);
    }finally{
      if(old===undefined)delete process.env.ANTIGRAVITY_APP_DATA_DIR;
      else process.env.ANTIGRAVITY_APP_DATA_DIR=old;
    }
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
