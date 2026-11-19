import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');

test('exhaustive syntax validator recurses and fails on malformed ESM',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-syntax-gate-'));
  try{
    fs.mkdirSync(path.join(tmp,'scripts'),{recursive:true});
    fs.mkdirSync(path.join(tmp,'src','nested'),{recursive:true});
    fs.copyFileSync(new URL('scripts/check-syntax.mjs',root),path.join(tmp,'scripts','check-syntax.mjs'));
    fs.writeFileSync(path.join(tmp,'src','valid.mjs'),'export const valid = true;\\n');
    fs.writeFileSync(path.join(tmp,'src','nested','invalid.mjs'),'export const bad = ;\\n');
    const run=()=>spawnSync(process.execPath,[path.join(tmp,'scripts','check-syntax.mjs')],{encoding:'utf8'});
    const bad=run();
    assert.notEqual(bad.status,0,'Nested malformed module must fail syntax gate');
    assert.match(bad.stderr,/SyntaxError|Unexpected token/);
    fs.writeFileSync(path.join(tmp,'src','nested','invalid.mjs'),'export const bad = false;\\n');
    const good=run();
    assert.equal(good.status,0,good.stderr);
    assert.match(good.stdout,/Syntax validated: 3 src\\/scripts ESM files/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test('CI and publication pipelines share the exhaustive syntax gate',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.syntax,'node scripts/check-syntax.mjs');
  assert.match(pkg.scripts.check,/npm run syntax/);
  for(const filename of ['.github/workflows/ci.yml','.github/workflows/publish-npm.yml','.github/workflows/publish-github-package.yml']){
    const yaml=read(filename);
    assert.match(yaml,/npm run syntax/,'Missing full syntax gate in '+filename);
    assert.doesNotMatch(yaml,/node --check src\\//,'Stale manually maintained file list in '+filename);
  }
});
