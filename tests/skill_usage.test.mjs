import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';

test('Skill usage is recorded only with explicit host-observed activation evidence',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-usage-'));
 const db=path.join(root,'private-store');
 const workspace=path.join(root,'workspace');
 fs.mkdirSync(workspace);
 const store=new Store(db);
 try{
  const workspaceId=store.register(workspace);
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'laravel-api'}),/host-observed/);
  assert.deepEqual(store.getSkillUsage(workspaceId),{});
  const first=store.recordSkillUsage({workspaceId,skillName:'Laravel-API',source:'workspace',activationEvidence:'host_observed'});
  assert.equal(first.skill_name,'laravel-api');
  assert.equal(first.usage_count,1);
  const second=store.recordSkillUsage({workspaceId,skillName:'laravel-api',source:'global',activationEvidence:'host_observed'});
  assert.equal(second.usage_count,2);
  assert.deepEqual(store.getSkillUsage(workspaceId),{'laravel-api':2});
  assert.equal(store.getSkillUsage('unknown-workspace').constructor,Object);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('Skill usage stores no task or prompt content and is workspace isolated',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-usage-isolation-'));
 const store=new Store(path.join(root,'db'));
 try{
  const a=store.register(path.join(root,'a'));
  const b=store.register(path.join(root,'b'));
  store.recordSkillUsage({workspaceId:a,skillName:'security-review',source:'global',activationEvidence:'host_observed'});
  assert.deepEqual(store.getSkillUsage(a),{'security-review':1});
  assert.deepEqual(store.getSkillUsage(b),{});
  const columns=store.all('PRAGMA table_info(skill_usage)').map(x=>x.name);
  assert.deepEqual(columns,['workspace_id','skill_name','source','usage_count','last_used_at']);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('Skill usage rejects invalid source and unsafe names',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-usage-validation-'));
 const store=new Store(path.join(root,'db'));
 try{
  const workspaceId=store.register(path.join(root,'workspace'));
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'bad\nname',source:'external',activationEvidence:'host_observed'}),/Invalid Skill/);
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'skill',source:'external',activationEvidence:'host_observed'}),/Invalid Skill source/);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});
