#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {Engine} from './engine.mjs';
import {getListedTools,validateArgs} from './tools.mjs';
import {dataDir,getA2AMode,getCompactMode,getAutoTrustMode,loadAllowlist,loadAntigravityWorkspaces} from './security.mjs';
import {getSessionTokenUsage} from './tokens.mjs';

const server={name:'a2a',version:'2.0.0'}, engine=new Engine();
const io=readline.createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false});
const answer=(id,result,error)=>{
  const message={jsonrpc:'2.0',id,...(error?{error:{code:error.code||-32603,message:String(error.message||error).slice(0,300)}}:{result})};
  process.stdout.write(JSON.stringify(message)+'\n');
};

const RESOURCES = [
  {uri:'a2a://status',name:'A2A Status',description:'Current A2A mode, compact mode, auto-trust policy, and authorized workspaces.',mimeType:'application/json'},
  {uri:'a2a://tokens/session',name:'A2A Session Token Telemetry',description:'Current Antigravity session token usage and cache hit metrics.',mimeType:'application/json'},
  {uri:'a2a://workspace/summary',name:'A2A Workspace Summary',description:'Active workspace graph coverage and measured token summary.',mimeType:'application/json'},
  {uri:'a2a://side-questions',name:'A2A Side Questions',description:'Recorded Antigravity side questions (/btw) and exploration notes.',mimeType:'application/json'},
];

function readResource(uri){
  if(uri==='a2a://status'){
    return {
      name:'a2a',
      version:server.version,
      mode:getA2AMode(),
      compact_mode:getCompactMode(),
      auto_trust:getAutoTrustMode(),
      data_dir:dataDir(),
      authorized_workspaces:loadAllowlist(),
      antigravity_workspaces:loadAntigravityWorkspaces(),
    };
  }
  if(uri==='a2a://tokens/session'){
    return getSessionTokenUsage(null,{dataDirPath:engine.store.base})||{status:'unavailable',reason:'No active transcript found'};
  }
  if(uri==='a2a://side-questions'){
    return {
      side_questions: engine.store.listSideQuestions({ limit: 50 })
    };
  }
  if(uri==='a2a://workspace/summary'){
    let activeWs=null;
    try{
      const sf=path.join(engine.store.base,'active-session.json');
      if(fs.existsSync(sf)){
        const sd=JSON.parse(fs.readFileSync(sf,'utf8'));
        activeWs=sd?.latest?.workspacePaths?.[0]||null;
      }
    }catch{}
    if(!activeWs){
      const candidates=[...loadAllowlist(),...loadAntigravityWorkspaces()];
      activeWs=candidates[0]||null;
    }
    if(!activeWs)return {status:'no_active_workspace',reason:'Authorize or open a workspace first.'};
    return engine.context({workspace:activeWs,action:'inspect'});
  }
  throw Object.assign(new Error('Resource not found: '+String(uri||'')),{code:-32002});
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
      return {content:[{type:'text',text}],isError:false};
    }
    case 'resources/list':return {resources:RESOURCES};
    case 'resources/read':{
      const uri=req.params?.uri;
      if(typeof uri!=='string'||!uri)throw Object.assign(new Error('Missing resource uri'),{code:-32602});
      const payload=readResource(uri);
      return {contents:[{uri,mimeType:'application/json',text:JSON.stringify(payload,null,2)}]};
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
  if(!req || Array.isArray(req)){answer(null,null,{code:-32600,message:'Invalid JSON-RPC request'});return}
  if(req.id===undefined){try{if(req.method!=='notifications/initialized'&&req.method!=='notifications/cancelled')route(req)}catch{}return}
  try{answer(req.id,route(req))}catch(e){
    if(req.method==='tools/call'){answer(req.id,{content:[{type:'text',text:JSON.stringify({status:'error',message:String(e.message||e).slice(0,350)})}],isError:true});return}
    answer(req.id,null,e);
  }
});
const shutdown=()=>{try{engine.close()}catch{}process.exit(0)};
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
io.on('close',()=>{try{engine.close()}catch{}});
