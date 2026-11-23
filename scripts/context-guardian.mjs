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
const command=()=>`node "${SCRIPT}" hook`;
const owned=()=>({PreInvocation:[{type:'command',command:command(),timeout:5}]});

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
 const expected=JSON.stringify(owned());
 const valid=present&&JSON.stringify(config[KEY])===expected;
 if(action==='status')return {enabled:valid,conflict:present&&!valid,default_enabled:false,
  no_recurring_hook_when_disabled:!present,automatic_compaction:false};
 if(present&&!valid)throw Error('Guardian key is managed by another configuration; refusing to overwrite');
 if(action==='enable'){
  if(!present){config[KEY]=owned();saveManifest(config,previous)}
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
