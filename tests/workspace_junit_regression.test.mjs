import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseArtifact} from '../src/verification.mjs';
import {classifyMcpFailure} from '../src/mcp-diagnostics.mjs';
import {requireAuthorizedWorkspace} from '../src/security.mjs';

test('JUnit structural validation rejects testcases outside the root, duplicate roots and trailing errors',()=>{
 const invalid=[
  '<testsuite tests="1" failures="0" errors="0" skipped="0"></testsuite><testcase name="fake"/>',
  '<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="real"/></testsuite><error>crashed</error>',
  '<testsuites><testcase name="fake"/><testsuite tests="1" failures="0"><testcase name="real"/></testsuite></testsuites>',
  '<testsuite tests="1" failures="0"><testcase name="real"/></testsuite><testsuite tests="1" failures="0"><testcase name="fake"/></testsuite>'
 ];
 for(const xml of invalid)assert.equal(parseArtifact(xml,'junit.xml').status,'inconclusive',xml);
 const valid='<testsuites><testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="real"/></testsuite></testsuites>';
 assert.equal(parseArtifact(valid,'junit.xml').status,'passed');
});

test('protected plugin workspaces cannot be authorized and MCP error never recommends allow',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-protected-diagnostic-'));
 const prior=process.env.HOME;
 try{
  process.env.HOME=home;
  const plugin=path.join(home,'.gemini','config','plugins','a2a');
  fs.mkdirSync(plugin,{recursive:true});
  assert.throws(()=>requireAuthorizedWorkspace(plugin),/Protected workspace denied/);
  const err=classifyMcpFailure('a2a_context',new Error('Protected workspace denied; select an ordinary trusted project'));
  assert.equal(err.code,'workspace_access_denied');
  assert.ok(!err.next_step.includes(' allow '));
  const grants=path.join(home,'.config','a2a','allowed-workspaces.json');
  fs.mkdirSync(path.dirname(grants),{recursive:true});
  fs.writeFileSync(grants,JSON.stringify({version:1,allowed:[plugin],revoked:[]}));
  const run=spawnSync(process.execPath,['scripts/a2a.mjs','doctor'],{cwd:path.resolve('.'),encoding:'utf8',env:{...process.env,HOME:home},timeout:10000});
  assert.equal(run.status,0,run.stderr);
  const doctor=JSON.parse(run.stdout);
  assert.equal(doctor.ignored_protected_grants,1);
  assert.deepEqual(doctor.allowed_workspaces,[]);
 }finally{
  if(prior===undefined)delete process.env.HOME;else process.env.HOME=prior;
  fs.rmSync(home,{recursive:true,force:true});
 }
});
