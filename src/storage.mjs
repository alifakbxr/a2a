import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {dataDir,sha256} from './security.mjs';

const DDL=fs.readFileSync(new URL('../schemas/database.sql',import.meta.url),'utf8');
export class Store {
  constructor(base=dataDir()) {
    this.base=path.resolve(base);fs.mkdirSync(this.base,{recursive:true,mode:0o700});
    try{fs.chmodSync(this.base,0o700)}catch{}
    this.file=path.join(this.base,'verifykit.sqlite');
    this.db=new DatabaseSync(this.file);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;'+DDL);
    try{fs.chmodSync(this.file,0o600)}catch{}
    this.db.prepare("INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version','1')").run();
    const actual=this.db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value;
    if(actual!=='1') throw new Error('Incompatible VerifyKit database schema '+actual);
  }
  close(){this.db.close()}
  get(sql,...params){return this.db.prepare(sql).get(...params)}
  all(sql,...params){return this.db.prepare(sql).all(...params)}
  run(sql,...params){return this.db.prepare(sql).run(...params)}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result}catch(e){this.db.exec('ROLLBACK');throw e}}
  register(ws){let id=sha256(ws).slice(0,24);this.run('INSERT OR IGNORE INTO workspaces(id,canonical_path,created_at) VALUES(?,?,?)',id,ws,new Date().toISOString());return id}
  latest(wsId){return this.get('SELECT * FROM revisions WHERE workspace_id=? ORDER BY created_at DESC LIMIT 1',wsId)}
  insertRevision(wsId,snapshot,git,env){const id=sha256(wsId+':'+snapshot).slice(0,32);this.run('INSERT OR IGNORE INTO revisions(id,workspace_id,git_head,snapshot_sha,environment_json,created_at) VALUES(?,?,?,?,?,?)',id,wsId,git||null,snapshot,JSON.stringify(env),new Date().toISOString());return id}
  persistIndex(wsId,rev,files,nodes,edges){
    this.transaction(()=>{
      this.run('DELETE FROM edges WHERE workspace_id=?',wsId);
      this.run('DELETE FROM nodes WHERE workspace_id=?',wsId);
      this.run('DELETE FROM files WHERE workspace_id=?',wsId);
      const f=this.db.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)');for(const x of files)f.run(wsId,x.path,x.hash,x.language,x.bytes,rev);
      const n=this.db.prepare('INSERT INTO nodes VALUES(?,?,?,?,?,?,?,?)');for(const x of nodes)n.run(wsId,x.id,x.kind,x.label,x.path||null,x.line||null,x.basis||'source',rev);
      const e=this.db.prepare('INSERT OR IGNORE INTO edges VALUES(?,?,?,?,?,?,?,?,?)');for(const x of edges)e.run(wsId,x.id,x.from,x.to,x.kind,x.basis||'source',x.state||'observed',x.file||null,rev);
    });
  }
}
export const uniqueId=(prefix)=>`${prefix}-${cryptoRandom()}`;
function cryptoRandom(){return globalThis.crypto.randomUUID()}
