import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditBrainLogs,auditTranscript,classifyInvocation,pilahOperation,explicitResultStatus} from '../scripts/audit-mcp-adoption.mjs';

const fixture=t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-forensic-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const add=(id,entries)=>{
  const dir=path.join(root,'brain',id,'.system_generated','logs');
  fs.mkdirSync(dir,{recursive:true});
  const filename=path.join(dir,'transcript_full.jsonl');
  fs.writeFileSync(filename,entries.map(e=>typeof e==='string'?e:JSON.stringify(e)).join('\n')+'\n');
  return filename;
 };
 return {root,add};
};

test('invocation categories and explicit outcomes require actual tool identities',()=>{
 assert.equal(classifyInvocation({name:'read_file',args:{Path:'pilah_context'}}),'native');
 assert.equal(classifyInvocation({name:'call_mcp_tool',args:{ServerName:'other',ToolName:'pilah_context'}}),'other_mcp');
 assert.equal(classifyInvocation({name:'mcp_pilah_pilah_pilah_context'}),'pilah');
 assert.equal(classifyInvocation({name:'call_mcp_tool',args:{ServerName:'pilah',ToolName:'pilah_verify'}}),'pilah');
 assert.equal(pilahOperation({name:'call_mcp_tool',args:{ServerName:'pilah',ToolName:'pilah_verify'}}),'verify');
 assert.equal(pilahOperation({name:'mcp_pilah_pilah_pilah_impact'}),'impact');
 assert.equal(explicitResultStatus({status:'ERROR'}),'failed');
 assert.equal(explicitResultStatus({tool_result:{isError:false}}),'succeeded');
 assert.equal(explicitResultStatus({type:'GENERIC',status:'UNKNOWN'}),null);
});

test('real transcript JSONL logs dedupe planner steps, correlate explicit IDs, and preserve privacy',async t=>{
 const {root,add}=fixture(t);
 const sensitive='/home/private/person/super-secret-project';
 const a=add('with-tool-001',[
  {type:'USER_INPUT',content:'APIKEY_TOTALLY_PRIVATE',step_index:0},
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'read_file',args:{Path:sensitive}}]},
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
   {name:'mcp_pilah_pilah_pilah_context',id:'P001',args:{workspace:sensitive}},
   {name:'call_mcp_tool',tool_call_id:'L002',args:{ServerName:'pilah_pilah',ToolName:'pilah_verify',Arguments:{secret:'HIDDEN_KEY'}}},
   {name:'call_mcp_tool',args:{ServerName:'external',ToolName:'pilah_context'}}],
   input_tokens:100,output_tokens:25,cache_read_tokens:900},
  {type:'GENERIC',tool_call_id:'P001',status:'SUCCESS',content:'private tool result'},
  {type:'GENERIC',tool_call_id:'L002',status:'ERROR',content:'sensitive error details'},
  {type:'ERROR_MESSAGE',content:'HTTP 503 from model, secret '+sensitive},
  {type:'PLANNER_RESPONSE',step_index:2,tool_calls:[
   {name:'run_command',args:{CommandLine:'node scripts/pilah.mjs doctor'}}]}
 ]);
 const b=add('no-tool-002',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'read_file'},{name:'call_mcp_tool',args:{ServerName:'foreign',ToolName:'pilah_context'}}]}
 ]);
 const r=await auditBrainLogs(root);
 assert.equal(r.transcripts,2);
 assert.equal(r.planner_responses,3);
 assert.deepEqual(r.tool_calls,{native:2,other_mcp:2,pilah:2});
 // Planner step 1 replay replaced old native read; only step 2 native.
 assert.equal(r.sessions_with_pilah_calls,1);
 assert.equal(r.sessions_with_other_mcp_calls,2);
 assert.deepEqual(r.pilah_operations,{context:1,impact:0,verify:1,evidence:0,unknown:0});
 assert.deepEqual(r.pilah_results_with_explicit_link,{succeeded:1,failed:1,unmatched:0});
 assert.deepEqual(r.pilah_unmatched_reasons,{missing_call_id:0,no_matching_result_id:0,missing_explicit_status:0});
 assert.equal(r.capacity_hint_records,1);
 assert.equal(r.official_token_usage,null);
 assert.deepEqual(r.local_token_counters,{input_tokens:100,output_tokens:25,cache_read_tokens:900});
 assert.equal(r.pilah_sessions.length,1);
 assert.equal(r.non_pilah_screening_candidates.length,1);
 assert.equal(r.pilah_sessions[0].mcp_availability,undefined);
 for(const secret of [sensitive,'APIKEY_TOTALLY_PRIVATE','HIDDEN_KEY','private tool result','with-tool-001','no-tool-002']){
  assert.ok(!JSON.stringify(r).includes(secret),'Sensitive content escaped metadata report');
 }
 assert.equal((await auditTranscript(a,'test-hash')).pilah_results_with_explicit_link.failed,1);
 assert.equal((await auditTranscript(b,'test-hash')).tool_calls.pilah,0);
});

test('missing tool-call IDs are UNMATCHED, not recorded as failed or succeeded',async t=>{
 const {root,add}=fixture(t);
 add('unknown-result-003',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'pilah_context',args:{workspace:'/secret'}}]},
  {type:'GENERIC',status:'SUCCESS',content:'not attached to invocation'},
  {type:'GENERIC',status:'ERROR',content:'also not linked to invocation'}
 ]);
 const r=await auditBrainLogs(root);
 assert.deepEqual(r.pilah_results_with_explicit_link,{succeeded:0,failed:0,unmatched:1});
 assert.deepEqual(r.pilah_unmatched_reasons,{missing_call_id:1,no_matching_result_id:0,missing_explicit_status:0});
 assert.equal(r.tool_result_error_records,1);
 assert.equal(r.capacity_hint_records,0);
});

test('malformed JSONL is disclosed as partial; symlinked logs are not followed',async t=>{
 const {root,add}=fixture(t);
 add('partial-session-004',[
  '{INVALID_JSON',
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'pilah_context'}]}
 ]);
 const link=path.join(root,'brain','symlink');
 try{fs.symlinkSync(path.join(root,'brain','partial-session-004'),link,'dir');}catch{}
 const r=await auditBrainLogs(root);
 assert.equal(r.malformed_lines,1);
 assert.equal(r.partial_transcripts,1);
 assert.equal(r.transcripts,1);
 assert.equal(r.tool_calls.pilah,1);
});

test('CLI only writes privacy-safe JSON; refuses overwriting an existing report',t=>{
 const {root,add}=fixture(t);
 add('cli-test-005',[{type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'pilah_context'}]}]);
 const out=path.join(root,'report.json');
 const exe=spawnSync(process.execPath,['scripts/audit-mcp-adoption.mjs',root,'--out',out],{encoding:'utf8'});
 assert.equal(exe.status,0,exe.stderr);
 assert.ok(fs.existsSync(out));
 const data=JSON.parse(fs.readFileSync(out,'utf8'));
 assert.equal(data.tool_calls.pilah,1);
 assert.equal(data.official_token_usage,null);
 const second=spawnSync(process.execPath,['scripts/audit-mcp-adoption.mjs',root,'--out',out],{encoding:'utf8'});
 assert.equal(second.status,1);
 assert.ok(!second.stderr.includes(out));
});

test('unmatched breakdown isolates missing IDs, missing result records, missing explicit statuses',async t=>{
 const {root,add}=fixture(t);
 add('outcome-inventory-006',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
   {name:'pilah_context'},
   {name:'pilah_context',id:'NO_MATCH'},
   {name:'pilah_impact',id:'NO_STATUS'},
   {name:'pilah_context',id:7}
  ]},
  {type:'GENERIC',tool_call_id:'NO_STATUS',status:'UNKNOWN',content:'private output'},
  {type:'GENERIC',tool_call_id:7,status:'SUCCESS',content:'private output'}
 ]);
 const r=await auditBrainLogs(root);
 assert.deepEqual(r.tool_calls,{native:0,other_mcp:0,pilah:4});
 assert.deepEqual(r.pilah_results_with_explicit_link,{succeeded:1,failed:0,unmatched:3});
 assert.deepEqual(r.pilah_unmatched_reasons,{missing_call_id:1,no_matching_result_id:1,missing_explicit_status:1});
 assert.deepEqual(r.pilah_sessions[0].pilah_unmatched_reasons,r.pilah_unmatched_reasons);
 for(const secret of ['NO_MATCH','NO_STATUS','private output','outcome-inventory-006'])
  assert.ok(!JSON.stringify(r).includes(secret));
});
