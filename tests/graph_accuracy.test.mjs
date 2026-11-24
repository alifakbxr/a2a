import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';

test('impact follows reverse imports, never incorrectly classifies providers as impacted callers',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-graph-direction-'));
 const home=path.join(dir,'home'),work=path.join(dir,'project');
 fs.mkdirSync(home);fs.mkdirSync(work);
 const previous={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR,VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR};
 let engine;
 try{
  process.env.HOME=home;process.env.USERPROFILE=home;
  process.env.A2A_DATA_DIR=path.join(dir,'data');
  delete process.env.VERIFYKIT_DATA_DIR;
  invalidateWorkspaceCache();
  const write=(name,body)=>{const full=path.join(work,name);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,body)};
  write('package.json',JSON.stringify({name:'graph-fixture'}));
  write('lib/base.js','export function base(){return 1}\n');
  write('lib/target.js',"import {base} from './base.js';\nexport const target=base();\n");
  write('app/consumer.js',"import {target} from '../lib/target.js';\nexport const value=target;\n");
  write('app/entry.js',"import {value} from './consumer.js';\nexport const entry=value;\n");
  write('app/unrelated.js',"import {base} from '../lib/base.js';\nexport const unrelated=base();\n");
  write('tests/target.test.js',"import {target} from '../lib/target.js';\nexport const passes=target===1;\n");
  authorizeWorkspace(work);engine=new Engine();
  const result=engine.impact({workspace:work,changed:['lib/target.js'],depth:4});
  const affected=result.affected.map(n=>n.path);
  assert.ok(affected.includes('app/consumer.js'));
  assert.ok(affected.includes('app/entry.js'),'transitive consumer must be detected');
  assert.ok(affected.includes('tests/target.test.js'),'importing test is a candidate');
  assert.ok(!affected.includes('lib/base.js'),'provider is not an impacted caller');
  assert.ok(!affected.includes('app/unrelated.js'),'sibling dependency is not an impacted caller');
  assert.ok(result.direct_dependencies.includes('lib/base.js'));
  assert.ok(result.observed_consumers.includes('app/consumer.js'));
  assert.ok(result.related_tests.includes('tests/target.test.js'));
  assert.equal(result.coverage.dependency_direction,'reverse-imports-for-affected;forward-imports-for-dependencies');
  assert.equal(result.coverage.analysis_complete,false);
  const downstream=engine.impact({workspace:work,changed:['app/consumer.js'],depth:4});
  assert.ok(downstream.direct_dependencies.includes('lib/target.js'));
  assert.ok(!downstream.affected.some(n=>n.path==='lib/target.js'),'forward imports must not be affected');
  const literal=engine.context({workspace:work,action:'query',query:'%target',limit:8});
  assert.equal(literal.nodes.length,0,'SQL query must treat percent as a literal');
  const exact=engine.context({workspace:work,action:'query',query:'target',limit:8});
  assert.ok(exact.nodes.some(n=>n.label==='target'));
  assert.equal(exact.nodes[0].label,'target','exact symbol match wins over path substring');
 }finally{
  engine?.close();
  for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(dir,{recursive:true,force:true});
 }
});

test('heuristic MAY_TEST edges never propagate impact through unrelated providers',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-graph-heuristics-'));
 const home=path.join(dir,'home'),work=path.join(dir,'project');
 fs.mkdirSync(home);fs.mkdirSync(work);
 const old={HOME:process.env.HOME,A2A_DATA_DIR:process.env.A2A_DATA_DIR};let engine;
 try{
  process.env.HOME=home;process.env.A2A_DATA_DIR=path.join(dir,'data');invalidateWorkspaceCache();
  const write=(p,s)=>{const f=path.join(work,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s)};
  write('package.json','{"name":"test"}');
  write('src/ledger.js','export const ledger = 1;\n');
  write('tests/ledger.test.js','export const checked = true;\n');
  write('tests/ledger-extra.test.js',"import {checked} from './ledger.test.js';\n");
  authorizeWorkspace(work);engine=new Engine();
  const result=engine.impact({workspace:work,changed:['src/ledger.js']});
  assert.ok(result.related_tests.includes('tests/ledger.test.js'));
  assert.ok(result.heuristic_test_candidates.includes('tests/ledger.test.js'));
  assert.ok(!result.affected.some(x=>x.path==='tests/ledger-extra.test.js'),'heuristic may-test must terminate and never transitively contaminate');
  assert.ok(result.uncertainty.some(x=>x.includes('Heuristic')));
 }finally{
  engine?.close();for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(dir,{recursive:true,force:true});
 }
});
