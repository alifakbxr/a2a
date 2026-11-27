import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectCapture, auditDirectory } from '../scripts/audit-headless-captures.mjs';
const result = (overrides={}) => ({event:'result',result:{status:'SUCCESS',usage:{input_tokens:70,output_tokens:30,total_tokens:100,cache_read_tokens:400},response:'A valid answer',duration_seconds:2,...overrides}});
const jsonl = (...events) => events.map(e=>JSON.stringify(e)).join('\n');
test('SUCCESS with blank response and denied MCP is invalid',()=>{
 const a=inspectCapture(jsonl({event:'step_update',step_update:{conversation_id:'a',step_index:3,step_type:'tool',state:'ERROR',tool_name:'call_mcp_tool'}},result({response:'',denied_actions:[{kind:'mcp'}]})),'jetski: a tool required the "mcp" permission, so was auto-denied');
 assert.equal(a.audit_status,'INVALID'); assert.ok(a.reasons.includes('permission_denied'));assert.ok(a.reasons.includes('error_steps'));assert.ok(a.reasons.includes('empty_response'));assert.equal(a.usage.total_tokens,100);
});
test('quota terminal error classified and not comparable',()=>{
 const a=inspectCapture(jsonl(result({status:'ERROR',response:'',error:'Individual quota reached. Resets in 156h51m47s.'})));
 assert.ok(a.reasons.includes('provider_quota'));assert.equal(a.audit_status,'INVALID'); assert.ok(!JSON.stringify(a).includes('156h'));
});
test('valid MCP invocation dedupes active and done tool events',()=>{
 const toolInfo={parameters:{ServerName:'pilah_pilah',ToolName:'pilah_impact'}};
 const a=inspectCapture(jsonl({event:'step_update',step_update:{conversation_id:'c',step_index:1,step_type:'tool',state:'ACTIVE',tool_name:'call_mcp_tool',tool_info:toolInfo}},{event:'step_update',step_update:{conversation_id:'c',step_index:1,step_type:'tool',state:'DONE',tool_name:'call_mcp_tool',tool_info:toolInfo}},result()));
 assert.equal(a.audit_status,'MECHANICALLY_COMPLETE');assert.equal(a.completed_tool_calls,1);assert.equal(a.confirmed_pilah_mcp_calls,1);assert.equal(a.usage.cache_read_tokens,400);
});
test('stderr-only permission denial invalidates misleading SUCCESS',()=>{
 const a=inspectCapture(jsonl(result()),'no output produced — a tool required the "command" permission so it was auto-denied');
 assert.ok(a.reasons.includes('permission_denied'));assert.equal(a.audit_status,'INVALID');
});
test('directory audit reports missing pair and never pretends savings',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-capture-test-'));
 try{
 fs.writeFileSync(path.join(folder,'native-04.jsonl'),jsonl(result({status:'ERROR',response:'',error:'Individual quota reached.'})));
 fs.writeFileSync(path.join(folder,'native-03.jsonl'),jsonl(result()));
 fs.writeFileSync(path.join(folder,'pilah-03.jsonl'),jsonl(result({response:'',denied_actions:[1]})));
 const report=auditDirectory(folder);
 assert.equal(report.pairs.length,2);assert.equal(report.mechanically_complete,1);
 assert.equal(report.pairs.find(p=>p.repeat==='04').pilah,'MISSING');
 assert.ok(report.pairs.every(p=>p.descriptive_total_token_delta===null));
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});
