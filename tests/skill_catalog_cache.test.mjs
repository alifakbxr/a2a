import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverSkills} from '../src/skill-catalog.mjs';

test('caches validated metadata and invalidates the entry when SKILL.md changes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-skill-cache-'));
 try{
  const skillDir=path.join(root,'.gemini','config','skills','cacheable');
  fs.mkdirSync(skillDir,{recursive:true});
  const file=path.join(skillDir,'SKILL.md');
  fs.writeFileSync(file,'---\nname: cacheable\ndescription: Original metadata description\n---\n');
  const first=discoverSkills({host:'app',home:root});
  const second=discoverSkills({host:'app',home:root});
  assert.equal(first.skills[0].description,'Original metadata description');
  assert.ok(second.cache.hits>first.cache.hits);
  fs.writeFileSync(file,'---\nname: cacheable\ndescription: Updated metadata description with a longer value\n---\n');
  const third=discoverSkills({host:'app',home:root});
  assert.equal(third.skills[0].description,'Updated metadata description with a longer value');
  assert.ok(third.cache.misses>second.cache.misses);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
