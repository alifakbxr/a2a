import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {TOOLS,validateArgs} from '../src/tools.mjs';
import {getA2AMode} from '../src/security.mjs';
import {handleHookEvent} from '../scripts/hook.mjs';

test('MCP verify_handoff is available in the published contract',()=>{
  const tool=TOOLS.find(t=>t.name==='a2a_verify');
  assert.ok(tool);
  assert.ok(tool.inputSchema.properties.operation.enum.includes('verify_handoff'));
  assert.ok(tool.inputSchema.properties.worker_name);
  assert.ok(tool.inputSchema.properties.artifact);
  assert.ok(tool.inputSchema.properties.allow_stale);
  assert.doesNotThrow(()=>validateArgs('a2a_verify',{
    workspace:process.cwd(),operation:'verify_handoff',
    worker_name:'worker-1',artifact:'report.xml',
    criteria:[{id:'required',test_name:'feature works'}]
  }));
  assert.throws(()=>validateArgs('a2a_verify',{
    workspace:process.cwd(),operation:'verify_handoff',unknown:true
  }),/Unknown argument/);
});

test('file URL conversion preserves OS-native paths including encoded spaces',()=>{
  const dir=path.join(os.tmpdir(),'a2a filename with spaces','unicode-é');
  const url=pathToFileURL(dir).href;
  assert.equal(fileURLToPath(url),dir);
});

test('fresh installations default to on-demand with no SessionStart instruction injection',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-opt-in-'));
  const keys=['HOME','USERPROFILE','A2A_DATA_DIR','PLUGIN_DATA','VERIFYKIT_DATA_DIR'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    process.env.HOME=base;
    process.env.USERPROFILE=base;
    process.env.A2A_DATA_DIR=path.join(base,'data');
    delete process.env.PLUGIN_DATA;
    delete process.env.VERIFYKIT_DATA_DIR;
    assert.equal(getA2AMode(),'on-demand');
    const args={hookEventName:'SessionStart',conversationId:'test-session-1234',workspacePaths:[],cwd:base};
    assert.deepEqual(handleHookEvent(args,{baseDir:path.join(base,'data')}),{});
    const settings=path.join(base,'.config','a2a','settings.json');
    fs.mkdirSync(path.dirname(settings),{recursive:true});
    fs.writeFileSync(settings,JSON.stringify({mode:'always-on'}));
    assert.ok(Array.isArray(handleHookEvent(args,{baseDir:path.join(base,'data')}).injectSteps));
  }finally{
    for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
    fs.rmSync(base,{recursive:true,force:true});
  }
});
