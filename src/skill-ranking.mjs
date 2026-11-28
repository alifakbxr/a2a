// Deterministic local Skill matching. No model call, network access or activation.
const STOP=new Set(['a','an','and','are','as','at','be','by','do','for','from','how','i','in','into','is','it','me','my','of','on','or','our','please','the','this','to','we','with','you','your']);
const MAX_TASK_CHARS=4000;
const MAX_SKILLS=200;
const MAX_RESULTS=2;
function terms(value){
 return String(value||'').toLowerCase().normalize('NFKC')
  .match(/[\p{L}\p{N}]+(?:[+#]+)?/gu)||[];
}
function weightedOverlap(query,field,weight){
 const fieldTerms=new Set(terms(field));
 let score=0,matches=0;
 for(const token of query){if(fieldTerms.has(token)){score+=weight;matches++;}}
 return {score,matches};
}
export function rankSkills({task,skills=[],usage={},maxResults=MAX_RESULTS,threshold=2,allowRoutine=false}={}){
 if(typeof task!=='string'||task.length>MAX_TASK_CHARS)throw new Error('task must be a string up to 4000 characters');
 if(!Array.isArray(skills)||skills.length>MAX_SKILLS)throw new Error('skills must contain at most 200 entries');
 if(!usage||typeof usage!=='object'||Array.isArray(usage))throw new Error('usage must be an object');
 if(!Number.isSafeInteger(maxResults)||maxResults<1||maxResults>MAX_RESULTS)throw new Error('maxResults must be 1 or 2');
 if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<1||threshold>20)throw new Error('threshold must be between 1 and 20');
 const query=[...new Set(terms(task).filter(x=>!STOP.has(x)))];
 if(!allowRoutine&&query.length<3)return {status:'skipped',reason:'Task description is too short for reliable Skill matching.',recommendations:[]};
 if(!query.length)return {status:'skipped',reason:'No meaningful task terms were found.',recommendations:[]};
 const ranked=[];
 for(const skill of skills){
  if(!skill||typeof skill.name!=='string'||typeof skill.description!=='string')continue;
  const name=weightedOverlap(query,skill.name,3),description=weightedOverlap(query,skill.description,1);
  const raw=name.score+description.score;
  if(raw<threshold)continue;
  const count=Number.isSafeInteger(usage[skill.name])&&usage[skill.name]>0?Math.min(usage[skill.name],1000):0;
  const usageBoost=Math.min(1.5,Math.log1p(count)*0.35);
  const sourceBoost=skill.source==='workspace'?0.5:0;
  ranked.push({name:skill.name,description:skill.description,source:skill.source||'unknown',
   score:Number((raw+usageBoost+sourceBoost).toFixed(3)),matched_terms:name.matches+description.matches,
   match_basis:{name_terms:name.matches,description_terms:description.matches,usage_count:count}});
 }
 ranked.sort((a,b)=>b.score-a.score||b.matched_terms-a.matched_terms||a.name.localeCompare(b.name));
 const recommendations=ranked.slice(0,maxResults);
 if(!recommendations.length)return {status:'no_match',reason:'No Skill met the deterministic relevance threshold.',recommendations:[]};
 const first=recommendations[0],second=recommendations[1];
 const margin=second?first.score-second.score:first.score;
 const confidence=first.matched_terms>=3&&margin>=1?'high':(first.match_basis.name_terms>=1||first.matched_terms>=3)?'medium':'low';
 if(confidence==='low')return {status:'ambiguous',reason:'Matches are too weak to recommend a Skill confidently.',recommendations:[]};
 return {status:'recommended',confidence,reason:'Matched task terms against Skill names and descriptions; usage history is a bounded tie-breaker only.',recommendations};
}
