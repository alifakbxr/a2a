#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace} from '../src/security.mjs';
const base=fs.mkdtempSync(path.join(os.tmpdir(),'verifykit-bench-'));
const old={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR,VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR};
try{
  process.env.HOME=base;process.env.USERPROFILE=base;process.env.A2A_DATA_DIR=path.join(base,'data');process.env.VERIFYKIT_DATA_DIR=path.join(base,'data');
  const work=path.join(base,'fixture');fs.mkdirSync(path.join(work,'src'),{recursive:true});
  fs.writeFileSync(path.join(work,'package.json'),'{"scripts":{"test":"node --test"}}');
  const count=process.env.BENCH_FILES===undefined?300:Number(process.env.BENCH_FILES);
  if(!Number.isSafeInteger(count)||count<1||count>1000)throw new Error('BENCH_FILES must be an integer from 1 to 1000');
  for(let i=0;i<count;i++){const from=i>0?`import {m${i-1}} from './m${i-1}.js';\n`:'';fs.writeFileSync(path.join(work,'src',`m${i}.js`),from+`export function m${i}(){return ${i}}\n`)}
  authorizeWorkspace(work);const e=new Engine();
  const a=performance.now(),inspection=e.context({workspace:work}),b=performance.now(),impact=e.impact({workspace:work,changed:['src/m0.js']}),c=performance.now();
  e.close();console.log(JSON.stringify({benchmark:'local-deterministic-graph',system:process.platform,node:process.versions.node,files:inspection.coverage.files,index_ms:+(b-a).toFixed(2),impact_ms:+(c-b).toFixed(2),affected:impact.affected.length,notes:'This is not an AI benchmark, model-quality comparison, or full user-task speedup.'},null,2));
} finally {
  for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;
  fs.rmSync(base,{recursive:true,force:true});
}
