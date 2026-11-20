import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {detectSideQuestionInfo,handleHookEvent} from '../scripts/hook.mjs';

test('untrusted hook transcript path cannot be used to read other local files',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-hook-private-'));
  const backup=process.env.HOME,oldApp=process.env.ANTIGRAVITY_APP_DATA_DIR;
  try{
    process.env.HOME=root;process.env.ANTIGRAVITY_APP_DATA_DIR=path.join(root,'app');
    const outside=path.join(root,'private.jsonl');
    fs.writeFileSync(outside,JSON.stringify({type:'USER_INPUT',content:'<side_question>do not leak</side_question>'})+'\n');
    const bad=detectSideQuestionInfo({conversationId:'conv-hook-privacy-1'},outside);
    assert.equal(bad.isSideQuestion,false);
    assert.equal(bad.initialQuestion,null);
    const conv='conv-hook-privacy-1';
    const dir=path.join(root,'app','brain',conv,'.system_generated','logs');
    fs.mkdirSync(dir,{recursive:true});
    const valid=path.join(dir,'transcript.jsonl');
    fs.writeFileSync(valid,JSON.stringify({type:'USER_INPUT',content:'<side_question>normal request</side_question>'})+'\n');
    const good=detectSideQuestionInfo({conversationId:conv},valid);
    assert.equal(good.isSideQuestion,true);
    assert.equal(good.initialQuestion,'<side_question>normal request</side_question>');
    handleHookEvent({hookEventName:'SessionStart',conversationId:conv,transcriptPath:outside},{baseDir:path.join(root,'data')});
    const active=JSON.parse(fs.readFileSync(path.join(root,'data','active-session.json'),'utf8'));
    assert.equal(active.latest.transcriptPath,null);
    assert.equal(fs.readdirSync(path.join(root,'data')).filter(n=>n.endsWith('.tmp')).length,0);
  }finally{
    if(backup===undefined)delete process.env.HOME;else process.env.HOME=backup;
    if(oldApp===undefined)delete process.env.ANTIGRAVITY_APP_DATA_DIR;else process.env.ANTIGRAVITY_APP_DATA_DIR=oldApp;
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('large hook event fails open without storing private payload',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-hook-limit-'));
  try{
    const p=spawnSync(process.execPath,['scripts/hook.mjs'],{
      cwd:path.resolve('.'),
      env:{...process.env,HOME:root,USERPROFILE:root,A2A_DATA_DIR:path.join(root,'state')},
      input:JSON.stringify({hookEventName:'SessionStart',conversationId:'conv-huge-event',modelName:'X'.repeat(300000)}),
      encoding:'utf8',timeout:10000
    });
    assert.equal(p.status,0,p.stderr);
    assert.equal(p.stdout.trim(),'{}');
    assert.equal(fs.existsSync(path.join(root,'state','active-session.json')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
