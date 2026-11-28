import path from 'node:path';
import {getA2AMode,getHomeDir,requireAuthorizedWorkspace,debugLog} from './security.mjs';
import {Store} from './storage.mjs';
import {identifySkillFile} from './skill-catalog.mjs';

// This script is registered only for the host's PostToolUse/view_file matcher.
// Antigravity's documented payload does not include hookEventName, so validate
// the event when supplied but rely on the hook registration when it is absent.
// Learn only from successful, un-ranged reads of a validated Skill manifest.
export function recordObservedSkillUse(payload,baseDir){
 if(getA2AMode()!=='always-on')return false;
 const eventName=payload?.hookEventName||payload?.hook_event_name;
 if((eventName&&eventName!=='PostToolUse')||payload?.error)return false;
 const call=payload?.toolCall,args=call?.args;
 if(call?.name!=='view_file'||!args||typeof args!=='object'||Array.isArray(args))return false;
 if(args.IsSkillFile===false||args.StartLine!=null||args.EndLine!=null)return false;
 const filePath=args.AbsolutePath;
 if(typeof filePath!=='string'||filePath.length>4096||!path.isAbsolute(filePath))return false;
 const candidates=[...(Array.isArray(payload?.workspacePaths)?payload.workspacePaths:[]),payload?.cwd]
  .filter(value=>typeof value==='string'&&value.length<=1024&&path.isAbsolute(value)).slice(0,33);
 let workspace=null;
 for(const candidate of candidates){try{workspace=requireAuthorizedWorkspace(candidate);break}catch{}}
 if(!workspace)return false;
 const skill=identifySkillFile({filePath,home:getHomeDir(),workspace});
 if(!skill)return false;
 let store;
 try{
  store=new Store(baseDir);
  const workspaceId=store.register(workspace);
  store.recordSkillUsage({workspaceId,skillName:skill.name,source:skill.source,activationEvidence:'host_observed'});
  return true;
 }catch(error){debugLog('skill_usage_observation',error);return false}
 finally{try{store?.close()}catch{}}
}
