#!/usr/bin/env node
// Explicit, read-only host preflight. No plugin install, model call or background daemon.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const base={live_agent_adoption:'not_tested',independent_e2e:'not_tested',
  model_token_savings:'not_measured',
  note:'Host CLI validation is not evidence that Antigravity selected PILAH appropriately during an IDE coding session.'};

export function checkHost({command='agy',cwd=root,exec=spawnSync}={}){
 const run=(args)=>{try{return exec(command,args,{cwd,encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:128*1024})}
   catch{return {status:null,error:{code:'EUNKNOWN'}}}};
 const version=run(['--version']);
 if(version.error||version.status!==0)return {...base,status:'blocked',
   cli:'not_available',validation:'not_run',installed:'unknown',
   next_step:'Install or expose the official Antigravity CLI on PATH, then rerun node scripts/pilah.mjs host-check.'};
 const validated=run(['plugin','validate','--strict','.']);
 if(validated.error||validated.status!==0)return {...base,status:'failed',
   cli:'available',validation:'failed',installed:'unknown',
   next_step:'Run agy plugin validate --strict . locally and review its private diagnostics; do not bypass strict validation.'};
 const listed=run(['plugin','list']);
 if(listed.error||listed.status!==0)return {...base,status:'partial',
   cli:'available',validation:'passed',installed:'unknown',
   next_step:'Inspect agy plugin list and the active Antigravity plugin manager; test real tool discovery separately.'};
 const found=/(^|[^a-z0-9_-])pilah([^a-z0-9_-]|$)/i.test(String(listed.stdout||''));
 return {...base,status:found?'local-preflight-passed':'partial',
   cli:'available',validation:'passed',installed:found?'listed':'not_listed',
   next_step:found
     ?'In the actual Antigravity host, verify 4 PILAH tools, skill activation, one useful cross-file call, one trivial zero-call task and denied-workspace negatives.'
     :'Enable/register PILAH in the Antigravity plugin manager and verify plugin list before claiming installation.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=checkHost();
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.status==='blocked'||report.status==='partial')process.exitCode=2;
 if(report.status==='failed')process.exitCode=1;
}
