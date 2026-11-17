import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {dataDir,sha256} from './security.mjs';

const DDL=fs.readFileSync(new URL('../schemas/database.sql',import.meta.url),'utf8');
export class Store {
  constructor(base=dataDir()) {
    this.base=path.resolve(base);fs.mkdirSync(this.base,{recursive:true,mode:0o700});
    try{fs.chmodSync(this.base,0o700)}catch{}
    const a2aFile=path.join(this.base,'a2a.sqlite');
    const legacyFile=path.join(this.base,'verifykit.sqlite');
    if(!fs.existsSync(a2aFile) && fs.existsSync(legacyFile)){
      try{
        const src=new DatabaseSync(legacyFile,{readOnly:true});
        try{src.prepare('VACUUM INTO ?').run(a2aFile)}finally{src.close()}
      }catch{
        try{fs.copyFileSync(legacyFile,a2aFile)}catch{}
      }
    }
    this.file=a2aFile;
    this.db=new DatabaseSync(this.file);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;'+DDL);
    try{fs.chmodSync(this.file,0o600)}catch{}
    this.#ensureColumn('workspaces','current_revision_id','TEXT');
    this.#ensureColumn('files','mtime_ms','REAL');
    this.db.prepare("INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version','1')").run();
    const actual=this.db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value;
    if(actual!=='1') throw new Error('Incompatible A2A database schema '+actual);
  }
  #ensureColumn(table,col,type){
    const cols=this.db.prepare(`PRAGMA table_info(${table})`).all();
    if(!cols.some(c=>c.name===col)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
  close(){this.db.close()}
  get(sql,...params){return this.db.prepare(sql).get(...params)}
  all(sql,...params){return this.db.prepare(sql).all(...params)}
  run(sql,...params){return this.db.prepare(sql).run(...params)}
  transaction(fn){
    let active=false;
    this.db.exec('BEGIN IMMEDIATE');
    active=true;
    try{
      const result=fn();
      this.db.exec('COMMIT');
      active=false;
      return result;
    }catch(e){
      if(active){try{this.db.exec('ROLLBACK')}catch{}}
      throw e;
    }
  }
  register(ws){let id=sha256(ws).slice(0,24);this.run('INSERT OR IGNORE INTO workspaces(id,canonical_path,created_at) VALUES(?,?,?)',id,ws,new Date().toISOString());return id}
  latest(wsId){
    const active=this.get('SELECT r.* FROM workspaces w JOIN revisions r ON r.id=w.current_revision_id WHERE w.id=? AND r.workspace_id=?',wsId,wsId);
    if(active) return active;
    return this.get('SELECT * FROM revisions WHERE workspace_id=? ORDER BY created_at DESC LIMIT 1',wsId);
  }
  insertRevision(wsId,snapshot,git,env){
    const id=sha256(wsId+':'+snapshot).slice(0,32);
    const now=new Date().toISOString();
    this.run('INSERT INTO revisions(id,workspace_id,git_head,snapshot_sha,environment_json,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at, git_head=excluded.git_head',id,wsId,git||null,snapshot,JSON.stringify(env),now);
    this.run('UPDATE workspaces SET current_revision_id=? WHERE id=?',id,wsId);
    return id;
  }
  persistIndex(wsId,rev,files,nodes,edges){
    this.transaction(()=>{
      const existingFiles=new Map(this.all('SELECT path,content_sha,bytes,mtime_ms FROM files WHERE workspace_id=?',wsId).map(r=>[r.path,r]));
      const incomingFiles=new Map(files.map(f=>[f.path,f]));
      const delFile=this.db.prepare('DELETE FROM files WHERE workspace_id=? AND path=?');
      const upsertFile=this.db.prepare('INSERT INTO files(workspace_id,path,content_sha,language,bytes,revision_id,mtime_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(workspace_id,path) DO UPDATE SET content_sha=excluded.content_sha,language=excluded.language,bytes=excluded.bytes,revision_id=excluded.revision_id,mtime_ms=excluded.mtime_ms');
      for(const p of existingFiles.keys()) if(!incomingFiles.has(p)) delFile.run(wsId,p);
      for(const x of files){
        const prev=existingFiles.get(x.path);
        const mtime=x.mtime_ms??null;
        if(!prev || prev.content_sha!==x.hash || prev.bytes!==x.bytes || prev.mtime_ms!==mtime){
          upsertFile.run(wsId,x.path,x.hash,x.language,x.bytes,rev,mtime);
        }
      }

      const existingNodes=new Map(this.all('SELECT id,kind,label,file_path,line,basis FROM nodes WHERE workspace_id=?',wsId).map(r=>[r.id,r]));
      const incomingNodes=new Map(nodes.map(n=>[n.id,n]));
      const delNode=this.db.prepare('DELETE FROM nodes WHERE workspace_id=? AND id=?');
      const upsertNode=this.db.prepare('INSERT INTO nodes(workspace_id,id,kind,label,file_path,line,basis,revision_id) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(workspace_id,id) DO UPDATE SET kind=excluded.kind,label=excluded.label,file_path=excluded.file_path,line=excluded.line,basis=excluded.basis,revision_id=excluded.revision_id');
      for(const id of existingNodes.keys()) if(!incomingNodes.has(id)) delNode.run(wsId,id);
      for(const x of nodes){
        const prev=existingNodes.get(x.id);
        const fp=x.path||null, ln=x.line||null, basis=x.basis||'source';
        if(!prev || prev.kind!==x.kind || prev.label!==x.label || prev.file_path!==fp || prev.line!==ln || prev.basis!==basis){
          upsertNode.run(wsId,x.id,x.kind,x.label,fp,ln,basis,rev);
        }
      }

      const existingEdgeIds=new Set(this.all('SELECT id FROM edges WHERE workspace_id=?',wsId).map(r=>r.id));
      const incomingEdgeIds=new Set(edges.map(e=>e.id));
      const delEdge=this.db.prepare('DELETE FROM edges WHERE workspace_id=? AND id=?');
      const insEdge=this.db.prepare('INSERT OR IGNORE INTO edges(workspace_id,id,source,target,kind,basis,state,source_file,revision_id) VALUES(?,?,?,?,?,?,?,?,?)');
      for(const id of existingEdgeIds) if(!incomingEdgeIds.has(id)) delEdge.run(wsId,id);
      for(const x of edges){
        if(!existingEdgeIds.has(x.id)){
          insEdge.run(wsId,x.id,x.from,x.to,x.kind,x.basis||'source',x.state||'observed',x.file||null,rev);
        }
      }
    });
  }
  recordTelemetry(wsId,{toolName,action,rawScopeTokens=0,responseTokens=0}){
    const raw=Math.max(0,Math.round(rawScopeTokens));
    const resp=Math.max(0,Math.round(responseTokens));
    const saved=Math.max(0,raw-resp);
    this.run('INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)',wsId,String(toolName||'a2a'),String(action||''),raw,resp,saved,new Date().toISOString());
  }
  getTelemetrySummary(wsId){
    const row=this.get('SELECT COUNT(*) AS calls, COALESCE(SUM(raw_scope_tokens),0) AS raw_scope_tokens, COALESCE(SUM(response_tokens),0) AS response_tokens, COALESCE(SUM(tokens_saved),0) AS tokens_saved FROM telemetry WHERE workspace_id=?',wsId);
    return row||{calls:0,raw_scope_tokens:0,response_tokens:0,tokens_saved:0};
  }
  recordSideQuestion({
    id=null,
    workspaceId=null,
    conversationId,
    parentConversationId=null,
    title=null,
    question,
    summary=null,
    status='resolved',
    transcriptPath=null,
    metadata={}
  }){
    if(!conversationId||!question)throw new Error('conversationId and question are required');
    const existing=this.get('SELECT * FROM side_questions WHERE conversation_id=?',conversationId);
    const sid=id||existing?.id||sha256(conversationId+':'+(parentConversationId||'')).slice(0,32);
    const now=new Date().toISOString();
    const createdAt=existing?.created_at||now;
    const metaJson=JSON.stringify(metadata||{});
    this.run(
      `INSERT INTO side_questions(id,workspace_id,conversation_id,parent_conversation_id,title,question,summary,status,transcript_path,metadata_json,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         workspace_id=COALESCE(excluded.workspace_id,side_questions.workspace_id),
         parent_conversation_id=COALESCE(excluded.parent_conversation_id,side_questions.parent_conversation_id),
         title=COALESCE(excluded.title,side_questions.title),
         question=excluded.question,
         summary=COALESCE(excluded.summary,side_questions.summary),
         status=excluded.status,
         transcript_path=COALESCE(excluded.transcript_path,side_questions.transcript_path),
         metadata_json=excluded.metadata_json,
         updated_at=excluded.updated_at`,
      sid,workspaceId,conversationId,parentConversationId,title,question,summary,status,transcriptPath,metaJson,createdAt,now
    );
    const saved=this.get('SELECT * FROM side_questions WHERE id=?',sid);
    return {...saved,metadata:JSON.parse(saved.metadata_json||'{}'),metadata_json:undefined};
  }
  listSideQuestions({workspaceId=null,parentConversationId=null,conversationId=null,limit=20}={}){
    let sql='SELECT * FROM side_questions WHERE 1=1';
    const params=[];
    if(workspaceId){sql+=' AND (workspace_id=? OR workspace_id IS NULL)';params.push(workspaceId);}
    if(parentConversationId){sql+=' AND parent_conversation_id=?';params.push(parentConversationId);}
    if(conversationId){sql+=' AND conversation_id=?';params.push(conversationId);}
    sql+=' ORDER BY updated_at DESC LIMIT ?';
    params.push(Math.max(1,Math.min(100,Number(limit)||20)));
    return this.all(sql,...params).map(r=>({...r,metadata:JSON.parse(r.metadata_json||'{}'),metadata_json:undefined}));
  }
  getSideQuestion(idOrConvId){
    const row=this.get('SELECT * FROM side_questions WHERE id=? OR conversation_id=? LIMIT 1',idOrConvId,idOrConvId);
    if(!row)return null;
    return {...row,metadata:JSON.parse(row.metadata_json||'{}'),metadata_json:undefined};
  }
}
export const uniqueId=(prefix)=>`${prefix}-${cryptoRandom()}`;
function cryptoRandom(){return globalThis.crypto.randomUUID()}
