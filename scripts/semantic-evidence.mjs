#!/usr/bin/env node
// Standalone entrypoint for the same conservative engine offered via a2a_verify.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateSemanticClaims} from '../src/semantic-evidence.mjs';
export {evaluateSemanticClaims,inspectScenarioFacts} from '../src/semantic-evidence.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw Error('Usage: node scripts/semantic-evidence.mjs <scenario-evidence.json>');
  const stat=fs.statSync(process.argv[2]);
  if(!stat.isFile()||stat.size>1024*1024)throw Error('Evidence artifact must be a regular JSON file <=1 MiB');
  process.stdout.write(JSON.stringify(evaluateSemanticClaims(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2)+'\n');
 }catch(e){process.stderr.write('Semantic evidence invalid: '+e.message+'\n');process.exitCode=1}
}
