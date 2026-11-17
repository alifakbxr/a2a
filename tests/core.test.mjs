import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {Store} from '../src/storage.mjs';
import {authorizeWorkspace,requireAuthorizedWorkspace,safeFile,shouldIgnore,loadAllowlist,getVerifyKitMode,setVerifyKitMode,getCompactMode,setCompactMode} from '../src/security.mjs';
import {estimateTokens,analyzeWorkspaceTokens,getSessionTokenUsage,skeletonizeCode,minifyContext} from '../src/tokens.mjs';
import {parseArtifact} from '../src/verification.mjs';
import {TOOLS,validateArgs} from '../src/tools.mjs';

let envBackup;
const state={};
function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'verifykit-test-'));const home=path.join(base,'home'),root=path.join(base,'work');fs.mkdirSync(home);fs.mkdirSync(root);
  envBackup={HOME:process.env.HOME,VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR};
  process.env.HOME=home;process.env.VERIFYKIT_DATA_DIR=path.join(base,'data');
  const write=(rel,value)=>{const dest=path.join(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,value)};
  write('package.json',JSON.stringify({name:'fixture',scripts:{test:'node --test',build:'echo build'}}));
  write('src/auth.js','export function login() { return true }\n');
  write('src/page.js',"import {login} from './auth.js';\nexport function page(){return login()}\n");
  write('tests/auth.test.js',"import {login} from '../src/auth.js';\nexport function works(){return login()}\n");
  write('.env','TOP_SECRET_ONLY_IN_ENV');
  state.base=base;state.root=root;state.write=write;
  return {base,root,write};
}
function cleanup(){
  for(const [k,v] of Object.entries(envBackup))if(v===undefined)delete process.env[k];else process.env[k]=v;
  fs.rmSync(state.base,{recursive:true,force:true});
}
async function withEngine(fn){fixture();try{authorizeWorkspace(state.root);const e=new Engine();try{return await fn(e,state.root,state.write)}finally{e.close()}}finally{cleanup()}}

test('deny scanning an unapproved workspace',()=>{fixture();try{assert.throws(()=>requireAuthorizedWorkspace(state.root),/not authorized/)}finally{cleanup()}});
test('authorize and revoke exact workspace boundary',()=>{fixture();try{assert.equal(authorizeWorkspace(state.root),fs.realpathSync(state.root));assert.equal(loadAllowlist().length,1);assert.throws(()=>authorizeWorkspace(os.homedir()),/Refusing/)}finally{cleanup()}});
test('reject traversal, secrets, and symlink escapes',()=>{fixture();try{
  assert.throws(()=>safeFile(state.root,'../home/private.txt'),/Blocked|escapes/);
  assert.throws(()=>safeFile(state.root,'.env'),/Blocked/);assert.equal(shouldIgnore('a/.env.local'),true);
  fs.symlinkSync(state.root+'/src/auth.js',path.join(state.root,'escape.ts'));
  assert.throws(()=>safeFile(state.root,'escape.ts'),/Symlink/);
}finally{cleanup()}});
test('inspect indexes code without private .env',()=>withEngine((e,root)=>{
  const r=e.context({workspace:root});assert.ok(r.coverage.files>=4);assert.ok(r.coverage.nodes>=r.coverage.files);assert.ok(r.ecosystems.includes('node'));
  assert.equal(e.store.get('SELECT * FROM files WHERE path=?','.env'),undefined);
}));
test('symbol query and relationship graph provide source-backed location',()=>withEngine((e,root)=>{
  const q=e.context({workspace:root,action:'query',query:'login'});assert.ok(q.nodes.some(n=>n.kind==='symbol'&&n.file==='src/auth.js'));assert.ok(q.relations.some(n=>n.kind==='DECLARES'));
}));
test('impact finds reverse import dependencies and suggested tests',()=>withEngine((e,root)=>{
  const r=e.impact({workspace:root,changed:['src/auth.js']});assert.ok(r.affected.some(n=>n.path==='src/page.js'));assert.ok(r.affected.some(n=>n.path==='tests/auth.test.js'));assert.ok(r.related_tests.includes('tests/auth.test.js'));
}));
test('risk elevates sensitive area and never claims complete coverage',()=>withEngine((e,root)=>{
  const r=e.impact({workspace:root,changed:['src/auth.js']});assert.equal(r.risk,'high');assert.equal(r.coverage.static_only,true);assert.ok(r.uncertainty.length);
}));
test('verification plan is native-only and never marks unrun passed',()=>withEngine((e,root)=>{
  const r=e.verify({workspace:root,criteria:['User login persists after refresh'],operation:'plan'});assert.equal(r.state,'not_run');assert.equal(r.criteria[0].status,'not_run');assert.equal(r.execution,'Use existing Antigravity native terminal/browser with its permissions. VerifyKit does not execute commands.');
}));
test('JUnit evidence passes only with tests, then becomes stale after source edits',()=>withEngine((e,root,write)=>{
  write('reports/results.xml','<testsuite tests="2" failures="0" errors="0" skipped="0"><testcase name="one"/><testcase name="two"/></testsuite>');
  const r=e.verify({workspace:root,operation:'assess',criteria:[{id:'auth-works',artifact:'reports/results.xml',test_name:'*'}]});assert.equal(r.verdict,'passed');
  let evidence=e.context({workspace:root,action:'freshness'});assert.ok(evidence.evidence.some(x=>x.fresh));
  write('src/auth.js','export function login() { return false }\n');
  evidence=e.context({workspace:root,action:'freshness'});assert.ok(evidence.evidence.some(x=>x.fresh===false));
}));
test('a passing suite without mapped testcase name cannot prove an arbitrary feature',()=>withEngine((e,root,write)=>{
  write('reports/result.tap','TAP version 13\n1..1\nok 1 - works\n');
  const r=e.verify({workspace:root,operation:'assess',criteria:[{id:'payment-idempotency',artifact:'reports/result.tap'}]});
  assert.equal(r.verdict,'inconclusive');
}));
test('evidence becomes stale when its machine report changes without source change',()=>withEngine((e,root,write)=>{
  write('reports/results.tap','TAP version 13\n1..1\nok 1 - works\n');
  const a=e.verify({workspace:root,operation:'assess',criteria:[{id:'auth',artifact:'reports/results.tap',test_name:'works'}]});assert.equal(a.verdict,'passed');
  write('reports/results.tap','TAP version 13\n1..1\nnot ok 1 - works\n');
  const now=e.context({workspace:root,action:'freshness'});assert.equal(now.evidence[0].artifact_intact,false);assert.equal(now.evidence[0].fresh,false);
}));
test('reports with skipped or no assertions cannot be declared pass',()=>{
  assert.equal(parseArtifact('<testsuite tests="0" failures="0"></testsuite>','test.xml').status,'inconclusive');
  assert.equal(parseArtifact('<testsuite tests="1"><testcase name="x"></testsuite>','test.xml').status,'inconclusive');
  assert.equal(parseArtifact('<testsuite tests="1" failures="0"><testcase name="x"><failure/></testcase></testsuite>','test.xml').status,'inconclusive');
  assert.equal(parseArtifact('<testsuite tests="1" failures="0" skipped="1"></testsuite>','test.xml').status,'inconclusive');
  assert.equal(parseArtifact('TAP version 13\n1..2\nok 1 - a\n','out.tap').status,'inconclusive');
});
test('TAP parser distinguishes failure, plan mismatch, and success',()=>{
  assert.equal(parseArtifact('TAP version 13\n1..2\nok 1 - a\nnot ok 2 - b\n','r.tap').status,'failed');
  assert.equal(parseArtifact('TAP version 13\n1..2\nok 1 - a\nok 2 - b\n','r.tap').status,'passed');
});
test('reject mismatched or missing artifacts as evidence',()=>withEngine((e,root)=>{
  assert.throws(()=>e.verify({workspace:root,operation:'assess',criteria:[{id:'x',artifact:'../evil.xml'}]}),/Blocked|escapes/);
  assert.throws(()=>e.verify({workspace:root,operation:'assess',criteria:[{id:'x',artifact:'.env'}]}),/Blocked/);
}));
test('record incident, hypothesis, and evidence listing scoped to workspace',()=>withEngine((e,root,write)=>{
  write('reports/results.tap','TAP version 13\n1..1\nok 1 - works\n');
  const v=e.verify({workspace:root,operation:'assess',criteria:[{id:'login',artifact:'reports/results.tap',test_name:'works'}]});
  const ev=v.criteria[0].evidence_id;
  const inc=e.evidence({workspace:root,operation:'record_incident',title:'Login session was not persisted',root_cause:'Session store was reset on refresh',paths:['src/auth.js'],criteria:['refresh persists'],evidence_ids:[ev]});
  assert.equal(inc.state,'evidence-linked');
  const h=e.evidence({workspace:root,operation:'add_hypothesis',incident_id:inc.id,hypothesis:'State is recreated after reload',experiment:'Reproduce with a refresh'});assert.equal(h.status,'untested');
  const list=e.evidence({workspace:root,operation:'incidents'});assert.equal(list.items.length,1);
}));
test('input schema validation blocks unknown, invalid and oversized arguments',()=>{
  assert.ok(TOOLS.length>=4);assert.throws(()=>validateArgs('verifykit_impact',{workspace:'/tmp',evil:true}),/Unknown argument/);
  assert.throws(()=>validateArgs('verifykit_context',{workspace:'/tmp',action:'delete'}),/Invalid value/);
  assert.throws(()=>validateArgs('verifykit_verify',{workspace:'/tmp'}),/Missing operation/);
});
test('source graph persisted across engine restart',()=>withEngine((e,root)=>{
  const before=e.context({workspace:root});const st=new Store();try{const files=st.all('SELECT * FROM files WHERE workspace_id=?',before.workspace_id);assert.ok(files.length>=4)}finally{st.close()}
}));
test('verifykit mode defaults to always-on and supports toggle/set',()=>{
  fixture();
  try{
    assert.equal(getVerifyKitMode(),'always-on');
    assert.equal(setVerifyKitMode('on-demand'),'on-demand');
    assert.equal(getVerifyKitMode(),'on-demand');
    assert.equal(setVerifyKitMode('always-on'),'always-on');
    assert.equal(getVerifyKitMode(),'always-on');
    assert.throws(()=>setVerifyKitMode('invalid-mode'),/Invalid mode/);
  }finally{cleanup()}
});
test('compact mode supports toggle and skeletonization',()=>{
  fixture();
  try{
    assert.equal(getCompactMode(),false);
    assert.equal(setCompactMode(true),true);
    assert.equal(getCompactMode(),true);
    assert.equal(setCompactMode('toggle'),false);
    assert.equal(getCompactMode(),false);

    const rawJs = `// test comment\nfunction test() {\n  /* multiline */\n  return 42;\n}\n\n\n`;
    const skeleton = skeletonizeCode(rawJs, '.js');
    assert.ok(!skeleton.includes('test comment'));
    assert.ok(!skeleton.includes('multiline'));
    assert.ok(skeleton.includes('return 42;'));

    const minified = minifyContext('line 1\n\n\n\nline 2    multiple   spaces');
    assert.ok(!minified.includes('    '));
    assert.ok(minified.includes('line 1\n\nline 2'));
  }finally{cleanup()}
});
test('detect token usage and savings in workspace',()=>withEngine((e,root)=>{
  assert.equal(estimateTokens('Hello World 1234'),4);
  const r=e.context({workspace:root,action:'tokens'});
  assert.ok(r.workspace_tokens.total_estimated_tokens>0);
  assert.ok(r.workspace_tokens.total_files>=4);
  assert.ok(r.workspace_tokens.top_consumers.length>0);
  assert.ok(r.workspace_tokens.efficiency.savings_ratio.includes('%'));
  assert.equal(r.coverage.estimated_source_tokens,r.workspace_tokens.total_estimated_tokens);
  const impact=e.impact({workspace:root,changed:['src/auth.js']});
  assert.ok(impact.tokens_affected>0);
}));
