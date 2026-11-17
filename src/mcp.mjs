#!/usr/bin/env node
import readline from 'node:readline';
import {Engine} from './engine.mjs';
import {TOOLS,validateArgs} from './tools.mjs';

const server={name:'a2a',version:'2.0.0'}, engine=new Engine();
const io=readline.createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false});
const answer=(id,result,error)=>{
  const message={jsonrpc:'2.0',id,...(error?{error:{code:error.code||-32603,message:String(error.message||error).slice(0,300)}}:{result})};
  process.stdout.write(JSON.stringify(message)+'\n');
};
function route(req){
  if(req?.jsonrpc!=='2.0'||typeof req.method!=='string')throw Object.assign(new Error('Invalid JSON-RPC request'),{code:-32600});
  switch(req.method){
    case 'initialize':return {protocolVersion:req.params?.protocolVersion||'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:server};
    case 'ping':return {};
    case 'tools/list':return {tools:TOOLS};
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
      }
      return {content:[{type:'text',text:JSON.stringify(result)}],isError:false};
    }
    case 'resources/list':return {resources:[]};
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
process.on('SIGINT',()=>{engine.close();process.exit(0)});
io.on('close',()=>{engine.close();});
