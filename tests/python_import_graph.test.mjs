import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {discover} from '../src/scanner.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';

test('Python relative imports and src-layout module imports appear in directional impact',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-python-imports-'));
 const home=path.join(base,'home'),root=path.join(base,'app');
 fs.mkdirSync(home);fs.mkdirSync(root);
 const env={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR};
 let engine;
 try{
  process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'data');
  invalidateWorkspaceCache();
  const write=(p,s)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s)};
  write('pyproject.toml','[project]\nname="pilah-test"\n');
  write('src/pkg/__init__.py','');
  write('src/pkg/helpers.py','def answer():\n    return 42\n');
  write('src/pkg/logic.py','from .helpers import answer\ndef logic():\n    return answer()\n');
  write('src/main.py','import pkg.logic\n');
  write('src/app.py','from pkg.logic import logic\n');
  write('src/unrelated.py','import os\n');
  authorizeWorkspace(root);engine=new Engine();
  const result=engine.impact({workspace:root,changed:['src/pkg/helpers.py'],depth:4});
  const affected=result.affected.map(x=>x.path);
  assert.ok(affected.includes('src/pkg/logic.py'),'local relative import must resolve');
  assert.ok(affected.includes('src/main.py'),'package import should resolve to src-layout module');
  assert.ok(affected.includes('src/app.py'),'from package import should resolve to src-layout module');
  assert.ok(!affected.includes('src/unrelated.py'),'stdlib imports must not become false repository edges');
  const inspect=engine.context({workspace:root,action:'inspect'});
  assert.equal(typeof inspect.index_scan_stats.read_files,'number');
  assert.ok(inspect.index_scan_stats.read_bytes>0);
  assert.ok(inspect.index_scan_stats.scanned_candidates>=5);
  const snapshot=discover(root);
  assert.ok(snapshot.scan_stats.read_files>=5);
  assert.equal(snapshot.scan_stats.reused_files,0);
 }finally{
  engine?.close();
  for(const [k,v] of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(base,{recursive:true,force:true});
 }
});
