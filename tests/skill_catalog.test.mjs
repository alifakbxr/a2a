import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverSkills,parseSkillFrontmatter} from '../src/skill-catalog.mjs';
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-catalog-'));const skill=(base,folder,name,description)=>{const dir=path.join(base,folder);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: '+name+'\ndescription: '+description+'\n---\n# body\n');return dir};return{root,skill,clean:()=>fs.rmSync(root,{recursive:true,force:true})}}
test('discovers workspace and global Skills for documented hosts without loading bodies',()=>{const f=fixture();try{const ws=path.join(f.root,'repo','packages','app');fs.mkdirSync(ws,{recursive:true});f.skill(path.join(f.root,'repo'),'.agents/skills','workspace-skill','Use for workspace tasks');f.skill(path.join(f.root,'.gemini','config'),'skills/global-skill','global-skill','Use for global tasks');for(const host of ['app','cli','ide']){const r=discoverSkills({host,home:f.root,workspace:ws});assert.deepEqual(r.skills.map(x=>x.name),['workspace-skill','global-skill']);assert.ok(r.skills.every(x=>!('body'in x)))}}finally{f.clean()}});
test('recognizes CLI-only and legacy IDE roots only on documented surfaces',()=>{const f=fixture();try{f.skill(path.join(f.root,'.gemini','antigravity-cli'),'skills/cli-only','cli-only','CLI skill');f.skill(path.join(f.root,'.gemini','antigravity'),'skills/legacy-ide','legacy-ide','IDE legacy skill');assert.deepEqual(discoverSkills({host:'cli',home:f.root}).skills.map(x=>x.name),['cli-only']);assert.deepEqual(discoverSkills({host:'ide',home:f.root}).skills.map(x=>x.name),['legacy-ide']);assert.deepEqual(discoverSkills({host:'app',home:f.root}).skills,[])}finally{f.clean()}});
test('rejects malformed metadata and symlinked Skill folders/files',()=>{const f=fixture();try{const root=path.join(f.root,'.gemini','config','skills');fs.mkdirSync(root,{recursive:true});const bad=path.join(root,'bad');fs.mkdirSync(bad);fs.writeFileSync(path.join(bad,'SKILL.md'),'no frontmatter');const real=path.join(f.root,'real');fs.mkdirSync(real);fs.writeFileSync(path.join(real,'SKILL.md'),'---\nname: linked\ndescription: linked skill\n---');try{fs.symlinkSync(real,path.join(root,'linked-dir'),'dir')}catch{}fs.mkdirSync(path.join(root,'linked-file'),{recursive:true});try{fs.symlinkSync(path.join(real,'SKILL.md'),path.join(root,'linked-file','SKILL.md'))}catch{}assert.deepEqual(discoverSkills({host:'app',home:f.root}).skills,[])}finally{f.clean()}});
test('deduplicates names and rejects unknown hosts',()=>{const f=fixture();try{const ws=path.join(f.root,'repo');fs.mkdirSync(ws,{recursive:true});f.skill(ws,'.agents/skills/one','same','first');f.skill(path.join(f.root,'.gemini','config'),'skills/two','same','second');assert.equal(discoverSkills({host:'ide',home:f.root,workspace:ws}).skills.length,1);assert.throws(()=>discoverSkills({host:'desktop',home:f.root}),/host must be/)}finally{f.clean()}});
test('parses BOM and Windows CRLF; rejects duplicate and unsafe scalar fields',()=>{assert.deepEqual(parseSkillFrontmatter('\uFEFF---\r\nname: laravel-api\r\ndescription: "Laravel API validation"\r\n---\r\n'),{name:'laravel-api',description:'Laravel API validation'});assert.deepEqual(parseSkillFrontmatter("---\nname: docs\ndescription: 'Write it''s docs'\n---"),{name:'docs',description:"Write it's docs"});assert.equal(parseSkillFrontmatter('---\nname: docs\nname: other\ndescription: docs\n---'),null);assert.equal(parseSkillFrontmatter('---\nname: docs\ndescription: [unsafe]\n---'),null);assert.equal(parseSkillFrontmatter('---\nname: docs\ndescription: \n---'),null)});

test('discovers backward-compatible Antigravity customization folder aliases',()=>{
 const f=fixture();
 try{
  const ws=path.join(f.root,'repo','packages','app');fs.mkdirSync(ws,{recursive:true});
  f.skill(path.join(f.root,'repo'),'.agent/skills','legacy-agent','Legacy .agent skill');
  f.skill(path.join(f.root,'repo'),'_agents/skills','legacy-agents','Legacy _agents skill');
  f.skill(path.join(f.root,'repo'),'_agent/skills','legacy-agent-singular','Legacy _agent skill');
  const r=discoverSkills({host:'ide',home:f.root,workspace:ws});
  assert.deepEqual(r.skills.map(x=>x.name),['legacy-agent','legacy-agents','legacy-agent-singular']);
 }finally{f.clean()}
});
