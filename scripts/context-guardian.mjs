#!/usr/bin/env node
// Optional Antigravity PreInvocation advisor. Not registered until explicitly enabled.
// No transcript reads, no model calls, no persistent user content or token estimates.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getHomeDir,readSafeBytesFile,readSafeJsonFile} from '../src/security.mjs';

const KEY='a2a-context-guardian';
const SCRIPT=fileURLToPath(import.meta.url);
const LIMITS=Object.freeze({yellow:80,red:140,yellowCooldown:35,redCooldown:25});
const hookFile=()=>path.join(getHomeDir(),'.gemini','config','hooks.json');
function safeCommandPath(value){
 return typeof value==='string'&&value.length>0&&value.length<=4096&&path.isAbsolute(value)&&
  ![...value].some(char=>char.codePointAt(0)<32||[34,36,96,37,33,127].includes(char.codePointAt(0)));
}
export function guardianHookCommand(pluginFile=SCRIPT,nodeBinary=process.execPath){
 if(!safeCommandPath(pluginFile)||!safeCommandPath(nodeBinary))throw new Error('Unsafe plugin or Node binary path for hook command');
 return '"' + nodeBinary + '" "' + pluginFile + '" hook';
}
const command=()=>guardianHookCommand();
const owned=()=>({PreInvocation:[{type:'command',command:command(),timeout:5}]});
function isOwnedGuardian(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const entry=value.PreInvocation;
 if(!Array.isArray(entry)||entry.length!==1)return false;
 const hook=entry[0];
 if(!hook||typeof hook!=='object'||typeof hook.command!=='string')return false;
 const cmd=hook.command;
 const oldCommand='node "'+SCRIPT+'" hook';
 const match=/^"([^"]+)" "([^"]+)" hook$/.exec(cmd);
 const validNew=!!match&&match[2]===SCRIPT&&safeCommandPath(match[1])&&
  ['node','node.exe'].includes(path.basename(match[1]).toLowerCase());
 return (cmd===oldCommand||validNew)&&
  JSON.stringify(value)===JSON.stringify({PreInvocation:[{type:'command',command:cmd,timeout:5}]});
}

export function adviseInvocation(p){
 if(!p||typeof p!=='object'||p.hookEventName&&p.hookEventName!=='PreInvocation')return {};
 const steps=p.initialNumSteps,turn=p.invocationNum;
 if(!Number.isSafeInteger(steps)||steps<0||steps>1000000||
    !Number.isSafeInteger(turn)||turn<0||turn>1000000)return {};
 const zone=steps>=LIMITS.red?'red':steps>=LIMITS.yellow?'yellow':'normal';
 if(zone==='normal')return {};
 const cooldown=zone==='red'?LIMITS.redCooldown:LIMITS.yellowCooldown;
 if(turn%cooldown!==0)return {};
 const advice=zone==='red'
  ? 'Review handoff to a new session only after the current atomic work and tests finish.'
  : 'Review whether native /compact is useful at the next completed milestone.';
 return {injectSteps:[{ephemeralMessage:
  `A2A Context Guardian (${zone}; ${steps} planner steps, heuristic only): ${advice} Never compact mid-task. No action was taken.`}]};
}
function readManifest(){
 const result=readSafeJsonFile(hookFile(),{maxBytes:128*1024,checkParentDir:true});
 if(result.reason==='missing')return {config:{},previous:null};
 if(!result.ok)throw new Error('Existing hooks manifest is unreadable or unsafe; no changes made.');
 if(!result.value||typeof result.value!=='object'||Array.isArray(result.value))
  throw new Error('Existing hooks manifest must be a JSON object; no changes made.');
 return {config:result.value,previous:result.bytes};
}
function ensureSafeParents(dir){
 const home=path.resolve(getHomeDir()),relative=path.relative(home,path.resolve(dir));
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Invalid hooks directory');
 let current=home;
 if(fs.lstatSync(current).isSymbolicLink())throw Error('Symlink home denied');
 for(const segment of relative.split(path.sep).filter(Boolean)){
   current=path.join(current,segment);
   try{fs.mkdirSync(current,{mode:0o700})}catch(e){if(e.code!=='EEXIST')throw e}
   const st=fs.lstatSync(current);
   if(st.isSymbolicLink()||!st.isDirectory())throw Error('Unsafe hooks directory');
 }
}
function saveManifest(config,previous){
 const file=hookFile(),folder=path.dirname(file);
 ensureSafeParents(folder);
 const current=readSafeBytesFile(file,{maxBytes:128*1024,checkParentDir:true});
 if(previous===null ? current.reason!=='missing' : !current.ok||!current.bytes.equals(previous))
   throw Error('Hooks configuration changed; refusing to overwrite');
 const payload=JSON.stringify(config,null,2)+'\n';
 if(Buffer.byteLength(payload)>128*1024)throw Error('Hooks configuration exceeds safe limit');
 const tmp=file+'.'+process.pid+'.tmp';
 let fd=null;
 try{
  fd=fs.openSync(tmp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0),0o600);
  fs.writeFileSync(fd,payload);fs.closeSync(fd);fd=null;
  fs.renameSync(tmp,file);
 }finally{if(fd!==null)fs.closeSync(fd);try{fs.unlinkSync(tmp)}catch{}}
}
export function configureGuardian(action){
 if(!['status','enable','disable'].includes(action))throw Error('Expected status, enable or disable');
 const {config,previous}=readManifest(),present=Object.hasOwn(config,KEY);
 const valid=present&&isOwnedGuardian(config[KEY]);
 if(action==='status')return {enabled:valid,conflict:present&&!valid,default_enabled:false,
  no_recurring_hook_when_disabled:!present,automatic_compaction:false};
 if(present&&!valid)throw Error('Guardian key is managed by another configuration; refusing to overwrite');
 if(action==='enable'){
  const expected=owned();
  // Explicit re-enable refreshes stale NVM Node binaries, including legacy PATH-based commands.
  if(!present||JSON.stringify(config[KEY])!==JSON.stringify(expected)){
   config[KEY]=expected;saveManifest(config,previous);
  }
  return {enabled:true,automatic_compaction:false,restart_ide_recommended:true,
   note:'Opt-in PreInvocation advisory only; no active context-window token measurement.'};
 }
 if(present){delete config[KEY];saveManifest(config,previous)}
 return {enabled:false,automatic_compaction:false,restart_ide_recommended:true};
}
function readStdin(max=128*1024){
 const buffer=Buffer.alloc(8192),parts=[];let bytes=0;
 while(true){
  const n=fs.readSync(0,buffer,0,buffer.length,null);if(n===0)break;
  bytes+=n;if(bytes>max)throw Error('Hook input too large');
  parts.push(Buffer.from(buffer.subarray(0,n)));
 }
 return Buffer.concat(parts).toString('utf8');
}
function main(){
 const arg=process.argv[2]||'status';
 if(arg==='hook'){
  try{const parsed=JSON.parse(readStdin()||'{}');process.stdout.write(JSON.stringify(adviseInvocation(parsed))+'\n')}
  catch{process.stdout.write('{}\n')}
  return;
 }
 try{
  if(process.argv.length>3)throw Error('Unexpected extra arguments');
  process.stdout.write(JSON.stringify(configureGuardian(arg))+'\n');
 }catch(e){
  process.stderr.write('Context guardian: '+String(e.message||'error').replaceAll(getHomeDir(),'<home>')+'\n');
  process.exitCode=1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===SCRIPT)main();
