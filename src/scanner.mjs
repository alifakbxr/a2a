import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256, MAX_INDEX_FILES, MAX_SOURCE_BYTES,shouldIgnore,safeFile} from './security.mjs';

const langMap={'.js':'javascript','.mjs':'javascript','.cjs':'javascript','.jsx':'javascript','.ts':'typescript','.tsx':'typescript','.php':'php','.py':'python','.go':'go','.rs':'rust','.java':'java','.kt':'kotlin','.kts':'kotlin','.dart':'dart','.swift':'swift','.cs':'csharp','.gd':'gdscript','.c':'c','.h':'c','.cpp':'cpp','.hpp':'cpp','.cc':'cpp','.rb':'ruby','.ex':'elixir','.exs':'elixir','.vue':'vue','.svelte':'svelte','.html':'html','.css':'css','.scss':'scss','.sql':'sql','.json':'json','.yaml':'yaml','.yml':'yaml','.toml':'toml','.xml':'xml','.sh':'shell'};
const manifestName=/^(package\.json|composer\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|Cargo\.toml|pom\.xml|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|pubspec\.yaml|project\.godot|CMakeLists\.txt|Makefile|[^/]+\.csproj|[^/]+\.sln|Package\.swift|Gemfile|mix\.exs)$/;
const textName=/\.(?:js|jsx|ts|tsx|mjs|cjs|php|py|go|rs|java|kt|kts|dart|swift|cs|gd|c|h|cpp|hpp|cc|rb|ex|exs|vue|svelte|html|css|scss|sql|json|yaml|yml|toml|xml|sh)$/i;
const testFile=/(?:^|\/)(?:tests?|specs?|__tests__)(?:\/|$)|(?:\.test\.|\.spec\.|_test\.|_spec\.|Test\.(?:java|kt|cs|php)$)/i;
export const detectLanguage=rel=>langMap[path.extname(rel).toLowerCase()]||(manifestName.test(path.basename(rel))?'config':'unknown');
export const isTestFile=rel=>testFile.test(rel);
export function gitHead(root){const p=spawnSync('git',['rev-parse','HEAD'],{cwd:root,timeout:1500,encoding:'utf8',windowsHide:true});return p.status===0?p.stdout.trim():null}
export function gitChanges(root){
  const p=spawnSync('git',['status','--porcelain=v1','-z','--untracked-files=normal'],{cwd:root,timeout:4000,encoding:'utf8',windowsHide:true});
  if(p.status!==0) return [];
  const parts=p.stdout.split('\0').filter(Boolean),out=[];
  for(let i=0;i<parts.length;i++){let s=parts[i]; if(s.length<4)continue;const status=s.slice(0,2);let rel=s.slice(3);if(/[RC]/.test(status)){const next=parts[++i];if(next)rel=next}
    if(rel && !shouldIgnore(rel))out.push(rel.replaceAll('\\','/'));
  }
  return [...new Set(out)].sort().slice(0,500);
}
export function discover(root,{limit=MAX_INDEX_FILES}={}){
  const paths=[],skip=[],stack=[''];let scanned=0,totalBytes=0;
  while(stack.length){const dir=stack.pop();let entries;try{entries=fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))}catch{continue}
    for(const ent of entries){const rel=(dir?dir+'/':'')+ent.name;
      if(shouldIgnore(rel)||ent.isSymbolicLink())continue;
      if(ent.isDirectory()){stack.push(rel);continue}
      if(!ent.isFile() || !(textName.test(rel)||manifestName.test(ent.name)))continue;
      scanned++;if(scanned>limit){skip.push('index_limit_exceeded');stack.length=0;break}
      try{const full=safeFile(root,rel);const st=fs.statSync(full);if(st.size>MAX_SOURCE_BYTES){skip.push('large:'+rel);continue}
        if(totalBytes+st.size>32*1024*1024){skip.push('index_byte_budget_exceeded');stack.length=0;break}
        const buf=fs.readFileSync(full);totalBytes+=st.size;if(buf.includes(0)){skip.push('binary:'+rel);continue}
        paths.push({path:rel,hash:sha256(buf),language:detectLanguage(rel),bytes:st.size,text:buf.toString('utf8')});
      }catch{skip.push('unreadable:'+rel)}
    }
  }
  paths.sort((a,b)=>a.path.localeCompare(b.path));return {files:paths,skipped:skip};
}
const symbolPatterns=[
 /\b(?:export\s+)?(?:async\s+)?(?:function|class|interface|enum|type|trait|struct|mod)\s+([A-Za-z_$][\w$]*)/g,
 /\b(?:def|class)\s+([A-Za-z_][\w]*)/g,
 /\b(?:pub\s+)?(?:async\s+)?(?:fn|struct|trait|enum)\s+([A-Za-z_][\w]*)/g,
 /\b(?:public|private|protected|internal)?\s*(?:static\s+)?(?:class|interface|record)\s+([A-Za-z_][\w]*)/g
];
function extractSymbols(text){let results=[];for(const re of symbolPatterns){re.lastIndex=0;let m;while((m=re.exec(text))!==null && results.length<150){const line=1+(text.slice(0,m.index).match(/\n/g)||[]).length;results.push({name:m[1],line});}}
  return [...new Map(results.map(s=>[s.name+'@'+s.line,s])).values()].sort((a,b)=>a.line-b.line).slice(0,150);
}
function importsFrom(text,language){let matches=[];const patterns=[
 /\b(?:import\s+(?:[^'"\n]+?\s+from\s+)?|export\s+[^'"\n]*?from\s+|require\s*\(\s*|import\s*\(\s*)['"]([^'"\n]+)['"]/g,
 /\b(?:include|include_once|require|require_once)\s*\(?\s*['"]([^'"\n]+)['"]/g,
 /\b(?:include|import|preload)\s*\(?\s*['"](res:\/\/[^'"\n]+)['"]/g,
 /\b(?:mod|use)\s+([A-Za-z_][\w:]*)/g,
 /#include\s+["<]([^">]+)[">]/g
];
  for(const re of patterns){let m;re.lastIndex=0;while((m=re.exec(text))!==null && matches.length<120)matches.push(m[1]);}
  if(language==='python'){
    const re=/^\s*from\s+(\.*[A-Za-z_][\w.]*)\s+import\s+/gm;let m;while((m=re.exec(text))!==null)matches.push(m[1]);
  }
  return [...new Set(matches)];
}
function resolveImport(rel,imp,known){
  if(imp.startsWith('res://'))imp=imp.slice(6);
  else if(imp.startsWith('.'))imp=path.posix.normalize(path.posix.join(path.posix.dirname(rel),imp));
  else return null;
  if(imp.startsWith('..')||imp.startsWith('/')||imp==='.')return null;
  const candidates=[imp,...['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.php','.gd','.json','.vue','.svelte','.h','.hpp','.rs'].map(s=>imp+s),...['index.ts','index.js','__init__.py','mod.rs'].map(s=>imp+'/'+s)];
  return candidates.find(s=>known.has(s))||null;
}
function featureOf(rel){let n=path.basename(rel).replace(/\.(test|spec|unit|integration)\b/ig,'').replace(/(_test|_spec|Test)\b/g,'').replace(/\.[^.]+$/,'');return n.toLowerCase().replace(/(controller|service|component|handler|model|repository|screen|page|view|store|routes|route)$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'root'}
export function createGraph(index){
  let files=index.files,nodes=[],edges=[],byPath=new Map(files.map(f=>[f.path,f])),featIds=new Map();const known=new Set(byPath.keys());
  const addEdge=(from,to,kind,basis='source',state='observed',file=null)=>{const id=sha256(from+'|'+to+'|'+kind).slice(0,36);edges.push({id,from,to,kind,basis,state,file})};
  for(const f of files){const fid='file:'+f.path;nodes.push({id:fid,kind:isTestFile(f.path)?'test':'file',label:f.path,path:f.path,basis:'source'});
    if(manifestName.test(path.basename(f.path)))continue;
    const feature=featureOf(f.path);let ftid='feature:'+feature;
    if(!featIds.has(ftid)){featIds.set(ftid,true);nodes.push({id:ftid,kind:'feature',label:feature,basis:'derived'})}
    addEdge(fid,ftid,'CONTRIBUTES_TO','filename-derived','derived',f.path);
    for(const sym of extractSymbols(f.text)){const sid='symbol:'+f.path+':'+sym.name+':'+sym.line;nodes.push({id:sid,kind:'symbol',label:sym.name,path:f.path,line:sym.line,basis:'source'});addEdge(fid,sid,'DECLARES','source','observed',f.path)}
    for(const imp of importsFrom(f.text,f.language)){const target=resolveImport(f.path,imp,known);if(target)addEdge(fid,'file:'+target,'IMPORTS','static-import','observed',f.path)}
  }
  for(const f of files.filter(x=>isTestFile(x.path))){const key=featureOf(f.path);const targets=files.filter(x=>!isTestFile(x.path)&&featureOf(x.path)===key);
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
export function discoverTestCommands(index){const names=new Set(index.files.map(f=>path.basename(f.path)));const suggestions=[];
  for(const k of knownScripts){if(!k.files.some(x=>names.has(x)) && !(k.ecosystem==='dotnet' && [...names].some(n=>/\.(csproj|sln)$/.test(n))))continue;
    const cmds=(k.ecosystem==='node')?(()=>{try{const pkg=index.files.find(f=>f.path==='package.json');if(!pkg)return [];const parsed=JSON.parse(pkg.text);return ['test','lint','typecheck','check','build'].filter(c=>typeof parsed.scripts?.[c]==='string').map(c=>'npm run '+c)}catch{return []}})():k.runners;
    suggestions.push({ecosystem:k.ecosystem,candidates:cmds,execution:'native-antigravity-only',confirmed:false});
  }
  const testFiles=index.files.filter(f=>isTestFile(f.path)).map(f=>f.path).slice(0,100);
  return {suggestions,testFiles,note:'Commands are candidates, not audited safe. Run only with Antigravity native permissions, after inspecting scripts.'};
}
export function snapshotOf(index){return sha256(index.files.map(f=>f.path+':'+f.hash).join('\n'))}
