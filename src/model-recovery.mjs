// Local conservative assisted recovery: no quota APIs, model switching or retries.
import {sha256} from './security.mjs';

const CONV=/^[A-Za-z0-9._-]{4,128}$/;
export const validConversationId=id=>typeof id==='string'&&CONV.test(id)&&id!=='.'&&id!=='..';
export const cleanModelName=name=>typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9 ._()/-]{0,99}$/.test(name)?name:null;
export function classifyModelFailure(error){
  if(typeof error!=='string'||!error.trim())return {category:'unknown',confidence:'low'};
  const e=error.slice(0,4096);
  let category='unknown',confidence='low';
  if(/quota (?:exhausted|exceeded|depleted)|(?:weekly|daily|five.hour|5.hour) (?:quota|limit) (?:reached|exhausted|exceeded)|insufficient (?:ai )?credits|credit balance exhausted|model quota exhausted/i.test(e))category='quota_exhausted';
  else if(/\b(?:429|rate.limit(?:ed)?|too many requests|resource_exhausted)\b/i.test(e))category='rate_limited';
  else if(/\b(?:503|high traffic|capacity exhausted|service unavailable|backend overload|server (?:is )?(?:overloaded|busy))\b/i.test(e))category='capacity';
  else if(/\b(?:502|504|bad gateway|gateway timeout|internal server error|500)\b/i.test(e))category='service_error';
  else if(/\b(?:401|403|unauthorized|unauthenticated|permission denied|invalid credentials|invalid api key)\b/i.test(e))category='authentication';
  else if(/\b(?:context window|context length|maximum context|input (?:is )?too long|token limit exceeded)\b/i.test(e))category='context_limit';
  else if(/\b(?:econnreset|econnrefused|etimedout|network unreachable|connection (?:reset|timed out)|tls handshake)\b/i.test(e))category='network';
  if(category!=='unknown')confidence='medium';
  return {category,confidence};
}
export function modelRecoveryAdvice(category){
  const base={automatic_switch:false,model_availability:'not_checked',quota:'not_checked',
    selection:'Use the native model selector or /model; A2A cannot switch the active model.'};
  switch(category){
    case 'quota_exhausted':return {...base,action:'check_quota_and_choose',message:'Open /usage and inspect remaining quota by model group. If an eligible group has capacity, select a model manually with /model. Availability is not verified.'};
    case 'rate_limited':return {...base,action:'respect_native_retry',message:'Rate limiting is not proof the weekly quota is exhausted. Respect native retry/backoff and check /usage; do not retry endlessly or rotate accounts.'};
    case 'capacity':case 'service_error':return {...base,action:'native_retry_then_choose',message:'Let Antigravity native retries finish. If errors persist, check /usage and select an eligible model manually with /model.'};
    case 'network':return {...base,action:'check_connection',message:'Check the network and Antigravity status. Changing model might not solve connectivity errors.'};
    case 'authentication':return {...base,action:'check_sign_in',message:'Check your native Antigravity sign-in and permissions; do not rotate accounts automatically.'};
    case 'context_limit':return {...base,action:'compact_or_resume',message:'Use an explicit concise checkpoint and revalidate source and tests. Switching models does not guarantee more context.'};
    default:return {...base,action:'inspect_native_error',message:'Cause is unconfirmed. Inspect Antigravity errors and /usage before deciding how to recover.'};
  }
}
export function saveRecoveryCheckpoint(store,wsId,{conversationId,revision,taskSummary,completed=[],nextSteps=[]}){
  if(!validConversationId(conversationId))throw Error('Valid conversation_id required');
  if(typeof taskSummary!=='string'||!taskSummary.trim()||taskSummary.length>500)throw Error('task_summary must be 1-500 characters');
  for(const [name,items] of [['completed',completed],['next_steps',nextSteps]]){
    if(!Array.isArray(items)||items.length>8||items.some(x=>typeof x!=='string'||!x.trim()||x.length>200))throw Error(name+' must have up to 8 short statements');
  }
  const now=new Date().toISOString();
  store.run('INSERT INTO recovery_checkpoints(workspace_id,conversation_id,revision_id,task_summary,completed_json,next_steps_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(workspace_id,conversation_id) DO UPDATE SET revision_id=excluded.revision_id,task_summary=excluded.task_summary,completed_json=excluded.completed_json,next_steps_json=excluded.next_steps_json,updated_at=excluded.updated_at',
    wsId,conversationId,revision||null,taskSummary.trim(),JSON.stringify(completed),JSON.stringify(nextSteps),now,now);
  store.run('DELETE FROM recovery_checkpoints WHERE workspace_id=? AND conversation_id NOT IN (SELECT conversation_id FROM recovery_checkpoints WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 30)',wsId,wsId);
  return {status:'saved',conversation_id:conversationId,revision:revision||null,verified:false,content_origin:'explicit_notes',updated_at:now};
}
export function recordModelStop(store,wsId,{conversationId,modelName,error,terminationReason}){
  if(!validConversationId(conversationId)||terminationReason!=='error')return {recorded:false};
  const model=cleanModelName(modelName),classified=classifyModelFailure(error),now=new Date().toISOString();
  // Persist only category, not raw provider messages, prompts or secrets.
  store.run('INSERT INTO model_recovery_state(workspace_id,conversation_id,model_name,incident_category,incident_confidence,incident_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(workspace_id,conversation_id) DO UPDATE SET model_name=COALESCE(excluded.model_name,model_recovery_state.model_name),incident_category=excluded.incident_category,incident_confidence=excluded.incident_confidence,incident_at=excluded.incident_at,updated_at=excluded.updated_at',
    wsId,conversationId,model,classified.category,classified.confidence,now,now);
  store.run('DELETE FROM model_recovery_state WHERE workspace_id=? AND conversation_id NOT IN (SELECT conversation_id FROM model_recovery_state WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 60)',wsId,wsId);
  return {recorded:true,category:classified.category,confidence:classified.confidence,error_body_persisted:false};
}
export function observeModelInvocation(store,wsId,{conversationId,modelName}){
  if(!validConversationId(conversationId))return {notice:null};
  const model=cleanModelName(modelName);if(!model)return {notice:null};
  return store.transaction(()=>{
    const prev=store.get('SELECT * FROM model_recovery_state WHERE workspace_id=? AND conversation_id=?',wsId,conversationId);
    const changed=Boolean(prev?.model_name&&prev.model_name!==model);
    const age=prev?.incident_at?Date.now()-Date.parse(prev.incident_at):Infinity;
    const incident=age>=0&&age<6*60*60*1000?prev?.incident_category:null;
    const key=sha256(JSON.stringify([prev?.model_name||'',model,incident||'',prev?.incident_at||'']));
    const notify=(changed||incident)&&prev?.notice_signature!==key;
    const now=new Date().toISOString();
    store.run('INSERT INTO model_recovery_state(workspace_id,conversation_id,model_name,notice_signature,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,conversation_id) DO UPDATE SET model_name=excluded.model_name,notice_signature=COALESCE(excluded.notice_signature,model_recovery_state.notice_signature),updated_at=excluded.updated_at',
      wsId,conversationId,model,notify?key:null,now);
    if(!notify)return {notice:null,model_changed:changed};
    const checkpoint=store.get('SELECT conversation_id FROM recovery_checkpoints WHERE workspace_id=? AND conversation_id=?',wsId,conversationId);
    // No untrusted free-text task notes embedded as high-priority instructions.
    const notice='A2A assisted recovery: '+(changed?'The user-selected model changed. ':'A model invocation previously failed. ')+
      (incident?'Observed error category: '+incident+' (heuristic, not verified quota). ':'')+
      (checkpoint?'Explicit task checkpoint available via a2a_evidence(operation="model_recovery"). ':'')+
      'Verify current files and test state. Never claim the last task completed, auto-switch models or retry blindly.';
    return {notice,model_changed:changed,checkpoint_available:Boolean(checkpoint)};
  });
}
export function recoveryStatus(store,wsId,{conversationId=null,currentRevision=null}={}){
  if(conversationId!==null&&!validConversationId(conversationId))throw Error('Invalid conversation_id');
  const state=conversationId?
    store.get('SELECT conversation_id,model_name,incident_category,incident_confidence,incident_at FROM model_recovery_state WHERE workspace_id=? AND conversation_id=?',wsId,conversationId):
    store.get('SELECT conversation_id,model_name,incident_category,incident_confidence,incident_at FROM model_recovery_state WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 1',wsId);
  const row=conversationId?
    store.get('SELECT * FROM recovery_checkpoints WHERE workspace_id=? AND conversation_id=?',wsId,conversationId):
    store.get('SELECT * FROM recovery_checkpoints WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 1',wsId);
  const age=row?Date.now()-Date.parse(row.updated_at):Infinity;
  const checkpoint=age>=0&&age<=7*24*60*60*1000?{
    conversation_id:row.conversation_id,task_summary:row.task_summary,
    completed:JSON.parse(row.completed_json),next_steps:JSON.parse(row.next_steps_json),
    source_revision:row.revision_id,source_revision_matches:typeof currentRevision==='string'?row.revision_id===currentRevision:null,
    updated_at:row.updated_at,verified:false,
    warning:'Explicit notes are not proof of completion. Recheck code, permissions and tests.'}:null;
  return {status:'assisted_only',automatic_switch:false,
    observation:state?{...state}:null,advice:modelRecoveryAdvice(state?.incident_category||'unknown'),checkpoint,
    limitations:['No quota API queried','Error categories are heuristic','No automatic model switch or retry executed']};
}
