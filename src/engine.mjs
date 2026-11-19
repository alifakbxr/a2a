import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store,uniqueId} from './storage.mjs';
import {requireAuthorizedWorkspace,sha256,cleanError,safeFile,getCompactMode,getHomeDir,readSafeJsonFile} from './security.mjs';
import {discover,createGraph,snapshotOf,gitHead,discoverTestCommands} from './scanner.mjs';
import {contextQuery,analyzeImpact,shortGraphSummary,validateChangedPaths} from './graph.mjs';
import {planVerification,assessVerification,listEvidence,freshness,verifyHandoff} from './verification.mjs';
import {estimateTokens,getSessionTokenUsage,analyzeWorkspaceTokens,skeletonizeCode} from './tokens.mjs';
import {scanConversationHistory,attachReportSize} from './conversations.mjs';
import {evaluateSemanticClaims} from './semantic-evidence.mjs';
import {assessBrowserEvidence} from './browser-evidence.mjs';

import {assessRelease} from '../scripts/evaluate-acceptance.mjs';

import {adviseOrchestration} from './orchestration-advisor.mjs';
import {saveRecoveryCheckpoint,recoveryStatus} from './model-recovery.mjs';
import {classifyNativeToolFailure} from './native-tool-recovery.mjs';
import {recordRcaIncident,addRcaHypothesis,assessRcaHypothesis,listRcaIncidents,listRcaHypotheses,deleteRcaIncident} from './rca.mjs';

export class Engine {
  constructor({store}={}) {this.store=store||new Store();this.owned=!store;}
  close(){if(this.owned)this.store.close()}
  sync(workspace,{verifyIntegrity=false}={}){
    const root=requireAuthorizedWorkspace(workspace),wsId=this.store.register(root);
    const cachedFiles=new Map(this.store.all('SELECT path,content_sha AS hash,language,bytes,mtime_ms FROM files WHERE workspace_id=?',wsId).map(r=>[r.path,r]));
    const index=discover(root,{cachedFiles:verifyIntegrity?null:cachedFiles}), git=gitHead(root);
    const snapshot=sha256((git||'no-git')+'|'+snapshotOf(index));const current=this.store.latest(wsId);
    const revision=this.store.insertRevision(wsId,snapshot,git,{os:os.platform(),arch:os.arch(),node:process.versions.node});
    if(!current||current.id!==revision||cachedFiles.size!==index.files.length){
      for(const f of index.files){
        if(f.text===null){
          try{f.text=fs.readFileSync(safeFile(root,f.path),'utf8')}catch{f.text=''}
        }
      }
      const graph=createGraph(index);
      this.store.persistIndex(wsId,revision,index.files.map(({text,...rest})=>rest),graph.nodes,graph.edges);
    }
    return {root,wsId,revision,index,git,snapshot,skipped:index.skipped};
  }
  resolveMeta(workspace){
    const root=requireAuthorizedWorkspace(workspace),wsId=this.store.register(root);
    const current=this.store.latest(wsId);
    if(!current) return this.sync(workspace);
    return {root,wsId,revision:current.id,git:current.git_head};
  }
  context({workspace,action='inspect',query='',limit=12,history_scope='current',history_limit=10,file=null,files=[],task={},path:targetPath=null}={}){
    const compact=getCompactMode();
    if(action==='orchestration'){requireAuthorizedWorkspace(workspace);return adviseOrchestration(task)}
    if(action==='tokens'&&history_scope==='all'){
      // This must be an explicit tokens action. Do not walk private transcripts
      // as a side effect of ordinary inspect/impact calls.
      requireAuthorizedWorkspace(workspace);
      const output=scanConversationHistory({
        dataDirPath:this.store.base,
        limit:Math.min(10,history_limit||10),
      });
      attachReportSize(output,{format:'json'});
      return {action:'tokens',history:output,note:'Historical token counters are not equivalent to provider-reported usage.'};
    }
    if(action==='skeleton'){
      // The preview must be labeled with the revision of the bytes actually read.
      const s=this.sync(workspace,{verifyIntegrity:true});
      const singleTarget=file||targetPath;
      const targets=[...(typeof singleTarget==='string'&&singleTarget.trim()?[singleTarget.trim()]:[]),...(Array.isArray(files)?files:[])].filter(Boolean);
      const uniqueTargets=[...new Set(targets)].slice(0,20);
      if(!uniqueTargets.length) throw new Error('Provide file or files for action="skeleton"');
      let totalRaw=0, totalSkel=0;
      const outputCharBudget=compact?4800:32000;
      const perFileCharBudget=compact?1600:6000;
      let remainingOutputChars=outputCharBudget;
      let omittedFiles=0;
      const items=[];
      for(const [index,rel] of uniqueTargets.entries()){
        if(compact&&index>=6){
          omittedFiles++;
          items.push({file:rel,skipped:true,reason:'compact_file_budget'});
          continue;
        }
        const full=safeFile(s.root,rel);
        const stat=fs.statSync(full);
        if(stat.size>160*1024 || remainingOutputChars<100){
          omittedFiles++;
          items.push({file:rel,skipped:true,reason:stat.size>160*1024?'source_too_large':'response_budget_exhausted'});
          continue;
        }
        const raw=fs.readFileSync(full,'utf8');
        const wholeSkeleton=skeletonizeCode(raw,path.extname(rel));
        const cap=Math.min(perFileCharBudget,remainingOutputChars);
        const skeleton=wholeSkeleton.length>cap?wholeSkeleton.slice(0,cap):wholeSkeleton;
        const truncated=skeleton.length<wholeSkeleton.length;
        remainingOutputChars-=skeleton.length;
        const rawTokens=estimateTokens(raw);
        const skelTokens=estimateTokens(skeleton);
        totalRaw+=rawTokens;totalSkel+=skelTokens;
        items.push({
          file:rel,
          ...(compact?{}:{estimated_source_tokens:rawTokens,estimated_preview_tokens:skelTokens}),
          skeleton,
          truncated,
          ...(truncated?{warning:'Preview truncated. Do not infer complete code behavior from this excerpt.'}:{}),
        });
      }
      const payload={
        workspace_id:s.wsId,
        revision:s.revision,
        action:'skeleton',
        files:items,
        summary:{
          estimated_source_tokens:totalRaw,
          estimated_preview_tokens:totalSkel,
          estimated_preview_only:true,
          preview_char_budget:outputCharBudget,
          omitted_files:omittedFiles,
          truncated_files:items.filter(x=>x.truncated).length,
          note:compact?'Payload estimates only; no billed savings proven.':'These are relative payload-size estimates; no model usage or net savings were measured.',
        },
        ...(compact?{compact:true}:{}),
      };
      this.store.recordTelemetry(s.wsId,{toolName:'a2a_context',action:'skeleton',rawScopeTokens:totalRaw,responseTokens:estimateTokens(JSON.stringify(payload))});
      return payload;
    }

    const s=this.sync(workspace,{verifyIntegrity:action==='freshness'||action==='query'||action==='inspect'});
    const base={
      workspace_id:s.wsId,
      revision:s.revision,
      git_head:s.git,
      coverage:{
        ...shortGraphSummary(this.store,s.wsId),
        skipped_files:s.skipped.length,
        incomplete:s.skipped.some(x=>x==='index_limit_exceeded'||x==='index_byte_budget_exceeded'),
      },
      read_only:true,
    };

    if(action==='query'){
      const qRes=contextQuery(this.store,s.wsId,{query,limit});
      if(compact){
        // Keep full uncertainty statements: compact output cannot change
        // the meaning of coverage/safety limits.
        const originalEdges=qRes.relations.length;
        if(originalEdges>12){
          qRes.relations=qRes.relations.slice(0,12);
          qRes.relations_truncated=true;
          qRes.relations_before_compaction=originalEdges;
        }
      }
      const payload={...base,...qRes,...(compact?{compact:true}:{})};
      const fileBytes=new Map(s.index.files.map(f=>[f.path,f.bytes]));
      const matchedFiles=new Set(qRes.nodes.map(n=>n.file).filter(Boolean));
      let rawBytes=0;
      for(const fp of matchedFiles) rawBytes+=fileBytes.get(fp)||0;
      this.store.recordTelemetry(s.wsId,{toolName:'a2a_context',action:'query',rawScopeTokens:estimateTokens(rawBytes),responseTokens:estimateTokens(JSON.stringify(payload))});
      return payload;
    }
    if(action==='freshness'){
      return {...base,evidence:freshness(this.store,s.wsId,s.root,s.revision),...(compact?{compact:true}:{})};
    }

    if(action==='inspect'){
      const cmdInfo=discoverTestCommands(s.index,s.root);
      return {
        ...base,
        ecosystems:cmdInfo.suggestions.map(x=>x.ecosystem),
        test_candidates:cmdInfo.testFiles.slice(0,25),
        limitations:compact?['Static heuristic analysis']:['Language analysis is heuristic and static; relationships may be incomplete.'],
        ...(compact?{compact:true}:{}),
      };
    }
    if(action==='tokens'){
      // Explicit-only telemetry: do not spend computation or context space on every inspect.
      const telemetrySummary=this.store.getTelemetrySummary(s.wsId);
      const wsTokens=analyzeWorkspaceTokens(s.index,[],telemetrySummary);
      base.coverage.estimated_workspace_source_tokens=wsTokens.total_estimated_tokens;
      base.coverage.source_token_estimate_only=true;
      const trimmedWsTokens=compact?{...wsTokens,top_consumers:wsTokens.top_consumers.slice(0,5)}:wsTokens;
      // Current conversation is selected from A2A's SessionStart hook when
      // present. This still works for conversations created before installing A2A.
      const latest=scanConversationHistory({
        dataDirPath:this.store.base,limit:1,onlyLatest:true
      });
      attachReportSize(latest,{format:'json'});
      // The workspace index cannot measure Gemini usage; never auto-read private
      // Antigravity transcripts or report fabricated percentages.
      return {
        ...base,
        workspace_tokens:trimmedWsTokens,
        conversation_history:latest,
        session_usage:{
          status:'not_available',
          source:null,
          usage:null,
          reason:'No provider-reported Antigravity CLI usage supplied. Use a2a tokens --usage-file <official agy JSON output>.',
        },
        ...(compact?{compact:true}:{}),
      };
    }
    throw new Error('Unknown context action');
  }
  impact({workspace,changed=[],depth=3,summary=false}={}){
    validateChangedPaths(changed);
    const compact=getCompactMode();
    const s=this.sync(workspace,{verifyIntegrity:true});
    const res=analyzeImpact(this.store,s.wsId,s.root,{changed,depth});
    // Always-On uses this one-call triage response for risky or multi-module work.
    // Preserve risk, uncertainty, source freshness, and total counts. Never imply
    // this bounded preview is complete coverage.
    if(summary){
      return {
        revision:s.revision,
        changed:res.changed,
        risk:res.risk,
        signals:res.signals,
        affected:res.affected.slice(0,8).map(({kind,path,label})=>({kind,path,label})),
        affected_total:res.affected_total,
        related_tests:res.related_tests.slice(0,5),
        related_tests_total:res.related_tests_total,
        fallback_test_candidates:res.fallback_test_candidates.slice(0,3),
        coverage:{...res.coverage,output_bounded:true},
        uncertainty:res.uncertainty,
        incomplete_index:s.skipped.some(x=>x==='index_limit_exceeded'||x==='index_byte_budget_exceeded'),
        summary:true,
      };
    }
    const impactTokens=analyzeWorkspaceTokens(s.index,res.changed);
    const affectedPaths=new Set([...res.changed,...res.affected.map(a=>a.path).filter(Boolean)]);
    const fileBytes=new Map(s.index.files.map(f=>[f.path,f.bytes]));
    let rawScopeBytes=0;
    for(const p of affectedPaths) rawScopeBytes+=fileBytes.get(p)||0;
    if(compact){
      // Never shorten risk/uncertainty language to a misleading ellipsis.
      if(res.coverage){
        delete res.coverage.graph_nodes_visited;
        delete res.coverage.traversal_depth;
      }
      if(res.signals&&res.signals.length>2) res.signals=res.signals.slice(0,2);
      if(res.fallback_test_candidates&&res.related_tests.length>0) delete res.fallback_test_candidates;
    }
    const isLargeScope=(res.affected_total>=6||(res.changed.length+res.affected_total)>=8);
    const payload={
      revision:s.revision,
      ...res,
      estimated_source_tokens_affected:impactTokens.changed_files_tokens,
      source_token_estimate_only:true,
      incomplete_index:s.skipped.some(x=>x==='index_limit_exceeded'||x==='index_byte_budget_exceeded'),
      ...(isLargeScope?{
        teamwork_advisory:{
          large_scope:true,
          recommendation:'Consider native parallel assistance only if available and approved by the user. Do not assume /teamwork, /swarm, /boost or @subagent is enabled.',
          capability_confirmed:false,
          user_approval_required:true,
          automatic_worker_launch:false,
          affected_count:res.affected.length,
          risk:res.risk,
        }
      }:{}),
      ...(compact?{compact:true}:{}),
    };
    this.store.recordTelemetry(s.wsId,{toolName:'a2a_impact',action:'impact',rawScopeTokens:estimateTokens(rawScopeBytes),responseTokens:estimateTokens(JSON.stringify(payload))});
    return payload;
  }
  verify({workspace,operation='plan',criteria=[],changed=[],worker_name,artifact,allow_stale,persist_plan=false,plan_id=null}={}){
    const compact=getCompactMode();
    const s=this.sync(workspace,{verifyIntegrity:true});
    if(operation==='plan'){
      validateChangedPaths(changed);
      let plannedCriteria=criteria;
      if(plan_id!==null){
        if(persist_plan!==true||!Array.isArray(criteria)||criteria.length!==0)throw new Error('Reissue plan requires persist_plan=true and no replacement criteria');
        const saved=this.store.get('SELECT * FROM acceptance_plans WHERE workspace_id=? AND id=?',s.wsId,plan_id);
        if(!saved||sha256(saved.criteria_json)!==saved.manifest_sha)throw new Error('Unknown or invalid prior acceptance plan');
        plannedCriteria=JSON.parse(saved.criteria_json);
        if(!Array.isArray(plannedCriteria)||plannedCriteria.length===0||plannedCriteria.length>40)throw new Error('Invalid prior plan');
        if(plannedCriteria.some(c=>c.source_revision && c.source_revision!==s.revision))
          throw new Error('The prior plan pins a different source_revision; create a new reviewed plan with an explicit updated revision');
      }
      const plan=planVerification({index:s.index,impact:analyzeImpact(this.store,s.wsId,s.root,{changed}),criteria:plannedCriteria,compact});
      if(plan_id!==null){
        plan.reissued_from=plan_id;
        plan.warning='A reissued plan retains the prior required scenarios but does not prove they were executed on current code. Rerun native tests and review new evidence.';
      }
      if(compact){
        // Preserve named unknowns and required checks; drop only verbose notes.
        if(plan.checks) delete plan.checks.note;
      }
      // Persist acceptance scope only on explicit opt-in; plans may contain
      // user-authored requirements and are therefore private local content.
      if(persist_plan===true){
        if(plan.criteria.length===0)throw new Error('Cannot persist an empty acceptance plan');
        const id=uniqueId('apl');
        const manifest=JSON.stringify(plan.criteria);
        this.store.run('INSERT INTO acceptance_plans(id,workspace_id,revision_id,manifest_sha,criteria_json,created_at) VALUES(?,?,?,?,?,?)',
          id,s.wsId,s.revision,sha256(manifest),manifest,new Date().toISOString());
        this.store.run('DELETE FROM acceptance_plans WHERE workspace_id=? AND id NOT IN (SELECT id FROM acceptance_plans WHERE workspace_id=? ORDER BY created_at DESC LIMIT 30)',s.wsId,s.wsId);
        plan.plan_id=id;plan.scope_bound=true;plan.scope_persisted=true;
      }else{plan.plan_id=null;plan.scope_bound=false;plan.scope_persisted=false;}
      return {revision:s.revision,...plan,...(compact?{compact:true}:{})};
    }
    if(operation==='assess'){
      const res=assessVerification(this.store,s.wsId,s.root,s.revision,criteria,{planId:plan_id});
      if(compact){
        if(res.limits){
          res.limits=['Report origin unverified','No independent release evidence','Untested behaviors out of scope',
            ...(!res.scope_bound?['Acceptance scope is unbound; omitted planned scenarios cannot be detected']:[])];
        }
        res.compact=true;
      }
      return res;
    }
    if(operation==='assess_semantic'||operation==='assess_browser'){
      if(typeof artifact!=='string'||!artifact)throw Error('Required relative evidence artifact path');
      const full=safeFile(s.root,artifact),stat=fs.statSync(full);
      if(!stat.isFile()||stat.size>1024*1024)throw Error('Evidence artifact exceeds 1 MiB');
      const bytes=fs.readFileSync(full);
      let report;
      try{report=JSON.parse(bytes.toString('utf8'))}catch{throw Error('Invalid semantic/browser evidence JSON')}
      let result;
      if(operation==='assess_semantic'){
        result=evaluateSemanticClaims(report);
        if(result.revision!==s.revision)result={...result,report_status:'stale',release_verified:false};
      }else{
        const checkList=[];
        for(const a of Array.isArray(report?.artifacts)?report.artifacts.slice(0,40):[]){
          if(typeof a?.path!=='string'||!a.path)continue;
          try{
            const source=safeFile(s.root,a.path),info=fs.statSync(source);
            if(!info.isFile()||info.size>4*1024*1024)continue;
            checkList.push({reference:a.reference,sha256:sha256(fs.readFileSync(source)),intact:true});
          }catch{}
        }
        result=assessBrowserEvidence(report,{expectedRevision:s.revision,artifactChecks:checkList});
      }
      // Local semantic/browser reports are never independent proof of execution.
      const recordStatus='inconclusive';
      const evidenceId=uniqueId('ev');
      this.store.run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',
        evidenceId,s.wsId,s.revision,report?.scenario_id||'semantic-review',recordStatus,operation,artifact,sha256(bytes),
        JSON.stringify({trust:'unattested-local-report',release_verified:false,summary:result.report_status||result.status,artifact_sha256:sha256(bytes)}),
        new Date().toISOString());
      return {revision:s.revision,evidence_id:evidenceId,...result,current_revision:s.revision,verification_verdict:'inconclusive',
        note:'The evidence artifact is parsed and hashed locally; reported execution is not independently authenticated.'};
    }
    if(operation==='assess_release'){
      if(typeof artifact!=='string'||!artifact)throw Error('Required relative release manifest');
      const source=safeFile(s.root,artifact);
      const manifestData=readSafeJsonFile(source,{maxBytes:1024*1024});
      if(!manifestData.ok)throw Error('Invalid or unsafe release manifest: '+manifestData.reason);
      const document=manifestData.value;
      const diagnostics=[];
      const describe=(kind,read)=>{
        if(read.ok||read.reason==='missing')return;
        const help=read.reason==='unsafe_mode'?'group/world writable; apply chmod 600':
          read.reason==='symlink_parent'||read.reason==='symlink'||read.reason==='unsafe_type'?'symlink or unsafe file':
          read.reason==='too_large'?'exceeds 64 KiB':
          read.reason==='invalid_json'?'invalid JSON':'unreadable or invalid';
        diagnostics.push('Local '+kind+' config rejected ('+help+').');
      };
      const trustFile=path.join(getHomeDir(),'.config','a2a','trusted-evaluators.json');
      const trustRead=readSafeJsonFile(trustFile,{maxBytes:65536,checkParentDir:true,requirePrivateMode:true});
      describe('trusted-evaluators',trustRead);
      const trustKeys=trustRead.ok?trustRead.value:{};
      // Frozen user-controlled scope; never read acceptance definitions from generated app.
      const scopeFile=path.join(getHomeDir(),'.config','a2a','acceptance-registry.json');
      const scopeRead=readSafeJsonFile(scopeFile,{maxBytes:65536,checkParentDir:true,requirePrivateMode:true});
      describe('acceptance-registry',scopeRead);
      const pinned=scopeRead.ok?scopeRead.value:null;
      const requiredScenarios=pinned?.schema==='a2a-acceptance-registry-v1'&&Array.isArray(pinned.scenarios)?pinned.scenarios:null;
      if(scopeRead.ok&&!requiredScenarios)diagnostics.push('Local acceptance-registry config rejected (invalid schema).');
      const evaluation=assessRelease(document,{trustKeys,requiredScenarios});
      if(diagnostics.length)evaluation.limits.push(...diagnostics);
      if(document.revision!==s.revision){
        evaluation.verdict='blocked';evaluation.release_ready=false;
        evaluation.blockers.push({reason:'Current workspace snapshot differs from submitted release manifest'});
      }
      const evidenceId=uniqueId('ev'),bytes=manifestData.bytes;
      this.store.run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',evidenceId,s.wsId,s.revision,'release-readiness',
        evaluation.release_ready?'passed':'inconclusive','signed-release-evaluation',artifact,sha256(bytes),
        JSON.stringify({trust:'public-key-verified-issuer-claim',release_ready:evaluation.release_ready,signature_evidence:evaluation.scenarios.results.reduce((n,x)=>n+x.signature_verified_evidence,0)}),new Date().toISOString());
      return {revision:s.revision,evidence_id:evidenceId,...evaluation,
        limitations:[...evaluation.limits,'User-pinned public key is read only from local A2A config; the plugin does not create or trust keys from project source']};
    }
    if(operation==='verify_handoff'||operation==='handoff'){
      validateChangedPaths(changed);
      const res=verifyHandoff(this.store,s.wsId,s.root,s.revision,{worker_name,changed,artifact,criteria,allow_stale});
      if(compact) res.compact=true;
      return res;
    }
    throw new Error('Unknown verify operation');
  }
  #resolveActiveConversationId(){
    try{
      const sf=path.join(this.store.base,'active-session.json');
      const d=readSafeJsonFile(sf,{maxBytes:128*1024});
      if(d.ok&&d.value.latest?.conversationId)return d.value.latest.conversationId;
    }catch{}
    return process.env.ANTIGRAVITY_CONVERSATION_ID||'default';
  }
  evidence({workspace,operation='list',id,limit=20,title,root_cause='',paths=[],criteria=[],evidence_ids=[],hypothesis,experiment,incident_id,conversation_id,parent_conversation_id,question,summary,status,artifact_name,artifact_path,v1,v2,task_summary,completed=[],next_steps=[],decisions=[],pending_tests=[],tool_family='other',error_hint='',error_class,retry_count=0,persist_rca=false,confirm_deletion=false,hypothesis_id,parent_hypothesis_id=null,predicted_observation,disconfirming_test,expected_criterion_id,plan_id=null,experiment_outcome,observation}={}){
    const compact=getCompactMode();
    const isReadOnly=operation==='tool_recovery'||operation==='model_recovery'||operation==='list'||operation==='runs'||operation==='incidents'||operation==='hypotheses'||operation==='side_questions'||operation==='side-questions'||operation==='artifact_versions'||operation==='artifact-versions'||operation==='artifact_diff'||operation==='artifact-diff';
    // Freshness is a security-relevant claim: never reuse cached revision metadata
    // when presenting test evidence or historical run freshness.
    const needsLiveRevision=['list','runs','model_recovery','save_checkpoint','incidents','record_incident','add_hypothesis','assess_hypothesis','hypotheses'].includes(operation);
    const s=needsLiveRevision?this.sync(workspace,{verifyIntegrity:true}):(isReadOnly?this.resolveMeta(workspace):this.sync(workspace));
    const wsId=s.wsId;
    if(operation==='tool_recovery')return classifyNativeToolFailure({error_class,error_hint,tool_family,retry_count});
    if(operation==='save_checkpoint'){
      const conv=conversation_id||this.#resolveActiveConversationId();
      if(conv==='default')throw new Error('An active conversation or explicit conversation_id is required');
      const saved=saveRecoveryCheckpoint(this.store,wsId,{
        conversationId:conv,revision:s.revision,taskSummary:task_summary,
        completed,nextSteps:next_steps,decisions,pendingTests:pending_tests
      });
      return {...saved,warning:'Notes are locally stored, not verified task completion; do not put secrets in checkpoints.'};
    }
    if(operation==='model_recovery'){
      return {...recoveryStatus(this.store,wsId,{
        conversationId:conversation_id||null,currentRevision:s.revision
      }),current_revision:s.revision};
    }
    if(operation==='list')return {revision:s.revision,...listEvidence(this.store,wsId,s.root,s.revision,{limit,id}),...(compact?{compact:true}:{})};
    if(operation==='runs')return {revision:s.revision,runs:this.store.all('SELECT id,revision_id,verdict,criteria_json,created_at FROM runs WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20))).map(x=>({...x,fresh:x.revision_id===s.revision,criteria:JSON.parse(x.criteria_json),criteria_json:undefined})),...(compact?{compact:true}:{})};
    if(operation==='incidents')return {...listRcaIncidents(this.store,wsId,s.revision,compact?Math.min(8,Number(limit)||20):limit),...(compact?{compact:true}:{})};
    if(operation==='record_incident')return {...recordRcaIncident(this.store,wsId,s.root,s.revision,{title,root_cause,paths,criteria,evidence_ids,persist_rca}),...(compact?{compact:true}:{})};
    if(operation==='add_hypothesis')return {...addRcaHypothesis(this.store,wsId,s.revision,{
      hypothesis,experiment,incident_id,parent_hypothesis_id,predicted_observation,disconfirming_test,expected_criterion_id,plan_id,persist_rca
    }),...(compact?{compact:true}:{})};
    if(operation==='assess_hypothesis')return {...assessRcaHypothesis(this.store,wsId,s.root,s.revision,{
      hypothesis_id,experiment_outcome,observation,evidence_ids,persist_rca
    }),...(compact?{compact:true}:{})};
    if(operation==='hypotheses')return {...listRcaHypotheses(this.store,wsId,s.root,s.revision,compact?Math.min(8,Number(limit)||20):limit,incident_id||null),...(compact?{compact:true}:{})};
    if(operation==='delete_incident')return deleteRcaIncident(this.store,wsId,{incident_id,persist_rca,confirm_deletion});
    if(operation==='side_questions'||operation==='side-questions'){
      const items=this.store.listSideQuestions({workspaceId:wsId,parentConversationId:parent_conversation_id,conversationId:conversation_id||id,limit});
      return {workspace:s.root,count:items.length,items,...(compact?{compact:true}:{})};
    }
    if(operation==='record_side_question'||operation==='record-side-question'){
      const cid=conversation_id||id;
      const qText=question||title;
      if(!cid||!qText)throw new Error('conversation_id (or id) and question (or title) are required to record a side question');
      const record=this.store.recordSideQuestion({
        workspaceId:wsId,
        conversationId:cid,
        parentConversationId:parent_conversation_id||null,
        title:title||null,
        question:qText,
        summary:summary||null,
        status:status||'resolved'
      });
      return {status:'recorded',side_question:record,...(compact?{compact:true}:{})};
    }
    if(operation==='artifact_versions'||operation==='artifact-versions'){
      const convId=conversation_id||id||this.#resolveActiveConversationId();
      const items=this.store.listArtifactVersions({workspaceId:wsId,conversationId:convId,artifactName:artifact_name,limit});
      return {conversation_id:convId,artifact_name:artifact_name||null,count:items.length,versions:items,...(compact?{compact:true}:{})};
    }
    if(operation==='artifact_diff'||operation==='artifact-diff'){
      const convId=conversation_id||id||this.#resolveActiveConversationId();
      if(!artifact_name)throw new Error('artifact_name is required for artifact_diff');
      const diffRes=this.store.getArtifactDiff({workspaceId:wsId,conversationId:convId,artifactName:artifact_name,v1,v2});
      return {conversation_id:convId,...(diffRes||{artifact_name,v1,v2,diff:''}),...(compact?{compact:true}:{})};
    }
    if(operation==='snapshot_artifact'||operation==='snapshot-artifact'){
      const convId=conversation_id||id||this.#resolveActiveConversationId();
      if(!artifact_path&&!artifact_name)throw new Error('artifact_path or artifact_name is required');
      const targetPath=artifact_path||path.join(process.env.HOME||'','.gemini/antigravity/brain',convId,artifact_name);
      // Authorization for a project does not grant access to every conversation's
      // brain files. Require this conversation to be active in that workspace.
      const absolute=path.resolve(targetPath);
      const inWorkspace=absolute!==s.root && absolute.startsWith(s.root+path.sep);
      if(!inWorkspace){
        const sessionFile=path.join(this.store.base,'active-session.json');
        let latest=null;
        try{const d=readSafeJsonFile(sessionFile,{maxBytes:128*1024});latest=d.ok?d.value.latest:null}catch{}
        if(latest?.conversationId!==convId || !Array.isArray(latest.workspacePaths)
            || !latest.workspacePaths.some(w=>{try{return requireAuthorizedWorkspace(w)===s.root}catch{return false}})){
          throw new Error('Brain artifact does not belong to the active authorized workspace/session');
        }
      }
      const snap=this.store.snapshotArtifact({workspaceId:wsId,conversationId:convId,artifactPath:targetPath,workspaceRoot:s.root});
      return {status:'snapshotted',snapshot:snap,...(compact?{compact:true}:{})};
    }
    throw new Error('Unknown evidence operation');
  }
}
export function guardedCall(fn,args){try{return fn(args||{})}catch(e){return {status:'error',message:cleanError(e),retryable:false}}}
