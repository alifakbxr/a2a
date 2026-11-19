#!/usr/bin/env node
// Check every shipped ESM module and CLI script, not an easily stale hand-written list.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const sources=[];
function collect(dir){
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(dir,entry.name);
    if(entry.isDirectory())collect(relative);
    else if(entry.isFile()&&entry.name.endsWith('.mjs'))sources.push(relative);
  }
}
for(const directory of ['src','scripts'])collect(directory);
if(!sources.length)throw new Error('No source or CLI modules discovered');
let failures=0;
for(const relative of sources){
  const run=spawnSync(process.execPath,['--check',path.join(root,relative)],{stdio:'inherit'});
  if(run.error)throw run.error;
  if(run.status!==0)failures++;
}
if(failures){
  process.stderr.write(`Syntax validation failed in ${failures}/${sources.length} ESM files.\n`);
  process.exitCode=1;
}else{
  process.stdout.write(`Syntax validated: ${sources.length} src/scripts ESM files.\n`);
}
