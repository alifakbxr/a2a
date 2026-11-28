import path from 'node:path';
import {getA2AMode,getHomeDir,requireAuthorizedWorkspace,sha256,debugLog} from './security.mjs';
import {sanitizeConversationId} from './tokens.mjs';
import {Store} from './storage.mjs';
import {recommendSkills} from './skill-discovery.mjs';
export function recommendSkillGuidance(payload,baseDir,{throwErrors=false}={}){
 const conversationId=sanitizeConversationId(payload?.conversationId),task=typeof payload?.lastUserInput==='string'?payload.lastUserInput:'';
 if(getA2AMode()!=='always-on'||!conversationId||!task.trim()||task.length>4000)return{};
 const candidates=[...(Array.isArray(payload?.workspacePaths)?payload.workspacePaths:[]),...(typeof payload?.cwd==='string'?[payload.cwd]:[])].filter(x=>typeof x==='string'&&x.length<=1024&&path.isAbsolute(x)).slice(0,33);
 let workspace=null;for(const c of candidates){try{workspace=requireAuthorizedWorkspace(c);break}catch{}}if(!workspace)return{};
 const raw=payload?.hostSurface||process.env.PILAH_HOST_SURFACE||'ide',host=['app','cli','ide'].includes(raw)?raw:'ide';let store;
 try{store=new Store(baseDir);const workspaceId=store.register(workspace),r=recommendSkills({task,host,home:getHomeDir(),workspace,workspaceId,store});if(r.status!=='recommended'||r.confidence!=='high'||!r.recommendations.length)return{};
  const names=r.recommendations.slice(0,2).map(x=>x.name),fingerprint=sha256(names.join('|'));if(!store.shouldInjectSkillRecommendation({workspaceId,conversationId,fingerprint}))return{};
  return{injectSteps:[{systemMessage:{systemMessage:'Potentially relevant Agent Skills: '+names.join(', ')+'. Use only if the host exposes them and they fit the task. A recommendation does not mean a Skill is loaded; otherwise continue with native Antigravity capabilities.'}}]};
 }catch(e){debugLog('skill_recommendation',e);if(throwErrors)throw e;return{}}finally{try{store?.close()}catch{}}
}