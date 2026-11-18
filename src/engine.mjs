import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store,uniqueId} from './storage.mjs';
import {requireAuthorizedWorkspace,sha256,cleanError,safeFile,getCompactMode} from './security.mjs';
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
  context({workspace,action='inspect',query='',limit=12,conversation_id=null,transcript_path=null,history_scope='current',history_limit=10,file=null,files=[],task={},path:targetPath=null}={}){
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
      let remainingOutputChars=32000;
      let omittedFiles=0;
      const items=[];
      for(const rel of uniqueTargets){
        const full=safeFile(s.root,rel);
        const stat=fs.statSync(full);
        if(stat.size>160*1024 || remainingOutputChars<100){
          omittedFiles++;
          items.push({file:rel,skipped:true,reason:stat.size>160*1024?'source_too_large':'response_budget_exhausted'});
          continue;
        }
        const raw=fs.readFileSync(full,'utf8');
        const wholeSkeleton=skeletonizeCode(raw,path.extname(rel));
        const cap=Math.min(6000,remainingOutputChars);
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
          omitted_files:omittedFiles,
          truncated_files:items.filter(x=>x.truncated).length,
          note:'These are relative payload-size estimates; no model usage or net savings were measured.',
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
      if(compact&&qRes.uncertainty){
        qRes.uncertainty=qRes.uncertainty.map(u=>u.length>60?u.slice(0,57)+'...':u);
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
      if(res.uncertainty){
        res.uncertainty=res.uncertainty.map(u=>u.length>60?u.slice(0,57)+'...':u);
      }
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
  verify({workspace,operation='plan',criteria=[],changed=[],worker_name,artifact,allow_stale}={}){
    const compact=getCompactMode();
    const s=this.sync(workspace,{verifyIntegrity:true});
    if(operation==='plan'){
      validateChangedPaths(changed);
      const plan=planVerification({index:s.index,impact:analyzeImpact(this.store,s.wsId,s.root,{changed}),criteria});
      if(compact){
        if(plan.impact&&plan.impact.unknowns){
          plan.impact.unknowns=plan.impact.unknowns.map(u=>u.length>60?u.slice(0,57)+'...':u);
        }
        if(plan.checks) delete plan.checks.note;
      }
      return {revision:s.revision,...plan,...(compact?{compact:true}:{})};
    }
    if(operation==='assess'){
      const res=assessVerification(this.store,s.wsId,s.root,s.revision,criteria);
      if(compact){
        if(res.limits){
          res.limits=['Report origin unverified','Untested behaviors out of scope'];
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
      const recordStatus=result.report_status==='stale'||result.status==='stale'?'inconclusive':'inconclusive';
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
      const source=safeFile(s.root,artifact),stat=fs.statSync(source);
      if(!stat.isFile()||stat.size>1024*1024)throw Error('Release manifest must be <=1 MiB');
      let document;
      try{document=JSON.parse(fs.readFileSync(source,'utf8'))}catch{throw Error('Invalid release manifest JSON')}
      const trustFile=path.join(os.homedir(),'.config','a2a','trusted-evaluators.json');
      let trustKeys={};
      try{
        const configStat=fs.lstatSync(trustFile);
        if(configStat.isFile()&&configStat.size<=65536&&(process.platform==='win32'||(configStat.mode&0o022)===0)){
          trustKeys=JSON.parse(fs.readFileSync(trustFile,'utf8'));
        }
      }catch{}
      // Frozen user-controlled scope; never read acceptance definitions from generated app.
      let requiredScenarios=null;
      const scopeFile=path.join(os.homedir(),'.config','a2a','acceptance-registry.json');
      try{
        const info=fs.lstatSync(scopeFile);
        if(info.isFile()&&info.size<=65536&&(process.platform==='win32'||(info.mode&0o022)===0)){
          const pinned=JSON.parse(fs.readFileSync(scopeFile,'utf8'));
          if(pinned?.schema==='a2a-acceptance-registry-v1'&&Array.isArray(pinned.scenarios))requiredScenarios=pinned.scenarios;
        }
      }catch{}
      const evaluation=assessRelease(document,{trustKeys,requiredScenarios});
      if(document.revision!==s.revision){
        evaluation.verdict='blocked';evaluation.release_ready=false;
        evaluation.blockers.push({reason:'Current workspace snapshot differs from submitted release manifest'});
      }
      const evidenceId=uniqueId('ev'),bytes=fs.readFileSync(source);
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
      if(fs.existsSync(sf)){
        const d=JSON.parse(fs.readFileSync(sf,'utf8'));
        if(d?.latest?.conversationId)return d.latest.conversationId;
      }
    }catch{}
    return process.env.ANTIGRAVITY_CONVERSATION_ID||'default';
  }
  evidence({workspace,operation='list',id,limit=20,title,root_cause='',paths=[],criteria=[],evidence_ids=[],hypothesis,experiment,incident_id,conversation_id,parent_conversation_id,question,summary,status,artifact_name,artifact_path,v1,v2,task_summary,completed=[],next_steps=[],decisions=[],pending_tests=[],tool_family='other',error_hint='',error_class,retry_count=0}={}){
    const compact=getCompactMode();
    const isReadOnly=operation==='tool_recovery'||operation==='model_recovery'||operation==='list'||operation==='runs'||operation==='incidents'||operation==='hypotheses'||operation==='side_questions'||operation==='side-questions'||operation==='artifact_versions'||operation==='artifact-versions'||operation==='artifact_diff'||operation==='artifact-diff';
    // Freshness is a security-relevant claim: never reuse cached revision metadata
    // when presenting test evidence or historical run freshness.
    const needsLiveRevision=['list','runs','model_recovery','save_checkpoint'].includes(operation);
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
    if(operation==='incidents')return {items:this.store.all('SELECT * FROM incidents WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20))).map(x=>({...x,paths:JSON.parse(x.related_paths_json),criteria:JSON.parse(x.criteria_json),evidence_ids:JSON.parse(x.evidence_ids_json),related_paths_json:undefined,criteria_json:undefined,evidence_ids_json:undefined})),...(compact?{compact:true}:{})};
    if(operation==='record_incident'){
      if(typeof title!=='string'||title.trim().length<5||title.length>240||typeof root_cause!=='string'||root_cause.length>1400)throw new Error('Invalid incident title/root cause');
      validateChangedPaths(paths);if(!Array.isArray(criteria)||criteria.length>40||criteria.some(v=>typeof v!=='string'||v.length>160))throw new Error('Invalid criteria');
      if(!Array.isArray(evidence_ids)||evidence_ids.length>20)throw new Error('Invalid evidence IDs');
      for(const eid of evidence_ids)if(!this.store.get('SELECT id FROM evidence WHERE id=? AND workspace_id=?',eid,wsId))throw new Error('Evidence ID outside workspace or unknown');
      const state=evidence_ids.length?'evidence-linked':'hypothesized',inc=uniqueId('inc');
      this.store.run('INSERT INTO incidents VALUES(?,?,?,?,?,?,?,?,?,?)',inc,wsId,title,root_cause,state,s.revision,JSON.stringify(paths),JSON.stringify(criteria),JSON.stringify(evidence_ids),new Date().toISOString());
      return {id:inc,state,revision:s.revision,...(compact?{compact:true}:{warning:'Evidence-linked is not synonymous with proven root cause.'})};
    }
    if(operation==='add_hypothesis'){
      if(typeof hypothesis!=='string'||hypothesis.length<8||hypothesis.length>1000||typeof experiment!=='string'||experiment.length>1000)throw new Error('Invalid hypothesis/experiment');
      if(incident_id && !this.store.get('SELECT id FROM incidents WHERE id=? AND workspace_id=?',incident_id,wsId))throw new Error('Invalid incident');
      const hid=uniqueId('hyp');this.store.run('INSERT INTO hypotheses VALUES(?,?,?,?,?,?,?,?)',hid,wsId,incident_id||null,hypothesis,'untested',experiment,JSON.stringify([]),new Date().toISOString());return {id:hid,status:'untested'};
    }
    if(operation==='hypotheses')return {items:this.store.all('SELECT id,incident_id,description,status,experiment,created_at FROM hypotheses WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,Math.max(1,Math.min(50,Number(limit)||20))),...(compact?{compact:true}:{})};
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
        try{latest=JSON.parse(fs.readFileSync(sessionFile,'utf8'))?.latest}catch{}
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
