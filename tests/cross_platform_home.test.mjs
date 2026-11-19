import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,getHomeDir,isSamePath,isSameOrDescendantPath,safeArtifactPath} from '../src/security.mjs';

test('same-path and descendant comparisons respect platform case and /private alias semantics',()=>{
 const root=process.platform==='win32'?'C:\\Repo\\Work':'/tmp/Repo/Work';
 assert.equal(isSamePath(root,root),true);
 assert.equal(isSameOrDescendantPath(root,path.join(root,'sub','file.md')),true);
 assert.equal(isSameOrDescendantPath(root,path.join(root,'..','outside')),false);
 assert.equal(isSameOrDescendantPath(root,root+'-elsewhere'),false);
 if(process.platform==='darwin'){
  assert.equal(isSamePath('/private/var/tmp/Repo','/var/tmp/repo'),true);
  assert.equal(isSameOrDescendantPath('/var/tmp/Repo','/private/var/tmp/repo/nested'),true);
 }else if(process.platform==='win32'){
  assert.equal(isSamePath('C:\\Repo\\Work','c:\\repo\\work'),true);
  assert.equal(isSameOrDescendantPath('C:\\Repo','c:\\repo\\work'),true);
 }else{
  assert.equal(isSamePath('/tmp/Repo','/tmp/repo'),false);
  assert.equal(isSamePath('/private/var/tmp','/var/tmp'),false);
 }
});

test('data directory can never chmod override HOME even when OS home differs',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-home-protect-'));
 const old=process.env.HOME;
 try{
  process.env.HOME=tmp;
  assert.equal(getHomeDir(),tmp);
  const before=fs.statSync(tmp).mode;
  assert.throws(()=>new Store(tmp),/dedicated private directory/);
  assert.equal(fs.statSync(tmp).mode,before);
 }finally{
  if(old===undefined)delete process.env.HOME;else process.env.HOME=old;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});

test('relative workspace artifact snapshot resolves against workspace rather than MCP server CWD',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-relative-snapshot-'));
 const oldHome=process.env.HOME,oldData=process.env.A2A_DATA_DIR;
 let engine=null;
 try{
  process.env.HOME=tmp;
  process.env.A2A_DATA_DIR=path.join(tmp,'db');
  const work=path.join(tmp,'project');fs.mkdirSync(work);
  fs.writeFileSync(path.join(work,'package.json'),'{"name":"snapshot"}');
  fs.writeFileSync(path.join(work,'notes.md'),'Verified local note');
  authorizeWorkspace(work);
  engine=new Engine();
  const result=engine.evidence({workspace:work,operation:'snapshot_artifact',conversation_id:'test-conversation-123',artifact_path:'notes.md'});
  assert.equal(result.status,'snapshotted');
  assert.equal(result.snapshot.artifact_name,'notes.md');
  assert.throws(()=>engine.evidence({workspace:work,operation:'snapshot_artifact',conversation_id:'test-conversation-123',artifact_path:'../escape.md'}),/outside|authorized|escapes|denied|not belong/i);
 }finally{
  if(engine)engine.close();
  if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
  if(oldData===undefined)delete process.env.A2A_DATA_DIR;else process.env.A2A_DATA_DIR=oldData;
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
