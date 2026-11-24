import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TOOLS,ALL_TOOLS,getListedTools,validateArgs} from '../src/tools.mjs';
import {ALWAYS_ON_POLICY} from '../scripts/hook.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('PILAH is the only default public skill and MCP identity',()=>{
 const plugin=JSON.parse(read('plugin.json'));
 const pkg=JSON.parse(read('package.json'));
 const mcp=JSON.parse(read('mcp_config.json'));
 assert.equal(plugin.name,'pilah');
 assert.equal(plugin.displayName,'PILAH');
 assert.equal(pkg.name,'@aliip/pilah');
 assert.equal(pkg.version,plugin.version);
 assert.equal(pkg.bin.pilah,'scripts/pilah.mjs');
 assert.equal(pkg.bin.a2a,'scripts/a2a.mjs','historical CLI remains callable');
 assert.equal(Object.keys(mcp.mcpServers).join(','),'pilah');
 assert.deepEqual(Object.keys(mcp.mcpServers.pilah.tools),['pilah_context']);
 assert.deepEqual(TOOLS.map(x=>x.name),['pilah_context','pilah_impact','pilah_verify','pilah_evidence']);
 assert.deepEqual(getListedTools().map(x=>x.name),TOOLS.map(x=>x.name));
 assert.equal(ALL_TOOLS.length,12);
 assert.equal(fs.existsSync(new URL('../skills/a2a/SKILL.md',import.meta.url)),false,'do not load duplicate legacy skill metadata');
 const skill=read('skills/pilah/SKILL.md');
 assert.match(skill,/0 calls/);
 assert.match(skill,/existing project code/);
 assert.match(skill,/pilah_verify/);
 assert.ok(skill.length<3000);
 assert.ok(ALWAYS_ON_POLICY.length<=350);
});

test('legacy tool calls stay callable with identical validation and a bounded public footprint',()=>{
 for(const op of ['context','impact','verify','evidence']){
  const params={workspace:'/tmp',...(op==='verify'?{operation:'plan'}:op==='evidence'?{operation:'list'}:{})};
  for(const prefix of ['pilah','a2a','verifykit']){
   assert.doesNotThrow(()=>validateArgs(prefix+'_'+op,params));
   assert.throws(()=>validateArgs(prefix+'_'+op,{...params,unsanctioned:true}),/Unknown argument/);
  }
 }
 assert.equal(TOOLS.length,4);
 assert.ok(!getListedTools().some(x=>x.name.startsWith('a2a_')));
});

test('PILAH package leaves existing data identities in place instead of overwriting them',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies,undefined);
 const contract=read('docs/ENGINEERING_METHOD.md');
 assert.match(contract,/environment settings and local databases/);
 assert.match(contract,/unverified|unproven|pending/i);
 assert.match(read('README.md'),/PILAH/);
});
