import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {nodeVersionManagerAdvisory} from '../src/node-runtime.mjs';

test('doctor detects common version manager Node binary paths without invoking shells',()=>{
 const managed=[
  '/home/user/.nvm/versions/node/v26.13.1/bin/node',
  '/home/user/.fnm/node-versions/v24.11.0/installation/bin/node',
  '/home/user/.volta/tools/image/node/24.5.0/bin/node',
  '/home/user/.volta/bin/node',
  '/home/user/.asdf/installs/nodejs/22.13.0/bin/node',
  '/home/user/.nodenv/versions/24.0.0/bin/node'
 ];
 for(const value of managed){
  const actual=nodeVersionManagerAdvisory(value);
  assert.equal(actual.node_version_manager_path,true,value);
  assert.match(actual.path_advisory,/Antigravity/);
 }
 for(const normal of ['/usr/bin/node','/usr/local/bin/node','C:\\Program Files\\nodejs\\node.exe']){
  const x=nodeVersionManagerAdvisory(normal);
  assert.equal(x.node_version_manager_path,false,normal);
  assert.equal(x.path_advisory,null);
 }
});

test('doctor exposes truthful runtime and read-only advisory fields',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const run=spawnSync(process.execPath,['scripts/a2a.mjs','doctor'],{cwd:root,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const d=JSON.parse(run.stdout);
 assert.equal(d.node_binary,process.execPath);
 assert.equal(typeof d.node_version_manager_path,'boolean');
 assert.equal(d.path_advisory===null||typeof d.path_advisory==='string',true);
 assert.equal(d.network,'no outbound requests');
});
