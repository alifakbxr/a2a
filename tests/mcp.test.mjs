import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function spawnServer(){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verifykit-mcp-'));
  const p=spawn(process.execPath,['src/mcp.mjs'],{cwd:path.resolve('.'),env:{...process.env,HOME:temp,VERIFYKIT_DATA_DIR:path.join(temp,'db')},stdio:['pipe','pipe','pipe']});
  const lines=createInterface({input:p.stdout});const pending=[];lines.on('line',line=>{const fn=pending.shift();if(fn)fn(JSON.parse(line))});
  const ask=(req)=>new Promise((resolve,reject)=>{pending.push(resolve);p.stdin.write(JSON.stringify(req)+'\n',err=>{if(err)reject(err)})});
  return {p,temp,ask,close:()=>{p.stdin.end();p.kill();fs.rmSync(temp,{recursive:true,force:true})}};
}
test('MCP handshake, tool listing, and safe permission rejection',async()=>{
  const {p,ask,close}=spawnServer();try{
    const init=await ask({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'0.1'}}});
    assert.equal(init.result.serverInfo.name,'a2a');assert.equal(init.result.protocolVersion,'2025-03-26');
    const tools=await ask({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});assert.ok(tools.result.tools.length>=4);
    const denied=await ask({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'verifykit_context',arguments:{workspace:'/tmp'}}});assert.equal(denied.result.isError,true);assert.match(denied.result.content[0].text,/authorized|exist/);
    const unknown=await ask({jsonrpc:'2.0',id:4,method:'method/unknown',params:{}});assert.equal(unknown.error.code,-32601);
  }finally{close()}
});
