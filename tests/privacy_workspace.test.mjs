import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/storage.mjs';
import {authorizeWorkspace,revokeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';

test('workspace privacy purge is explicit, scoped, and does not delete other projects',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-privacy-'));
 const home=path.join(base,'home'),one=path.join(base,'one'),two=path.join(base,'two');
 for(const dir of [home,one,two])fs.mkdirSync(dir);
 const previous={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR,VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR};
 let store;
 try{
  process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'data');delete process.env.VERIFYKIT_DATA_DIR;
  invalidateWorkspaceCache();
  authorizeWorkspace(one);authorizeWorkspace(two);
  store=new Store();
  const id1=store.register(one),id2=store.register(two);
  store.insertRevision(id1,'rev-one',null,{});
  store.insertRevision(id2,'rev-two',null,{});
  for(const id of [id1,id2])store.run(
    'INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)',
    id,'pilah_context','query',12,2,0,'2026-11-24T00:00:00Z');
  const before=store.workspaceDataCounts(one),other=store.workspaceDataCounts(two);
  assert.equal(before.registered,true);
  assert.ok(before.total_rows>=2);
  assert.throws(()=>store.purgeWorkspaceData(one),/explicit confirmation/);
  assert.equal(store.workspaceDataCounts(one).total_rows,before.total_rows);
  const result=store.purgeWorkspaceData(one,{confirmed:true});
  assert.equal(result.purged,true);
  assert.equal(result.deleted_rows,before.total_rows);
  assert.equal(store.workspaceDataCounts(one).registered,false);
  assert.equal(store.workspaceDataCounts(two).total_rows,other.total_rows);
  revokeWorkspace(two);
  assert.throws(()=>store.workspaceDataCounts(two),/authorized/,'revoked projects must not leak their stored record counts');
 }finally{
  store?.close();
  for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(base,{recursive:true,force:true});
 }
});

test('CLI refuses privacy erase without explicit user confirmation before opening DB',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-privacy-cli-'));
 try{
  const result=spawnSync(process.execPath,['scripts/pilah.mjs','privacy','purge',root],{cwd:process.cwd(),encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/--confirm-purge/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
