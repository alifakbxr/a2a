import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMcpFailure} from '../src/mcp-diagnostics.mjs';
test('bad argument explains schema without silent retries',()=>{
 const e=classifyMcpFailure('a2a_impact',new Error('Unknown argument: files'));
 assert.equal(e.code,'invalid_tool_arguments');assert.ok(e.accepted_parameters.includes('changed'));assert.ok(!e.accepted_parameters.includes('files'));
});
test('workspace consent is required and actual local path is not leaked',()=>{
 const e=classifyMcpFailure('a2a_impact',new Error('Workspace is not authorized. Run: node scripts/a2a.mjs allow "/home/private/work"'));
 assert.equal(e.code,'workspace_authorization_required');assert.equal(JSON.stringify(e).includes('/home/private/work'),false);assert.ok(e.next_step.includes('user'));
});
test('protected roots never receive a bypass recommendation',()=>{const e=classifyMcpFailure('a2a_context',new Error('Refusing to authorize a protected root or system directory'));assert.equal(e.code,'workspace_access_denied')});

test('unknown execution exceptions and invalid keys never echo secret values',()=>{
 for(const e of ['Invalid type: /home/user/.env API_KEY=abc','SQL: SELECT * FROM credential_table WHERE token=abc','Unknown argument: password=secret']){
  const r=classifyMcpFailure('a2a_context',new Error(e));
  assert.equal(JSON.stringify(r).includes('API_KEY=abc'),false);
  assert.equal(JSON.stringify(r).includes('credential_table'),false);
  assert.equal(JSON.stringify(r).includes('password=secret'),false);
 }
});
test('generic path outside workspace returns safe error only',()=>{
 const r=classifyMcpFailure('a2a_impact',new Error('outside workspace at /Users/private/secrets.pem'));
 assert.equal(r.code,'workspace_access_denied');
 assert.equal(JSON.stringify(r).includes('/Users/private'),false);
});

test('stale source, missing evidence and oversized responses receive actionable redacted codes',()=>{
 const cases=[
  ['Source integrity incomplete at /home/private/secret','source_freshness_unconfirmed'],
  ['Required relative evidence artifact /home/private/receipt.xml','evidence_missing'],
  ['MCP response exceeds 64 KiB. Narrow query. /Users/private','resource_limit']
 ];
 for(const [message,code] of cases){
  const result=classifyMcpFailure('pilah_verify',new Error(message));
  assert.equal(result.code,code);
  assert.ok(!JSON.stringify(result).includes('/home/private'));
  assert.ok(!JSON.stringify(result).includes('/Users/private'));
  assert.ok(!JSON.stringify(result).includes('secret'));
 }
});
