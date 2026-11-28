import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';

test('Skill usage is recorded only with explicit host-observed full-read evidence',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-usage-'));
 const db=path.join(root,'private-store');
 const workspace=path.join(root,'workspace');
 fs.mkdirSync(workspace);
 const store=new Store(db);
 try{
  const workspaceId=store.register(workspace);
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'laravel-api'}),/host-observed/);
  assert.deepEqual(store.getSkillUsage(workspaceId),{});
  const first=store.recordSkillUsage({workspaceId,skillName:'Laravel-API',source:'workspace',observationEvidence:'host_observed_full_read'});
  assert.equal(first.skill_name,'laravel-api');
  assert.equal(first.usage_count,1);
  const second=store.recordSkillUsage({workspaceId,skillName:'laravel-api',source:'global',observationEvidence:'host_observed_full_read'});
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
  store.recordSkillUsage({workspaceId:a,skillName:'security-review',source:'global',observationEvidence:'host_observed_full_read'});
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
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'bad\nname',source:'external',observationEvidence:'host_observed_full_read'}),/Invalid Skill/);
  assert.throws(()=>store.recordSkillUsage({workspaceId,skillName:'skill',source:'external',observationEvidence:'host_observed_full_read'}),/Invalid Skill source/);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('Skill guidance fingerprint is deduplicated per authorized workspace and conversation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-guidance-state-'));
 const store=new Store(path.join(root,'db'));
 try{
  const workspaceId=store.register(path.join(root,'workspace'));
  const fingerprint='a'.repeat(64);
  assert.equal(store.shouldInjectSkillRecommendation({workspaceId,conversationId:'conv-guidance-1',fingerprint}),true);
  assert.equal(store.shouldInjectSkillRecommendation({workspaceId,conversationId:'conv-guidance-1',fingerprint}),false);
  assert.equal(store.shouldInjectSkillRecommendation({workspaceId,conversationId:'conv-guidance-1',fingerprint:'b'.repeat(64)}),true);
  assert.equal(store.shouldInjectSkillRecommendation({workspaceId,conversationId:'conv-guidance-1',fingerprint:'c'.repeat(64)}),false,'per-conversation injection cap is two');
  assert.equal(store.get('SELECT injection_count FROM skill_recommendation_state WHERE workspace_id=? AND conversation_id=?',workspaceId,'conv-guidance-1').injection_count,2);
  assert.equal(store.shouldInjectSkillRecommendation({workspaceId,conversationId:'conv-guidance-2',fingerprint}),true);
  assert.throws(()=>store.shouldInjectSkillRecommendation({workspaceId,conversationId:'../bad',fingerprint}),/conversation ID/);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('accepts every discovered manifest source category',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-source-'));
 const store=new Store(root);
 try{
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-source-workspace-'));
  const id=store.register(workspace);
  for(const source of ['personal-workspace','workspace-manifest','global-manifest'])
   assert.equal(store.recordSkillUsage({workspaceId:id,skillName:'sample-skill',source,observationEvidence:'host_observed_full_read'}).source,source);
  fs.rmSync(workspace,{recursive:true,force:true});
 }finally{store.close();fs.rmSync(root,{recursive:true,force:true})}
});
