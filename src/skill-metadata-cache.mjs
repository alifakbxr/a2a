import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const VERSION=1,MAX_ENTRIES=400,MAX_BYTES=256*1024;
const isDir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}catch{return false}};
function privateDir(home,create=false){
 const root=path.resolve(home);if(!isDir(root))return null;
 const config=path.join(root,'.config'),dir=path.join(config,'pilah');
 if(!isDir(config)&&create)try{fs.mkdirSync(config,{mode:0o700})}catch{}
 if(!isDir(config))return null;
 if(!isDir(dir)&&create)try{fs.mkdirSync(dir,{mode:0o700})}catch{}
 if(!isDir(dir))return null;
 try{if(process.platform!=='win32'&&(fs.lstatSync(dir).mode&0o077)!==0)return null}catch{return null}
 return dir;
}
export function loadSkillMetadataCache(home){
 const dir=privateDir(home),file=dir?path.join(dir,'skill-metadata-cache.json'):null,entries=new Map();
 if(!file)return{entries,file:null,dirty:false};let fd;
 try{
  const before=fs.lstatSync(file);
  if(before.isSymbolicLink()||!before.isFile()||before.size>MAX_BYTES||(process.platform!=='win32'&&(before.mode&0o077)!==0))return{entries,file,dirty:false};
  fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  const after=fs.fstatSync(fd);
  if(!after.isFile()||after.dev!==before.dev||after.ino!==before.ino||after.size>MAX_BYTES)return{entries,file,dirty:false};
  const v=JSON.parse(fs.readFileSync(fd,'utf8'));
  if(v?.version!==VERSION||!v.entries||typeof v.entries!=='object'||Array.isArray(v.entries))return{entries,file,dirty:false};
  for(const[k,x]of Object.entries(v.entries)){
   if(k.length<=4096&&typeof x?.signature==='string'&&x.signature.length<=256&&typeof x.metadata?.name==='string'&&typeof x.metadata?.description==='string'){
    entries.set(k,{signature:x.signature,metadata:{name:x.metadata.name,description:x.metadata.description}});
    if(entries.size>=MAX_ENTRIES)break;
   }
  }
 }catch{}finally{if(fd!==undefined)try{fs.closeSync(fd)}catch{}}
 return{entries,file,dirty:false};
}
export function saveSkillMetadataCache(cache,home){
 if(!cache?.dirty)return true;const dir=privateDir(home,true);if(!dir)return false;
 const file=path.join(dir,'skill-metadata-cache.json');
 try{const s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile())return false}catch(e){if(e.code!=='ENOENT')return false}
 const content=JSON.stringify({version:VERSION,entries:Object.fromEntries([...cache.entries].slice(-MAX_ENTRIES))});
 if(Buffer.byteLength(content)>MAX_BYTES)return false;
 const temp=path.join(dir,'.skill-cache-'+crypto.randomUUID()+'.tmp');let fd;
 try{
  fd=fs.openSync(temp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0),0o600);
  fs.writeFileSync(fd,content);fs.closeSync(fd);fd=undefined;try{fs.renameSync(temp,file)}catch(error){if(process.platform!=='win32')throw error;fs.rmSync(file,{force:true});fs.renameSync(temp,file)}cache.file=file;cache.dirty=false;return true;
 }catch{return false}finally{if(fd!==undefined)try{fs.closeSync(fd)}catch{}try{fs.unlinkSync(temp)}catch{}}
}