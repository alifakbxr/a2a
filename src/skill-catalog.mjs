// Bounded, read-only Agent Skills discovery. This inventories metadata only;
// it does not load a Skill into an agent context or force host activation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readSafeBytesFile} from './security.mjs';

const HOSTS=new Set(['app','cli','ide']);
const MAX_SKILLS=200;
const MAX_SKILL_BYTES=16*1024;
const MAX_DEPTH=2;
const MAX_ANCESTORS=8;

function safeDir(dir){
  try{const st=fs.lstatSync(dir);return st.isDirectory()&&!st.isSymbolicLink()}catch{return false}
}
function safeChain(dir,boundary){
  const target=path.resolve(dir),base=path.resolve(boundary);
  const rel=path.relative(base,target);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))return false;
  let cursor=base;
  if(!safeDir(cursor))return false;
  for(const segment of rel.split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    if(!safeDir(cursor))return false;
  }
  return true;
}
function parseFrontmatter(text){
  if(typeof text!=='string'||!text.startsWith('---\n'))return null;
  const end=text.indexOf('\n---',4);
  if(end<0)return null;
  const fields={};
  for(const line of text.slice(4,end).split(/\r?\n/)){
    const match=line.match(/^(name|description):\s*(.*?)\s*$/);
    if(!match)continue;
    let value=match[2];
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    fields[match[1]]=value;
  }
  if(!fields.name||!fields.description||fields.name.length>128||fields.description.length>1024)return null;
  return {name:fields.name,description:fields.description};
}
function readSkill(dir,source){
  if(!safeDir(dir))return null;
  const file=path.join(dir,'SKILL.md');
  const read=readSafeBytesFile(file,{maxBytes:MAX_SKILL_BYTES,checkParentDir:false});
  if(!read.ok)return null;
  const metadata=parseFrontmatter(read.bytes.toString('utf8'));
  if(!metadata)return null;
  return {...metadata,source};
}
function addRoot(roots,dir,source){
  if(!roots.some(x=>x.path===dir))roots.push({path:dir,source});
}
function workspaceRoots(workspace,home){
  if(typeof workspace!=='string'||!workspace.trim())return [];
  let current=path.resolve(workspace),roots=[];
  for(let i=0;i<MAX_ANCESTORS;i++){
    if(!safeDir(current))break;
    addRoot(roots,path.join(current,'.agents','skills'),'workspace');
    const parent=path.dirname(current);
    if(parent===current||parent===path.resolve(home))break;
    current=parent;
  }
  return roots;
}
function getRoots({host,home,workspace}){
  const roots=workspaceRoots(workspace,home);
  addRoot(roots,path.join(home,'.gemini','config','skills'),'global');
  if(host==='ide')addRoot(roots,path.join(home,'.gemini','antigravity','skills'),'legacy-ide');
  if(host==='cli'){
    addRoot(roots,path.join(home,'.gemini','antigravity-cli','skills'),'cli-only');
    addRoot(roots,path.join(home,'.gemini','skills'),'cli-only');
    const plugins=path.join(home,'.gemini','config','plugins');
    if(safeDir(plugins)){
      try{
        for(const entry of fs.readdirSync(plugins,{withFileTypes:true}).slice(0,100)){
          if(entry.isDirectory()&&!entry.isSymbolicLink())addRoot(roots,path.join(plugins,entry.name,'skills'),'plugin-cli');
        }
      }catch{}
    }
  }
  return roots;
}
function walk(root,source,boundary){
  if(!safeChain(root,boundary))return [];
  const found=[];
  const visit=(dir,depth)=>{
    if(found.length>=MAX_SKILLS||depth>MAX_DEPTH||!safeDir(dir))return;
    const skill=readSkill(dir,source);
    if(skill){found.push(skill);return;}
    let entries;
    try{entries=fs.readdirSync(dir,{withFileTypes:true})}catch{return}
    for(const entry of entries){
      if(found.length>=MAX_SKILLS)break;
      if(entry.isDirectory()&&!entry.isSymbolicLink()&&!entry.name.startsWith('.'))
        visit(path.join(dir,entry.name),depth+1);
    }
  };
  visit(root,0);
  return found;
}
export function discoverSkills({host='ide',home=process.env.HOME||process.env.USERPROFILE||os.homedir(),workspace=null}={}){
  if(!HOSTS.has(host))throw new Error('host must be app, cli, or ide');
  const homeRoot=path.resolve(home);
  const roots=getRoots({host,home:homeRoot,workspace});
  const skills=[],seen=new Set();
  for(const root of roots){
    const boundary=path.parse(path.resolve(root.path)).root;
    for(const skill of walk(root.path,root.source,boundary)){
      const key=skill.name.toLowerCase();
      if(seen.has(key))continue;
      seen.add(key);
      skills.push(skill);
      if(skills.length>=MAX_SKILLS)break;
    }
    if(skills.length>=MAX_SKILLS)break;
  }
  return {host,skills,scanned_roots:roots.filter(x=>safeDir(x.path)).map(x=>({source:x.source,available:true})),limits:{max_skills:MAX_SKILLS,max_skill_bytes:MAX_SKILL_BYTES}};
}
