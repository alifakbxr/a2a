import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/storage.mjs';
import {recommendSkills} from '../src/skill-discovery.mjs';
import {rankSkills} from '../src/skill-ranking.mjs';

test('recommendSkills combines the local catalog with workspace-scoped observed usage',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-recommend-'));
 const home=path.join(root,'home');
 const workspace=path.join(home,'repo');
 const skillDir=path.join(workspace,'.agents','skills','laravel-api');
 fs.mkdirSync(skillDir,{recursive:true});
 fs.mkdirSync(home,{recursive:true});
 fs.writeFileSync(path.join(skillDir,'SKILL.md'),'---\nname: laravel-api\ndescription: Laravel API endpoints validation and authorization\n---\n\n# Private body not loaded\n');
 const store=new Store(path.join(root,'db'));
 try{
  const workspaceId=store.register(workspace);
  store.recordSkillUsage({workspaceId,skillName:'laravel-api',source:'workspace',observationEvidence:'host_observed_full_read'});
  const result=recommendSkills({task:'Implement Laravel API endpoint validation and authorization',host:'ide',home,workspace,workspaceId,store});
  assert.equal(result.status,'recommended');
  assert.equal(result.recommendations[0].name,'laravel-api');
  assert.equal(result.recommendations[0].match_basis.usage_count,1);
  assert.equal(result.skills[0].body,undefined);
 }finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('recommendSkills works without a store and does not create one',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-recommend-no-store-'));
 try{
  const result=recommendSkills({task:'Implement Laravel API endpoint validation',host:'ide',home:root,workspace:root});
  assert.equal(result.status,'no_match');
  assert.deepEqual(result.recommendations,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('ranks namespaced plugin Skills without dropping the namespace',()=>{
 const skills=[{name:'code-tools:security-review',description:'Security audit authentication and authorization vulnerabilities',source:'plugin'}];
 const ranked=rankSkills({task:'Audit authentication and authorization security vulnerabilities',skills});
 assert.equal(ranked.status,'recommended');
 assert.equal(ranked.recommendations[0].name,'code-tools:security-review');
});
