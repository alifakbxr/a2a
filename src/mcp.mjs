#!/usr/bin/env node
import fs from 'node:fs';
import pkg from '../package.json' with {type:'json'};
import path from 'node:path';
import readline from 'node:readline';
import {Engine} from './engine.mjs';
import {getListedTools,validateArgs} from './tools.mjs';
import {dataDir,getA2AMode,getCompactMode,getAutoTrustMode,loadAllowlist,loadAntigravityWorkspaces,requireAuthorizedWorkspace} from './security.mjs';
import {getSessionTokenUsage} from './tokens.mjs';
import {classifyMcpFailure} from './mcp-diagnostics.mjs';

const server={name:'a2a',version:pkg.version}, engine=new Engine();
const io=readline.createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false});
const answer=(id,result,error)=>{
  const message={jsonrpc:'2.0',id,...(error?{error:{code:error.code||-32603,message:String(error.message||error).slice(0,300)}}:{result})};
  process.stdout.write(JSON.stringify(message)+'\n');
};

const RESOURCES = [
  {uri:'a2a://status',name:'A2A Status',description:'Current A2A modes and redacted workspace counts; no local paths.',mimeType:'application/json'},
  {uri:'a2a://tokens/session',name:'A2A Session Diagnostics',description:'Local session event counts only; model token totals require official Antigravity CLI JSON output.',mimeType:'application/json'},
  {uri:'a2a://workspace/summary',name:'A2A Workspace Summary',description:'Active workspace graph coverage and estimated source inventory; not model token usage.',mimeType:'application/json'},
  {uri:'a2a://side-questions',name:'A2A Side Questions',description:'Recorded Antigravity side questions (/btw) and exploration notes.',mimeType:'application/json'},
];

function getActiveSession(){
  try{
    const file=path.join(engine.store.base,'active-session.json');
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.size>128*1024)return null;
    const active=JSON.parse(fs.readFileSync(file,'utf8'))?.latest;
    const workspace=active?.workspacePaths?.[0] || active?.cwd;
    return active?.conversationId && workspace ? {conversationId:active.conversationId,workspace} : null;
  }catch{return null}
}
function readResource(uri){
  if(uri==='a2a://status'){
    return {
      name:'a2a',
      version:server.version,
      mode:getA2AMode(),
      compact_mode:getCompactMode(),
      auto_trust:getAutoTrustMode(),
      data_dir_configured:fs.existsSync(dataDir()),
      authorized_workspace_count:loadAllowlist().length,
      antigravity_workspace_count:loadAntigravityWorkspaces().length,
      active_workspace_authorized:(()=>{
        const active=getActiveSession();
        if(!active)return false;
        try{requireAuthorizedWorkspace(active.workspace);return true}catch{return false}
      })(),
    };
  }
  if(uri==='a2a://tokens/session'){
    const active=getActiveSession();
    if(!active)return {status:'unavailable',reason:'No active session found'};
    requireAuthorizedWorkspace(active.workspace);
    return getSessionTokenUsage(active.conversationId,{workspace:active.workspace,dataDirPath:engine.store.base})||{status:'unavailable',reason:'No session transcript found'};
  }
  if(uri==='a2a://side-questions'){
    const active=getActiveSession();
    if(!active?.conversationId || !active?.workspace) return {status:'no_active_session',side_questions:[]};
    const root=requireAuthorizedWorkspace(active.workspace);
    const wsId=engine.store.register(root);
    return {side_questions:engine.store.listSideQuestions({workspaceId:wsId,conversationId:active.conversationId,limit:20})};
  }
  if(uri==='a2a://workspace/summary'){
    const activeWs=getActiveSession()?.workspace;
    if(!activeWs)return {status:'no_active_workspace',reason:'Open an authorized workspace in a session first.'};
    return engine.context({workspace:activeWs,action:'inspect'});
  }
  throw Object.assign(new Error('Resource not found'),{code:-32002});
}

function route(req){
  if(req?.jsonrpc!=='2.0'||typeof req.method!=='string')throw Object.assign(new Error('Invalid JSON-RPC request'),{code:-32600});
  switch(req.method){
    case 'initialize':return {protocolVersion:req.params?.protocolVersion||'2025-03-26',capabilities:{tools:{listChanged:false},resources:{subscribe:false,listChanged:false}},serverInfo:server};
    case 'ping':return {};
    case 'tools/list':return {tools:getListedTools()};
    case 'tools/call':{
      const {name,arguments:args={}}=req.params||{};validateArgs(name,args);
      let result;
      switch(name){
        case 'a2a_context':
        case 'verifykit_context':result=engine.context(args);break;
        case 'a2a_impact':
        case 'verifykit_impact':result=engine.impact(args);break;
        case 'a2a_verify':
        case 'verifykit_verify':result=engine.verify(args);break;
        case 'a2a_evidence':
        case 'verifykit_evidence':result=engine.evidence(args);break;
        default:throw new Error('Unknown tool: '+name);
      }
      const text=JSON.stringify(result);
      if(!text)throw new Error('Empty tool response');
      if(Buffer.byteLength(text,'utf8')>64*1024)throw new Error('MCP response exceeds 64 KiB. Narrow the file list, query, or diff range.');
      return {content:[{type:'text',text}],isError:false};
    }
    case 'resources/list':return {resources:RESOURCES};
    case 'resources/read':{
      const uri=req.params?.uri;
      if(typeof uri!=='string'||!uri)throw Object.assign(new Error('Missing resource uri'),{code:-32602});
      const payload=readResource(uri);
      const content=JSON.stringify(payload);
      if(Buffer.byteLength(content,'utf8')>64*1024)throw new Error('MCP resource response exceeds 64 KiB');
      return {contents:[{uri,mimeType:'application/json',text:content}]};
    }
    case 'prompts/list':return {prompts:[]};
    default:throw Object.assign(new Error('Method not found'),{code:-32601});
  }
}
io.on('line',(line)=>{
  if(!line.trim())return;
  if(line.length>180000){answer(null,null,{code:-32600,message:'Request too large'});return}
  let req;
  try{req=JSON.parse(line)}catch{answer(null,null,{code:-32700,message:'Parse error'});return}
  if(!req || typeof req!=='object' || Array.isArray(req)){answer(null,null,{code:-32600,message:'Invalid JSON-RPC request'});return}
  if(req.id!==undefined && req.id!==null && typeof req.id!=='string' && typeof req.id!=='number'){
    answer(null,null,{code:-32600,message:'Invalid JSON-RPC id'});return;
  }
  // JSON-RPC notifications have no response and MUST NOT run data-changing tool handlers.
  if(req.id===undefined)return;
  try{answer(req.id,route(req))}catch(e){
    if(req.method==='tools/call'){answer(req.id,{content:[{type:'text',text:JSON.stringify(classifyMcpFailure(req.params?.name,e))}],isError:true});return}
    if(req.method==='resources/read' && e?.code!==-32002 && e?.code!==-32602){
      const safe=classifyMcpFailure('resources/read',e);
      answer(req.id,null,{code:-32000,message:safe.code+': '+safe.message});return;
    }
    answer(req.id,null,e);
  }
});
const shutdown=()=>{try{engine.close()}catch{}process.exit(0)};
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
io.on('close',()=>{try{engine.close()}catch{}});
