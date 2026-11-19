import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {CANDIDATE_ARTIFACTS} from '../src/verification.mjs';
import {Database,sqliteApiName} from '../src/sqlite-compat.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
test('runtime uses one modern built-in SQLite binding and unique report candidates',()=>{
  assert.equal(typeof Database,'function');
  assert.ok(['Database','DatabaseSync'].includes(sqliteApiName));
  assert.equal(new Set(CANDIDATE_ARTIFACTS).size,CANDIDATE_ARTIFACTS.length);
  const code=fs.readFileSync(new URL('../src/security.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(code,/import\s+.*DatabaseSync.*from\s+['"]node:sqlite['"]/);
  assert.match(code,/import\s+\{\s*Database\s*\}\s+from\s+['"]\.\/sqlite-compat\.mjs['"]/);
});

test('release authorization CLI executes relative-path entry rather than silently exiting',()=>{
  const env={...process.env,GITHUB_EVENT_NAME:'',GITHUB_REF:'',A2A_RELEASE_APPROVED_SHA:''};
  const run=spawnSync(process.execPath,['./scripts/release-authorization.mjs'],{cwd:root,env,encoding:'utf8'});
  assert.equal(run.status,1);
  assert.match(run.stderr,/Release authorization DENIED:/);
});

test('debug diagnostics remain opt-in, stderr-only and redact raw error text',()=>{
  const script="import {debugLog} from './src/security.mjs';debugLog('ide_trust_db',Object.assign(new Error('/home/private/token.txt'),{code:'EACCES'}));";
  for(const enabled of ['0','1']){
    const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,env:{...process.env,A2A_DEBUG:enabled},encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.equal(run.stdout,'');
    if(enabled==='1'){
      assert.match(run.stderr,/\[A2A debug\] ide_trust_db: EACCES/);
      assert.ok(!run.stderr.includes('/home/private'));
    }else assert.equal(run.stderr,'');
  }
});
