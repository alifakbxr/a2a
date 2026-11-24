import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {GRAPH_INDEX_VERSION} from '../src/scanner.mjs';
import {sha256,authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';

test('upgrading scanner graph semantics rebuilds old persisted relations even when source files are unchanged',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-reindex-upgrade-'));
 const home=path.join(root,'home'),project=path.join(root,'project');
 fs.mkdirSync(home);fs.mkdirSync(project);
 const prior={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR};
 let engine;
 try{
  process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(root,'data');
  invalidateWorkspaceCache();
  const write=(p,c)=>{const f=path.join(project,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,c)};
  write('package.json','{"name":"graph-index-fixture"}');
  write('lib/provider.js','export function calc(){return 42}\n');
  write('lib/consumer.js',"import {calc} from './provider.js';\nexport const out=calc();\n");
  authorizeWorkspace(project);engine=new Engine();
  const first=engine.sync(project);
  assert.equal(GRAPH_INDEX_VERSION,'pilah-graph-v2');
  assert.ok(engine.impact({workspace:project,changed:['lib/provider.js']}).observed_consumers.includes('lib/consumer.js'));
  const legacyInner=sha256([...first.index.files.map(f=>f.path+':'+f.hash),
    ...(first.index.skippedHashes||[]),'source-integrity-complete'].sort().join('\n'));
  const oldSnapshot=sha256((first.git||'no-git')+'|'+legacyInner);
  const oldRevision=engine.store.insertRevision(first.wsId,oldSnapshot,first.git,{});
  assert.notEqual(first.revision,oldRevision);
  engine.store.run('DELETE FROM edges WHERE workspace_id=?',first.wsId);
  assert.equal(engine.store.get('SELECT COUNT(*) AS n FROM edges WHERE workspace_id=?',first.wsId).n,0);
  const updated=engine.sync(project);
  assert.equal(updated.revision,first.revision,'new graph format must reinstate source-bound current revision');
  assert.notEqual(updated.revision,oldRevision,'old graph revision must never remain active');
  assert.ok(engine.store.get('SELECT COUNT(*) AS n FROM edges WHERE workspace_id=?',first.wsId).n>0,
    'graph relationships must be rebuilt');
  const impact=engine.impact({workspace:project,changed:['lib/provider.js']});
  assert.ok(impact.observed_consumers.includes('lib/consumer.js'));
 }finally{
  engine?.close();
  for(const [k,v] of Object.entries(prior))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(root,{recursive:true,force:true});
 }
});
