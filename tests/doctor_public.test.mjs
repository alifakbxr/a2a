import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('doctor --public uses current PILAH identity and redacts workspace/data paths',()=>{
 const secret='/tmp/pilah-sensitive-debug-folder';
 const r=spawnSync(process.execPath,['scripts/pilah.mjs','doctor','--public'],{
  encoding:'utf8',timeout:15000,env:{...process.env,A2A_DATA_DIR:secret}});
 assert.equal(r.status,0,r.stderr);
 const d=JSON.parse(r.stdout);
 assert.equal(d.name,'pilah');assert.equal(d.title,'PILAH');
 assert.equal(d.public_redacted,true);
 for(const k of ['node_binary','settings','data_dir','allowlist','allowed_workspaces','antigravity_workspaces'])
  assert.equal(Object.hasOwn(d,k),false,'public doctor leaked '+k);
 assert.ok(!r.stdout.includes(secret));
 assert.equal(d.host_validation.status,'not_checked');
});
test('doctor rejects unexpected options instead of silently ignoring input',()=>{
 const r=spawnSync(process.execPath,['scripts/pilah.mjs','doctor','--unexpected'],{encoding:'utf8',timeout:15000});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/doctor \[--public\]/);
});
