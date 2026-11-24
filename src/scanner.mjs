import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256, MAX_INDEX_FILES, MAX_SOURCE_BYTES,shouldIgnore,safeFile} from './security.mjs';
import {stripCommentsLex} from './tokens.mjs';

const langMap={'.js':'javascript','.mjs':'javascript','.cjs':'javascript','.jsx':'javascript','.ts':'typescript','.tsx':'typescript','.mts':'typescript','.cts':'typescript','.php':'php','.py':'python','.go':'go','.rs':'rust','.java':'java','.kt':'kotlin','.kts':'kotlin','.dart':'dart','.swift':'swift','.cs':'csharp','.gd':'gdscript','.c':'c','.h':'c','.cpp':'cpp','.hpp':'cpp','.cc':'cpp','.rb':'ruby','.ex':'elixir','.exs':'elixir','.vue':'vue','.svelte':'svelte','.html':'html','.css':'css','.scss':'scss','.sql':'sql','.json':'json','.yaml':'yaml','.yml':'yaml','.toml':'toml','.xml':'xml','.sh':'shell'};
const manifestName=/^(package\.json|composer\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|Cargo\.toml|pom\.xml|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|pubspec\.yaml|project\.godot|CMakeLists\.txt|Makefile|[^/]+\.csproj|[^/]+\.sln|Package\.swift|Gemfile|mix\.exs)$/;
const textName=/\.(?:js|jsx|ts|tsx|mts|cts|mjs|cjs|php|py|go|rs|java|kt|kts|dart|swift|cs|gd|c|h|cpp|hpp|cc|rb|ex|exs|vue|svelte|html|css|scss|sql|json|yaml|yml|toml|xml|sh)$/i;
const testFile=/(?:^|\/)(?:tests?|specs?|__tests__)(?:\/|$)|(?:\.test\.|\.spec\.|_test\.|_spec\.|Test\.(?:java|kt|cs|php)$)/i;
export const detectLanguage=rel=>langMap[path.extname(rel).toLowerCase()]||(manifestName.test(path.basename(rel))?'config':'unknown');
export const isTestFile=rel=>testFile.test(rel);
// Generated A2A reports are evidence, not application source. Restrict this
// exclusion to report directories AND recognized report shapes; ordinary JSON,
// including application configuration, must still affect the source revision.
export function isGeneratedA2AReport(rel,content){
  if(!/(^|\/)(?:reports?|test-results)\/[^/]+\.json$/i.test(String(rel||'').replaceAll('\\','/')))return false;
  try{
    const x=JSON.parse(String(content));
    if(!x||typeof x!=='object'||Array.isArray(x))return false;
    if(x.schema==='a2a-browser-evidence-v1'&&typeof x.source?.revision==='string')return true;
    if(typeof x.revision==='string'&&Array.isArray(x.claims)&&x.claims.length>0)return true;
    if(typeof x.revision==='string'&&x.evaluator&&Array.isArray(x.scenarios))return true;
    return x.format==='a2a-test-report-v1'&&Array.isArray(x.cases)&&x.completed===true;
  }catch{return false}
}

export function gitHead(root){const p=spawnSync('git',['rev-parse','HEAD'],{cwd:root,timeout:1500,encoding:'utf8',windowsHide:true});return p.status===0?p.stdout.trim():null}
export function gitChanges(root){
  // git status may execute a repository-configured fsmonitor hook unless explicitly disabled.
  // A2A only inspects source; repository trust must never imply permission to run hooks.
  const p=spawnSync('git',['-c','core.fsmonitor=false','status','--porcelain=v1','-z','--untracked-files=normal'],{cwd:root,timeout:4000,encoding:'utf8',windowsHide:true});
  if(p.status!==0) return [];
  const parts=p.stdout.split('\0'),out=[];
  for(let i=0;i<parts.length;i++){
    const s=parts[i];
    if(!s||s.length<4)continue;
    const status=s.slice(0,2);
    const rel=s.slice(3);
    if(/[RC]/.test(status)) i++;
    if(rel && !shouldIgnore(rel))out.push(rel.replaceAll('\\','/'));
  }
  return [...new Set(out)].sort().slice(0,500);
}
// Hash moderately oversized first-party files without parsing them. Larger or
// unreadable sources make verification explicitly incomplete instead of stale-PASS.
function fingerprintOversizedSource(full,size){
 if(size>32*1024*1024)return null;
 const fd=fs.openSync(full,'r'),buffer=Buffer.allocUnsafe(65536),hash=crypto.createHash('sha256');
 try{
  let position=0;
  while(position<size){
   const n=fs.readSync(fd,buffer,0,Math.min(buffer.length,size-position),position);
   if(n<=0)return null;
   hash.update(buffer.subarray(0,n));position+=n;
  }
  if(fs.fstatSync(fd).size!==size)return null;
  return hash.digest('hex');
 }finally{fs.closeSync(fd)}
}

export function discover(root,{limit=MAX_INDEX_FILES,cachedFiles=null}={}){
  const paths=[],skip=[],skippedHashes=[],stack=[''];let scanned=0,totalBytes=0,integrityComplete=true,readFiles=0,readBytes=0,reusedFiles=0,oversizedHashedBytes=0;const now=Date.now();
  while(stack.length){const dir=stack.pop();let entries;try{entries=fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))}catch{continue}
    for(const ent of entries){const rel=(dir?dir+'/':'')+ent.name;
      if(shouldIgnore(rel)||ent.isSymbolicLink())continue;
      if(ent.isDirectory()){stack.push(rel);continue}
      if(!ent.isFile() || !(textName.test(rel)||manifestName.test(ent.name)))continue;
      scanned++;if(scanned>limit){skip.push('index_limit_exceeded');integrityComplete=false;stack.length=0;break}
      try{const full=safeFile(root,rel);const st=fs.statSync(full);if(st.size>MAX_SOURCE_BYTES){
          skip.push('large:'+rel);
          const digest=fingerprintOversizedSource(full,st.size);
          if(digest){skippedHashes.push(rel+':'+digest);oversizedHashedBytes+=st.size;}else integrityComplete=false;
          continue;
        }
        if(totalBytes+st.size>32*1024*1024){skip.push('index_byte_budget_exceeded');integrityComplete=false;stack.length=0;break}
        const cached=cachedFiles?.get(rel);
        if(cached && ent.name!=='package.json' && !/(^|\/)(?:reports?|test-results)\/[^/]+\.json$/i.test(rel) && cached.mtime_ms!=null && cached.mtime_ms===st.mtimeMs && cached.bytes===st.size && (now-st.mtimeMs)>1500){
          totalBytes+=st.size;reusedFiles++;
          paths.push({path:rel,hash:cached.hash,language:cached.language||detectLanguage(rel),bytes:st.size,mtime_ms:st.mtimeMs,text:null});
          continue;
        }
        const buf=fs.readFileSync(full);readFiles++;readBytes+=buf.length;totalBytes+=st.size;if(buf.includes(0)){skip.push('binary:'+rel);skippedHashes.push(rel+':'+sha256(buf));continue}
        if(isGeneratedA2AReport(rel,buf))continue;
        paths.push({path:rel,hash:sha256(buf),language:detectLanguage(rel),bytes:st.size,mtime_ms:st.mtimeMs,text:buf.toString('utf8')});
      }catch{skip.push('unreadable:'+rel);integrityComplete=false}
    }
  }
  paths.sort((a,b)=>a.path.localeCompare(b.path));return {files:paths,skipped:skip,skippedHashes,integrityComplete,scan_stats:{read_files:readFiles,read_bytes:readBytes,reused_files:reusedFiles,oversized_hashed_bytes:oversizedHashedBytes,scanned_candidates:scanned}};
}
function buildLineStarts(text){
  const starts=[0];
  for(let i=0;i<text.length;i++)if(text.charCodeAt(i)===10)starts.push(i+1);
  return starts;
}
function lineAt(starts,offset){
  let lo=0,hi=starts.length-1;
  while(lo<=hi){
    const mid=(lo+hi)>>>1;
    if(starts[mid]<=offset)lo=mid+1;else hi=mid-1;
  }
  return hi+1;
}
const symbolPatterns=[
 /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|interface|enum|type|trait|struct|mod)\s+([A-Za-z_$][\w$]*)/g,
 /\b(?:def|class)\s+([A-Za-z_][\w]*)/g,
 /\b(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:fn|struct|trait|enum)\s+([A-Za-z_][\w]*)/g,
 /\bfunc\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)\s*\(/g,
 /\btype\s+([A-Za-z_][\w]*)\s+(?:struct|interface)\b/g,
 /\b(?:public|private|protected|internal|open|override|static|final|suspend|async)?\s*(?:fun|func|class|interface|record|struct|enum|protocol)\s+([A-Za-z_][\w]*)/g
];
export function extractSymbols(text,ext=''){
  if(!text)return [];
  const cleaned=stripCommentsLex(text,ext,{preserveLines:true});
  const starts=buildLineStarts(cleaned);
  const results=[];
  for(const re of symbolPatterns){
    re.lastIndex=0;
    let m,count=0;
    while((m=re.exec(cleaned))!==null && count<60){
      results.push({name:m[1],line:lineAt(starts,m.index)});
      count++;
    }
  }
  return [...new Map(results.map(s=>[s.name+'@'+s.line,s])).values()].sort((a,b)=>a.line-b.line).slice(0,150);
}
function importsFrom(text,language,ext=''){
  if(!text)return [];
  const cleaned=stripCommentsLex(text,ext,{preserveLines:true});
  let matches=[];
  const patterns=[
   /\b(?:import\s+(?:[^'"\n]+?\s+from\s+)?|export\s+[^'"\n]*?from\s+|require\s*\(\s*|import\s*\(\s*)['"]([^'"\n]+)['"]/g,
   /\b(?:include|include_once|require|require_once)\s*\(?\s*['"]([^'"\n]+)['"]/g,
   /\b(?:include|import|preload)\s*\(?\s*['"](res:\/\/[^'"\n]+)['"]/g,
   /\b(?:mod|use)\s+([A-Za-z_][\w:]*)/g,
   /#include\s+["<]([^">]+)[">]/g
  ];
  for(const re of patterns){let m;re.lastIndex=0;while((m=re.exec(cleaned))!==null && matches.length<120)matches.push(m[1]);}
  if(language==='python'){
    const re=/^\s*from\s+(\.*[A-Za-z_][\w.]*)\s+import\s+/gm;let m;while((m=re.exec(cleaned))!==null)matches.push(m[1]);
    const direct=/^\s*import\s+([A-Za-z_][\w.]*)/gm;while((m=direct.exec(cleaned))!==null)matches.push(m[1]);
  }
  if(language==='php'){
    // Explicit, static imports only. Runtime container resolution and Laravel
    // facades are intentionally out of scope.
    const re=/^\s*use\s+(?!function\b|const\b)([A-Za-z_][\w\\]*)(?:\s+as\s+\w+)?\s*;/gm;
    let m;while((m=re.exec(cleaned))!==null && matches.length<120)matches.push(m[1]);
  }
  return [...new Set(matches)];
}
function localConfigAliases(files){
  const php=[],js=[];
  const resolveDir=(folder,dir)=>{
    if(typeof dir!=='string'||dir.startsWith('/')||dir.includes('\\')||dir.split('/').includes('..'))return null;
    const combined=path.posix.normalize(path.posix.join(folder,dir));
    return combined==='..'||combined.startsWith('../')||combined.startsWith('/')?null:combined;
  };
  for(const f of files){
    if(!f.text||!/(^|\/)(?:composer|tsconfig|jsconfig)\.json$/.test(f.path))continue;
    let data;try{data=JSON.parse(f.text)}catch{continue}
    const folder=path.posix.dirname(f.path)==='.'?'':path.posix.dirname(f.path);
    if(path.posix.basename(f.path)==='composer.json'){
      for(const mapping of [data?.autoload?.['psr-4'],data?.['autoload-dev']?.['psr-4']]){
        if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))continue;
        for(const [prefix,dirs] of Object.entries(mapping).slice(0,100)){
          if(!prefix.endsWith('\\')||prefix.length>100)continue;
          for(const dir of (Array.isArray(dirs)?dirs:[dirs]).slice(0,8)){
            const target=resolveDir(folder,dir);
            if(target!==null)php.push({prefix,target});
          }
        }
      }
    }else{
      const compiler=data?.compilerOptions;
      if(!compiler||typeof compiler!=='object'||Array.isArray(compiler))continue;
      const base=resolveDir(folder,typeof compiler.baseUrl==='string'?compiler.baseUrl:'.');
      if(base===null)continue;
      const entries=compiler.paths;
      if(!entries||typeof entries!=='object'||Array.isArray(entries))continue;
      for(const [prefix,targets] of Object.entries(entries).slice(0,100)){
        if(!prefix.endsWith('/*')||prefix.length>80||!Array.isArray(targets))continue;
        for(const target of targets.slice(0,8)){
          if(typeof target!=='string'||!target.endsWith('/*'))continue;
          const dir=resolveDir(base,target.slice(0,-2));
          if(dir!==null)js.push({prefix:prefix.slice(0,-1),target:dir});
        }
      }
    }
  }
  php.sort((a,b)=>b.prefix.length-a.prefix.length);
  js.sort((a,b)=>b.prefix.length-a.prefix.length);
  return {php,js};
}
function resolveImport(rel,imp,known,language,aliases){

  if(language==='python'){
    const dots=imp.match(/^\.+/);
    if(dots){
      let dir=path.posix.dirname(rel);
      for(let n=1;n<dots[0].length;n++)dir=path.posix.dirname(dir);
      const member=imp.slice(dots[0].length).replaceAll('.','/');
      imp=path.posix.normalize(path.posix.join(dir,member));
    }else imp=imp.replaceAll('.','/');
    if(!imp||imp==='.'||imp.startsWith('..')||imp.startsWith('/'))return null;
  }
  else if(language==='php' && imp.includes('\\')){
    let mapped=null;
    for(const rule of aliases.php){
      if(!imp.startsWith(rule.prefix))continue;
      const remainder=imp.slice(rule.prefix.length).replaceAll('\\','/');
      if(!remainder||remainder.split('/').some(x=>!x||x==='..'||x==='.'))continue;
      mapped=path.posix.join(rule.target,remainder+'.php');
      break;
    }
    if(!mapped)return null;
    imp=mapped;
  }
  else if(['javascript','typescript','vue','svelte'].includes(language)&&!imp.startsWith('.')&&!imp.startsWith('res://')){
    let mapped=null;
    for(const rule of aliases.js){
      if(!imp.startsWith(rule.prefix))continue;
      const remainder=imp.slice(rule.prefix.length);
      if(!remainder||remainder.split('/').some(x=>!x||x==='..'||x==='.'))continue;
      mapped=path.posix.join(rule.target,remainder);
      break;
    }
    if(!mapped)return null;
    imp=mapped;
  }
  else if(imp.startsWith('res://'))imp=imp.slice(6);
  else if(imp.startsWith('.'))imp=path.posix.normalize(path.posix.join(path.posix.dirname(rel),imp));
  else return null;
  if(imp.startsWith('..')||imp.startsWith('/')||imp==='.')return null;
  const candidates=[imp];
  if(!known.has(imp)){
    if(imp.endsWith('.js'))candidates.push(imp.slice(0,-3)+'.ts',imp.slice(0,-3)+'.tsx',imp.slice(0,-3)+'.mts');
    else if(imp.endsWith('.jsx'))candidates.push(imp.slice(0,-4)+'.tsx');
    else if(imp.endsWith('.mjs'))candidates.push(imp.slice(0,-4)+'.mts');
    else if(imp.endsWith('.cjs'))candidates.push(imp.slice(0,-4)+'.cts');
  }
  // Python src-layout packages (e.g. src/pkg/mod.py) are resolved only
  // when the exact indexed file exists; never synthesize external dependencies.
  if(language==='python' && !imp.startsWith('src/')){
    candidates.push('src/'+imp+'.py','src/'+imp+'/__init__.py');
  }
  candidates.push(
    ...['.ts','.tsx','.mts','.cts','.js','.jsx','.mjs','.cjs','.py','.php','.gd','.json','.vue','.svelte','.h','.hpp','.rs'].map(s=>imp+s),
    ...['index.ts','index.tsx','index.mts','index.js','index.mjs','__init__.py','mod.rs'].map(s=>imp+'/'+s)
  );
  return candidates.find(s=>known.has(s))||null;
}
function featureOf(rel){let n=path.basename(rel).replace(/\.(test|spec|unit|integration)\b/ig,'').replace(/(_test|_spec|Test)\b/g,'').replace(/\.[^.]+$/,'');return n.toLowerCase().replace(/(controller|service|component|handler|model|repository|screen|page|view|store|routes|route)$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'root'}
export function createGraph(index){
  let files=index.files,nodes=[],edges=[],byPath=new Map(files.map(f=>[f.path,f])),featIds=new Map();const known=new Set(byPath.keys());
  const nonTestByFeature=new Map(),configured=localConfigAliases(files);
  const addEdge=(from,to,kind,basis='source',state='observed',file=null)=>{const id=sha256(from+'|'+to+'|'+kind).slice(0,36);edges.push({id,from,to,kind,basis,state,file})};
  for(const f of files){const fid='file:'+f.path;const isTest=isTestFile(f.path);nodes.push({id:fid,kind:isTest?'test':'file',label:f.path,path:f.path,basis:'source'});
    if(manifestName.test(path.basename(f.path)))continue;
    const feature=featureOf(f.path);let ftid='feature:'+feature;
    if(!featIds.has(ftid)){featIds.set(ftid,true);nodes.push({id:ftid,kind:'feature',label:feature,basis:'derived'})}
    addEdge(fid,ftid,'CONTRIBUTES_TO','filename-derived','derived',f.path);
    if(!isTest){
      if(!nonTestByFeature.has(feature))nonTestByFeature.set(feature,[]);
      nonTestByFeature.get(feature).push(f);
    }
    const ext=path.extname(f.path);
    for(const sym of extractSymbols(f.text,ext)){const sid='symbol:'+f.path+':'+sym.name+':'+sym.line;nodes.push({id:sid,kind:'symbol',label:sym.name,path:f.path,line:sym.line,basis:'source'});addEdge(fid,sid,'DECLARES','source','observed',f.path)}
    for(const imp of importsFrom(f.text,f.language,ext)){const target=resolveImport(f.path,imp,known,f.language,configured);if(target)addEdge(fid,'file:'+target,'IMPORTS','static-import','observed',f.path)}
  }
  for(const f of files){
    if(!isTestFile(f.path))continue;
    const targets=nonTestByFeature.get(featureOf(f.path))||[];
    for(const target of targets.slice(0,12))addEdge('file:'+f.path,'file:'+target.path,'MAY_TEST','naming-heuristic','derived',f.path);
  }
  return {nodes,edges:[...new Map(edges.map(x=>[x.id,x])).values()]};
}
const knownScripts=[
 {files:['package.json'],match:/"(?:test|lint|typecheck|check|build)"\s*:/,ecosystem:'node',runners:['npm run test','npm run lint','npm run build']},
 {files:['composer.json'],ecosystem:'php',runners:['vendor/bin/phpunit','vendor/bin/pest']},
 {files:['pyproject.toml','pytest.ini'],ecosystem:'python',runners:['python -m pytest']},
 {files:['go.mod'],ecosystem:'go',runners:['go test ./...']},
 {files:['Cargo.toml'],ecosystem:'rust',runners:['cargo test']},
 {files:['pubspec.yaml'],ecosystem:'dart',runners:['flutter test','dart test']},
 {files:['project.godot'],ecosystem:'godot',runners:['godot --headless --path . --quit']},
 {files:['pom.xml'],ecosystem:'java',runners:['mvn test']},
 {files:['build.gradle','build.gradle.kts'],ecosystem:'gradle',runners:['./gradlew test']},
 {files:['Package.swift'],ecosystem:'swift',runners:['swift test']},
 {files:['App.csproj','App.sln'],ecosystem:'dotnet',runners:['dotnet test']},
 {files:['CMakeLists.txt'],ecosystem:'cmake',runners:['ctest --output-on-failure']},
];
export function discoverTestCommands(index,root=null){const names=new Set(index.files.map(f=>path.basename(f.path)));const suggestions=[];
  for(const k of knownScripts){if(!k.files.some(x=>names.has(x)) && !(k.ecosystem==='dotnet' && [...names].some(n=>/\.(csproj|sln)$/.test(n))))continue;
    const cmds=(k.ecosystem==='node')?(()=>{try{const pkg=index.files.find(f=>f.path==='package.json');if(!pkg)return [];const raw=pkg.text??(root?fs.readFileSync(safeFile(root,'package.json'),'utf8'):null);if(!raw)return [];const parsed=JSON.parse(raw);return ['test','lint','typecheck','check','build'].filter(c=>typeof parsed.scripts?.[c]==='string').map(c=>'npm run '+c)}catch{return []}})():k.runners;
    suggestions.push({ecosystem:k.ecosystem,candidates:cmds,execution:'native-antigravity-only',confirmed:false});
  }
  const testFiles=index.files.filter(f=>isTestFile(f.path)).map(f=>f.path).slice(0,100);
  return {suggestions,testFiles,note:'Commands are candidates, not audited safe. Run only with Antigravity native permissions, after inspecting scripts.'};
}
export function snapshotOf(index){return sha256([...index.files.map(f=>f.path+':'+f.hash),...(index.skippedHashes||[]),index.integrityComplete===false?'source-integrity-incomplete':'source-integrity-complete'].sort().join('\n'))}
