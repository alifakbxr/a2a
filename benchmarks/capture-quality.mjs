// Private, fail-closed classification for captured Antigravity A/B runs.
// Raw errors, stderr, prompts and tool parameters must never leave this module.
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const ERROR_TYPES=Object.freeze([
  [/individual quota reached|quota (?:exhausted|exceeded|depleted|reached)|quota.exceeded|insufficient (?:ai )?credits/i,'provider_quota'],
  [/(?:\b429\b|rate.limit(?:ed)?|too many requests|resource_exhausted)/i,'provider_rate_limit'],
  [/no capacity available|\b503\b|overloaded|service unavailable|capacity exhausted/i,'provider_capacity'],
  [/a tool required the .* permission|auto.denied|permission check failed|permission denied|permissions? denied|\b403\b/i,'permission_denied'],
  [/(?:timeout|timed out|\betimedout\b)/i,'timeout'],
  [/invalid model selection|model unavailable|unsupported model/i,'invalid_model'],
]);
export function classifyCapturedError(value) {
  let message='';
  if(typeof value==='string')message=value;
  else if(object(value))message=[value.code,value.message].filter(x=>typeof x==='string'||typeof x==='number').join(' ');
  if(!message.trim())return null;
  for(const [pattern,category] of ERROR_TYPES)if(pattern.test(message.slice(0,8192)))return category;
  return 'other_error';
}
const toolFailed=info=>Boolean(info?.error||info?.isError===true);
export function captureQuality(events,result,officialUsage,{stderr=null}={}) {
  const steps=new Map();
  let errorMessageSteps=0;
  for(let i=0;i<events.length;i++){
    const event=events[i],step=event?.step_update;
    if(event?.event!=='step_update'||!object(step))continue;
    if(step.step_type==='error_message'){errorMessageSteps++;continue}
    if(step.step_type!=='tool')continue;
    const key=String(step.conversation_id||'')+':'+String(step.step_index??'event-'+i);
    const prev=steps.get(key)||{state:'ACTIVE',everFailed:false};
    const state=step.state==='ERROR'?'ERROR':step.state==='DONE'?'DONE':'ACTIVE';
    steps.set(key,{
      state:state==='ACTIVE'?prev.state:state,
      failedNow:state==='ACTIVE'?prev.failedNow:state==='ERROR'||toolFailed(step.tool_info),
      everFailed:prev.everFailed||state==='ERROR'||toolFailed(step.tool_info),
    });
  }
  let completedCalls=0,fatalErrors=0,recoveredErrors=0,unfinishedCalls=0;
  for(const step of steps.values()){
    if(step.state==='DONE')completedCalls++;
    if(step.state==='ACTIVE')unfinishedCalls++;
    if(step.failedNow)fatalErrors++;
    else if(step.everFailed)recoveredErrors++;
  }
  const deniedActionsCount=Array.isArray(result.denied_actions)?result.denied_actions.length:null;
  const responsePresent=typeof result.response==='string'&&result.response.trim().length>0;
  const terminalErrorCategory=classifyCapturedError(result.error);
  const stderrCaptured=typeof stderr==='string';
  const stderrErrorCategory=stderrCaptured?classifyCapturedError(stderr):null;
  const reasons=[];
  if(result.status!=='SUCCESS')reasons.push('terminal_not_success');
  if(!officialUsage||officialUsage.total_tokens===0)reasons.push('missing_or_zero_official_usage');
  if(!responsePresent)reasons.push('empty_response');
  if(deniedActionsCount===null)reasons.push('denied_actions_not_reported');
  else if(deniedActionsCount>0)reasons.push('denied_actions');
  if(!stderrCaptured)reasons.push('stderr_not_captured');
  else if(stderr.trim()&&stderrErrorCategory==='other_error')reasons.push('unclassified_stderr_output');
  if(terminalErrorCategory)reasons.push(terminalErrorCategory==='other_error'?'terminal_error':terminalErrorCategory);
  if(stderrErrorCategory&&stderrErrorCategory!=='other_error')reasons.push(stderrErrorCategory);
  if(fatalErrors)reasons.push('fatal_tool_errors');
  if(unfinishedCalls)reasons.push('unfinished_tool_steps');
  if(errorMessageSteps)reasons.push('error_message_steps');
  return {
    status:reasons.length===0?'mechanically_complete':'not_comparable',
    reasons:[...new Set(reasons)],
    response_present:responsePresent,
    denied_actions_count:deniedActionsCount,
    stderr_captured:stderrCaptured,
    stderr_error_category:stderrErrorCategory,
    terminal_error_category:terminalErrorCategory,
    tool_calls:events.length?completedCalls:null,
    tool_errors:events.length?fatalErrors:null,
    tool_error_steps:fatalErrors,
    recovered_tool_errors:recoveredErrors,
    unfinished_tool_steps:unfinishedCalls,
    error_message_steps:errorMessageSteps,
  };
}
