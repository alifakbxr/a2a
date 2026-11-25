#!/usr/bin/env node
// Read-only Antigravity CLI preflight. This never certifies an IDE session.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const base={
  host_surface:'cli-preflight-only',ide_plugin_loaded:'not_tested',
  live_agent_adoption:'not_tested',independent_e2e:'not_tested',
  model_token_savings:'not_measured',
  note:'CLI plugin status does not prove the actual IDE loaded, discovered or selected PILAH.'
};
const names=new Set(['pilah','a2a']);

// Official --json output is a list of installed plugins with an explicit
// enabled flag. Never classify a substring match as successful installation.
export function inspectPluginList(raw,{format='json'}={}){
  if(format==='json'){
    let items;
    try{items=JSON.parse(String(raw??''));}catch{return {installed:'unknown',plugin_name:null,inventory:'unparseable'};}
    if(!Array.isArray(items))return {installed:'unknown',plugin_name:null,inventory:'unparseable'};
    const options=items.filter(x=>x&&typeof x==='object'&&names.has(x.name));
    const match=options.find(x=>x.name==='pilah')||options[0];
    if(!match)return {installed:'not_listed',plugin_name:null,inventory:'json'};
    const plugin_name=match.name;
    if(match.enabled!==true)return {installed:match.enabled===false?'disabled':'unknown',plugin_name,inventory:'json'};
    if(Array.isArray(match.mcpServers)&&match.mcpServers.length===0)return {installed:'missing_mcp_component',plugin_name,inventory:'json'};
    return {installed:'listed',plugin_name,inventory:'json'};
  }
  // Documented text form: '- pilah (enabled, 1.0.3)'.
  const rows=String(raw??'').split(/\r?\n/).map(line=>
    line.match(/^\s*-\s+(pilah|a2a)\s+\((enabled|disabled)(?:\s*,|\s*\))/i)
  ).filter(Boolean);
  const found=rows.find(m=>m[1].toLowerCase()==='pilah')||rows[0];
  if(!found)return {installed:'not_listed',plugin_name:null,inventory:'text'};
  return {installed:found[2].toLowerCase()==='enabled'?'listed':'disabled',
    plugin_name:found[1].toLowerCase(),inventory:'text'};
}

export function checkHost({command='agy',cwd=root,exec=spawnSync}={}){
  const run=args=>{try{return exec(command,args,{cwd,encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:128*1024});}
    catch{return {status:null,error:{code:'EUNKNOWN'}};}};
  const version=run(['--version']);
  if(version.error||version.status!==0)return {...base,status:'blocked',
    cli:'not_available',validation:'not_run',installed:'unknown',
    next_step:'Install or expose the official Antigravity CLI on PATH, then rerun pilah host-check.'};
  const validated=run(['plugin','validate','--strict','.']);
  if(validated.error||validated.status!==0)return {...base,status:'failed',
    cli:'available',validation:'failed',installed:'unknown',
    next_step:'Run agy plugin validate --strict . locally; do not bypass validation.'};
  const json=run(['plugin','list','--json']);
  let inventory=json.status===0&&!json.error
    ?inspectPluginList(json.stdout,{format:'json'})
    :{installed:'unknown'};
  if(inventory.installed==='unknown'){
    // Older installations may lack --json: parse strict list entries only.
    const plain=run(['plugin','list']);
    inventory=plain.status===0&&!plain.error
      ?inspectPluginList(plain.stdout,{format:'text'})
      :{installed:'unknown',plugin_name:null,inventory:'unavailable'};
  }
  const passed=inventory.installed==='listed';
  return {...base,status:passed?'local-preflight-passed':'partial',
    cli:'available',validation:'passed',...inventory,
    next_step:passed
      ?'CLI preflight only: inspect the active IDE window, tool discovery, real cross-file calls, and denied-workspace behavior using H01-H06.'
      :'Enable PILAH and its MCP component in the active Antigravity surface, then inspect plugin status and tools.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=checkHost();
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.status==='blocked'||report.status==='partial')process.exitCode=2;
  if(report.status==='failed')process.exitCode=1;
}
