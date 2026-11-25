import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function spawnServer(extraEnv={}){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-mcp-'));
  const p=spawn(process.execPath,['src/mcp.mjs'],{cwd:path.resolve('.'),env:{...process.env,HOME:temp,USERPROFILE:temp,A2A_DATA_DIR:path.join(temp,'db'),...extraEnv},stdio:['pipe','pipe','pipe']});
  const lines=createInterface({input:p.stdout});const pending=[];lines.on('line',line=>{const fn=pending.shift();if(fn)fn(JSON.parse(line))});
  const ask=(req)=>new Promise((resolve,reject)=>{pending.push(resolve);p.stdin.write(JSON.stringify(req)+'\n',err=>{if(err)reject(err)})});
  const close=async ()=>{
    try{p.stdin.end()}catch{}
    try{p.kill()}catch{}
    await new Promise(resolve=>{
      if(p.exitCode!==null) return resolve();
      p.on('close',resolve);
      setTimeout(resolve,500);
    });
    try{fs.rmSync(temp,{recursive:true,force:true})}catch{}
  };
  return {p,temp,ask,close};
}
test('MCP handshake, default 4-tool listing, legacy alias routing, resources, and safe permission rejection',async()=>{
  const {temp,ask,close}=spawnServer();try{
    const init=await ask({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'0.1'}}});
    assert.equal(init.result.serverInfo.name,'pilah');
    assert.equal(init.result.protocolVersion,'2025-03-26');
    assert.ok(init.result.capabilities.resources);
    const newer=await ask({jsonrpc:'2.0',id:20,method:'initialize',params:{protocolVersion:'2026-07-28'}});
    assert.equal(newer.error.code,-32602);
    assert.deepEqual(newer.error.data.supported,['2025-03-26','2025-06-18','2025-11-25']);
    assert.ok(!newer.result);
    const unsupported=await ask({jsonrpc:'2.0',id:21,method:'initialize',params:{protocolVersion:'2099-01-01'}});
    assert.equal(unsupported.error.code,-32602);

    const tools=await ask({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});
    assert.equal(tools.result.tools.length,4);
    assert.ok(tools.result.tools.every(t=>t.name.startsWith('pilah_')));

    // Legacy verifykit_* tool calls remain backward-compatible even when not listed
    const deniedLegacy=await ask({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'verifykit_context',arguments:{workspace:'/tmp'}}});
    assert.equal(deniedLegacy.result.isError,true);
    assert.match(deniedLegacy.result.content[0].text,/authorized|exist|Protected/);

    // Authorize a workspace in temp allowlist and test skeleton + resources
    const work=path.join(temp,'proj');
    fs.mkdirSync(path.join(work,'src'),{recursive:true});
    fs.writeFileSync(path.join(work,'package.json'),'{"name":"proj"}');
    fs.writeFileSync(path.join(work,'src','app.js'),'// comment\nexport const x = "https://a.com//b";\n');
    const cfgDir=path.join(temp,'.config','a2a');
    fs.mkdirSync(cfgDir,{recursive:true});
    fs.writeFileSync(path.join(cfgDir,'allowed-workspaces.json'),JSON.stringify({version:1,allowed:[fs.realpathSync(work)]}));

    const skel=await ask({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'pilah_context',arguments:{workspace:work,action:'skeleton',file:'src/app.js'}}});
    assert.equal(skel.result.isError,false);
    const skelJson=JSON.parse(skel.result.content[0].text);
    assert.ok(!skelJson.files[0].skeleton.includes('// comment'));
    assert.ok(skelJson.files[0].skeleton.includes('https://a.com//b'));

    const resList=await ask({jsonrpc:'2.0',id:5,method:'resources/list',params:{}});
    assert.ok(resList.result.resources.length>=3);
    const resRead=await ask({jsonrpc:'2.0',id:6,method:'resources/read',params:{uri:'pilah://status'}});
    const statusObj=JSON.parse(resRead.result.contents[0].text);
    assert.equal(statusObj.name,'pilah');
    assert.equal(typeof statusObj.authorized_workspace_count,'number');
    assert.equal(typeof statusObj.antigravity_workspace_count,'number');
    assert.equal(typeof statusObj.data_dir_configured,'boolean');
    assert.equal(typeof statusObj.active_workspace_authorized,'boolean');
    assert.equal(statusObj.data_dir,undefined);
    assert.equal(statusObj.authorized_workspaces,undefined);
    assert.equal(statusObj.antigravity_workspaces,undefined);
    assert.ok(!JSON.stringify(statusObj).includes(temp),'Status must never disclose HOME, data directories, or authorized workspace paths');

    // resources/read previously passed raw authorization errors through JSON-RPC.
    const notTrusted=path.join(temp,'untrusted');
    fs.mkdirSync(notTrusted);
    fs.writeFileSync(path.join(notTrusted,'package.json'),JSON.stringify({name:'untrusted'}));
    fs.writeFileSync(path.join(temp,'db','active-session.json'),JSON.stringify({latest:{conversationId:'untrusted-session',workspacePaths:[notTrusted]}}));
    const deniedResource=await ask({jsonrpc:'2.0',id:16,method:'resources/read',params:{uri:'pilah://side-questions'}});
    assert.equal(deniedResource.error.code,-32000);
    assert.ok(!JSON.stringify(deniedResource).includes(temp),'Denied resources must not echo the host path');

    const resUnknown=await ask({jsonrpc:'2.0',id:7,method:'resources/read',params:{uri:'pilah://missing'}});
    assert.equal(resUnknown.error.code,-32002);

    const unknown=await ask({jsonrpc:'2.0',id:8,method:'method/unknown',params:{}});
    assert.equal(unknown.error.code,-32601);
  }finally{await close()}
});

test('MCP legacy alias env flag exposes 12 tools when enabled',async()=>{
  const {ask,close}=spawnServer({A2A_LEGACY_TOOL_ALIASES:'1'});try{
    const tools=await ask({jsonrpc:'2.0',id:1,method:'tools/list',params:{}});
    assert.equal(tools.result.tools.length,12);
  }finally{await close()}
});

test('hook.mjs fails open on malformed stdin and handles PostToolUse',()=>{
  const resBad=spawnSync(process.execPath,['scripts/hook.mjs'],{input:'{broken json',encoding:'utf8'});
  assert.equal(resBad.status,0);
  assert.equal(resBad.stdout.trim(),'{}');

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-hook-'));
  try{
    const resPost=spawnSync(process.execPath,['scripts/hook.mjs'],{
      input:JSON.stringify({hookEventName:'PostToolUse',conversationId:'c1',toolCall:{name:'run_command',args:{CommandLine:'npm test'}}}),
      env:{...process.env,HOME:temp,PLUGIN_DATA:path.join(temp,'pdata')},
      encoding:'utf8'
    });
    assert.equal(resPost.status,0);
    assert.equal(resPost.stdout.trim(),'{}');
    // No trusted workspace -> never create a global native-run record.
    assert.equal(fs.existsSync(path.join(temp,'pdata','last-test-run.json')),false);
  }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('MCP stdio supports 2025-06-18 and 2025-11-25 core capabilities without claiming modern tasks',async()=>{
 const {ask,close}=spawnServer();
 try{
  for(const protocolVersion of ['2025-06-18','2025-11-25']){
   const init=await ask({jsonrpc:'2.0',id:'init-'+protocolVersion,method:'initialize',
      params:{protocolVersion,capabilities:{},clientInfo:{name:'fixture',version:'1'}}});
   assert.equal(init.result.protocolVersion,protocolVersion);
   assert.ok(init.result.capabilities.tools);
   assert.equal(init.result.capabilities.tasks,undefined);
   const listed=await ask({jsonrpc:'2.0',id:'list-'+protocolVersion,method:'tools/list'});
   assert.equal(listed.result.tools.length,4);
  }
 }finally{await close()}
});
