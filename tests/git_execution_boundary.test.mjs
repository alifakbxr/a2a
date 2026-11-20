import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {gitChanges} from '../src/scanner.mjs';

test('read-only gitChanges never executes a repository-configured fsmonitor hook', { skip: process.platform === 'win32' ? 'POSIX hook execution fixture' : false }, t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-git-fsmonitor-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const git=(...args) => {
    const r=spawnSync('git',args,{cwd:dir,encoding:'utf8',timeout:5000});
    assert.equal(r.status,0,r.stderr);
    return r;
  };
  git('init','--quiet');
  git('config','user.email','test@example.invalid');
  git('config','user.name','A2A Test');
  fs.writeFileSync(path.join(dir,'source.js'),'export const value=1;\n');
  git('add','source.js');
  git('-c','core.fsmonitor=false','commit','-qm','base');
  const marker=path.join(dir,'hook-executed.marker');
  const hook=path.join(dir,'.git','hooks','a2a-fsmonitor-hook');
  fs.writeFileSync(hook,`#!/bin/sh
: > "${marker}"
printf '2\\n'
`);
  fs.chmodSync(hook,0o755);
  git('config','core.fsmonitor',hook);
  git('config','core.fsmonitorHookVersion','2');
  fs.writeFileSync(path.join(dir,'source.js'),'export const value=2;\n');
  const changes=gitChanges(dir);
  assert.ok(changes.includes('source.js'),JSON.stringify(changes));
  assert.equal(fs.existsSync(marker),false,'gitChanges executed untrusted project fsmonitor');
});
