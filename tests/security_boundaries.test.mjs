import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';
import {Database} from '../src/sqlite-compat.mjs';
import {Engine} from '../src/engine.mjs';
import {readSafeBytesFile,readSafeJsonFile,loadAntigravityWorkspaces,invalidateWorkspaceCache,authorizeWorkspace} from '../src/security.mjs';

test('bounded descriptor-pinned reads reject oversized, symlinked and group-writable metadata',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-io-negative-'));
 const orig=process.env.HOME;
 try{
  process.env.HOME=tmp;
  const root=path.join(tmp,'.config','a2a');
  fs.mkdirSync(root,{recursive:true});
  const conf=path.join(root,'trusted-evaluators.json');
  fs.writeFileSync(conf,'{"keys":{}}',{mode:0o600});
  assert.equal(readSafeJsonFile(conf,{maxBytes:1024,checkParentDir:true,requirePrivateMode:true}).ok,true);
  if(process.platform!=='win32'){
    fs.chmodSync(conf,0o664);
    assert.equal(readSafeJsonFile(conf,{maxBytes:1024,checkParentDir:true,requirePrivateMode:true}).reason,'unsafe_mode');
    fs.chmodSync(conf,0o600);
  }
  const sparse=path.join(tmp,'oversized.xml'),fd=fs.openSync(sparse,'w');
  try{fs.ftruncateSync(fd,100*1024*1024)}finally{fs.closeSync(fd)}
  assert.equal(readSafeBytesFile(sparse,{maxBytes:4*1024*1024}).reason,'too_large');
  const alias=path.join(tmp,'linked.json');
  try{
    fs.symlinkSync(conf,alias,'file');
    assert.equal(readSafeJsonFile(alias,{maxBytes:1024}).ok,false);
  }catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error}
  const elsewhere=path.join(tmp,'elsewhere');fs.mkdirSync(elsewhere);
  const link=path.join(root,'linked'); 
  try{
    fs.symlinkSync(elsewhere,link,'dir');
    const symlinkChild=path.join(link,'config.json');
    fs.writeFileSync(path.join(elsewhere,'config.json'),'{"ok":true}');
    assert.equal(readSafeJsonFile(symlinkChild,{maxBytes:1024,checkParentDir:true}).reason,'symlink_parent');
  }catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error}
  fs.writeFileSync(conf,'{"unclosed":');
  assert.equal(readSafeJsonFile(conf,{maxBytes:1024}).reason,'invalid_json');
 }finally{
  if(orig===undefined)delete process.env.HOME;else process.env.HOME=orig;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});

test('workspace trust parsing cannot recurse indefinitely through cyclic .code-workspace files',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-workspace-cycle-'));
 const original=process.env.HOME;
 try{
  process.env.HOME=tmp;
  const folder=path.join(tmp,'project');fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder,'package.json'),'{"name":"loop"}');
  const loop=path.join(folder,'loop.code-workspace');
  fs.writeFileSync(loop,JSON.stringify({folders:[{path:'loop.code-workspace'}]}));
  const settings=path.join(tmp,'.gemini','antigravity','settings.json');
  fs.mkdirSync(path.dirname(settings),{recursive:true});
  fs.writeFileSync(settings,JSON.stringify({trustedWorkspaces:[loop]}));
  invalidateWorkspaceCache();
  const roots=loadAntigravityWorkspaces({bypassCache:true});
  assert.ok(Array.isArray(roots));
  assert.ok(roots.length<=3);
 }finally{
  if(original===undefined)delete process.env.HOME;else process.env.HOME=original;
  invalidateWorkspaceCache();
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});

test('side question caller-supplied id cannot overwrite another workspace record',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-cross-ws-'));
 const s=new Store(path.join(tmp,'db'));
 try{
  const a=path.join(tmp,'repo-a'),b=path.join(tmp,'repo-b');fs.mkdirSync(a);fs.mkdirSync(b);
  const wsA=s.register(a),wsB=s.register(b),id='collision-record';
  s.recordSideQuestion({id,workspaceId:wsA,conversationId:'conv-from-a',question:'original question'});
  assert.throws(()=>s.recordSideQuestion({id,workspaceId:wsB,conversationId:'conv-from-b',question:'forged overwrite'}),/another workspace|ownership/i);
  const owner=s.get('SELECT workspace_id,question FROM side_questions WHERE id=?',id);
  assert.equal(owner.workspace_id,wsA);
  assert.equal(owner.question,'original question');
 }finally{s.close();fs.rmSync(tmp,{recursive:true,force:true})}
});

test('release config with insecure permissions fails closed with actionable diagnostics and no paths',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-release-config-'));
 const oldHome=process.env.HOME,oldData=process.env.A2A_DATA_DIR;
 let engine;
 try{
  process.env.HOME=tmp;process.env.A2A_DATA_DIR=path.join(tmp,'data');
  const work=path.join(tmp,'workspace');fs.mkdirSync(work);
  fs.writeFileSync(path.join(work,'package.json'),'{"name":"release-config-test"}');
  authorizeWorkspace(work);
  const cfg=path.join(tmp,'.config','a2a');
  const trust=path.join(cfg,'trusted-evaluators.json');
  const registry=path.join(cfg,'acceptance-registry.json');
  fs.writeFileSync(trust,'{}',{mode:0o600});
  fs.writeFileSync(registry,JSON.stringify({schema:'a2a-acceptance-registry-v1',scenarios:[]}),{mode:0o600});
  if(process.platform!=='win32'){fs.chmodSync(trust,0o664);fs.chmodSync(registry,0o664);}
  else{fs.writeFileSync(trust,'{invalid');fs.writeFileSync(registry,'{invalid');}
  const manifest={revision:'unverified',evaluator:{independent:true,name:'external-fixture'},scenarios:[
   {id:'F01',requirement:'Independent scenario',verdict:'not-tested',critical:true,evidence:[]}
  ]};
  fs.writeFileSync(path.join(work,'release.json'),JSON.stringify(manifest));
  engine=new Engine();
  const result=engine.verify({workspace:work,operation:'assess_release',artifact:'release.json'});
  assert.equal(result.release_ready,false);
  assert.ok(result.limitations.some(x=>x.includes('trusted-evaluators config rejected')));
  assert.ok(result.limitations.some(x=>x.includes('acceptance-registry config rejected')));
  assert.ok(!result.limitations.join(' ').includes(tmp));
 }finally{
  if(engine)engine.close();
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldData===undefined)delete process.env.A2A_DATA_DIR;else process.env.A2A_DATA_DIR=oldData;
  invalidateWorkspaceCache();
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});

test('IDE trusted workspace discovery rejects symlinked SQLite and oversized JSON metadata',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-ide-metadata-'));
 const oldHome=process.env.HOME;
 try{
  process.env.HOME=tmp;
  const work=path.join(tmp,'trusted-project');
  fs.mkdirSync(work);fs.writeFileSync(path.join(work,'package.json'),'{"name":"trusted-project"}');
  const dbDir=path.join(tmp,'.config','Antigravity IDE','User','globalStorage');
  fs.mkdirSync(dbDir,{recursive:true});
  const rawDb=path.join(tmp,'external.db');
  const db=new Database(rawDb);
  db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY,value TEXT)');
  db.prepare('INSERT INTO ItemTable(key,value) VALUES(?,?)').run('content.trust.model.key',JSON.stringify({uriTrustInfo:[
   {trusted:true,uri:{fsPath:work}}
  ]}));
  db.close();
  try{
   fs.symlinkSync(rawDb,path.join(dbDir,'state.vscdb'),'file');
   invalidateWorkspaceCache();
   assert.ok(!loadAntigravityWorkspaces({bypassCache:true}).includes(work));
  }catch(err){if(!['EPERM','EACCES','ENOTSUP'].includes(err.code))throw err}
  const cli=path.join(tmp,'.gemini','antigravity','settings.json');
  fs.mkdirSync(path.dirname(cli),{recursive:true});
  fs.writeFileSync(cli,JSON.stringify({trustedWorkspaces:[work],padding:'x'.repeat(200000)}));
  invalidateWorkspaceCache();
  assert.ok(!loadAntigravityWorkspaces({bypassCache:true}).includes(work));
 }finally{
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  invalidateWorkspaceCache();
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});

test('descriptor readers have an absolute byte cap even if a file grows after fstat',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-growth-race-'));
 const file=path.join(tmp,'report.json');
 fs.writeFileSync(file,'{}');
 const previous=fs.readSync;
 let calls=0;
 try{
  // Simulate a concurrently growing file: each low-level read has more bytes
  // available than its original fstat size. Never allocate or read past cap+1.
  fs.readSync=(fd,buffer,offset,length,position)=>{
    calls++;
    buffer.fill(0x61,offset,offset+length);
    return length;
  };
  const result=readSafeBytesFile(file,{maxBytes:128});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'too_large');
  assert.ok(calls>0&&calls<=2,'bounded reader must stop at 129 bytes');
 }finally{
  fs.readSync=previous;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
