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
 if(!file)return{entries,file:null,dirty:false,valid:false};let fd;
 try{
  const before=fs.lstatSync(file);
  if(before.isSymbolicLink()||!before.isFile()||before.size>MAX_BYTES||(process.platform!=='win32'&&(before.mode&0o077)!==0))return{entries,file,dirty:false,valid:false};
  fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  const after=fs.fstatSync(fd);
  if(!after.isFile()||after.dev!==before.dev||after.ino!==before.ino||after.size>MAX_BYTES)return{entries,file,dirty:false,valid:false};
  const value=JSON.parse(fs.readFileSync(fd,'utf8'));
  if(value?.version!==VERSION||!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries))return{entries,file,dirty:false,valid:false};
  for(const[key,item]of Object.entries(value.entries)){
   if(key.length<=4096&&typeof item?.signature==='string'&&item.signature.length<=256&&typeof item.metadata?.name==='string'&&typeof item.metadata?.description==='string'){
    entries.set(key,{signature:item.signature,metadata:{name:item.metadata.name,description:item.metadata.description,...(item.metadata.disableModelInvocation===true?{disableModelInvocation:true}:{})}});
    if(entries.size>=MAX_ENTRIES)break;
   }
  }
  return{entries,file,dirty:false,valid:true};
 }catch(error){return{entries,file,dirty:false,valid:false}}
 finally{if(fd!==undefined)try{fs.closeSync(fd)}catch{}}
}
export function saveSkillMetadataCache(cache,home){
 if(!cache?.dirty)return cache?.valid===true;
 const dir=privateDir(home,true);if(!dir)return false;
 const file=path.join(dir,'skill-metadata-cache.json');
 try{const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile())return false}catch(error){if(error.code!=='ENOENT')return false}
 const content=JSON.stringify({version:VERSION,entries:Object.fromEntries([...cache.entries].slice(-MAX_ENTRIES))});
 if(Buffer.byteLength(content)>MAX_BYTES)return false;
 const temp=path.join(dir,'.skill-cache-'+crypto.randomUUID()+'.tmp');let fd;
 try{
  fd=fs.openSync(temp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0),0o600);
  fs.writeFileSync(fd,content);fs.closeSync(fd);fd=undefined;
  try{fs.renameSync(temp,file)}catch(error){if(process.platform!=='win32')throw error;fs.rmSync(file,{force:true});fs.renameSync(temp,file)}
  cache.file=file;cache.dirty=false;cache.valid=true;return true;
 }catch{return false}
 finally{if(fd!==undefined)try{fs.closeSync(fd)}catch{}try{fs.unlinkSync(temp)}catch{}}
}