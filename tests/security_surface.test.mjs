import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateArgs} from '../src/tools.mjs';
import {getSessionTokenUsage} from '../src/tokens.mjs';

test('strict MCP parameter schemas reject inherited Object prototype keys at every depth',()=>{
  for(const key of ['constructor','toString','__proto__']){
    const top=JSON.parse('{"workspace":"/some/workspace","'+key+'":"hidden"}');
    assert.throws(()=>validateArgs('a2a_context',top),/Unknown argument/);
    const nested=JSON.parse('{"workspace":"/some/workspace","task":{"'+key+'":"hidden"}}');
    assert.throws(()=>validateArgs('a2a_context',nested),/Unknown argument/);
  }
  assert.doesNotThrow(()=>validateArgs('a2a_context',{workspace:'/some/workspace',action:'inspect'}));
});

test('MCP rejects side-effecting notifications without a request id',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-notification-'));
  try{
    const home=path.join(base,'home'),ws=path.join(base,'workspace');
    fs.mkdirSync(home);fs.mkdirSync(ws);
    fs.writeFileSync(path.join(ws,'package.json'),JSON.stringify({name:'test'}));
    const config=path.join(home,'.config','a2a');
    fs.mkdirSync(config,{recursive:true});
    fs.writeFileSync(path.join(config,'allowed-workspaces.json'),JSON.stringify({version:1,allowed:[fs.realpathSync(ws)]}));
    const env={...process.env,HOME:home,USERPROFILE:home,A2A_DATA_DIR:path.join(base,'data')};
    const method=(id,operation,args={})=>({jsonrpc:'2.0',...(id===undefined?{}:{id}),method:'tools/call',params:{name:'a2a_evidence',arguments:{workspace:ws,operation,...args}}});
    const requests=[
      method(undefined,'record_incident',{title:'This must never be persisted'}),
      method(2,'incidents')
    ];
    const call=spawnSync(process.execPath,['src/mcp.mjs'],{cwd:path.resolve('.'),env,input:requests.map(JSON.stringify).join('\n')+'\n',encoding:'utf8',timeout:10000});
    assert.equal(call.status,0,call.stderr);
    const replies=call.stdout.split(/\r?\n/).filter(Boolean).map(JSON.parse);
    assert.equal(replies.length,1);
    assert.equal(replies[0].id,2);
    const result=JSON.parse(replies[0].result.content[0].text);
    assert.deepEqual(result.items,[]);
  }finally{fs.rmSync(base,{recursive:true,force:true})}
});

test('untrusted hook transcript paths cannot cross the brain directory boundary',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-transcript-boundary-'));
  const old=process.env.ANTIGRAVITY_APP_DATA_DIR;
  try{
    process.env.ANTIGRAVITY_APP_DATA_DIR=path.join(base,'antigravity');
    const brain=path.join(base,'antigravity','brain');
    const data=path.join(base,'data');fs.mkdirSync(brain,{recursive:true});fs.mkdirSync(data);
    const outside=path.join(base,'outside.jsonl');
    fs.writeFileSync(outside,JSON.stringify({type:'PLANNER_RESPONSE',model:'PRIVATE',input_tokens:777})+'\n');
    const conv='conv-security-12';
    fs.writeFileSync(path.join(data,'active-session.json'),JSON.stringify({latest:{conversationId:conv,transcriptPath:outside}}));
    assert.equal(getSessionTokenUsage(null,{dataDirPath:data}),null);
    assert.equal(getSessionTokenUsage(null,{transcriptPath:outside}),null);
    const transcriptDir=path.join(brain,conv,'.system_generated','logs');
    fs.mkdirSync(transcriptDir,{recursive:true});
    const expected=path.join(transcriptDir,'transcript.jsonl');
    try{
      fs.symlinkSync(outside,expected);
      assert.equal(getSessionTokenUsage(conv),null);
    }catch(e){if(e.code!=='EPERM'&&e.code!=='EACCES')throw e;}
    fs.rmSync(expected,{force:true});
    fs.writeFileSync(expected,JSON.stringify({type:'PLANNER_RESPONSE',model:'safe',input_tokens:14})+'\n');
    assert.equal(getSessionTokenUsage(conv)?.latest_model,'safe');
    assert.equal(getSessionTokenUsage(null,{transcriptPath:expected})?.latest_model,'safe');
  }finally{
    if(old===undefined)delete process.env.ANTIGRAVITY_APP_DATA_DIR;else process.env.ANTIGRAVITY_APP_DATA_DIR=old;
    fs.rmSync(base,{recursive:true,force:true});
  }
});
