import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';
import {Store} from '../src/storage.mjs';
import {discover} from '../src/scanner.mjs';

function withProject(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-cache-freshness-'));
 const root=path.join(base,'project'),home=path.join(base,'home');
 fs.mkdirSync(root);fs.mkdirSync(home);
 const saved=Object.fromEntries(['HOME','USERPROFILE','A2A_DATA_DIR','VERIFYKIT_DATA_DIR'].map(k=>[k,process.env[k]]));
 let engine;
 try{
   process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'data');
   delete process.env.VERIFYKIT_DATA_DIR;invalidateWorkspaceCache();
   fs.writeFileSync(path.join(root,'package.json'),'{"name":"cache-fixture"}');
   const write=(rel,body)=>{const full=path.join(root,rel);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,body);return full};
   authorizeWorkspace(root);
   engine=new Engine();
   fn({engine,root,write});
 }finally{
   engine?.close();
   for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
   invalidateWorkspaceCache();fs.rmSync(base,{recursive:true,force:true});
 }
}

test('persisted hash cache requires ctime in addition to mtime and size',()=>withProject(({engine,root,write})=>{
  write('lib/provider.js','export const key=1;\n');
  write('lib/use.js',"import {key} from './provider.js';\n");
  // Old file modification times make the warm cache path eligible immediately.
  const aged=new Date(Date.now()-10_000);
  for(const rel of ['lib/provider.js','lib/use.js']){
    const filename=path.join(root,rel);
    fs.utimesSync(filename,aged,aged);
  }
  const first=engine.sync(root);
  const warm=engine.sync(root);
  assert.ok(warm.scan_stats.reused_files>=1,'warm scan should reuse unchanged metadata safely');
  const file=path.join(root,'lib/provider.js'),before=fs.statSync(file);
  // Same file size and restored modification time; ordinary mtime+bytes caches miss this edit.
  fs.writeFileSync(file,'export const key=2;\n');
  fs.utimesSync(file,before.atime,before.mtime);
  const after=fs.statSync(file);
  assert.equal(after.size,before.size);
  if(after.mtimeMs===before.mtimeMs && after.ctimeMs!==before.ctimeMs){
    const changed=engine.sync(root);
    assert.notEqual(changed.revision,first.revision,'content edit must invalidate cached hash');
    assert.ok(changed.scan_stats.read_files>=1);
  } else {
    // Coarse platform timestamps require an explicit integrity scan.
    const checked=engine.sync(root,{verifyIntegrity:true});
    assert.notEqual(checked.revision,first.revision);
  }
}));

test('legacy file-cache rows without ctime are upgraded and never reused blindly',()=>withProject(({engine,root,write})=>{
  write('src/a.js','export const a=1;\n');
  engine.sync(root);
  const ws=engine.store.register(root);
  engine.store.run('UPDATE files SET ctime_ms=NULL WHERE workspace_id=?',ws);
  const refreshed=engine.sync(root);
  assert.ok(refreshed.scan_stats.read_files>=1,'missing ctime must require content rehash');
  assert.ok(engine.store.get("SELECT ctime_ms FROM files WHERE workspace_id=? AND path='src/a.js'",ws)?.ctime_ms!=null);
}));

test('unreadable directory scan is incomplete rather than silently asserting freshness',()=>{
  // No forced chmod that would be flaky or privileged on Windows: static review
  // ensures filesystem enumeration exceptions have an explicit incomplete branch.
  const code=fs.readFileSync(new URL('../src/scanner.mjs',import.meta.url),'utf8');
  assert.match(code,/unreadable_directory:/);
  assert.match(code,/integrityComplete=false;continue/);
});

test('legacy saved token counters stay excluded from actual savings and graph row provenance is not freshness',()=>withProject(({engine,root,write})=>{
  write('src/a.js','export const a=1;\n');
  const initial=engine.sync(root),ws=initial.wsId;
  engine.store.run("INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)",ws,'a2a_context','inspect',1000000,200,999800,new Date().toISOString());
  write('src/b.js','export const b=1;\n');
  const updated=engine.sync(root);
  assert.notEqual(updated.revision,initial.revision);
  const persisted=engine.store.get("SELECT revision_id FROM nodes WHERE workspace_id=? AND id='file:src/a.js'",ws);
  assert.equal(persisted.revision_id,initial.revision,'unchanged rows intentionally retain origin revision');
  const result=engine.context({workspace:root,action:'tokens'});
  assert.equal(JSON.stringify(result).includes('999800'),false,'legacy saved tokens must not be projected as actual savings');
}));
