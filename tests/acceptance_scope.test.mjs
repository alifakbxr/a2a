import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assessVerification} from '../src/verification.mjs';
test('a passing named JUnit test is not automatic production release approval',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-review-scope-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'report.xml'),'<testsuite tests="1" failures="0" errors="0" skipped="0"><testcase name="checkout_success"/></testsuite>');
 const calls=[];const store={run:(...args)=>calls.push(args),transaction:fn=>fn()}; // Test-only transaction stub.
 const r=assessVerification(store,'ws-1',root,'rev-1',[{id:'checkout',artifact:'report.xml',test_name:'checkout_success'}]);
 assert.equal(r.verdict,'passed');
 assert.equal(r.release_ready,false);
 assert.equal(r.semantic_requirements_proven,false);
 assert.equal(r.proof_scope,'named-machine-test-assertions-only');
 assert.ok(calls.some(x=>x[0].includes('INSERT INTO evidence')));
});
