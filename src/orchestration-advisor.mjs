// Opt-in, non-executing advisor for Antigravity's native agent modes.
const ALLOWED=new Set(['/swarm','/teamwork','/boost','@subagent']);
const isArr=v=>Array.isArray(v)&&v.length<=30&&v.every(x=>typeof x==='string'&&x.length<=120);
export function adviseOrchestration(task={}){
 if(!task||typeof task!=='object'||Array.isArray(task))throw new Error('Provide a task description object');
 const work=task.workstreams??[];
 if(!isArr(work))throw new Error('workstreams must be <=30 strings');
 const listed=task.available_commands??[];
 if(!isArr(listed)||listed.some(x=>!ALLOWED.has(x)))throw new Error('Invalid available_commands');
 const tier=['free','pro','ultra','paid-other','unknown'].includes(task.tier)?task.tier:'unknown';
 const supported=new Set(listed);
 const paid=tier==='pro'||tier==='ultra'||tier==='paid-other';
 const pro=tier==='pro'||tier==='ultra';
 const can=x=>supported.has(x)&&(x==='@subagent'||paid&&(x!=='/swarm'||pro));
 const ownership=['independent','shared','unknown'].includes(task.file_ownership)?task.file_ownership:'unknown';
 const independent=work.length>=2&&task.dependencies==='low'&&ownership==='independent';
 const long=Number.isInteger(task.milestones)&&task.milestones>=2&&task.long_horizon===true;
 let suggested='single-agent',why='A single agent avoids parallel coordination overhead for uncertain or tightly coupled work';
 if(long&&independent&&can('/teamwork')){suggested='/teamwork';why='Multiple milestones benefit from dedicated roles and independent audit gates'}
 else if(independent&&can('/swarm')){suggested='/swarm';why='Independent workstreams can be divided among named workers and a verifier'}
 else if(task.hard_reasoning===true&&can('/boost')){suggested='/boost';why='A hard tightly coupled problem may benefit from iterative challenger verification'}
 else if(independent&&can('@subagent')){suggested='@subagent';why='Delegate one scoped workstream for focused help, keeping primary agent in control'}
 return {status:'recommendation-only',recommended:suggested,rationale:why,task_summary:{workstreams:work.length,dependencies:task.dependencies||'unknown',file_ownership:ownership,milestones:Number.isInteger(task.milestones)?task.milestones:null},plan_tier:tier,explicit_capabilities:[...supported],user_approval_required:true,automatic_worker_launch:false,cautions:['File ownership and low coupling are user-declared, not independently verified','Do not launch multiple workers on overlapping files without a conflict-resolution plan','Every worker handoff requires named evidence before integration','Only commands explicitly reported available are considered','Free Tier does not imply paid /boost, /swarm or /teamwork access','Parallel workers can consume more tokens and quota than a single agent','MCP access may differ for Swarm workers; validate tools and permissions separately','A2A does not replace native Antigravity coordination or worker evidence gates']};
}
