import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readSafeBytesFile} from './security.mjs';
import {loadSkillMetadataCache,saveSkillMetadataCache} from './skill-metadata-cache.mjs';
const HOSTS=new Set(['app','cli','ide']),MAX_SKILLS=200,MAX_SKILL_BYTES=16*1024,MAX_DEPTH=2,MAX_ANCESTORS=8,MAX_CACHE_ENTRIES=400;
function safeDir(p){try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}catch{return false}}
function safeChain(dir,boundary){const target=path.resolve(dir),base=path.resolve(boundary),rel=path.relative(base,target);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))return false;let cur=base;if(!safeDir(cur))return false;for(const seg of rel.split(path.sep).filter(Boolean)){cur=path.join(cur,seg);if(!safeDir(cur))return false}return true}
function scalar(raw){let v=raw.trim();if(!v)return '';if(v.startsWith('"')){try{const x=JSON.parse(v);return typeof x==='string'?x:null}catch{return null}}if(v.startsWith("'"))return v.endsWith("'")&&v.length>=2?v.slice(1,-1).replace(/''/g,"'"):null;if(/[|>&*!{}\[\],]/.test(v))return null;return v.replace(/\s+#.*$/,'').trim()}
export function parseSkillFrontmatter(text){
 if(typeof text!=='string')return null;
 const s=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 if(!s.startsWith('---\n'))return null;const end=s.indexOf('\n---',4);if(end<0)return null;
 const fields={};
 for(const line of s.slice(4,end).split('\n')){
  if(!line.trim()||line.trimStart().startsWith('#'))continue;
  const m=line.match(/^([a-z][a-z0-9_-]*):\s*(.*?)\s*$/i);if(!m)continue;
  const key=m[1].toLowerCase();if(!['name','description'].includes(key))continue;
  if(Object.hasOwn(fields,key))return null;const value=scalar(m[2]);if(value===null)return null;fields[key]=value;
 }
 if(!fields.name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name)||fields.name.length>64||!fields.description||fields.description.length>1024||/[\u0000-\u001f\u007f]/.test(fields.description))return null;
 return{name:fields.name,description:fields.description};
}
function readSkill(dir,source,cache){
 if(!safeDir(dir))return null;const file=path.join(dir,'SKILL.md');let before;try{before=fs.lstatSync(file)}catch{return null}
 if(before.isSymbolicLink()||!before.isFile()||before.size>MAX_SKILL_BYTES)return null;
 const signature=[before.dev,before.ino,before.size,before.mtimeMs,before.ctimeMs].join(':'),cached=cache.entries.get(file);let metadata;
 if(cached?.signature===signature){cache.hits++;metadata=cached.metadata}
 else{cache.misses++;const read=readSafeBytesFile(file,{maxBytes:MAX_SKILL_BYTES,checkParentDir:false});if(!read.ok)return null;metadata=parseSkillFrontmatter(read.bytes.toString('utf8'));if(!metadata){cache.entries.delete(file);cache.dirty=true;return null}
  if(cache.entries.size>=MAX_CACHE_ENTRIES&&!cache.entries.has(file))cache.entries.delete(cache.entries.keys().next().value);
  cache.entries.delete(file);cache.entries.set(file,{signature,metadata});cache.dirty=true;
 }
 return{...metadata,source};
}
function addRoot(a,dir,source){if(!a.some(x=>x.path===dir))a.push({path:dir,source})}
function workspaceRoots(workspace,home){if(typeof workspace!=='string'||!workspace.trim())return[];let cur=path.resolve(workspace);const roots=[];for(let i=0;i<MAX_ANCESTORS;i++){if(!safeDir(cur))break;addRoot(roots,path.join(cur,'.agents','skills'),'workspace');const parent=path.dirname(cur);if(parent===cur||parent===path.resolve(home))break;cur=parent}return roots}
function getRoots({host,home,workspace}){const roots=workspaceRoots(workspace,home);addRoot(roots,path.join(home,'.gemini','config','skills'),'global');if(host==='ide')addRoot(roots,path.join(home,'.gemini','antigravity','skills'),'legacy-ide');if(host==='cli'){addRoot(roots,path.join(home,'.gemini','antigravity-cli','skills'),'cli-only');addRoot(roots,path.join(home,'.gemini','skills'),'cli-only');const plugins=path.join(home,'.gemini','config','plugins');if(safeDir(plugins))try{for(const e of fs.readdirSync(plugins,{withFileTypes:true}).slice(0,100))if(e.isDirectory()&&!e.isSymbolicLink())addRoot(roots,path.join(plugins,e.name,'skills'),'plugin-cli')}catch{}}return roots}
function walk(root,source,boundary,cache){if(!safeChain(root,boundary))return[];const found=[];const visit=(dir,depth)=>{if(found.length>=MAX_SKILLS||depth>MAX_DEPTH||!safeDir(dir))return;const skill=readSkill(dir,source,cache);if(skill){found.push(skill);return}let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true})}catch{return}for(const e of entries){if(found.length>=MAX_SKILLS)break;if(e.isDirectory()&&!e.isSymbolicLink()&&!e.name.startsWith('.'))visit(path.join(dir,e.name),depth+1)}};visit(root,0);return found}
export function discoverSkills({host='ide',home=process.env.HOME||process.env.USERPROFILE||os.homedir(),workspace=null}={}){
 if(!HOSTS.has(host))throw new Error('host must be app, cli, or ide');
 const homeRoot=path.resolve(home),roots=getRoots({host,home:homeRoot,workspace}),cache=loadSkillMetadataCache(homeRoot);cache.hits=0;cache.misses=0;
 const skills=[],seen=new Set();
 for(const root of roots){const boundary=path.parse(path.resolve(root.path)).root;for(const skill of walk(root.path,root.source,boundary,cache)){const key=skill.name.toLowerCase();if(seen.has(key))continue;seen.add(key);skills.push(skill);if(skills.length>=MAX_SKILLS)break}if(skills.length>=MAX_SKILLS)break}
 const persisted=saveSkillMetadataCache(cache,homeRoot);
 return{host,skills,scanned_roots:roots.filter(x=>safeDir(x.path)).map(x=>({source:x.source,available:true})),cache:{hits:cache.hits,misses:cache.misses,entries:cache.entries.size,max_entries:MAX_CACHE_ENTRIES,persistent:true,persisted},limits:{max_skills:MAX_SKILLS,max_skill_bytes:MAX_SKILL_BYTES}};
}