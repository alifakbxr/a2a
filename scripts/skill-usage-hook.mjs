#!/usr/bin/env node
import fs from 'node:fs';
import {dataDir} from '../src/security.mjs';
import {recordObservedSkillUse} from '../src/skill-usage.mjs';
try{
 const chunks=[],buffer=Buffer.alloc(16384);let bytes=0;
 for(;;){const n=fs.readSync(0,buffer,0,buffer.length,null);if(!n)break;bytes+=n;if(bytes>128*1024)throw Error('Hook payload exceeds safe limit');chunks.push(Buffer.from(buffer.subarray(0,n)))}
 const raw=Buffer.concat(chunks).toString('utf8'),payload=raw.trim()?JSON.parse(raw):{};
 recordObservedSkillUse(payload,dataDir());
 process.stdout.write('{}\n');
}catch{process.stdout.write('{}\n')}
