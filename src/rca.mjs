// A2A RCA is opt-in: named machine assertions support an experiment, not causality.
import fs from 'node:fs';
import {safeFile,sha256} from './security.mjs';
import {uniqueId} from './storage.mjs';
import {validateChangedPaths} from './graph.mjs';

export const RCA_WARNING='Local named tests do not independently prove a root cause. Review competing explanations, source freshness and external behavior.';
const SECRET=/(?:password|passwd|api[ _-]?key|(?:access[_ -]?|refresh[_ -]?)?token|cookie|authorization|private[_ -]?key|secret)\s*[:=]|\bBearer\s+[A-Za-z0-9._~-]{8,}/i;
const validate=(text,label,min,max)=>{
  if(typeof text!=='string'||text.trim().length<min||text.length>max)throw Error('Invalid '+label+' (expected '+min+'-'+max+' characters)');
  if(SECRET.test(text))throw Error('Possible credential in RCA notes; remove secrets before saving');
  return text.trim();
};
const optional=(text,label,max)=>text===undefined||text===null||text===''?null:validate(text,label,1,max);
const consent=flag=>{if(flag!==true)throw Error('Explicit persist_rca=true required before storing private RCA notes')};
const signature=(title,paths)=>sha256(JSON.stringify([title.toLowerCase().replace(/\s+/g,' ').trim(),[...new Set(paths)].sort().slice(0,8)]));
function checkEvidence(store,ws,root,revision,id,criterion=null,strict=false){
  const e=store.get('SELECT * FROM evidence WHERE workspace_id=? AND id=?',ws,id);
  if(!e)throw Error('Unknown RCA evidence ID or unauthorized workspace');
  if(e.revision_id!==revision)throw Error('RCA evidence is stale for current source revision');
  let intact=false;
  try{intact=sha256(fs.readFileSync(safeFile(root,e.artifact_path)))===e.artifact_sha}catch{}
  if(!intact)throw Error('RCA evidence hash/path does not match a current permitted artifact');
  if(criterion!==null&&e.criterion_id!==criterion)throw Error('RCA evidence belongs to an unrelated acceptance criterion');
  const meta=JSON.parse(e.metadata_json||'{}');
  if(strict && (e.status!=='passed' || !['unit','integration'].includes(meta.requested_evidence_type)
     || !meta.test_name || meta.test_name==='*' || !(meta.assertions>=1)))
    throw Error('RCA requires a passing exact named unit/integration assertion; build, UI and hardware are insufficient');
  return {id:e.id,criterion_id:e.criterion_id,test_name:meta.test_name||null,
    evidence_type:meta.requested_evidence_type||'unspecified',fresh:true,
    trust:'local-machine-assertion-only'};
}
export function recordRcaIncident(store,ws,root,revision,args){
  consent(args.persist_rca);
  const title=validate(args.title,'incident title',5,240);
  const candidate=optional(args.root_cause,'candidate cause',1400)||'';
  const paths=args.paths||[],criteria=args.criteria||[],evidenceIds=args.evidence_ids||[];
  if(!Array.isArray(paths)||paths.length>80||paths.some(x=>typeof x!=='string'||x.length>500))throw Error('Invalid RCA paths');
  validateChangedPaths(paths);
  if(!Array.isArray(criteria)||criteria.length>40)throw Error('Invalid RCA criteria');
  const cleanCriteria=criteria.map(x=>validate(x,'criterion',1,160));
  if(!Array.isArray(evidenceIds)||evidenceIds.length>20||new Set(evidenceIds).size!==evidenceIds.length)throw Error('Invalid RCA evidence IDs');
  const checked=evidenceIds.map(id=>checkEvidence(store,ws,root,revision,id));
  const sig=signature(title,paths);
  const related=store.all('SELECT id FROM incidents WHERE workspace_id=? AND signature_sha=? ORDER BY created_at DESC LIMIT 3',ws,sig).map(x=>x.id);
  const id=uniqueId('inc');
  store.run('INSERT INTO incidents(id,workspace_id,title,root_cause,state,revision_id,related_paths_json,criteria_json,evidence_ids_json,created_at,signature_sha) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    id,ws,title,candidate,'investigating',revision,JSON.stringify(paths),JSON.stringify(cleanCriteria),
    JSON.stringify(checked.map(x=>x.id)),new Date().toISOString(),sig);
  return {id,state:'investigating',revision,candidate_cause:candidate||null,
    root_cause_verified:false,linked_evidence_count:checked.length,
    related_incident_ids:related,recurrence_is_hypothesis:true,warning:RCA_WARNING};
}
export function addRcaHypothesis(store,ws,revision,args){
  consent(args.persist_rca);
  const description=validate(args.hypothesis,'hypothesis',8,1000);
  const experiment=validate(args.experiment,'experiment',8,1000);
  const prediction=validate(args.predicted_observation,'predicted_observation',8,300);
  const falsifier=validate(args.disconfirming_test,'disconfirming_test',8,300);
  const criterion=validate(args.expected_criterion_id,'expected_criterion_id',1,160);
  if(!args.incident_id||!store.get('SELECT id FROM incidents WHERE id=? AND workspace_id=?',args.incident_id,ws))
    throw Error('RCA incident must exist in authorized workspace');
  let depth=1;
  const parentId=args.parent_hypothesis_id||null;
  if(parentId){
    const parent=store.get('SELECT incident_id,why_depth FROM hypotheses WHERE id=? AND workspace_id=?',parentId,ws);
    if(!parent||parent.incident_id!==args.incident_id)throw Error('Parent hypothesis must belong to same incident');
    depth=(parent.why_depth||1)+1;
  }
  if(depth>8)throw Error('Maximum RCA why depth reached; branch or summarize');
  const planId=args.plan_id||null;
  if(planId){
    const plan=store.get('SELECT revision_id,manifest_sha,criteria_json FROM acceptance_plans WHERE workspace_id=? AND id=?',ws,planId);
    if(!plan||plan.revision_id!==revision||sha256(plan.criteria_json)!==plan.manifest_sha
      ||!JSON.parse(plan.criteria_json).some(x=>x.id===criterion))
      throw Error('RCA criterion must exist in a fresh, intact, authorized acceptance plan');
  }
  const id=uniqueId('hyp'),now=new Date().toISOString();
  const sql='INSERT INTO hypotheses(id,workspace_id,incident_id,description,status,experiment,evidence_ids_json,created_at,revision_id,parent_hypothesis_id,why_depth,predicted_observation,disconfirming_test,expected_criterion_id,plan_id,assessment_json,assessed_revision_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  store.run(sql,id,ws,args.incident_id,description,'untested',experiment,'[]',now,
    revision,parentId,depth,prediction,falsifier,criterion,planId,'{}',null,now);
  return {id,incident_id:args.incident_id,status:'untested',why_depth:depth,parent_hypothesis_id:parentId,
    source_revision:revision,root_cause_verified:false,warning:'Hypothesis saved but not tested; evidence remains required.'};
}
export function assessRcaHypothesis(store,ws,root,revision,args){
  consent(args.persist_rca);
  if(!['supports','refutes','inconclusive'].includes(args.experiment_outcome))
    throw Error('experiment_outcome must be supports, refutes or inconclusive');
  const observation=validate(args.observation,'observation',8,400);
  const h=store.get('SELECT * FROM hypotheses WHERE workspace_id=? AND id=?',ws,args.hypothesis_id);
  if(!h)throw Error('Unknown RCA hypothesis or unauthorized workspace');
  if(!h.revision_id||h.revision_id!==revision)throw Error('RCA hypothesis is stale; create a new reviewed hypothesis');
  if(!h.predicted_observation||!h.disconfirming_test||!h.expected_criterion_id)
    throw Error('Falsifiable prediction, counter-test and named criterion required');
  const ids=args.evidence_ids||[];
  if(!Array.isArray(ids)||ids.length>20||new Set(ids).size!==ids.length)throw Error('Invalid RCA evidence IDs');
  if(args.experiment_outcome!=='inconclusive'&&ids.length===0)throw Error('Causal outcome needs fresh named experimental evidence');
  const evidence=ids.map(id=>checkEvidence(store,ws,root,revision,id,h.expected_criterion_id,args.experiment_outcome!=='inconclusive'));
  const status=args.experiment_outcome==='supports'?'locally_supported':
    args.experiment_outcome==='refutes'?'refuted':'inconclusive';
  const now=new Date().toISOString();
  const assessment={outcome:args.experiment_outcome,observation,evidence_ids:evidence.map(x=>x.id),
    criterion_id:h.expected_criterion_id,plan_id:h.plan_id||null,source_revision:revision,
    independent_causal_proof:false,updated_at:now};
  store.run('UPDATE hypotheses SET status=?,evidence_ids_json=?,assessment_json=?,assessed_revision_id=?,updated_at=? WHERE workspace_id=? AND id=?',
    status,JSON.stringify(assessment.evidence_ids),JSON.stringify(assessment),revision,now,ws,h.id);
  return {id:h.id,incident_id:h.incident_id,status,why_depth:h.why_depth,source_freshness:'current',
    linked_local_evidence:evidence,independently_attested:false,root_cause_verified:false,warning:RCA_WARNING};
}
export function listRcaHypotheses(store,ws,revision,limit=20,incidentId=null){
  const n=Math.max(1,Math.min(50,Number(limit)||20));
  const rows=incidentId?
    store.all('SELECT * FROM hypotheses WHERE workspace_id=? AND incident_id=? ORDER BY created_at DESC LIMIT ?',ws,incidentId,n):
    store.all('SELECT * FROM hypotheses WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',ws,n);
  return {revision,items:rows.map(h=>{
    const fresh=Boolean(h.revision_id&&h.revision_id===revision);
    const assessedFresh=Boolean(h.assessed_revision_id&&h.assessed_revision_id===revision);
    const status=!fresh||(h.status!=='untested'&&!assessedFresh)?'stale':h.status;
    return {id:h.id,incident_id:h.incident_id,description:h.description,status,
      recorded_status:h.status,source_freshness:fresh?'current':'stale_or_unbound',
      experiment:h.experiment,parent_hypothesis_id:h.parent_hypothesis_id||null,
      why_depth:h.why_depth||1,predicted_observation:h.predicted_observation||null,
      disconfirming_test:h.disconfirming_test||null,expected_criterion_id:h.expected_criterion_id||null,
      plan_id:h.plan_id||null,evidence_ids:JSON.parse(h.evidence_ids_json||'[]'),
      assessment:JSON.parse(h.assessment_json||'{}'),
      root_cause_verified:false,independently_attested:false};
  }),warning:RCA_WARNING};
}
export function listRcaIncidents(store,ws,revision,limit=20){
  const rows=store.all('SELECT * FROM incidents WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',ws,Math.max(1,Math.min(50,Number(limit)||20)));
  return {revision,items:rows.map(x=>({id:x.id,title:x.title,root_cause:x.root_cause,
    candidate_cause:x.root_cause||null,root_cause_verified:false,
    state:x.state==='evidence-linked'?'historical-evidence-linked-unverified':x.state,
    source_freshness:x.revision_id===revision?'current':'stale',
    paths:JSON.parse(x.related_paths_json),criteria:JSON.parse(x.criteria_json),
    evidence_ids:JSON.parse(x.evidence_ids_json),created_at:x.created_at})),warning:RCA_WARNING};
}
