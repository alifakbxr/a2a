import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as sqlite from 'node:sqlite';
import {Database} from '../src/sqlite-compat.mjs';
import {Store} from '../src/storage.mjs';

function withTemp(fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'a2a-node-runtime-'));
  try{return fn(root)}
  finally{fs.rmSync(root,{recursive:true,force:true})}
}

test('Node 22-26 SQLite compatibility chooses current Database when available',()=>{
  assert.equal(typeof Database,'function');
  assert.equal(Database,typeof sqlite.Database==='function'?sqlite.Database:sqlite.DatabaseSync);
  const db=new Database(':memory:');
  try{
    db.exec('PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    db.prepare('INSERT INTO test(value) VALUES(?)').run('runtime-ok');
    assert.equal(db.prepare('SELECT value FROM test WHERE id=1').get().value,'runtime-ok');
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
  }finally{db.close()}
});

test('SQLite synchronous store creates persistent WAL data and commits/rolls back',()=>withTemp(root=>{
  const data=path.join(root,'a2a-private-store');
  let store=new Store(data);
  try{
    assert.equal(store.get("SELECT value FROM meta WHERE key='schema_version'").value,'1');
    assert.equal(store.get('PRAGMA journal_mode').journal_mode,'wal');
    store.run("INSERT INTO meta(key,value) VALUES('node-runtime','cross-version')");
    assert.throws(()=>store.transaction(()=>{
      store.run("INSERT INTO meta(key,value) VALUES('rolled-back','should-not-remain')");
      throw Error('abort transaction');
    }),/abort transaction/);
    assert.equal(store.get("SELECT value FROM meta WHERE key='rolled-back'"),undefined);
  }finally{store.close()}
  store=new Store(data);
  try{
    assert.equal(store.get("SELECT value FROM meta WHERE key='node-runtime'").value,'cross-version');
    assert.equal(store.get('PRAGMA trusted_schema').trusted_schema,0);
  }finally{store.close()}
}));

test('Older verifykit.sqlite migrates with VACUUM INTO on supported Node LTS runtimes',()=>withTemp(root=>{
  const data=path.join(root,'private-migration');
  fs.mkdirSync(data,{recursive:true,mode:0o700});
  const legacyFile=path.join(data,'verifykit.sqlite');
  const oldDb=new Database(legacyFile);
  try{
    oldDb.exec("CREATE TABLE migration_probe (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
    oldDb.prepare('INSERT INTO migration_probe(id,value) VALUES(?,?)').run('retained','legacy-row');
  }finally{oldDb.close()}
  const store=new Store(data);
  try{
    assert.equal(store.get("SELECT value FROM migration_probe WHERE id='retained'").value,'legacy-row');
    assert.equal(store.get("SELECT value FROM meta WHERE key='schema_version'").value,'1');
    assert.ok(fs.existsSync(path.join(data,'a2a.sqlite')));
  }finally{store.close()}
  assert.ok(fs.existsSync(legacyFile),'Original legacy DB must not be deleted');
}));

test('CLI doctor reports running Node version on all supported runtimes',()=>withTemp(root=>{
  const data=path.join(root,'doctor-store');
  const subprocess=spawnSync(process.execPath,['scripts/a2a.mjs','doctor'],{
    cwd:new URL('../',import.meta.url).pathname,
    env:{...process.env,A2A_DATA_DIR:data},
    timeout:15000,encoding:'utf8',windowsHide:true
  });
  assert.equal(subprocess.status,0,subprocess.stderr);
  const doctor=JSON.parse(subprocess.stdout);
  assert.equal(doctor.node,process.versions.node);
  assert.equal(doctor.node_requirement,'>=22.13.0');
  assert.equal(doctor.sqlite,'node:sqlite');
}));
