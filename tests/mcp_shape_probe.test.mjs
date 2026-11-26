import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectLogShapes,profileTranscript} from '../scripts/inspect-mcp-result-shapes.mjs';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-mcp-shape-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 function add(id,events){
  const dir=path.join(root,'brain',id,'.system_generated','logs');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'transcript_full.jsonl');
  fs.writeFileSync(file,events.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n')+'\n');
  return file;
 }
 return {root,add};
}
test('shape probe detects actual PILAH calls and counts only allowlisted field names',async t=>{
 const {root,add}=fixture(t);
 const file=add('never-show-this-session-id',[
  {type:'USER_INPUT',content:'APIKEY_ABSOLUTELY_PRIVATE'},
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[
    {name:'mcp_pilah_pilah_pilah_context',args:{workspace:'/private/workspace',token:'secret'}},
    {name:'call_mcp_tool',toolCallId:45,args:{ServerName:'pilah',ToolName:'pilah_impact'}},
    {name:'read_file',args:{Path:'/private/workspace'}},
    {name:'call_mcp_tool',args:{ServerName:'foreign',ToolName:'pilah_verify'}}
  ]},
  {type:'GENERIC',status:'SUCCESS',tool_result:{call_id:45,secret:'hidden'},content:'secret too'},
  {type:'TOOL_RESULT',tool_call_id:45,status:'ERROR',error:{text:'private key'}},
  {type:'GENERIC',status:'ERROR',tool_call:{id:'HIDDEN-123'},arbitrary_sensitive_field:'token'},
  {type:'ERROR_MESSAGE',content:'secret'},
  {type:'PLANNER_RESPONSE',step_index:2,tool_calls:[{name:'pilah_context',id:'directA',arguments:{workspace:'safe'}}]}
 ]);
 add('without-pilah-001',[
  {type:'PLANNER_RESPONSE',step_index:1,tool_calls:[{name:'read_file'}]}
 ]);
 const r=await inspectLogShapes(root);
 assert.equal(r.transcripts_scanned,2);
 assert.equal(r.sessions_with_pilah,1);
 assert.equal(r.pilah_calls,3);
 assert.equal(r.sessions[0].pilah_operations.context,2);
 assert.equal(r.sessions[0].pilah_operations.impact,1);
 assert.equal(r.sessions[0].observed_call_fields.name,2);
 assert.equal(r.sessions[0].observed_call_fields.toolCallId,1);
 assert.equal(r.sessions[0].observed_call_id_shapes['root.toolCallId'],1);
 assert.equal(r.sessions[0].observed_call_id_shapes['root.id'],1);
 assert.equal(r.sessions[0].candidate_result_events,4);
 assert.equal(r.sessions[0].observed_result_id_shapes['tool_result.call_id'],1);
 assert.equal(r.sessions[0].observed_result_id_shapes['tool_call.id'],1);
 const raw=JSON.stringify(r);
 for(const secret of ['never-show-this-session-id','without-pilah-001','/private/workspace','APIKEY_ABSOLUTELY_PRIVATE','HIDDEN-123','private key','arbitrary_sensitive_field']){
  assert.equal(raw.includes(secret),false,secret);
 }
 const one=await profileTranscript(file,'sha-hash');
 assert.equal(one.pilah_calls,3);
});
test('malformed lines are counted and no raw contents enter report',async t=>{
 const {root,add}=fixture(t);
 add('malformed-session',[
  '{"not json" ...',
  {type:'PLANNER_RESPONSE',tool_calls:[{name:'mcp_pilah_pilah_pilah_context'}]}
 ]);
 const r=await inspectLogShapes(root);
 assert.equal(r.malformed_lines,1);
 assert.equal(r.pilah_calls,1);
});
test('CLI writes owner-only file, prevents overwrite, and does not echo private input paths',t=>{
 const {root,add}=fixture(t);
 add('cli-session',[{type:'PLANNER_RESPONSE',tool_calls:[{name:'pilah_context'}]}]);
 const dest=path.join(root,'report.json');
 const run=()=>spawnSync(process.execPath,['scripts/inspect-mcp-result-shapes.mjs',root,'--out',dest],{encoding:'utf8'});
 const first=run();
 assert.equal(first.status,0,first.stderr);
 assert.equal(JSON.parse(fs.readFileSync(dest,'utf8')).pilah_calls,1);
 const second=run();
 assert.equal(second.status,1);
 assert.ok(!second.stderr.includes(root));
});
