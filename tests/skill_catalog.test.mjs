import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverSkills} from '../src/skill-catalog.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-catalog-'));
 const skill=(base,folder,name,description)=>{const dir=path.join(base,folder);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),`---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`);return dir;};
 return {root,skill,clean:()=>fs.rmSync(root,{recursive:true,force:true})};
}

test('discovers workspace and global Skills for all documented hosts without reading full Skill bodies',()=>{
 const f=fixture();
 try{
  const workspace=path.join(f.root,'repo','packages','app');fs.mkdirSync(workspace,{recursive:true});
  f.skill(path.join(f.root,'repo'), ' .agents/skills'.trim(),'workspace-skill','Use for workspace tasks');
  f.skill(path.join(f.root,'.gemini','config'),'skills/global-skill','global-skill','Use for global tasks');
  for(const host of ['app','cli','ide']){
   const result=discoverSkills({host,home:f.root,workspace});
   assert.deepEqual(result.skills.map(x=>x.name),['workspace-skill','global-skill']);
   assert.ok(result.skills.every(x=>!('body' in x)));
  }
 }finally{f.clean()}
});

test('recognizes CLI-only and legacy IDE roots only on their documented surfaces',()=>{
 const f=fixture();
 try{
  f.skill(path.join(f.root,'.gemini','antigravity-cli'),'skills/cli-only','cli-only','CLI skill');
  f.skill(path.join(f.root,'.gemini','antigravity'),'skills/legacy-ide','legacy-ide','IDE legacy skill');
  assert.deepEqual(discoverSkills({host:'cli',home:f.root}).skills.map(x=>x.name),['cli-only']);
  assert.deepEqual(discoverSkills({host:'ide',home:f.root}).skills.map(x=>x.name),['legacy-ide']);
  assert.deepEqual(discoverSkills({host:'app',home:f.root}).skills,[]);
 }finally{f.clean()}
});

test('ignores malformed metadata, symlinked Skill folders and symlinked SKILL.md files',()=>{
 const f=fixture();
 try{
  const root=path.join(f.root,'.gemini','config','skills');fs.mkdirSync(root,{recursive:true});
  const bad=path.join(root,'bad');fs.mkdirSync(bad);fs.writeFileSync(path.join(bad,'SKILL.md'),'no frontmatter');
  const real=path.join(f.root,'real');fs.mkdirSync(real);fs.writeFileSync(path.join(real,'SKILL.md'),'---\nname: linked\ndescription: linked skill\n---');
  try{fs.symlinkSync(real,path.join(root,'linked-dir'),'dir')}catch{}
  fs.mkdirSync(path.join(root,'linked-file'),{recursive:true});
  try{fs.symlinkSync(path.join(real,'SKILL.md'),path.join(root,'linked-file','SKILL.md'))}catch{}
  assert.deepEqual(discoverSkills({host:'app',home:f.root}).skills,[]);
 }finally{f.clean()}
});

test('deduplicates by Skill name and rejects unknown host values',()=>{
 const f=fixture();
 try{
  const workspace=path.join(f.root,'repo');fs.mkdirSync(workspace,{recursive:true});
  f.skill(workspace,'.agents/skills/one','same','first');
  f.skill(path.join(f.root,'.gemini','config'),'skills/two','same','second');
  assert.equal(discoverSkills({host:'ide',home:f.root,workspace}).skills.length,1);
  assert.throws(()=>discoverSkills({host:'desktop',home:f.root}),/host must be/);
 }finally{f.clean()}
});
