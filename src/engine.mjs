import fs from 'node:fs';
import os from 'node:os';
import {Store,uniqueId} from './storage.mjs';
import {requireAuthorizedWorkspace,sha256,cleanError} from './security.mjs';
import {discover,createGraph,snapshotOf,gitHead,discoverTestCommands} from './scanner.mjs';
import {contextQuery,analyzeImpact,shortGraphSummary,validateChangedPaths} from './graph.mjs';
import {planVerification,assessVerification,listEvidence,freshness} from './verification.mjs';
import {estimateTokens,getSessionTokenUsage,analyzeWorkspaceTokens} from './tokens.mjs';

export class Engine {
  constructor({store}={}) {this.store=store||new Store();this.owned=!store;}
  close(){if(this.owned)this.store.close()}
  sync(workspace){
    const root=requireAuthorizedWorkspace(workspace),wsId=this.store.register(root), index=discover(root), git=gitHead(root);
    const snapshot=sha256((git||'no-git')+'|'+snapshotOf(index));const current=this.store.latest(wsId);
    const revision=this.store.insertRevision(wsId,snapshot,git,{os:os.platform(),arch:os.arch(),node:process.versions.node});
    if(!current||current.id!==revision||this.store.get('SELECT count(*) AS n FROM files WHERE workspace_id=?',wsId).n!==index.files.length){const graph=createGraph(index);this.store.persistIndex(wsId,revision,index.files.map(({text,...rest})=>rest),graph.nodes,graph.edges)}
    return {root,wsId,revision,index,git,snapshot,skipped:index.skipped};
  }
  context({workspace,action='inspect',query='',limit=12}={}){
    const s=this.sync(workspace),wsTokens=analyzeWorkspaceTokens(s.index);
    const base={workspace_id:s.wsId,revision:s.revision,git_head:s.git,coverage:{...shortGraphSummary(this.store,s.wsId),skipped_files:s.skipped.length,incomplete:s.skipped.some(x=>x==='index_limit_exceeded'||x==='index_byte_budget_exceeded'),estimated_source_tokens:wsTokens.total_estimated_tokens,tokens_saved_ratio:wsTokens.efficiency.savings_ratio},read_only:true};
    if(action==='inspect')return {...base,ecosystems:discoverTestCommands(s.index).suggestions.map(x=>x.ecosystem),test_candidates:discoverTestCommands(s.index).testFiles.slice(0,25),tokens:{estimated_source_tokens:wsTokens.total_estimated_tokens,efficiency:wsTokens.efficiency},limitations:['Language analysis is heuristic and static; relationships may be incomplete.']};
    if(action==='query')return {...base,...contextQuery(this.store,s.wsId,{query,limit})};
    if(action==='freshness')return {...base,evidence:freshness(this.store,s.wsId,s.root,s.revision)};
    if(action==='tokens')return {...base,workspace_tokens:wsTokens,session_tokens:getSessionTokenUsage()};
    throw new Error('Unknown context action');
  }
  impact({workspace,changed=[],depth=3}={}){validateChangedPaths(changed);const s=this.sync(workspace);const impactTokens=analyzeWorkspaceTokens(s.index,changed);return {revision:s.revision,...analyzeImpact(this.store,s.wsId,s.root,{changed,depth}),tokens_affected:impactTokens.changed_files_tokens,incomplete_index:s.skipped.some(x=>x==='index_limit_exceeded'||x==='index_byte_budget_exceeded')}}
  verify({workspace,operation='plan',criteria=[],changed=[]}={}){
    const s=this.sync(workspace);
    if(operation==='plan'){validateChangedPaths(changed);return {revision:s.revision,...planVerification({index:s.index,impact:analyzeImpact(this.store,s.wsId,s.root,{changed}),criteria})}}
    if(operation==='assess')return assessVerification(this.store,s.wsId,s.root,s.revision,criteria);
    throw new Error('Unknown verify operation');
  }
  evidence({workspace,operation='list',id,limit=20,title,root_cause='',paths=[],criteria=[],evidence_ids=[],hypothesis,experiment,incident_id}={}){
    const s=this.sync(workspace),wsId=s.wsId;
    if(operation==='list')return {revision:s.revision,...listEvidence(this.store,wsId,s.root,s.revision,{limit,id})};
    if(operation==='runs')return {revision:s.revision,runs:this.store.all('SELECT id,revision_id,verdict,criteria_json,created_at FROM runs WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20))).map(x=>({...x,fresh:x.revision_id===s.revision,criteria:JSON.parse(x.criteria_json),criteria_json:undefined}))};
    if(operation==='incidents')return {items:this.store.all('SELECT * FROM incidents WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20))).map(x=>({...x,paths:JSON.parse(x.related_paths_json),criteria:JSON.parse(x.criteria_json),evidence_ids:JSON.parse(x.evidence_ids_json),related_paths_json:undefined,criteria_json:undefined,evidence_ids_json:undefined}))};
    if(operation==='record_incident'){
      if(typeof title!=='string'||title.trim().length<5||title.length>240||typeof root_cause!=='string'||root_cause.length>1400)throw new Error('Invalid incident title/root cause');
      validateChangedPaths(paths);if(!Array.isArray(criteria)||criteria.length>40||criteria.some(v=>typeof v!=='string'||v.length>160))throw new Error('Invalid criteria');
      if(!Array.isArray(evidence_ids)||evidence_ids.length>20)throw new Error('Invalid evidence IDs');
      for(const eid of evidence_ids)if(!this.store.get('SELECT id FROM evidence WHERE id=? AND workspace_id=?',eid,wsId))throw new Error('Evidence ID outside workspace or unknown');
      const state=evidence_ids.length?'evidence-linked':'hypothesized',inc=uniqueId('inc');
      this.store.run('INSERT INTO incidents VALUES(?,?,?,?,?,?,?,?,?,?)',inc,wsId,title,root_cause,state,s.revision,JSON.stringify(paths),JSON.stringify(criteria),JSON.stringify(evidence_ids),new Date().toISOString());
      return {id:inc,state,revision:s.revision,warning:'Evidence-linked is not synonymous with proven root cause.'};
    }
    if(operation==='add_hypothesis'){
      if(typeof hypothesis!=='string'||hypothesis.length<8||hypothesis.length>1000||typeof experiment!=='string'||experiment.length>1000)throw new Error('Invalid hypothesis/experiment');
      if(incident_id && !this.store.get('SELECT id FROM incidents WHERE id=? AND workspace_id=?',incident_id,wsId))throw new Error('Invalid incident');
      const hid=uniqueId('hyp');this.store.run('INSERT INTO hypotheses VALUES(?,?,?,?,?,?,?,?)',hid,wsId,incident_id||null,hypothesis,'untested',experiment,JSON.stringify([]),new Date().toISOString());return {id:hid,status:'untested'};
    }
    if(operation==='hypotheses')return {items:this.store.all('SELECT id,incident_id,description,status,experiment,created_at FROM hypotheses WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20)))};
    throw new Error('Unknown evidence operation');
  }
}
export function guardedCall(fn,args){try{return fn(args||{})}catch(e){return {status:'error',message:cleanError(e),retryable:false}}}
