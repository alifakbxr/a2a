import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('doctor --public reports PILAH without exposing private local paths',()=>{
 const env={...process.env,HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:'/tmp/pilah-private-sensitive-store'};
 const r=spawnSync(process.execPath,['scripts/pilah.mjs','doctor','--public'],{encoding:'utf8',timeout:15000,env});
 assert.equal(r.status,0,r.stderr);
 const d=JSON.parse(r.stdout);
 assert.equal(d.name,'pilah');assert.equal(d.title,'PILAH');
 assert.equal(d.public_redacted,true);
 for(const field of ['node_binary','settings','data_dir','allowlist','allowed_workspaces','antigravity_workspaces'])
   assert.equal(Object.hasOwn(d,field),false,'private path in '+field);
 assert.equal(d.host_validation.status,'not_checked');
 assert.ok(!r.stdout.includes('pilah-private-sensitive-store'));
});
test('doctor refuses extra flags rather than silently ignoring them',()=>{
 const r=spawnSync(process.execPath,['scripts/pilah.mjs','doctor','--unexpected'],{encoding:'utf8',timeout:15000});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/doctor \[--public\]/);
});
