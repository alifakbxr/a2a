import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Real JSON-RPC/stdio process E2E with an ephemeral on-disk workspace+SQLite.
// This is NOT a real installed Antigravity browser/hardware or STOCKROOM E2E.
function start(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-behavioral-mcp-'));
 const work=path.join(base,'project'),home=path.join(base,'home');
 fs.mkdirSync(home);fs.mkdirSync(path.join(work,'src'),{recursive:true});
 fs.writeFileSync(path.join(work,'package.json'),'{"name":"behavioral-e2e"}');
 fs.writeFileSync(path.join(work,'src','checkin.js'),'export function shouldPrint(isRepeat){return !isRepeat}');
 const child=spawn(process.execPath,['src/mcp.mjs'],{
  cwd:path.resolve('.'),
  env:{...process.env,HOME:home,USERPROFILE:home,A2A_DATA_DIR:path.join(base,'db'),
   A2A_LEGACY_TOOL_ALIASES:'0',PLUGIN_DATA:'',VERIFYKIT_DATA_DIR:''},
  stdio:['pipe','pipe','pipe']
 });
 let id=0;const pending=new Map(),errors=[];
 createInterface({input:child.stdout}).on('line',line=>{
   try{const obj=JSON.parse(line);const p=pending.get(obj.id);if(p){pending.delete(obj.id);p.resolve(obj)}}catch(e){errors.push(String(e))}
 });
 child.stderr.on('data',buffer=>{if(errors.length<5)errors.push(String(buffer).slice(0,400))});
 function request(method,params={}){
  return new Promise((resolve,reject)=>{
   const next=++id;
   pending.set(next,{resolve,reject});
   child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:next,method,params})+'\n',err=>{
    if(err){pending.delete(next);reject(err)}
   });
  });
 }
 const call=async(name,args)=>{
  const response=await request('tools/call',{name,arguments:args});
  assert.ok(response.result,'No response: '+JSON.stringify(response.error||errors).slice(0,250));
  return {isError:response.result.isError,body:JSON.parse(response.result.content[0].text)};
 };
 const close=async()=>{
  try{child.stdin.end()}catch{}
  try{child.kill()}catch{}
  await new Promise(resolve=>{
   if(child.exitCode!==null)return resolve();
   child.once('close',resolve);
   setTimeout(resolve,750).unref();
  });
  fs.rmSync(base,{recursive:true,force:true});
 };
 return {base,home,work,request,call,close};
}
test('real MCP stdio: deny untrusted, plan, reject false UI PASS, checkpoint/recovery, stale source',async()=>{
 const io=start();
 try{
  const initialization=await io.request('initialize',{protocolVersion:'2025-03-26',capabilities:{}});
  assert.equal(initialization.result.serverInfo.name,'a2a');
  const tools=await io.request('tools/list');
  assert.deepEqual(tools.result.tools.map(x=>x.name),['a2a_context','a2a_impact','a2a_verify','a2a_evidence']);
  const denied=await io.call('a2a_context',{workspace:io.work,action:'inspect'});
  assert.equal(denied.isError,true);

  const allowDir=path.join(io.home,'.config','a2a');
  fs.mkdirSync(allowDir,{recursive:true});
  fs.writeFileSync(path.join(allowDir,'allowed-workspaces.json'),JSON.stringify({
   version:1,allowed:[fs.realpathSync(io.work)]
  }));
  const valid=await io.call('a2a_context',{workspace:io.work,action:'inspect'});
  assert.equal(valid.isError,false);
  const revision=valid.body.revision;
  const acceptance={
   id:'UsherApp-double-checkin',
   given:'A guest has checked in already',
   when:'The same QR is scanned again',
   then:'No second print job is produced',
   evidence_type:'browser',reference:'user-defined scan flow',
   viewport:'desktop-with-printer',ui_state:'second-checkin',negative:true
  };
  const plan=await io.call('a2a_verify',{workspace:io.work,operation:'plan',criteria:[acceptance]});
  assert.equal(plan.isError,false);
  assert.equal(plan.body.completion.fully_verified,false);
  assert.equal(plan.body.completion.counts.not_tested,1);

  fs.mkdirSync(path.join(io.work,'reports'));
  fs.writeFileSync(path.join(io.work,'reports','suite.json'),JSON.stringify({
   format:'a2a-test-report-v1',completed:true,cases:[{name:'build succeeded',state:'passed'}]
  }));
  const assessed=await io.call('a2a_verify',{workspace:io.work,operation:'assess',
   criteria:[{...acceptance,artifact:'reports/suite.json',test_name:'build succeeded'}]});
  assert.equal(assessed.isError,false);
  assert.equal(assessed.body.completion.fully_verified,false);
  assert.equal(assessed.body.criteria[0].status,'inconclusive');
  assert.equal(assessed.body.release_ready,false);
  assert.equal(assessed.body.revision,revision);

  const conv='test-user-session-2026';
  const checkpoint=await io.call('a2a_evidence',{workspace:io.work,operation:'save_checkpoint',
   conversation_id:conv,task_summary:'Fix duplicate print',
   completed:['Updated backend handler'],
   next_steps:['Run physical device test'],
   decisions:['Second scan never reprints'],
   pending_tests:['Selfie only','Verification only']});
  assert.equal(checkpoint.isError,false);
  assert.equal(checkpoint.body.status,'saved');
  const restore=await io.call('a2a_evidence',{workspace:io.work,operation:'model_recovery',conversation_id:conv});
  assert.equal(restore.body.checkpoint.source_revision_matches,true);
  assert.equal(restore.body.checkpoint.pending_tests.length,2);
  assert.equal(restore.body.checkpoint.verified,false);
  const recovery=await io.call('a2a_evidence',{workspace:io.work,operation:'tool_recovery',
   tool_family:'browser',retry_count:3,error_hint:'Execution context was destroyed, token=THIS_IS_PRIVATE'});
  assert.equal(recovery.isError,false);
  assert.equal(recovery.body.category,'context_lost');
  assert.equal(recovery.body.retry_same_input,false);
  assert.equal(JSON.stringify(recovery.body).includes('THIS_IS_PRIVATE'),false);

  const bad=await io.call('a2a_evidence',{workspace:io.work,operation:'save_checkpoint',
   conversation_id:conv,task_summary:'password=THIS_IS_PRIVATE'});
  assert.equal(bad.isError,true);
  assert.equal(JSON.stringify(bad.body).includes('THIS_IS_PRIVATE'),false);

  fs.writeFileSync(path.join(io.work,'src','checkin.js'),'export function shouldPrint(isRepeat){return true}');
  const stale=await io.call('a2a_evidence',{workspace:io.work,operation:'model_recovery',conversation_id:conv});
  assert.equal(stale.isError,false);
  assert.equal(stale.body.checkpoint.source_freshness,'stale');
  assert.equal(stale.body.checkpoint.source_revision_matches,false);
  const inputError=await io.call('a2a_verify',{workspace:io.work,operation:'plan',criteria:[{...acceptance,foo:'invalid'}]});
  assert.equal(inputError.isError,true);
  assert.equal(inputError.body.code,'invalid_tool_arguments');
 }finally{await io.close()}
});
