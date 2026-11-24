import fs from 'node:fs';
import path from 'node:path';
import {Database} from './sqlite-compat.mjs';
import {dataDir} from './security.mjs';

const SAFE_TABLES=['workspaces','revisions','files','nodes','edges','telemetry','runs','evidence','incidents','hypotheses','rca_experiments','acceptance_plans','side_questions','artifact_versions','recovery_checkpoints'];
const SAFE_TOOL_NAMES=new Set(['pilah_context','pilah_impact','pilah_verify','pilah_evidence','a2a_context','a2a_impact','a2a_verify','a2a_evidence','verifykit_context','verifykit_impact','verifykit_verify','verifykit_evidence']);
const safeCount=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):0;

export function exportRedacted(file=path.join(dataDir(),'a2a.sqlite')){
  const full=path.resolve(file);
  let stat;
  try{stat=fs.lstatSync(full)}catch(e){
    if(e.code==='ENOENT')return {schema:'pilah-redacted-diagnostics-v1',status:'no_database',table_counts:{},tool_calls:[],model_token_savings:null};
    throw e;
  }
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128*1024*1024)throw Error('Unsafe or oversized diagnostic database');
  const db=new Database(full,{readOnly:true});
  try{
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
    const table_counts={};
    for(const name of SAFE_TABLES)table_counts[name]=tables.has(name)?safeCount(db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n):0;
    const tool_calls=[];
    if(tables.has('telemetry')){
      const rows=db.prepare('SELECT tool_name, COUNT(*) AS calls FROM telemetry GROUP BY tool_name ORDER BY tool_name LIMIT 100').all();
      let other=0;
      for(const item of rows){
        if(SAFE_TOOL_NAMES.has(item.tool_name))tool_calls.push({tool:item.tool_name,calls:safeCount(item.calls)});
        else other+=safeCount(item.calls);
      }
      if(other)tool_calls.push({tool:'other',calls:other});
    }
    return {schema:'pilah-redacted-diagnostics-v1',status:'ok',table_counts,tool_calls,model_token_savings:null,
      note:'Aggregate local row counts only. Historic tokens_saved is not provider usage; no task outcomes or independently verified savings are inferred.'};
  }finally{db.close()}
}
