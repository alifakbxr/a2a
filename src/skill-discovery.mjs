import {discoverSkills} from './skill-catalog.mjs';
import {rankSkills} from './skill-ranking.mjs';
export {discoverSkills,rankSkills};

// Compose disk inventory with optional workspace-scoped observed usage. This is
// still advisory: it neither activates Skills nor mutates host state.
export function recommendSkills({task,host='ide',home,workspace=null,workspaceId=null,store=null}={}) {
  const catalog=discoverSkills({host,home,workspace});
  const usage=store&&workspaceId&&typeof store.getSkillUsage==='function'
    ?store.getSkillUsage(workspaceId):{};
  return {...catalog,...rankSkills({task,skills:catalog.skills,usage})};
}
// Read-only, bounded skill exclusion diagnostic. Plugin installation does not
// prove skill inclusion in every Antigravity conversation or subagent.
import path from 'node:path';
import {getHomeDir,readSafeJsonFile} from './security.mjs';

export function diagnoseSkillDiscovery(){
 const file=path.join(getHomeDir(),'.gemini','config','skills.json');
 const result=readSafeJsonFile(file,{maxBytes:64*1024,checkParentDir:true});
 if(!result.ok)return {
  status:result.reason==='missing'?'no_global_manifest':'manifest_unavailable',
  note:'This does not establish whether the current IDE/CLI agent loaded the pilah skill. Check /skills and project exclusion manifests.'
 };
 const excludes=result.value.exclude;
 if(excludes!==undefined&&(!Array.isArray(excludes)||excludes.some(x=>typeof x!=='string')))
  return {status:'manifest_unavailable',note:'Global skill manifest exclusion format is not readable as a string array.'};
 const excluded=Array.isArray(excludes)&&excludes.some(x=>x==='pilah'||x==='pilah:pilah'||x==='a2a'||x==='a2a:a2a');
 return {
  status:excluded?'excluded_by_global_manifest':'not_excluded_by_global_manifest',
  note:excluded
   ?'A global skills.json exclusion names PILAH/A2A. Inspect it in Antigravity; this diagnostic will never alter user preferences.'
   :'Workspace manifests, plugin-level exclusions, session-specific context and model activation remain unverified. Inspect /skills in Antigravity.'
 };
}
