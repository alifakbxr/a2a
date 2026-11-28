import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {TOOLS} from '../src/tools.mjs';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const files=['README.md','BUILD_STATUS.md','skills/pilah/SKILL.md','rules/AGENTS.md',
  ...fs.readdirSync(path.join(root,'docs')).filter(n=>n.endsWith('.md')).map(n=>'docs/'+n)];
const content=Object.fromEntries(files.map(file=>[file,read(file)]));
const pkg=JSON.parse(read('package.json')),plugin=JSON.parse(read('plugin.json'));
const index=content['docs/README.md'];
const contracts=content['docs/CONTRACTS.md'];
const readme=content['README.md'];
const tick=String.fromCharCode(96);

test('documentation covers every Markdown page from a single versioned navigation index',()=>{
 assert.ok(index.includes('PILAH'));
 for(const file of files.filter(f=>f.startsWith('docs/')&&f!=='docs/README.md')){
   assert.ok(index.includes(file.slice(5)),'Undocumented page: '+file);
 }
 assert.equal(new Set(files).size,files.length);
});

test('public Markdown is PILAH-only, including examples, URLs, links and archived pages',()=>{
 for(const [file,body] of Object.entries(content)){
   assert.doesNotMatch(body,/a2a/i,file+': retired public name must not appear anywhere in docs');
 }
 assert.equal(pkg.bin.pilah,'scripts/pilah.mjs');
 assert.ok(fs.existsSync(path.join(root,'scripts/pilah.mjs')));
});

test('all local Markdown links resolve and no machine-local file URLs leak into public docs',()=>{
 for(const [file,text] of Object.entries(content)){
   assert.doesNotMatch(text,/file:\/\/\/home\/|file:\/\/\/Users\/|file:\/\/\/[A-Za-z]:/i,file);
   // External URLs are excluded; this validates repository-relative links.
   for(const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)){
     const href=match[1].trim().split(/\s+"/)[0];
     if(!href || /^(?:https?:\/\/|mailto:|#|data:|plugin:)/i.test(href))continue;
     if(href.startsWith('<')&&href.endsWith('>'))continue;
     const target=decodeURIComponent(href.split('#')[0].split('?')[0]);
     if(!target)continue;
     const resolved=path.resolve(root,path.dirname(file),target);
     assert.ok(resolved===root||resolved.startsWith(root+path.sep),file+': link escapes repo: '+href);
     assert.ok(fs.existsSync(resolved),file+': link target missing: '+href);
   }
 }
});

test('README, contracts, skill, plugin and CLI agree on version, four tools and runtime',()=>{
 assert.equal(pkg.version,plugin.version);
 assert.equal(TOOLS.length,4);
 assert.equal(pkg.engines.node,'>=22.13.0');
 for(const name of TOOLS.map(x=>x.name)){
   for(const file of ['README.md','docs/CONTRACTS.md','skills/pilah/SKILL.md']){
     assert.ok(content[file].includes(name),file+': missing '+name);
   }
 }
 const help=spawnSync(process.execPath,['scripts/pilah.mjs','help'],{cwd:root,encoding:'utf8',timeout:15000});
 assert.equal(help.status,0,help.stderr);
 for(const command of ['doctor','mode','toggle','compact','autotrust','allow','revoke','tokens','inspect','impact']){
   assert.match(help.stdout,new RegExp('\\b'+command+'\\b'));
   assert.ok(readme.includes('scripts/pilah.mjs '+command),'README docs missing CLI: '+command);
 }
 assert.match(readme,/PILAH/);
 assert.match(readme,/3\/3/,'README must state the last known tested main CI scope');
 assert.match(readme,/F01[–-]F18/,'README must disclose unverified external acceptance');
 assert.doesNotMatch(readme,/not been promoted|the branch has not been promoted|issue #15 remains open/i,'Historical release instructions must not be presented as current');
});

test('every operation declared in executable MCP schema appears in contracts',()=>{
 for(const tool of TOOLS){
   const selector=tool.name==='pilah_context'?'action':'operation';
   const ops=tool.inputSchema.properties[selector]?.enum||[];
   for(const operation of ops){
     assert.ok(contracts.includes(tick+operation+tick),'Contract omits '+tool.name+':'+operation);
   }
 }
 for(const field of ['given','when','then','evidence_type','viewport','ui_state','reference','source_revision','decisions','pending_tests','file_ownership','tool_recovery']){
   assert.ok(contracts.includes(tick+field+tick),'Missing typed contract field: '+field);
 }
});

test('published docs distinguish local proof, external release gate, and active hook surface',()=>{
 const hooks=JSON.parse(read('hooks.json'));
 const types=new Set(Object.values(hooks).flatMap(group=>Object.keys(group)));
 assert.ok(types.has('SessionStart'));
 assert.ok(types.has('PostToolUse'));
 assert.ok(types.has('PreInvocation'));
 for(const file of ['README.md','BUILD_STATUS.md','docs/ARCHITECTURE.md','docs/RELEASE.md','docs/CONTRACTS.md']){
   assert.ok(/not.tested|unverified|independent|NO.GO|not production|not released|release gate/i.test(content[file]),file+': acceptance boundary missing');
 }
 assert.ok(content['docs/RELEASE.md'].includes('9-job'),'Full pre-release CI matrix must remain documented');
 assert.ok(content['BUILD_STATUS.md'].includes('3/3'),'Current main CI results required');
 assert.ok(content['BUILD_STATUS.md'].includes('PR #107'),'PILAH source rebrand must be traceable');
 assert.ok(content['BUILD_STATUS.md'].includes('PR #108'),'CI reduction must be traceable');
 assert.ok(content['docs/SECURITY.md'].includes('explicitly saved local Markdown'));
 assert.ok(!content['skills/pilah/SKILL.md'].includes('not fixed by this workflow'));
});

test('current documentation does not misstate closed audit issues or release readiness',()=>{
 const build=read('BUILD_STATUS.md');
 assert.match(build,/PILAH/);
 assert.match(build,/main/);
 assert.match(build,/NO-GO/);
 assert.doesNotMatch(build,/main branch remains unchanged|Do not merge into `main` yet|#15 remains open/i);
 assert.match(read('docs/README.md'),/Historical implementation audits and research/);
 assert.match(read('docs/MAIN_VALIDATION_BACKLOG.md'),/deferred\/superseded/);
 assert.match(read('docs/ENGINEERING_METHOD.md'),/Lean evaluation loop/);
 const compatibility=read('docs/COMPATIBILITY.md');
 assert.match(compatibility,/node_version_manager_path/);
 assert.match(compatibility,/USERPROFILE/);
 const security=read('docs/SECURITY.md');
 assert.match(security,/state\.vscdb/);
 assert.match(security,/64 MiB/);
 assert.match(read('docs/CONTRACTS.md'),/6,500-byte/);
});
