import { Database } from './sqlite-compat.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {dataDir,sha256,safeArtifactPath,MAX_ARTIFACT_BYTES,realpathIfExists} from './security.mjs';

const DDL=fs.readFileSync(new URL('../schemas/database.sql',import.meta.url),'utf8');
export class Store {
  constructor(base=dataDir()) {
    this.base=path.resolve(base);
    // Never chmod a broad/shared directory if a mistaken environment override
    // points storage at HOME, /tmp, filesystem root or an app configuration root.
    const home=os.homedir();
    const unsafe=[path.parse(this.base).root,home,os.tmpdir(),path.join(home,'.config'),path.join(home,'.gemini'),path.join(home,'.gemini','antigravity')];
    const compare=p=>process.platform==='win32'?p.toLowerCase():p;
    if(unsafe.some(p=>compare(path.resolve(p))===compare(this.base)))throw new Error('A2A data directory must be a dedicated private directory');
    fs.mkdirSync(this.base,{recursive:true,mode:0o700});
    const dataStat=fs.lstatSync(this.base);
    if(dataStat.isSymbolicLink()||!dataStat.isDirectory())throw new Error('A2A data directory must be a real directory');
    if(process.platform!=='win32'&&(dataStat.mode&0o002)!==0)throw new Error('A2A data directory cannot be world-writable');
    try{fs.chmodSync(this.base,0o700)}catch{}
    const a2aFile=path.join(this.base,'a2a.sqlite');
    const legacyFile=path.join(this.base,'verifykit.sqlite');
    const rejectUnsafeDbPath=(file)=>{
      let st;try{st=fs.lstatSync(file)}catch(e){if(e.code==='ENOENT')return;throw e}
      if(st.isSymbolicLink()||!st.isFile())throw new Error('Unsafe A2A database file type');
    };
    for(const file of [a2aFile,a2aFile+'-wal',a2aFile+'-shm',legacyFile])rejectUnsafeDbPath(file);
    if(!fs.existsSync(a2aFile) && fs.existsSync(legacyFile)){
      try{
        const src=new Database(legacyFile,{readOnly:true});
        try{src.prepare('VACUUM INTO ?').run(a2aFile)}finally{src.close()}
      }catch(e){
        // Raw copies are not WAL-consistent; never silently migrate a partial DB.
        throw new Error('Legacy A2A database migration failed; original database left unchanged');
      }
    }
    this.file=a2aFile;
    this.db=new Database(this.file);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000; PRAGMA trusted_schema=OFF;');
    this.#ensureColumn('workspaces','current_revision_id','TEXT');
    this.#ensureColumn('files','mtime_ms','REAL');
    this.#ensureColumn('artifact_versions','workspace_id','TEXT');
    // Upgrade old v2.0.1 RCA tables BEFORE applying DDL indexes that depend
    // on newly added columns. Other user data and incidents are preserved.
    this.#ensureColumn('incidents','signature_sha','TEXT');
    for(const [column,type] of [
      ['revision_id','TEXT'],['parent_hypothesis_id','TEXT'],
      ['why_depth','INTEGER NOT NULL DEFAULT 1'],['predicted_observation','TEXT'],
      ['disconfirming_test','TEXT'],['expected_criterion_id','TEXT'],
      ['plan_id','TEXT'],['assessment_json',"TEXT NOT NULL DEFAULT '{}'"],
      ['assessed_revision_id','TEXT'],['updated_at','TEXT']
    ])this.#ensureColumn('hypotheses',column,type);
    this.db.exec(DDL);
    // Existing v2.0.1 SQLite databases must upgrade in place, without
    // deleting prior user checkpoints or requiring a new major DB schema.
    this.#ensureColumn('recovery_checkpoints','decisions_json',"TEXT NOT NULL DEFAULT '[]'");
    this.#ensureColumn('recovery_checkpoints','pending_tests_json',"TEXT NOT NULL DEFAULT '[]'");
    try{fs.chmodSync(this.file,0o600)}catch{}
    this.db.prepare("INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version','1')").run();
    const actual=this.db.prepare("SELECT value FROM meta WHERE key='schema_version'").get()?.value;
    if(actual!=='1') throw new Error('Incompatible A2A database schema '+actual);
  }
  #ensureColumn(table,col,type){
    const tableExists=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if(!tableExists) return;
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
  register(ws){const canonical=realpathIfExists(ws);let id=sha256(canonical).slice(0,24);this.run('INSERT OR IGNORE INTO workspaces(id,canonical_path,created_at) VALUES(?,?,?)',id,canonical,new Date().toISOString());return id}
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
    const saved=0; // Deprecated schema column: there is no observed native baseline.
    this.run('INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)',wsId,String(toolName||'a2a'),String(action||''),raw,resp,saved,new Date().toISOString());
    try {
      this.run('DELETE FROM telemetry WHERE workspace_id=? AND id NOT IN (SELECT id FROM telemetry WHERE workspace_id=? ORDER BY created_at DESC LIMIT 500)', wsId, wsId);
    } catch {}
  }
  getTelemetrySummary(wsId){
    const row=this.get('SELECT COUNT(*) AS calls, COALESCE(SUM(raw_scope_tokens),0) AS raw_scope_tokens, COALESCE(SUM(response_tokens),0) AS response_tokens FROM telemetry WHERE workspace_id=?',wsId);
    return row||{calls:0,raw_scope_tokens:0,response_tokens:0};
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
    const sanitizedTitle=title?String(title).slice(0,240):null;
    const sanitizedQuestion=String(question).slice(0,2000);
    const sanitizedSummary=summary?String(summary).slice(0,2000):null;
    const existing=this.get('SELECT * FROM side_questions WHERE conversation_id=? AND workspace_id IS ?',conversationId,workspaceId);
    const sid=id||existing?.id||sha256((workspaceId||'unassigned')+':'+conversationId+':'+(parentConversationId||'')).slice(0,32);
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
      sid,workspaceId,conversationId,parentConversationId,sanitizedTitle,sanitizedQuestion,sanitizedSummary,status,transcriptPath,metaJson,createdAt,now
    );
    if(workspaceId){
      try{
        this.run('DELETE FROM side_questions WHERE workspace_id=? AND id NOT IN (SELECT id FROM side_questions WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 100)', workspaceId, workspaceId);
      }catch{}
    }
    const saved=this.get('SELECT * FROM side_questions WHERE id=?',sid);
    return {...saved,metadata:JSON.parse(saved.metadata_json||'{}'),metadata_json:undefined};
  }
  listSideQuestions({workspaceId=null,parentConversationId=null,conversationId=null,limit=20}={}){
    let sql='SELECT * FROM side_questions WHERE 1=1';
    const params=[];
    if(workspaceId){sql+=' AND workspace_id=?';params.push(workspaceId);}
    if(parentConversationId){sql+=' AND parent_conversation_id=?';params.push(parentConversationId);}
    if(conversationId){sql+=' AND conversation_id=?';params.push(conversationId);}
    sql+=' ORDER BY updated_at DESC LIMIT ?';
    params.push(Math.max(1,Math.min(100,Number(limit)||20)));
    return this.all(sql,...params).map(r=>({...r,metadata:JSON.parse(r.metadata_json||'{}'),metadata_json:undefined}));
  }
  getSideQuestion(idOrConvId,{workspaceId=null}={}){
    if(!workspaceId)return null;
    const row=this.get('SELECT * FROM side_questions WHERE workspace_id=? AND (id=? OR conversation_id=?) LIMIT 1',workspaceId,idOrConvId,idOrConvId);
    if(!row)return null;
    return {...row,metadata:JSON.parse(row.metadata_json||'{}'),metadata_json:undefined};
  }
  snapshotArtifact({workspaceId=null,conversationId,artifactPath,content=null,workspaceRoot=null}){
    if(!conversationId||typeof conversationId!=='string'||!/^[a-zA-Z0-9_\-.]{4,64}$/.test(conversationId)){
      throw new Error('Valid conversationId is required for artifact snapshot');
    }
    // A workspace-bound snapshot must not be rebound to another workspace ID.
    if(workspaceRoot && workspaceId && this.register(workspaceRoot)!==workspaceId){
      throw new Error('Artifact workspace identity mismatch');
    }
    const validPath=safeArtifactPath(workspaceRoot,conversationId,artifactPath,{mustExist:content===null});
    const artifactName=path.basename(validPath);
    let rawContent=content;
    if(rawContent===null){
      rawContent=fs.readFileSync(validPath,'utf8');
    }
    if(typeof rawContent!=='string'||Buffer.byteLength(rawContent)>MAX_ARTIFACT_BYTES){
      throw new Error(`Artifact content exceeds maximum allowed size (${MAX_ARTIFACT_BYTES/1024} KB)`);
    }
    const contentSha=sha256(rawContent);
    // Serialize version allocation and retention across concurrent processes.
    // The database is the source of truth; filesystem shadows are best-effort.
    let outcome,removedVersions=[];
    this.transaction(()=>{
      const latest=this.get(
        'SELECT * FROM artifact_versions WHERE workspace_id IS ? AND conversation_id=? AND artifact_name=? ORDER BY version_number DESC LIMIT 1',
        workspaceId||null,conversationId,artifactName
      );
      if(latest&&latest.content_sha===contentSha){
        outcome={...latest,changed:false};
        return;
      }
      const versionNumber=latest?latest.version_number+1:1;
      const diff=latest?computeUnifiedDiff(latest.content,rawContent,'v'+latest.version_number,'v'+versionNumber):'';
      const id=sha256((workspaceId||'unassigned')+':'+conversationId+':'+artifactName+':'+versionNumber+':'+contentSha).slice(0,32);
      const now=new Date().toISOString();
      this.run(
        'INSERT INTO artifact_versions(id,workspace_id,conversation_id,artifact_name,version_number,content_sha,content,diff_from_previous,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
        id,workspaceId||null,conversationId,artifactName,versionNumber,contentSha,rawContent,diff,now
      );
      // Keep retention independent of filesystem-shadow write success.
      const excess=this.all(
        'SELECT id,version_number FROM artifact_versions WHERE workspace_id IS ? AND conversation_id=? AND artifact_name=? ORDER BY version_number DESC LIMIT -1 OFFSET 10',
        workspaceId||null,conversationId,artifactName
      );
      for(const oldRow of excess)this.run('DELETE FROM artifact_versions WHERE id=?',oldRow.id);
      removedVersions=excess.map(x=>x.version_number);
      outcome={
        id,workspace_id:workspaceId||null,conversation_id:conversationId,artifact_name:artifactName,
        version_number:versionNumber,content_sha:contentSha,diff_from_previous:diff,created_at:now,
        changed:true,bytes:Buffer.byteLength(rawContent)
      };
    });
    if(!outcome.changed)return outcome;
    try{
      const histDir=path.join(this.base,'artifact_history',workspaceId||'unassigned',conversationId);
      // Create one component at a time; recursive mkdir would follow a
      // pre-existing malicious symlink before we could inspect it.
      let cursor=this.base;
      for(const part of path.relative(this.base,histDir).split(path.sep)){
        cursor=path.join(cursor,part);
        try{fs.mkdirSync(cursor,{mode:0o700})}catch(e){if(e.code!=='EEXIST')throw e}
        const stat=fs.lstatSync(cursor);
        if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Unsafe artifact shadow path');
      }
      try{fs.chmodSync(histDir,0o700)}catch{}
      const shadowPath=path.join(histDir,artifactName+'.v'+outcome.version_number+'.md');
      try{fs.writeFileSync(shadowPath,rawContent,{encoding:'utf8',mode:0o600,flag:'wx'})}catch{}
      for(const n of removedVersions){
        const oldShadow=path.join(histDir,artifactName+'.v'+n+'.md');
        try{fs.unlinkSync(oldShadow)}catch{}
      }
    }catch{}
    return outcome;
  }
  listArtifactVersions({workspaceId=null,conversationId,artifactName=null,limit=50}={}){
    let sql="SELECT id,workspace_id,conversation_id,artifact_name,version_number,content_sha,created_at,LENGTH(content) AS bytes,(diff_from_previous IS NOT NULL AND diff_from_previous!='') AS has_diff FROM artifact_versions WHERE 1=1";
    const params=[];
    if(conversationId){sql+=' AND conversation_id=?';params.push(conversationId);}
    if(workspaceId){sql+=' AND workspace_id=?';params.push(workspaceId);}
    if(artifactName){sql+=' AND artifact_name=?';params.push(artifactName);}
    sql+=' ORDER BY version_number DESC LIMIT ?';
    params.push(Math.max(1,Math.min(200,Number(limit)||50)));
    return this.all(sql,...params);
  }
  getArtifactVersion({workspaceId=null,conversationId,artifactName,versionNumber=null}={}){
    let sql='SELECT * FROM artifact_versions WHERE conversation_id=? AND artifact_name=?';
    const params=[conversationId,artifactName];
    if(workspaceId){sql+=' AND workspace_id=?';params.push(workspaceId);}
    if(versionNumber!==null&&versionNumber!==undefined){
      sql+=' AND version_number=?';
      params.push(Number(versionNumber));
    }else{
      sql+=' ORDER BY version_number DESC LIMIT 1';
    }
    return this.get(sql,...params)||null;
  }
  getArtifactDiff({workspaceId=null,conversationId,artifactName,v1=null,v2=null}={}){
    if(!v1&&!v2){
      let sql='SELECT * FROM artifact_versions WHERE conversation_id=? AND artifact_name=?';
      const params=[conversationId,artifactName];
      if(workspaceId){sql+=' AND workspace_id=?';params.push(workspaceId);}
      sql+=' ORDER BY version_number DESC LIMIT 1';
      const latest=this.get(sql,...params);
      if(!latest)return null;
      return {
        artifact_name:artifactName,
        v1:latest.version_number>1?latest.version_number-1:0,
        v2:latest.version_number,
        diff:latest.diff_from_previous||''
      };
    }
    const row1=v1?this.getArtifactVersion({workspaceId,conversationId,artifactName,versionNumber:v1}):null;
    const row2=v2?this.getArtifactVersion({workspaceId,conversationId,artifactName,versionNumber:v2}):null;
    // A nonexistent explicitly requested version is not an empty artifact:
    // returning a diff against empty content could falsely imply a real history.
    const missing_versions=[...(v1&&!row1?[v1]:[]),...(v2&&!row2?[v2]:[])];
    if(missing_versions.length)return {artifact_name:artifactName,v1:v1||0,v2:v2||0,status:'version_not_found',missing_versions,diff:null};
    const content1=row1?.content||'';
    const content2=row2?.content||'';
    return {
      artifact_name:artifactName,
      v1:v1||0,
      v2:v2||0,
      diff:computeUnifiedDiff(content1,content2,`v${v1||0}`,`v${v2||0}`)
    };
  }
  scanAndSnapshotBrainArtifacts(conversationId,brainDir=null,{workspaceId=null,workspaceRoot=null}={}){
    if(!conversationId)return [];
    const bDir=brainDir||path.join(process.env.HOME||'','.gemini/antigravity/brain',conversationId);
    if(!fs.existsSync(bDir))return [];
    const results=[];
    try{
      const files=fs.readdirSync(bDir,{withFileTypes:true});
      for(const entry of files){
        if(entry.isFile()&&entry.name.endsWith('.md')){
          const filePath=path.join(bDir,entry.name);
          const snap=this.snapshotArtifact({workspaceId,workspaceRoot,conversationId,artifactPath:filePath});
          if(snap&&snap.changed)results.push(snap);
        }
      }
    }catch{}
    return results;
  }
}

export function computeUnifiedDiff(oldStr,newStr,oldLabel='vPrevious',newLabel='vCurrent'){
  if(oldStr===newStr)return '';
  const oldLines=oldStr?oldStr.split('\n'):[];
  const newLines=newStr?newStr.split('\n'):[];
  const diff=[`--- ${oldLabel}`,`+++ ${newLabel}`];
  const m=oldLines.length,n=newLines.length;
  if(m>2500||n>2500){
    diff.push(`@@ -1,${m} +1,${n} @@`,`- (previous content: ${m} lines)`,`+ (updated content: ${n} lines)`);
    return diff.join('\n');
  }
  const dp=Array.from({length:m+1},()=>new Uint16Array(n+1));
  for(let i=0;i<m;i++){
    for(let j=0;j<n;j++){
      dp[i+1][j+1]=oldLines[i]===newLines[j]?dp[i][j]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  let i=m,j=n;
  const script=[];
  while(i>0||j>0){
    if(i>0&&j>0&&oldLines[i-1]===newLines[j-1]){
      script.push({type:' ',text:oldLines[i-1]});
      i--;j--;
    }else if(j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])){
      script.push({type:'+',text:newLines[j-1]});
      j--;
    }else if(i>0&&(j===0||dp[i][j-1]<dp[i-1][j])){
      script.push({type:'-',text:oldLines[i-1]});
      i--;
    }
  }
  script.reverse();
  let hunk=[],inHunk=false;
  for(let idx=0;idx<script.length;idx++){
    const item=script[idx];
    if(item.type!==' '){
      if(!inHunk){
        inHunk=true;
        const start=Math.max(0,idx-2);
        for(let k=start;k<idx;k++){
          if(script[k].type===' ')hunk.push(' '+script[k].text);
        }
      }
      hunk.push(item.type+item.text);
    }else if(inHunk){
      hunk.push(' '+item.text);
      const nextChange=script.slice(idx+1,idx+3).some(x=>x.type!==' ');
      if(!nextChange){
        diff.push(...hunk);
        hunk=[];
        inHunk=false;
      }
    }
  }
  if(hunk.length>0)diff.push(...hunk);
  return diff.join('\n');
}
export const uniqueId=(prefix)=>`${prefix}-${cryptoRandom()}`;
function cryptoRandom(){return globalThis.crypto.randomUUID()}
