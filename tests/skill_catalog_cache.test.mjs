import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const source=new URL('../src/skill-catalog.mjs',import.meta.url).href;
test('persists metadata across Node processes and invalidates changed files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-cache-'));
 try{
  const dir=path.join(root,'.gemini','config','skills','cacheable');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'SKILL.md');fs.writeFileSync(file,'---\nname: cacheable\ndescription: Original metadata description\n---\n');
  const code='import {discoverSkills} from '+JSON.stringify(source)+';const r=discoverSkills({host:"app",home:'+JSON.stringify(root)+'});process.stdout.write(JSON.stringify({description:r.skills[0]?.description,cache:r.cache}));';
  const run=()=>spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
  const a=run(),b=run();assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);
  assert.equal(JSON.parse(a.stdout).description,'Original metadata description');assert.equal(JSON.parse(a.stdout).cache.misses,1);assert.equal(JSON.parse(b.stdout).cache.hits,1);const cacheFile=path.join(root,'.config','pilah','skill-metadata-cache.json');const cacheText=fs.readFileSync(cacheFile,'utf8');assert.ok(!cacheText.includes(root),'cache must not persist absolute Skill paths');assert.match(cacheText,/\"[a-f0-9]{64}\"/);
  fs.writeFileSync(file,'---\nname: cacheable\ndescription: Updated metadata description with a longer value\n---\n');
  const c=run();assert.equal(c.status,0,c.stderr);assert.equal(JSON.parse(c.stdout).description,'Updated metadata description with a longer value');assert.equal(JSON.parse(c.stdout).cache.misses,1);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('persistent cache retains manual-only Skill metadata across Node processes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-cache-manual-'));
 try{
  const dir=path.join(root,'.gemini','config','skills','manual-only');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: manual-only\ndescription: Review release plans and deployment risks\ndisable-model-invocation: true\n---\n');
  const code='import {discoverSkills} from '+JSON.stringify(source)+';const r=discoverSkills({host:"app",home:'+JSON.stringify(root)+'});process.stdout.write(JSON.stringify(r.skills[0]));';
  const run=()=>spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
  const a=run(),b=run();assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);
  assert.equal(JSON.parse(a.stdout).disableModelInvocation,true);assert.equal(JSON.parse(b.stdout).disableModelInvocation,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('replaces legacy plaintext-path cache schema with hashed keys',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-cache-migrate-'));
 try{
  const cacheDir=path.join(root,'.config','pilah');fs.mkdirSync(cacheDir,{recursive:true,mode:0o700});
  const legacyPath=path.join(root,'.gemini','config','skills','old','SKILL.md');
  fs.writeFileSync(path.join(cacheDir,'skill-metadata-cache.json'),JSON.stringify({version:2,entries:{[legacyPath]:{signature:'old',metadata:{name:'old',description:'old'}}}}),{mode:0o600});
  const skillDir=path.join(root,'.gemini','config','skills','fresh');fs.mkdirSync(skillDir,{recursive:true});
  fs.writeFileSync(path.join(skillDir,'SKILL.md'),'---\nname: fresh\ndescription: Fresh metadata\n---\n');
  const code='import {discoverSkills} from '+JSON.stringify(source)+';discoverSkills({host:"app",home:'+JSON.stringify(root)+'});';
  const run=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const next=fs.readFileSync(path.join(cacheDir,'skill-metadata-cache.json'),'utf8');
  assert.ok(!next.includes(legacyPath));assert.match(next,/"[a-f0-9]{64}"/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
