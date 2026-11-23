// Explicit, deterministic workflow advice. No model calls, tools, or settings writes.
const PROFILES=new Set(['economy','balanced','deep-review']);
const TASKS=new Set(['simple','cross-file','change-impact','verification','recovery']);
const RISKS=new Set(['low','medium','high','critical']);
export function routeWorkflow({profile='balanced',task='simple',risk='low',uncertainty=false,scopeKnown=true,hasNamedEvidence=false}={}){
 if(!PROFILES.has(profile)||!TASKS.has(task)||!RISKS.has(risk)||
    typeof uncertainty!=='boolean'||typeof scopeKnown!=='boolean'||typeof hasNamedEvidence!=='boolean')
   throw new Error('Invalid workflow route request');
 const baseline={profile,task,risk,mode:'native-first',automatic_tool_calls:0,
   requires_user_approval:false,model_switch:false,estimated_token_savings:null,provider_usage:null,
   selection_basis:'Caller-declared task, risk and uncertainty; not independently verified or an instruction to auto-call MCP.'};
 let operation=null,reason='Native context is sufficient or this task does not require A2A.';
 if(task!=='simple'&&uncertainty&&(task==='cross-file'||!scopeKnown)){
   operation='a2a_context';reason='Targeted code graph query may reduce uncertainty across files.';
 } else if(task==='change-impact'&&(uncertainty||(risk!=='low'&&profile!=='economy'))){
   operation='a2a_impact';reason=uncertainty
     ?'Scoped change impact may expose dependent files and tests.'
     :'A risk-aware impact summary is potentially useful for the scoped change.';
 } else if(task==='verification'&&['high','critical'].includes(risk)&&profile==='deep-review'){
   operation='a2a_verify';reason='A high-risk acceptance plan is warranted; no local test is counted as release proof.';
 } else if(task==='recovery'&&['high','critical'].includes(risk)&&profile==='deep-review'){
   operation='a2a_evidence';reason='Opt-in model recovery may be helpful after a verified failure; no automatic retries.';
 }
 if(task==='simple'){operation=null;reason='Simple tasks remain native-only regardless of declared uncertainty.';}
 if(operation&&(!scopeKnown||task==='cross-file')&&operation!=='a2a_context'){
   operation='a2a_context';reason='Determine the scope before considering other A2A operations.';
 }
 // Deep review may suggest more verification, but cannot authorize a second call.
 return {...baseline,proposal:operation??'native-only',max_initial_a2a_calls:operation?1:0,
   reason,needs_workspace_permission:!!operation,needs_named_test_evidence:false,
   named_evidence_required_for_assessment:operation==='a2a_verify',
   additional_calls:'Only after a new, explicit uncertainty; never automatically chained.',
   caveat:'A routing recommendation is not measured token or quality improvement.'};
}
