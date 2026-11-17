import {sha256,isSafeRelative,shouldIgnore} from './security.mjs';
import {gitChanges} from './scanner.mjs';

const uniq=xs=>[...new Set(xs)];
const isSensitiveFeature=s=>/(auth|login|session|payment|checkout|security|permission|access|transaction|migration|database|crypto|billing|order|credential)/i.test(s);
export const normalizeRelPath=rel=>String(rel||'').replaceAll('\\','/').replace(/^(?:\.\/)+/,'');

function batchedSelect(store,sqlPrefix,wsId,ids,sqlSuffix=''){
  const out=[];
  for(let i=0;i<ids.length;i+=100){
    const chunk=ids.slice(i,i+100);
    if(!chunk.length)continue;
    const placeholders=chunk.map(()=>'?').join(',');
    out.push(...store.all(`${sqlPrefix}(${placeholders})${sqlSuffix}`,wsId,...chunk));
  }
  return out;
}

export function contextQuery(store,wsId,{query='',limit=12}={}){
  const q=String(query).trim().slice(0,160).toLowerCase();const n=Math.max(1,Math.min(40,Number(limit)||12));
  let nodes;
  if(q) nodes=store.all('SELECT * FROM nodes WHERE workspace_id=? AND (LOWER(label) LIKE ? OR LOWER(file_path) LIKE ?) ORDER BY CASE WHEN LOWER(label)=? THEN 0 ELSE 1 END,kind LIMIT ?',wsId,'%'+q.replace(/[%_]/g,'')+'%','%'+q.replace(/[%_]/g,'')+'%',q,n);
  else nodes=store.all("SELECT * FROM nodes WHERE workspace_id=? AND kind IN ('feature','test') ORDER BY kind,label LIMIT ?",wsId,n);
  const queryIds=nodes.slice(0,15).map(x=>x.id);
  const relationships=[];
  if(queryIds.length){
    const ph=queryIds.map(()=>'?').join(',');
    const edges=store.all(`SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND (source IN (${ph}) OR target IN (${ph})) ORDER BY CASE kind WHEN 'IMPORTS' THEN 0 WHEN 'MAY_TEST' THEN 1 WHEN 'CONTRIBUTES_TO' THEN 2 ELSE 3 END LIMIT 120`,wsId,...queryIds,...queryIds);
    relationships.push(...edges);
  }
  return {nodes:nodes.map(({id,kind,label,file_path,line,basis})=>({id,kind,label,file:file_path,line,basis})),relations:[...new Map(relationships.map(e=>[e.source+'|'+e.target+'|'+e.kind,e])).values()].slice(0,80),uncertainty:['Static discovery is not full behavioral or runtime dependency coverage.']};
}

// Suggestions only: filename proximity does not prove that a test exercises a path.
export function rankFallbackTests(changed,available,limit=5){
  const stems=changed.map(p=>p.split('/').at(-1).replace(/\.[^.]+$/,'').replace(/(?:Service|Controller|Repository|Request|Model)$/,'').toLowerCase()).filter(Boolean);
  return [...new Set(available)].map(file=>{
    const name=file.split('/').at(-1).replace(/\.[^.]+$/,'').toLowerCase();
    let score=0;
    for(const stem of stems)if(stem.length>=3&&(name.includes(stem)||stem.includes(name.replace(/test|spec/g,''))))score=Math.max(score,stem===name?3:2);
    return {file,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,limit).map(x=>x.file);
}

export function analyzeImpact(store,wsId,workspace,{changed=[],depth=3}={}){
  const rawPaths=(changed.length?changed:gitChanges(workspace)).slice(0,200);
  const paths=[];
  for(const raw of rawPaths){
    if(!isSafeRelative(raw)||shouldIgnore(raw))throw new Error('Unsafe changed path');
    const rel=normalizeRelPath(raw);
    if(!isSafeRelative(rel)||shouldIgnore(rel))throw new Error('Unsafe changed path');
    paths.push(rel);
  }
  const uniquePaths=uniq(paths);
  const cappedDepth=Math.min(4,Math.max(1,Number(depth)||3));
  const queue=uniquePaths.map(p=>({id:'file:'+p,depth:0})),visited=new Map();
  const foundEdges=[];
  while(queue.length&&visited.size<350){
    const cur=queue.shift();
    if(visited.has(cur.id)&&visited.get(cur.id)<=cur.depth)continue;
    visited.set(cur.id,cur.depth);
    if(cur.depth>=cappedDepth)continue;
    if(cur.id.startsWith('feature:')||cur.id.startsWith('symbol:'))continue;
    const rels=store.all(
      "SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND (target=? OR source=?) AND kind IN ('IMPORTS','MAY_TEST','CONTRIBUTES_TO') ORDER BY CASE kind WHEN 'IMPORTS' THEN 0 WHEN 'MAY_TEST' THEN 1 ELSE 2 END LIMIT 250",
      wsId,cur.id,cur.id
    );
    for(const e of rels){
      foundEdges.push(e);
      const next=e.source===cur.id?e.target:e.source;
      if(!visited.has(next)||visited.get(next)>cur.depth+1)queue.push({id:next,depth:cur.depth+1});
    }
  }
  const ids=[...visited.keys()];
  const rows=batchedSelect(store,'SELECT id,kind,label,file_path,basis FROM nodes WHERE workspace_id=? AND id IN ',wsId,ids);
  const nodes=rows.map(n=>({id:n.id,kind:n.kind,label:n.label,path:n.file_path,basis:n.basis}));
  const relatedTests=nodes.filter(n=>n.kind==='test').map(n=>n.path);
  const allTests=store.all("SELECT file_path FROM nodes WHERE workspace_id=? AND kind='test' LIMIT 150",wsId).map(x=>x.file_path);
  const missingChanged=uniquePaths.filter(p=>!store.get('SELECT 1 AS present FROM files WHERE workspace_id=? AND path=?',wsId,p));
  const fallback=rankFallbackTests(uniquePaths,allTests);
  const risks=[];
  if(uniquePaths.some(p=>isSensitiveFeature(p))||nodes.some(n=>isSensitiveFeature(n.label)))risks.push('security-or-state-sensitive');
  if(uniquePaths.some(p=>/schema|migration|lock|config|middleware/i.test(p)))risks.push('cross-module-configuration');
  if(nodes.some(n=>n.basis==='derived')||foundEdges.some(e=>e.state==='derived'))risks.push('heuristic-relations');
  if(!relatedTests.length)risks.push('no-mapped-tests');
  const risk=risks.includes('security-or-state-sensitive')?'high':risks.length>=2?'medium':uniquePaths.length?'low':'unknown';
  const affected=nodes.filter(n=>n.kind!=='symbol');
  const uniqueTests=uniq(relatedTests);
  return {changed:uniquePaths,affected:affected.slice(0,25),affected_total:affected.length,related_tests:uniqueTests.slice(0,10),related_tests_total:uniqueTests.length,fallback_test_candidates:relatedTests.length?[]:fallback,risk,signals:risks,coverage:{graph_nodes_visited:visited.size,traversal_depth:cappedDepth,static_only:true,result_truncated:affected.length>25||uniqueTests.length>10,graph_visit_limit_reached:queue.length>0,indexed_changed_files:uniquePaths.length-missingChanged.length,unindexed_changed_files:missingChanged.length,unindexed_changed_paths:missingChanged.slice(0,10),mapped_test_evidence:uniqueTests.length?'static_graph_only':'none',fallback_test_confidence:fallback.length?'filename_heuristic_only':'none',analysis_complete:false},uncertainty:["Static references and naming heuristics cannot prove complete runtime impact.",...(missingChanged.length?['Some changed files are not in the index: results may miss dependencies or tests.']:[]),...(!uniqueTests.length?['No tests mapped by static graph; suggested filenames are not verified test coverage.']:[]),...(queue.length?['Graph visit limit reached; dependency traversal was truncated.']:[]),...(uniquePaths.length?[]:['No changed paths detected. Provide changed paths explicitly or modify the working tree.'])]};
}
export function validateChangedPaths(paths){if(!Array.isArray(paths)||paths.length>200)throw new Error('changed must be an array with at most 200 paths');for(const p of paths)if(!isSafeRelative(p)||shouldIgnore(p))throw new Error('Invalid changed file path')}
export function shortGraphSummary(store,wsId){return {files:store.get('SELECT COUNT(*) as n FROM files WHERE workspace_id=?',wsId)?.n||0,nodes:store.get('SELECT COUNT(*) as n FROM nodes WHERE workspace_id=?',wsId)?.n||0,relations:store.get('SELECT COUNT(*) as n FROM edges WHERE workspace_id=?',wsId)?.n||0,tests:store.get("SELECT COUNT(*) as n FROM nodes WHERE workspace_id=? AND kind='test'",wsId)?.n||0}}
