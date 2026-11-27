import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';
import {validateArgs} from '../src/tools.mjs';
import {classifyMcpFailure} from '../src/mcp-diagnostics.mjs';

const fixtures=t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-impact-paging-'));
 const home=path.join(base,'home'),project=path.join(base,'project');
 const saved=Object.fromEntries(['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'].map(k=>[k,process.env[k]]));
 fs.mkdirSync(home);fs.mkdirSync(project);
 process.env.HOME=home;process.env.USERPROFILE=home;
 process.env.A2A_DATA_DIR=path.join(base,'data');
 delete process.env.PLUGIN_DATA;delete process.env.VERIFYKIT_DATA_DIR;
 invalidateWorkspaceCache();
 const write=(name,body)=>{
  const file=path.join(project,name);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,body);
 };
 write('package.json',JSON.stringify({name:'paging-fixture',type:'module'}));
 write('src/base.js','export const base=1;\n');
 write('src/provider.js',"import {base} from './base.js';\nexport const shared=base;\n");
 // More than two pages of affected files, plus two pages of test evidence.
 for(let n=0;n<38;n++)write('app/consumer'+String(n).padStart(2,'0')+'.js',
  "import {shared} from '../src/provider.js'; export const value=shared;\n");
 for(let n=0;n<18;n++)write('tests/provider'+String(n).padStart(2,'0')+'.test.js',
  "import {shared} from '../src/provider.js'; export const checked=shared===1;\n");
 write('app/unrelated.js',"import {base} from '../src/base.js'; export const unrelated=base;\n");
 authorizeWorkspace(project);
 const engine=new Engine();
 t.after(()=>{
  try{engine.close()}finally{
   for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
   invalidateWorkspaceCache();fs.rmSync(base,{recursive:true,force:true});
  }
 });
 return {engine,project,write};
};

test('impact pages exhaust all affected files and test candidates without overlap or unrelated siblings',t=>{
 const {engine,project}=fixtures(t);
 const base={workspace:project,changed:['src/provider.js'],depth:3,summary:false};
 const first=engine.impact(base);
 assert.equal(first.incomplete_index,false);
 assert.equal(first.coverage.graph_visit_limit_reached,false);
 assert.equal(first.coverage.analysis_complete,false,'static graph is never runtime proof');
 assert.equal(first.coverage.result_truncated,true);
 assert.equal(first.affected.length,25);
 assert.equal(first.related_tests.length,10);
 assert.ok(first.affected_total>=56,'38 consumers + 18 test nodes must be affected');
 assert.ok(first.related_tests_total>=18);
 assert.ok(first.pagination.affected.next_offset!==null);
 assert.equal(first.pagination.affected.returned,25);
 assert.equal(first.pagination.related_tests.returned,10);
 assert.equal(first.pagination.related_tests.next_offset,10);
 assert.equal(first.teamwork_advisory.affected_count,first.affected_total);
 assert.equal(first.direct_dependencies.includes('src/base.js'),true);

 const affected=[...first.affected];
 let cursor=first.pagination.affected.next_cursor,iterations=0;
 while(cursor!==null){
  assert.ok(++iterations<=15,'bounded impact pagination');
  const page=engine.impact({...base,cursor});
  assert.equal(page.revision,first.revision);
  assert.equal(page.affected_total,first.affected_total);
  assert.equal(page.pagination.affected.offset,Number(cursor.split(':').at(-1)));
  assert.equal(page.teamwork_advisory.affected_count,first.affected_total);
  affected.push(...page.affected);
  cursor=page.pagination.affected.next_cursor;
 }
 assert.equal(affected.length,first.affected_total);
 assert.equal(new Set(affected.map(x=>x.path)).size,affected.length);
 assert.deepEqual(affected.map(x=>x.path),affected.map(x=>x.path).sort());
 assert.ok(affected.some(x=>x.path==='app/consumer37.js'));
 assert.ok(!affected.some(x=>x.path==='app/unrelated.js'));
 assert.ok(!affected.some(x=>x.path==='src/base.js'));

 const related=[...first.related_tests];
 cursor=first.pagination.related_tests.next_cursor;iterations=0;
 while(cursor!==null){
  assert.ok(++iterations<=35,'bounded related test pages');
  const page=engine.impact({...base,cursor});
  assert.equal(page.revision,first.revision);
  assert.equal(page.related_tests_total,first.related_tests_total);
  related.push(...page.related_tests);
  cursor=page.pagination.related_tests.next_cursor;
 }
 assert.equal(related.length,first.related_tests_total);
 assert.equal(new Set(related).size,related.length);
 assert.deepEqual(related,[...related].sort());
 assert.ok(related.includes('tests/provider17.test.js'));
 const quick=engine.impact({...base,summary:true});
 assert.equal(quick.summary,true);
 assert.equal(quick.affected_total,first.affected_total);
 assert.equal(quick.related_tests_total,first.related_tests_total);
 assert.ok(quick.affected.length<=8);
 assert.ok(quick.related_tests.length<=5);
});

test('continuation requires source revision and fails closed when files change between pages',t=>{
 const {engine,project,write}=fixtures(t);
 const args={workspace:project,changed:['src/provider.js'],depth:3};
 const first=engine.impact(args);
 const pageCursor=first.pagination.affected.next_cursor;
 assert.ok(pageCursor,'more affected items should provide a cursor');
 assert.throws(()=>engine.impact({...args,cursor:'invalid'}),/Invalid impact cursor/);
 assert.throws(()=>engine.impact({...args,cursor:pageCursor,summary:true}),/summary cannot use cursor/);
 assert.throws(()=>engine.impact({...args,cursor:pageCursor,changed:['src/base.js']}),/Impact page scope mismatch/);
 const pieces=pageCursor.split(':');
 assert.throws(()=>engine.impact({...args,cursor:[pieces[0],pieces[1],pieces[2],'351'].join(':')}),/Invalid impact cursor/);
 const valid=engine.impact({...args,cursor:pageCursor});
 assert.ok(valid.affected.length>0);
 write('src/provider.js',"import {base} from './base.js';\nexport const shared=base+1;\n");
 assert.throws(()=>engine.impact({...args,cursor:pageCursor}),/Impact page source revision mismatch/);
 const fresh=engine.impact(args);
 assert.notEqual(fresh.revision,first.revision);
 assert.equal(fresh.pagination.affected.offset,0);
});

test('MCP schema exposes bounded paging for public and legacy tools with safe stale errors',()=>{
 for(const name of ['pilah_impact','a2a_impact','verifykit_impact']){
  assert.doesNotThrow(()=>validateArgs(name,{
   workspace:'/safe/example',changed:['src/provider.js'],cursor:'a:a'.repeat(4),
  }));
  assert.throws(()=>validateArgs(name,{workspace:'/safe/example',cursor:'x'.repeat(97)}),/too long/i);
  assert.throws(()=>validateArgs(name,{workspace:'/safe/example',affected_offset:25}),/Unknown argument/);
  assert.throws(()=>validateArgs(name,{workspace:'/safe/example',limit:100}),/Unknown argument/);
 }
 assert.equal(classifyMcpFailure('pilah_impact',new Error('Impact page source revision mismatch')).code,'source_freshness_unconfirmed');
 assert.equal(classifyMcpFailure('pilah_impact',new Error('Invalid impact cursor')).code,'invalid_tool_arguments');
 assert.equal(classifyMcpFailure('pilah_impact',new Error('Impact page scope mismatch')).code,'invalid_tool_arguments');
});
