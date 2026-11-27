import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {getMcpAppHtml} from '../src/mcp-app.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const plugin=JSON.parse(fs.readFileSync(path.join(root,'plugin.json'),'utf8'));

test('package, plugin, doctor and MCP initialize expose the same version',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-version-contract-'));
 try{
  const home=path.join(base,'home');fs.mkdirSync(home);
  const env={...process.env,HOME:home,USERPROFILE:home,A2A_DATA_DIR:path.join(base,'data')};
  assert.equal(pkg.version,plugin.version);
  assert.match(getMcpAppHtml(),new RegExp('>v'+pkg.version.replaceAll('.',String.raw`\.`)+'<'));
  assert.ok(getMcpAppHtml().includes('Status not verified'),'Dashboard cannot claim live validation');
  const doctor=spawnSync(process.execPath,['scripts/a2a.mjs','doctor'],{cwd:root,env,encoding:'utf8',timeout:10000});
  assert.equal(doctor.status,0,doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).version,pkg.version);
  const request={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}};
  const mcp=spawnSync(process.execPath,['src/mcp.mjs'],{cwd:root,env,encoding:'utf8',input:JSON.stringify(request)+'\n',timeout:10000});
  assert.equal(mcp.status,0,mcp.stderr);
  const replies=mcp.stdout.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  const initialize=replies.find(x=>x.id===1);
  assert.equal(initialize?.result?.serverInfo?.version,pkg.version);
 }finally{fs.rmSync(base,{recursive:true,force:true})}
});
