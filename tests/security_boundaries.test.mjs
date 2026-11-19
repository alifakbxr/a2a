import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';
import {readSafeBytesFile,readSafeJsonFile,loadAntigravityWorkspaces,invalidateWorkspaceCache} from '../src/security.mjs';

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
