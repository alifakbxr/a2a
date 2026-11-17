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
