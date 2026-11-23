// Read-only on-demand context milestone advice: never automatic compaction.
export const CONTEXT_HEALTH_LIMITS=Object.freeze({reviewSteps:80,handoffSteps:140});
export function assessContextHealth({steps,complete=true,milestoneComplete=false}={}){
 if(!Number.isSafeInteger(steps)||steps<0)throw new Error('Invalid planner step count');
 if(typeof complete!=='boolean'||typeof milestoneComplete!=='boolean')throw new Error('Invalid context state');
 const common={planner_steps_since_conversation_start:steps,step_count_is_heuristic:true,active_context_tokens:null,
   measured_token_savings:null,automatic_compaction:false,user_action_required:true,
   note:'Local planner steps are not context-window occupancy, quota or official token usage.'};
 if(!complete)return {...common,status:'insufficient_evidence',recommendation:'Transcript is incomplete; verify the native session before considering compaction.'};
 if(steps<CONTEXT_HEALTH_LIMITS.reviewSteps)return {...common,status:'normal',recommendation:'No context action suggested by step heuristic.'};
 if(!milestoneComplete)return {...common,status:'defer_until_milestone',recommendation:'Finish active edits and tests; this command cannot detect unfinished work.'};
 if(steps>=CONTEXT_HEALTH_LIMITS.handoffSteps)return {...common,status:'handoff_review',recommendation:'At a user-confirmed completed milestone, consider a new session with verified files, tests and next steps. Never auto-clear or auto-compact.'};
 return {...common,status:'compact_review',recommendation:'At a user-confirmed completed milestone, consider native /compact only after checking verified state. Never auto-compact.'};
}
