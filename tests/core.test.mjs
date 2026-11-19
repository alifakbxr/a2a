import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Engine} from '../src/engine.mjs';
import {Store} from '../src/storage.mjs';
import {
  authorizeWorkspace,requireAuthorizedWorkspace,safeFile,shouldIgnore,loadAllowlist,
  isWorkspaceAuthorized,loadAntigravityWorkspaces,invalidateWorkspaceCache,
  getVerifyKitMode,setVerifyKitMode,getCompactMode,setCompactMode,
  getAutoTrustMode,setAutoTrustMode,dataDir
} from '../src/security.mjs';
import {estimateTokens,analyzeWorkspaceTokens,getSessionTokenUsage,skeletonizeCode,minifyContext} from '../src/tokens.mjs';
import {parseArtifact} from '../src/verification.mjs';
import {TOOLS,ALL_TOOLS,getListedTools,validateArgs} from '../src/tools.mjs';
import {gitChanges,extractSymbols} from '../src/scanner.mjs';
import {handleHookEvent} from '../scripts/hook.mjs';

let envBackup;
const state={};
function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-test-'));const home=path.join(base,'home'),root=path.join(base,'work');fs.mkdirSync(home);fs.mkdirSync(root);
  envBackup={
    HOME:process.env.HOME,
    USERPROFILE:process.env.USERPROFILE,
    APPDATA:process.env.APPDATA,
    A2A_DATA_DIR:process.env.A2A_DATA_DIR,
    VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR,
    PLUGIN_DATA:process.env.PLUGIN_DATA,
    ANTIGRAVITY_APP_DATA_DIR:process.env.ANTIGRAVITY_APP_DATA_DIR,
    ANTIGRAVITY_CONVERSATION_ID:process.env.ANTIGRAVITY_CONVERSATION_ID,
    A2A_LEGACY_TOOL_ALIASES:process.env.A2A_LEGACY_TOOL_ALIASES,
  };
  process.env.HOME=home;
  process.env.USERPROFILE=home;
  process.env.APPDATA=path.join(home,'AppData','Roaming');
  delete process.env.A2A_DATA_DIR;
  delete process.env.PLUGIN_DATA;
  delete process.env.ANTIGRAVITY_APP_DATA_DIR;
  delete process.env.ANTIGRAVITY_CONVERSATION_ID;
  delete process.env.A2A_LEGACY_TOOL_ALIASES;
  process.env.VERIFYKIT_DATA_DIR=path.join(base,'data');
  invalidateWorkspaceCache();
  const write=(rel,value)=>{const dest=path.join(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,value)};
  write('package.json',JSON.stringify({name:'fixture',scripts:{test:'node --test',build:'echo build'}}));
  write('src/auth.js','export function login() { return true }\n');
  write('src/page.js',"import {login} from './auth.js';\nexport function page(){return login()}\n");
  write('tests/auth.test.js',"import {login} from '../src/auth.js';\nexport function works(){return login()}\n");
  write('.env','TOP_SECRET_ONLY_IN_ENV');
  state.base=base;state.home=home;state.root=root;state.write=write;
  return {base,home,root,write};
}
function cleanup(){
  invalidateWorkspaceCache();
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
  assert.equal(r.coverage.graph_visit_limit_reached,false);
  assert.ok(!r.uncertainty.some(x=>x.includes('Graph visit limit reached')));
}));
test('risk elevates sensitive area and never claims complete coverage',()=>withEngine((e,root)=>{
  const r=e.impact({workspace:root,changed:['src/auth.js']});assert.equal(r.risk,'high');assert.equal(r.coverage.static_only,true);assert.ok(r.uncertainty.length);
}));
test('verification plan is native-only and never marks unrun passed',()=>withEngine((e,root)=>{
  const r=e.verify({workspace:root,criteria:['User login persists after refresh'],operation:'plan'});assert.equal(r.state,'not_run');assert.equal(r.criteria[0].status,'not_run');assert.equal(r.execution,'Use existing Antigravity native terminal/browser with its permissions. A2A does not execute commands.');
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
test('a2a mode defaults to on-demand and supports toggle/set',()=>{
  fixture();
  try{
    assert.equal(getVerifyKitMode(),'on-demand');
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
    assert.equal(getCompactMode(),true,'Fresh installs prefer compact output');
    assert.equal(setCompactMode(false),false,'Explicit compact off still supported');
    assert.equal(getCompactMode(),false);
    assert.equal(setCompactMode('toggle'),true);
    assert.equal(getCompactMode(),true);

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
test('token diagnostics do not invent net savings in workspace',()=>withEngine((e,root)=>{
  assert.equal(estimateTokens('Hello World 1234'),4);
  const r=e.context({workspace:root,action:'tokens'});
  assert.ok(r.workspace_tokens.total_estimated_tokens>0);
  assert.ok(r.workspace_tokens.total_files>=4);
  assert.ok(r.workspace_tokens.top_consumers.length>0);
  assert.equal(r.workspace_tokens.efficiency.savings_ratio,null);
  assert.equal(r.workspace_tokens.net_token_savings,null);
  assert.equal(r.session_usage.status,'not_available');
  assert.equal(r.coverage.estimated_workspace_source_tokens,r.workspace_tokens.total_estimated_tokens);
  const impact=e.impact({workspace:root,changed:['src/auth.js']});
  assert.ok(impact.estimated_source_tokens_affected>0);
  assert.equal(impact.source_token_estimate_only,true);
}));

test('security: upward authorization bypass is blocked and protected roots are denied',()=>{
  fixture();
  try{
    const docsDir=path.join(state.home,'Documents');
    const projA=path.join(docsDir,'projA');
    const sibling=path.join(docsDir,'projB');
    const nested=path.join(projA,'packages','api');
    fs.mkdirSync(nested,{recursive:true});
    fs.mkdirSync(sibling,{recursive:true});

    authorizeWorkspace(projA);
    assert.equal(isWorkspaceAuthorized(fs.realpathSync(projA)),true);
    assert.equal(isWorkspaceAuthorized(fs.realpathSync(nested)),true);
    assert.equal(isWorkspaceAuthorized(fs.realpathSync(docsDir)),false);
    assert.equal(isWorkspaceAuthorized(fs.realpathSync(sibling)),false);

    for(const protectedSub of ['Documents','Downloads','Desktop','Music','Pictures','Videos','.config','.gemini','.ssh','.aws','.gnupg']){
      const p=path.join(state.home,protectedSub);
      fs.mkdirSync(p,{recursive:true});
      assert.throws(()=>authorizeWorkspace(p),/Refusing/);
      assert.equal(isWorkspaceAuthorized(fs.realpathSync(p)),false);
    }
    assert.throws(()=>authorizeWorkspace(os.tmpdir()),/Refusing/);
    assert.throws(()=>authorizeWorkspace(path.parse(state.home).root),/Refusing/);
  }finally{cleanup()}
});

test('security: Antigravity IDE Workspace Trust (state.vscdb) and CLI settings honored safely',async()=>{
  fixture();
  try{
    const {DatabaseSync}=await import('node:sqlite');
    const globalStorage=path.join(state.home,'.config','Antigravity IDE','User','globalStorage');
    fs.mkdirSync(globalStorage,{recursive:true});
    const docsDir=path.join(state.home,'Documents');
    const trustedProj=path.join(docsDir,'TrustedApp');
    const untrustedProj=path.join(docsDir,'UntrustedApp');
    const codeWsFolder=path.join(state.home,'CodeWork');
    fs.mkdirSync(docsDir,{recursive:true});
    fs.mkdirSync(trustedProj,{recursive:true});
    fs.mkdirSync(untrustedProj,{recursive:true});
    fs.mkdirSync(codeWsFolder,{recursive:true});

    const codeWsFile=path.join(state.home,'.gemini','config','sample.code-workspace');
    fs.mkdirSync(path.dirname(codeWsFile),{recursive:true});
    fs.writeFileSync(codeWsFile,JSON.stringify({folders:[{path:'../../CodeWork'}]}));

    const vscdb=new DatabaseSync(path.join(globalStorage,'state.vscdb'));
    vscdb.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
    vscdb.prepare('INSERT INTO ItemTable VALUES(?,?)').run(
      'content.trust.model.key',
      JSON.stringify({
        uriTrustInfo:[
          {uri:{fsPath:trustedProj,scheme:'file'},trusted:true},
          {uri:{fsPath:untrustedProj,scheme:'file'},trusted:false},
          {uri:{fsPath:docsDir,scheme:'file'},trusted:true},
          {uri:{fsPath:state.home,scheme:'file'},trusted:true},
          {uri:{fsPath:codeWsFile,scheme:'file'},trusted:true},
        ]
      })
    );
    vscdb.close();

    // Historical workspaceStorage WITHOUT trust should NOT be auto-trusted in default antigravity-trust mode
    const wsStorage=path.join(state.home,'.config','Antigravity IDE','User','workspaceStorage','abc123');
    fs.mkdirSync(wsStorage,{recursive:true});
    fs.writeFileSync(path.join(wsStorage,'workspace.json'),JSON.stringify({folder:pathToFileURL(untrustedProj).href}));

    // CLI trustedWorkspaces
    const cliDir=path.join(state.home,'.gemini','antigravity-cli');
    fs.mkdirSync(cliDir,{recursive:true});
    const cliProj=path.join(state.home,'CliTrusted');
    fs.mkdirSync(cliProj,{recursive:true});
    fs.writeFileSync(path.join(cliDir,'settings.json'),JSON.stringify({trustedWorkspaces:[state.home,cliProj]}));

    invalidateWorkspaceCache();
    assert.equal(getAutoTrustMode(),'antigravity-trust');
    const workspaces=loadAntigravityWorkspaces({bypassCache:true});
    assert.ok(workspaces.includes(fs.realpathSync(trustedProj)));
    assert.ok(workspaces.includes(fs.realpathSync(codeWsFolder)));
    assert.ok(workspaces.includes(fs.realpathSync(cliProj)));
    assert.ok(!workspaces.includes(fs.realpathSync(untrustedProj)));
    assert.ok(!workspaces.includes(fs.realpathSync(docsDir)));
    assert.ok(!workspaces.includes(fs.realpathSync(state.home)));
    assert.ok(!workspaces.includes(fs.realpathSync(path.dirname(codeWsFile))));

    // autoTrust='off' disables all Antigravity auto-trust
    setAutoTrustMode('off');
    assert.deepEqual(loadAntigravityWorkspaces(),[]);

    // autoTrust='project-markers' requires project markers for historical storage
    fs.writeFileSync(path.join(untrustedProj,'package.json'),'{}');
    setAutoTrustMode('project-markers');
    const withMarkers=loadAntigravityWorkspaces({bypassCache:true});
    assert.ok(withMarkers.includes(fs.realpathSync(untrustedProj)));
  }finally{cleanup()}
});

test('security: shouldIgnore normalizes backslashes and ignores lockfiles & caches',()=>{
  assert.equal(shouldIgnore('package-lock.json'),true);
  assert.equal(shouldIgnore('apps\\web\\pnpm-lock.yaml'),true);
  assert.equal(shouldIgnore('yarn.lock'),true);
  assert.equal(shouldIgnore('bun.lockb'),true);
  assert.equal(shouldIgnore('composer.lock'),true);
  assert.equal(shouldIgnore('Cargo.lock'),true);
  assert.equal(shouldIgnore('poetry.lock'),true);
  assert.equal(shouldIgnore('Gemfile.lock'),true);
  assert.equal(shouldIgnore('.svelte-kit/generated/root.js'),true);
  assert.equal(shouldIgnore('.turbo/cache/abc.json'),true);
  assert.equal(shouldIgnore('.pytest_cache/v/cache'),true);
  assert.equal(shouldIgnore('tsconfig.tsbuildinfo'),true);
  assert.equal(shouldIgnore('storage/logs/laravel.log'),true);
  assert.equal(shouldIgnore('src\\auth\\.env.local'),true);
  assert.equal(shouldIgnore('src/auth.js'),false);
});

test('tokens: estimateTokens handles empty/zero, lexer skeletonizer preserves strings/regexes, minifyContext preserves indent',()=>{
  assert.equal(estimateTokens(''),0);
  assert.equal(estimateTokens(0),0);

  const jsInput=[
    '// real line comment',
    'const url = "http://localhost:3000/api//v1";',
    'const proto = "//cdn.example.com/app.js";',
    'const blkStr = "foo /* not a comment */ bar";',
    'const re = /https:\\/\\//g;',
    'const tpl = `hello // not comment ${1 /* inline */ + 2}`;',
    '/* block\n   comment */\nexport function ok() { return url + proto + blkStr; }',
  ].join('\n');
  const jsSkel=skeletonizeCode(jsInput,'.js');
  assert.ok(!jsSkel.includes('real line comment'));
  assert.ok(!jsSkel.includes('inline'));
  assert.ok(!jsSkel.includes('block\n'));
  assert.ok(jsSkel.includes('"http://localhost:3000/api//v1"'));
  assert.ok(jsSkel.includes('"//cdn.example.com/app.js"'));
  assert.ok(jsSkel.includes('"foo /* not a comment */ bar"'));
  assert.ok(jsSkel.includes('/https:\\/\\//g'));
  assert.ok(jsSkel.includes('`hello // not comment ${1  + 2}`'));

  const pySkel=skeletonizeCode('# py comment\ndef f():\n    return "# keep"\n','.py');
  assert.ok(!pySkel.includes('py comment'));
  assert.ok(pySkel.includes('return "# keep"'));

  const phpSkel=skeletonizeCode("<?php\n// cmt\n#[Route('/api')]\nfunction run() { return 1; }\n",'.php');
  assert.ok(!phpSkel.includes('cmt'));
  assert.ok(phpSkel.includes("#[Route('/api')]"));

  const sqlSkel=skeletonizeCode("-- header\nSELECT '-- keep' FROM users;\n",'.sql');
  assert.ok(!sqlSkel.includes('header'));
  assert.ok(sqlSkel.includes("'-- keep'"));

  const indented=minifyContext('def foo():\n    x   =   1\n\n\n\n    return   x  ');
  assert.equal(indented,'def foo():\n    x = 1\n\n    return x');
});

test('tokens: getSessionTokenUsage parses PLANNER_RESPONSE/USER_INPUT, skips subagents, and uses active-session.json',()=>{
  fixture();
  try{
    const appData=path.join(state.base,'ag');
    process.env.ANTIGRAVITY_APP_DATA_DIR=appData;
    const mainDir=path.join(appData,'brain','conv-main-111','.system_generated','logs');
    const subDir=path.join(appData,'brain','conv-sub-222','.system_generated','logs');
    fs.mkdirSync(mainDir,{recursive:true});
    fs.mkdirSync(subDir,{recursive:true});

    const mainLog=[
      JSON.stringify({type:'USER_INPUT',step_index:0}),
      JSON.stringify({type:'GENERIC',step_index:1}),
      JSON.stringify({type:'PLANNER_RESPONSE',step_index:2,model:'gemini-4-hydrogen-tiered-high',input_tokens:5000,cache_read_tokens:4000,output_tokens:200,tool_calls:[{name:'call_mcp_tool',args:{ServerName:'a2a_a2a',ToolName:'a2a_impact'}}]}),
      JSON.stringify({type:'PLANNER_RESPONSE',step_index:3,model:'gemini-4-hydrogen-tiered-high',input_tokens:6000,cache_read_tokens:5200,output_tokens:150,tool_calls:[{name:'read_file',args:{Path:'/tmp/a'}}]}),
    ].join('\n')+'\n';
    const subLog=[
      JSON.stringify({type:'SYSTEM_MESSAGE',content:'<subagent_reminder>subagent</subagent_reminder>'}),
      JSON.stringify({type:'PLANNER_RESPONSE',step_index:1,input_tokens:99999,cache_read_tokens:0,output_tokens:10}),
    ].join('\n')+'\n';

    const mainFile=path.join(mainDir,'transcript.jsonl');
    const subFile=path.join(subDir,'transcript.jsonl');
    fs.writeFileSync(mainFile,mainLog);
    fs.writeFileSync(subFile,subLog);
    const future=new Date(Date.now()+5000);
    fs.utimesSync(subFile,future,future);

    // Never fall back to another conversation by timestamp, including subagents.
    assert.equal(getSessionTokenUsage(null,{dataDirPath:process.env.VERIFYKIT_DATA_DIR}),null);
    const usage=getSessionTokenUsage('conv-main-111',{dataDirPath:process.env.VERIFYKIT_DATA_DIR});
    assert.equal(usage.conversation_id,'conv-main-111');
    assert.equal(usage.llm_steps,2);
    assert.equal(usage.status,'diagnostic_only');
    assert.equal(usage.user_turns,1);
    assert.equal(usage.total_tokens_consumed,null);
    assert.equal(usage.usage,null);
    assert.equal(usage.cache_hit_ratio,null);
    assert.equal(usage.tool_calls.a2a_calls,1);
    assert.equal(usage.tool_calls.read_file_calls,1);
    assert.equal(usage.cost_estimate,null);

    // Traversal conversationId is rejected
    assert.equal(getSessionTokenUsage('../evil'),null);

    // Hook persists active-session.json and takes precedence
    const hookOut=handleHookEvent({
      hookEventName:'SessionStart',
      conversationId:'conv-main-111',
      transcriptPath:mainFile,
      workspacePaths:[state.root],
      cwd:state.root,
    },{baseDir:process.env.VERIFYKIT_DATA_DIR});
    assert.deepEqual(hookOut,{}); // on-demand must not inject instruction tokens
    setVerifyKitMode('always-on');
    const activeHook=handleHookEvent({hookEventName:'SessionStart',conversationId:'conv-main-111',transcriptPath:mainFile,workspacePaths:[state.root],cwd:state.root},{baseDir:process.env.VERIFYKIT_DATA_DIR});
    assert.ok(Array.isArray(activeHook.injectSteps));
    const hookUsage=getSessionTokenUsage(null,{workspace:state.root,dataDirPath:process.env.VERIFYKIT_DATA_DIR});
    assert.equal(hookUsage.source,'active-session-hook');
    assert.equal(hookUsage.conversation_id,'conv-main-111');
  }finally{cleanup()}
});

test('engine: skeleton action, measured telemetry, and compact mode output stripping',()=>withEngine((e,root,write)=>{
  write('src/sample.js','// comment to strip\nconst u = "https://example.com//keep";\nexport function hello() { return u; }\n');
  const skel=e.context({workspace:root,action:'skeleton',file:'src/sample.js'});
  assert.equal(skel.files.length,1);
  assert.ok(!skel.files[0].skeleton.includes('comment to strip'));
  assert.ok(skel.files[0].skeleton.includes('https://example.com//keep'));
  assert.ok(skel.summary.estimated_source_tokens>=skel.summary.estimated_preview_tokens);
  assert.equal(skel.summary.tokens_saved,undefined);

  const tok=e.context({workspace:root,action:'tokens'});
  assert.ok(tok.workspace_tokens.compact_index_tokens>0);
  assert.equal(tok.workspace_tokens.efficiency.verifykit_compact_tokens,undefined);
  assert.ok(tok.workspace_tokens.tool_payload_estimates.calls>=1);
  assert.equal(tok.workspace_tokens.net_token_savings_pct,null);

  setCompactMode(true);
  const compactInspect=e.context({workspace:root,action:'inspect'});
  assert.equal(compactInspect.compact,true);
  assert.ok(Array.isArray(compactInspect.limitations));
  const compactImpact=e.impact({workspace:root,changed:['src/auth.js']});
  assert.equal(compactImpact.compact,true);
  assert.ok(Array.isArray(compactImpact.uncertainty));
}));

test('storage & scanner: revert updates latest(), gitChanges handles rename, extractSymbols supports Go/Swift/Kotlin, impact normalizes paths',()=>withEngine((e,root,write)=>{
  // 1. Revert test (v1 -> v2 -> v1 in <1ms)
  const r1=e.context({workspace:root});
  write('src/auth.js','export function login() { return false }\n');
  const r2=e.context({workspace:root});
  assert.notEqual(r1.revision,r2.revision);
  write('src/auth.js','export function login() { return true }\n');
  const r3=e.context({workspace:root});
  assert.equal(r3.revision,r1.revision);
  assert.equal(e.store.latest(r1.workspace_id).id,r1.revision);

  // 2. transaction() guards ROLLBACK when BEGIN fails
  assert.throws(()=>e.store.transaction(()=>{throw new Error('inner boom')}),/inner boom/);

  // 3. Path normalization in analyzeImpact()
  const imp=e.impact({workspace:root,changed:['./src/auth.js']});
  assert.equal(imp.changed[0],'src/auth.js');
  assert.ok(imp.affected.some(n=>n.path==='src/page.js'));

  // 4. Go/Swift/Kotlin symbol extraction + comment awareness
  const syms=extractSymbols('// class CommentedOut {}\nfunc (s *Srv) HandleRequest() {}\ntype Config struct {}\nfun buildApp() {}\n','.go');
  assert.ok(syms.some(s=>s.name==='HandleRequest'));
  assert.ok(syms.some(s=>s.name==='Config'));
  assert.ok(syms.some(s=>s.name==='buildApp'));
  assert.ok(!syms.some(s=>s.name==='CommentedOut'));

  // 5. gitChanges rename keeps new path instead of old path
  const gitRepo=path.join(state.base,'gitrepo');
  fs.mkdirSync(gitRepo);
  spawnSync('git',['init'],{cwd:gitRepo});
  spawnSync('git',['config','user.email','test@example.com'],{cwd:gitRepo});
  spawnSync('git',['config','user.name','Test'],{cwd:gitRepo});
  fs.writeFileSync(path.join(gitRepo,'old.js'),'export const x=1;\n');
  spawnSync('git',['add','.'],{cwd:gitRepo});
  spawnSync('git',['commit','-m','init'],{cwd:gitRepo});
  spawnSync('git',['mv','old.js','new.js'],{cwd:gitRepo});
  const changes=gitChanges(gitRepo);
  assert.deepEqual(changes,['new.js']);
}));

test('verification & validation: <testsuites> aggregation, a2a-test-report-v1, and nested array item validation',()=>{
  const junit='<testsuites name="vitest"><testsuite name="a" tests="1" failures="0"><testcase name="t1"/></testsuite><testsuite name="b" tests="1" failures="1"><testcase name="t2"><failure/></testcase></testsuite></testsuites>';
  const parsedJunit=parseArtifact(junit,'results.xml');
  assert.equal(parsedJunit.status,'failed');
  assert.equal(parsedJunit.assertions,2);
  assert.equal(parsedJunit.failed,1);

  const jsonRep=JSON.stringify({format:'a2a-test-report-v1',completed:true,cases:[{name:'c1',state:'passed'}]});
  const parsedJson=parseArtifact(jsonRep,'report.json');
  assert.equal(parsedJson.status,'passed');
  assert.equal(parsedJson.format,'a2a-test-report-v1');

  assert.equal(TOOLS.length,4);
  assert.equal(ALL_TOOLS.length,8);
  assert.equal(getListedTools().length,4);
  process.env.A2A_LEGACY_TOOL_ALIASES='1';
  assert.equal(getListedTools().length,8);
  delete process.env.A2A_LEGACY_TOOL_ALIASES;

  assert.throws(()=>validateArgs('a2a_impact',{workspace:'/tmp',changed:[123]}),/Invalid type/);
  assert.throws(()=>validateArgs('a2a_verify',{workspace:'/tmp',operation:'assess',criteria:[{artifact:'a.xml'}]}),/Invalid item/);
  assert.throws(()=>validateArgs('a2a_verify',{workspace:'/tmp',operation:'assess',criteria:[{id:'c1',evil:true}]}),/Invalid item/);
});

test('side questions: persists, lists by parent/conversation, and integrates with evidence tool',()=>withEngine((e,root)=>{
  const sq=e.store.recordSideQuestion({
    workspaceId:e.store.register(root),
    conversationId:'child-conv-999',
    parentConversationId:'parent-conv-111',
    title:'Testing Rate Limits',
    question:'How do we implement leaky bucket in Go?',
    summary:'Use token bucket with atomic timestamps.',
    status:'resolved'
  });
  assert.equal(sq.conversation_id,'child-conv-999');
  assert.equal(sq.parent_conversation_id,'parent-conv-111');

  const listParent=e.store.listSideQuestions({parentConversationId:'parent-conv-111'});
  assert.equal(listParent.length,1);
  assert.equal(listParent[0].title,'Testing Rate Limits');

  const queryViaEvidence=e.evidence({workspace:root,operation:'side_questions'});
  assert.ok(queryViaEvidence.count>=1);
  assert.equal(queryViaEvidence.items[0].conversation_id,'child-conv-999');
}));

test('teamwork & subagent verification: verify_handoff enforces machine evidence and timestamp freshness',()=>withEngine((e,root)=>{
  // Setup source file and fresh test report
  fs.writeFileSync(path.join(root,'feature.mjs'),'export const add=(a,b)=>a+b;\n');
  const srcStat=fs.statSync(path.join(root,'feature.mjs'));

  // 1. Missing evidence when no report exists
  const missingRes=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-1',changed:['feature.mjs']});
  assert.equal(missingRes.verified,false);
  assert.equal(missingRes.status,'missing_evidence');

  // 2. Fresh passing JUnit report
  const freshXml='<testsuite tests="2" failures="0" errors="0" skipped="0"><testcase name="testAdd"/><testcase name="testAddNegatives"/></testsuite>';
  fs.writeFileSync(path.join(root,'report.xml'),freshXml);
  // Ensure artifact timestamp is after source modification
  const futureTime=(srcStat.mtimeMs+5000)/1000;
  fs.utimesSync(path.join(root,'report.xml'),futureTime,futureTime);

  const passingRes=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-1',artifact:'report.xml',changed:['feature.mjs'],criteria:['testAdd']});
  assert.equal(passingRes.verified,false);
  assert.equal(passingRes.tests_passed,true);
  assert.equal(passingRes.deliverable_verified,false);
  assert.equal(passingRes.status,'unattested_report');
  assert.equal(passingRes.assertions,2);
  assert.equal(passingRes.failed,0);
  assert.equal(passingRes.fresh,true);

  // False-PASS prevention: passing test suite without mapped criteria cannot verify deliverable
  const unmappedRes=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-1',artifact:'report.xml',changed:['feature.mjs']});
  assert.equal(unmappedRes.tests_passed,true);
  assert.equal(unmappedRes.deliverable_verified,false);
  assert.equal(unmappedRes.verified,false);
  assert.equal(unmappedRes.status,'unverified_deliverable');

  // 3. Stale report: modify source file AFTER artifact timestamp
  const srcFuture=(futureTime*1000+5000)/1000;
  fs.utimesSync(path.join(root,'feature.mjs'),srcFuture,srcFuture);
  const staleRes=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-1',artifact:'report.xml',changed:['feature.mjs'],criteria:['testAdd']});
  assert.equal(staleRes.verified,false);
  assert.equal(staleRes.status,'stale');
  assert.equal(staleRes.fresh,false);

  // Even an explicit stale override must not authorize verified=true
  const allowedStale=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-1',artifact:'report.xml',changed:['feature.mjs'],criteria:['testAdd'],allow_stale:true});
  assert.equal(allowedStale.verified,false);
  assert.equal(allowedStale.status,'stale');

  // 4. Failing test report
  const failXml='<testsuite tests="2" failures="1" errors="0" skipped="0"><testcase name="testAdd"/><testcase name="testAddBroken"><failure message="Assertion error"/></testcase></testsuite>';
  fs.writeFileSync(path.join(root,'report.xml'),failXml);
  const newerTime=(srcFuture*1000+5000)/1000;
  fs.utimesSync(path.join(root,'report.xml'),newerTime,newerTime);
  const failingRes=e.verify({workspace:root,operation:'verify_handoff',worker_name:'worker-2',artifact:'report.xml',changed:['feature.mjs'],criteria:['testAdd']});
  assert.equal(failingRes.verified,false);
  assert.equal(failingRes.status,'failed');
  assert.equal(failingRes.failed,1);
  assert.ok(failingRes.failed_cases.includes('testAddBroken'));
}));

test('artifact versioning: snapshots versions, computes unified diffs, and integrates with evidence tool',()=>withEngine((e,root)=>{
  const brainDir=path.join(root,'brain','conv-art-123');
  fs.mkdirSync(brainDir,{recursive:true});
  const walkFile=path.join(brainDir,'walkthrough.md');

  fs.writeFileSync(walkFile,'# Walkthrough\nInitial task overview\n- Item 1\n');
  const snap1=e.store.snapshotArtifact({workspaceId:e.store.register(root),workspaceRoot:root,conversationId:'conv-art-123',artifactPath:walkFile});
  assert.equal(snap1.version_number,1);
  assert.equal(snap1.changed,true);

  const snapDup=e.store.snapshotArtifact({workspaceId:e.store.register(root),workspaceRoot:root,conversationId:'conv-art-123',artifactPath:walkFile});
  assert.equal(snapDup.changed,false);
  assert.equal(snapDup.version_number,1);

  fs.writeFileSync(walkFile,'# Walkthrough\nInitial task overview\n- Item 1 (verified)\n- Item 2 added\n');
  const snap2=e.store.snapshotArtifact({workspaceId:e.store.register(root),workspaceRoot:root,conversationId:'conv-art-123',artifactPath:walkFile});
  assert.equal(snap2.version_number,2);
  assert.equal(snap2.changed,true);
  assert.ok(snap2.diff_from_previous.includes('-- Item 1'));
  assert.ok(snap2.diff_from_previous.includes('+- Item 1 (verified)'));
  assert.ok(snap2.diff_from_previous.includes('+- Item 2 added'));

  const listRes=e.evidence({workspace:root,operation:'artifact_versions',conversation_id:'conv-art-123',artifact_name:'walkthrough.md'});
  assert.equal(listRes.count,2);

  const diffRes=e.evidence({workspace:root,operation:'artifact_diff',conversation_id:'conv-art-123',artifact_name:'walkthrough.md'});
  assert.equal(diffRes.v1,1);
  assert.equal(diffRes.v2,2);
  assert.ok(diffRes.diff.includes('+- Item 2 added'));
}));

test('A2A semantic JSON reports do not change their own source revision',()=>withEngine((e,root,write)=>{
 const baseline=e.sync(root,{verifyIntegrity:true});
 const report={revision:baseline.revision,claims:[{id:'retry-case',scenario:'lost-response-retry',evidence:[]}]};
 write('reports/scenarios.json',JSON.stringify(report));
 const result=e.verify({workspace:root,operation:'assess_semantic',artifact:'reports/scenarios.json'});
 assert.equal(result.report_status,'insufficient-evidence');
 assert.equal(result.current_revision,baseline.revision);
 assert.equal(e.sync(root,{verifyIntegrity:true}).revision,baseline.revision);
 // Tampering invalidates the stored evidence hash even though reports do not change source revisions.
 write('reports/scenarios.json',JSON.stringify({...report,note:'modified evidence'}));
 const history=e.context({workspace:root,action:'freshness'});
 assert.ok(history.evidence.some(x=>x.artifact_intact===false));
 assert.equal(e.sync(root,{verifyIntegrity:true}).revision,baseline.revision);
 write('src/config.json',JSON.stringify({enabled:true}));
 assert.notEqual(e.sync(root,{verifyIntegrity:true}).revision,baseline.revision);
 const stale=e.verify({workspace:root,operation:'assess_semantic',artifact:'reports/scenarios.json'});
 assert.equal(stale.report_status,'stale');
}));
test('ordinary source JSON remains revision-bound even within reports folder',()=>withEngine((e,root,write)=>{
 const before=e.sync(root,{verifyIntegrity:true});
 write('reports/app-configuration.json',JSON.stringify({feature:true}));
 const after=e.sync(root,{verifyIntegrity:true});
 assert.notEqual(before.revision,after.revision);
}));


test('read-only evidence and run views invalidate freshness after same-size source edits',()=>withEngine((e,root,write)=>{
  write('reports/regression.tap','TAP version 13\n1..1\nok 1 - works\n');
  const observed=e.verify({workspace:root,operation:'assess',criteria:[{id:'integrity',artifact:'reports/regression.tap',test_name:'works'}]});
  assert.equal(observed.verdict,'passed');
  const before=e.evidence({workspace:root,operation:'list'});
  assert.ok(before.items.some(x=>x.fresh===true));
  const originalFile=path.join(root,'src/auth.js');
  const previous=fs.statSync(originalFile);
  const original=fs.readFileSync(originalFile,'utf8');
  const changed=original.replace('true','null');
  assert.equal(Buffer.byteLength(changed),Buffer.byteLength(original));
  fs.writeFileSync(originalFile,changed);
  fs.utimesSync(originalFile,previous.atime,previous.mtime);
  const after=e.evidence({workspace:root,operation:'list'});
  assert.notEqual(before.revision,after.revision);
  assert.ok(after.items.some(x=>x.fresh===false));
  const runs=e.evidence({workspace:root,operation:'runs'});
  assert.ok(runs.runs.some(x=>x.fresh===false));
}));


test('impact, query, preview and verification use new source even when size and mtime are unchanged',()=>withEngine((e,root,write)=>{
  write('src/misc.js','export function login() { return false }\n');
  const before=e.impact({workspace:root,changed:['src/auth.js']});
  assert.ok(before.affected.some(x=>x.path==='src/page.js'));
  const filename=path.join(root,'src/page.js');
  const stat=fs.statSync(filename);
  const original=fs.readFileSync(filename,'utf8');
  const modified=original.replace("from './auth.js'","from './misc.js'");
  assert.notEqual(modified,original);
  assert.equal(Buffer.byteLength(modified),Buffer.byteLength(original));
  fs.writeFileSync(filename,modified);
  fs.utimesSync(filename,stat.atime,stat.mtime);
  const after=e.impact({workspace:root,changed:['src/auth.js']});
  assert.notEqual(after.revision,before.revision);
  assert.ok(!after.affected.some(x=>x.path==='src/page.js'));
  const query=e.context({workspace:root,action:'query',query:'page'});
  assert.equal(query.revision,after.revision);
  assert.ok(query.relations.some(x=>x.source==='file:src/page.js'&&x.target==='file:src/misc.js'));
  const skeleton=e.context({workspace:root,action:'skeleton',file:'src/page.js'});
  assert.equal(skeleton.revision,after.revision);
  assert.ok(skeleton.files[0].skeleton.includes('misc.js'));
  const plan=e.verify({workspace:root,operation:'plan',criteria:['Import target must exist']});
  assert.equal(plan.revision,after.revision);
}));


test('multi-criterion assessment rolls back previously inserted evidence when later artifact is invalid',()=>withEngine((e,root,write)=>{
  write('reports/valid.tap','TAP version 13\n1..1\nok 1 - works\n');
  assert.throws(()=>e.verify({workspace:root,operation:'assess',criteria:[
    {id:'first-valid',artifact:'reports/valid.tap',test_name:'works'},
    {id:'second-missing',artifact:'reports/missing.tap',test_name:'works'}
  ]}),/ENOENT|no such file|not found/);
  const after=e.evidence({workspace:root,operation:'list'});
  assert.equal(after.items.length,0);
  const runs=e.evidence({workspace:root,operation:'runs'});
  assert.equal(runs.runs.length,0);
  const valid=e.verify({workspace:root,operation:'assess',criteria:[
    {id:'first-valid',artifact:'reports/valid.tap',test_name:'works'}
  ]});
  assert.equal(valid.verdict,'passed');
  assert.equal(e.evidence({workspace:root,operation:'list'}).items.length,1);
}));


test('inspection never trusts file stat metadata alone for revision freshness',()=>withEngine((e,root,write)=>{
  const first=e.context({workspace:root,action:'inspect'});
  const file=path.join(root,'src/auth.js');
  const stat=fs.statSync(file);
  const old=fs.readFileSync(file,'utf8');
  const next=old.replace('true','null');
  assert.equal(old.length,next.length);
  fs.writeFileSync(file,next);
  fs.utimesSync(file,stat.atime,stat.mtime);
  const refreshed=e.context({workspace:root,action:'inspect'});
  assert.notEqual(refreshed.revision,first.revision);
}));
