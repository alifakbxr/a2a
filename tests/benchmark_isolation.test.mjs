import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('deterministic benchmark runs in a private temporary DB, never the caller A2A_DATA_DIR',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-bench-isolation-'));
 try{
   const userStore=path.join(base,'sensitive-user-state');
   fs.mkdirSync(userStore);
   fs.writeFileSync(path.join(userStore,'important.txt'),'UNCHANGED');
   const result=spawnSync(process.execPath,['benchmarks/bench.mjs'],{
     cwd:path.resolve('.'),
     env:{...process.env,A2A_DATA_DIR:userStore,BENCH_FILES:'12'},
     encoding:'utf8',timeout:15000
   });
   assert.equal(result.status,0,result.stderr);
   const parsed=JSON.parse(result.stdout);
   assert.equal(parsed.benchmark,'local-deterministic-graph');
   assert.equal(parsed.files,13); // 12 modules and the package manifest
   assert.deepEqual(fs.readdirSync(userStore),['important.txt']);
   assert.equal(fs.readFileSync(path.join(userStore,'important.txt'),'utf8'),'UNCHANGED');
 }finally{fs.rmSync(base,{recursive:true,force:true})}
});

test('synthetic benchmark rejects unbounded fixture size before creating files',()=>{
 const result=spawnSync(process.execPath,['benchmarks/bench.mjs'],{
   cwd:path.resolve('.'),
   env:{...process.env,BENCH_FILES:'9999999'},
   encoding:'utf8',timeout:10000
 });
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/BENCH_FILES/);
});
