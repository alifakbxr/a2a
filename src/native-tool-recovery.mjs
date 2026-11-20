// Native Antigravity failure triage only. A2A does not call or intercept native tools.
// Never include raw error text, paths, screenshots, commands or credentials in output.
const CATEGORIES=new Set(['invalid_arguments','context_lost','timeout','permission_denied','missing_file','edit_conflict','unknown']);
const ADVICE={
 invalid_arguments:{next_step:'Inspect the current native tool schema and required parameter names; obtain a fresh pageId when applicable.',safe_retry:'Only after corrected parameters.'},
 context_lost:{next_step:'List active browser pages, select a current page and re-evaluate selectors after navigation.',safe_retry:'Only after refreshing browser state.'},
 timeout:{next_step:'Check whether the prior action completed before retrying. Respect native backoff and user approvals.',safe_retry:'Only after observing the current state.'},
 permission_denied:{next_step:'Stop and request the user-approved workspace or tool permission. Never bypass native safeguards.',safe_retry:'Only after explicit authorization.'},
 missing_file:{next_step:'Inspect the current project tree and resolve the existing authorized file path.',safe_retry:'Only after confirming the file exists.'},
 edit_conflict:{next_step:'Read the current file version, recompute the minimal patch and re-run affected tests.',safe_retry:'Only after refreshing the expected source state.'},
 unknown:{next_step:'Inspect native diagnostics and last observable tool state. Do not assume cause or retry blindly.',safe_retry:'Only after determining a changed condition.'}
};
export function classifyNativeToolFailure({error_class,error_hint='',tool_family='other',retry_count=0}={}){
 if(typeof error_hint!=='string'||error_hint.length>400)throw Error('Invalid bounded error hint');
 if(!['mcp','browser','filesystem','terminal','other'].includes(tool_family))throw Error('Invalid tool family');
 if(!Number.isSafeInteger(retry_count)||retry_count<0||retry_count>20)throw Error('Invalid retry count');
 if(error_class!==undefined&&!CATEGORIES.has(error_class))throw Error('Unknown error class');
 const e=error_hint;
 // Authorization failures are safety critical: an argument/pageId substring or
 // a caller-provided lower-severity class must never downgrade them.
 const denial=/(?:permission denied|forbidden|eacces|unauthori[sz]ed|\b403\b|access denied)/i.test(e);
 const detected=
  denial?'permission_denied':
  /(?:-32602|invalid (?:arguments?|parameter)|missing (?:required|parameter)|invalid pageid)/i.test(e)?'invalid_arguments':
  /(?:execution context (?:was )?destroyed|context lost|stale element|no such page|target closed)/i.test(e)?'context_lost':
  /(?:timeout|timed out|deadline exceeded|etimedout)/i.test(e)?'timeout':
  /(?:enoent|file not found|no such file|path does not exist)/i.test(e)?'missing_file':
  /(?:edit conflict|patch failed|expected text not found|old string not found|does not match)/i.test(e)?'edit_conflict':'unknown';
 const category=error_class==='permission_denied'?'permission_denied':(detected==='unknown'?(error_class||'unknown'):detected);
 const advice=ADVICE[category];
 return {
  status:'guidance_only',category,
  confidence:detected!=='unknown'?'heuristic':'user_classified_or_unknown',
  native_tool_family:tool_family,
  retry_same_input:false,
  retry_count,
  escalation:retry_count>=2?'Stop identical retries; inspect the tool contract/state or request user guidance.':null,
  next_step:advice.next_step,
  safe_retry:advice.safe_retry,
  requires_user_approval:category==='permission_denied',
  automatic_execution:false,
  raw_error_stored:false,
  limitations:['A2A cannot intercept or modify native Antigravity tool calls','Error classifications are heuristics, not verified root causes']
 };
}
