// A2A acceptance matrix: scope and evidence requirements are explicit, never inferred.
// Local reports cannot independently attest browser state, visual parity or hardware.
import {sha256} from './security.mjs';

const TYPES=new Set(['build','unit','integration','browser','visual','hardware','security','independent']);
const UI=new Set(['browser','visual']);
const text=(value,max=160)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const clean=(value,max=160)=>text(value,max)?value.trim():null;

export function normalizeAcceptanceCriterion(input){
  if(typeof input==='string'){
    if(!text(input))throw new Error('Invalid criterion');
    return {id:sha256(input.trim().toLowerCase()).slice(0,20),description:input.trim(),status:'not_run',evidence_required:true,contract:'legacy'};
  }
  if(!input||typeof input!=='object'||Array.isArray(input)||!text(input.id,160))throw new Error('Invalid acceptance criterion id');
  const id=input.id.trim();
  const typed=input.evidence_type!==undefined;
  if(!typed){
    if(input.description!==undefined&&!text(input.description))throw new Error('Invalid criterion description');
    return {id,description:clean(input.description)||id,status:'not_tested',evidence_required:true,contract:'legacy'};
  }
  if(!TYPES.has(input.evidence_type))throw new Error('Unknown acceptance evidence_type');
  for(const field of ['given','when','then']){
    if(!text(input[field],200))throw new Error('Acceptance requires explicit '+field);
  }
  if(UI.has(input.evidence_type)){
    for(const field of ['viewport','ui_state','reference']){
      if(!text(input[field],160))throw new Error('UI acceptance requires '+field);
    }
  }
  if(input.source_revision!==undefined&&!text(input.source_revision,160))throw new Error('Invalid source_revision');
  if(input.negative!==undefined&&typeof input.negative!=='boolean')throw new Error('Invalid negative control flag');
  return {
    id,description:clean(input.description)||id,
    given:input.given.trim(),when:input.when.trim(),then:input.then.trim(),
    evidence_type:input.evidence_type,
    ...(UI.has(input.evidence_type)?{
      viewport:input.viewport.trim(),ui_state:input.ui_state.trim(),reference:input.reference.trim()
    }:{}),
    ...(input.source_revision?{source_revision:input.source_revision}:{}),
    negative:input.negative===true,
    status:'not_tested',evidence_required:true,
    contract:'acceptance-v1'
  };
}


const LOCAL_ATTESTATION_EXCLUDED=new Set(['browser','visual','hardware','security','independent']);
// A2A machine reports are inspectable local assertions, not independent
// execution/visual/hardware witnesses. Shared by assess and verify_handoff.
export function localEvidencePolicy(criterion){
  const kind=criterion?.evidence_type||'unspecified';
  if(LOCAL_ATTESTATION_EXCLUDED.has(kind))return {
    locally_attestable:false,
    reason:'Local named tests and native hook metadata cannot independently attest '+kind+' acceptance'
  };
  return {locally_attestable:true,reason:null};
}

export function acceptanceCompletion(plan,results,{planning=false}={}){
  const byId=new Map(results.map(r=>[r.id,r]));
  const counts={passed:0,failed:0,blocked:0,not_tested:0,stale:0,inconclusive:0};
  const missing=[];
  for(const criterion of plan){
    const result=byId.get(criterion.id);
    let status=planning?'not_tested':(result?.status||'not_tested');
    if(status==='not_run'||!Object.hasOwn(counts,status))status='not_tested';
    counts[status]++;
    if(status!=='passed'&&missing.length<20)missing.push({id:criterion.id,status});
  }
  const localPasses=counts.passed;
  return {
    status:planning?'not_tested':'not_independently_verified',
    fully_verified:false,
    scope:'explicit-acceptance-criteria',
    total:plan.length,
    counts,
    local_report_passes:localPasses,
    independently_attested:0,
    missing_or_unproven:missing,
    missing_truncated:plan.length-localPasses>missing.length,
    note:'Named local machine tests prove only their assertions. Build success is not browser, visual, financial, hardware, or independent acceptance. Use signed assess_release evidence for release eligibility.'
  };
}
