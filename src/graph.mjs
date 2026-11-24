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
  const q=String(query).trim().slice(0,160).toLowerCase();
  const n=Math.max(1,Math.min(40,Number(limit)||12));
  // instr() treats % and _ literally, unlike LIKE's wildcard semantics.
  const nodes=q
    ?store.all(`SELECT * FROM nodes WHERE workspace_id=?
      AND (instr(LOWER(label),?)>0 OR instr(LOWER(file_path),?)>0)
      ORDER BY CASE
        WHEN LOWER(label)=? THEN 0
        WHEN substr(LOWER(label),1,length(?))=? THEN 1
        WHEN LOWER(file_path)=? THEN 2
        WHEN instr(LOWER(label),?)>0 THEN 3
        ELSE 4 END,kind,label LIMIT ?`,
      wsId,q,q,q,q,q,q,q,n)
    :store.all("SELECT * FROM nodes WHERE workspace_id=? AND kind IN ('feature','test') ORDER BY kind,label LIMIT ?",wsId,n);
  const queryIds=nodes.slice(0,15).map(x=>x.id);
  const relationships=[];
  if(queryIds.length){
    const ph=queryIds.map(()=>'?').join(',');
    const edges=store.all(`SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND (source IN (${ph}) OR target IN (${ph})) ORDER BY CASE kind WHEN 'IMPORTS' THEN 0 WHEN 'MAY_TEST' THEN 1 WHEN 'CONTRIBUTES_TO' THEN 2 ELSE 3 END LIMIT 120`,wsId,...queryIds,...queryIds);
    relationships.push(...edges);
  }
  return {nodes:nodes.map(({id,kind,label,file_path,line,basis})=>({id,kind,label,file:file_path,line,basis})),
    relations:[...new Map(relationships.map(e=>[e.source+'|'+e.target+'|'+e.kind,e])).values()].slice(0,80),
    uncertainty:['Static discovery is not full behavioral or runtime dependency coverage.']};
}
// A changed entry point often reaches services through dynamic framework dispatch.
// This is a review trigger, never proof of route coverage or authorization.
export function inferEntryPointRisks(changed=[]){
 const paths=Array.isArray(changed)?changed:[];
 const groups=[
  ['routes',/^(?:routes\/|app\/Http\/routes\/)/i],
  ['middleware',/(?:Middleware\/|Policy\.php$|Policies\/|Guard\.php$)/i],
  ['http-controller',/(?:Controllers?\/|Http\/Requests?\/)/i],
  ['service',/(?:Services?\/|Actions?\/|Repositories?\/)/i],
  ['background',/(?:Jobs?\/|Listeners?\/|Commands?\/|Queue\/)/i],
  ['offline-sync',/(?:offline|sync|replay|service[-_]?worker|\bsw\.js\b)/i],
  ['financial',/(?:checkout|payment|refund|price|discount|tax|ledger|invoice|poscontroller)/i],
  ['tenant-relationship',/(?:tenant|organization|organisation|store|supplier|membership|inventory|productvariant)/i]
 ];
 const entry_points=groups.filter(([,re])=>paths.some(x=>re.test(x))).map(([name])=>name);
 return {entry_points,requires_role_matrix:entry_points.some(x=>['routes','middleware','http-controller','background','offline-sync','tenant-relationship'].includes(x)),
  requires_domain_invariant_tests:entry_points.some(x=>['financial','offline-sync','tenant-relationship'].includes(x)),
  verified_coverage:false,
  warning:'Framework route/middleware dispatch and foreign-key ownership are not established by static file references. Test each entry point independently.'};
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
  const uniquePaths=uniq(paths),changedIds=new Set(uniquePaths.map(p=>'file:'+p));
  const cappedDepth=Math.min(4,Math.max(1,Number(depth)||3));
  const queue=uniquePaths.map(p=>({id:'file:'+p,depth:0}));
  const visited=new Map(),foundEdges=[],directDependencies=new Set(),observedConsumers=new Set(),heuristicTests=new Set();
  let head=0,queueLimited=false,edgeLimited=false;
  for(const id of changedIds){
    const direct=store.all("SELECT target FROM edges WHERE workspace_id=? AND source=? AND kind='IMPORTS' LIMIT 100",wsId,id);
    for(const e of direct)if(e.target.startsWith('file:'))directDependencies.add(e.target.slice(5));
    if(direct.length===100)edgeLimited=true;
  }
  while(head<queue.length&&visited.size<350){
    const cur=queue[head++];
    if(visited.has(cur.id)&&visited.get(cur.id)<=cur.depth)continue;
    visited.set(cur.id,cur.depth);
    if(cur.depth>=cappedDepth)continue;
    // Only reverse dependencies can be impacted by a changed provider. Direct
    // imports from a changed consumer are dependencies, not affected callers.
    const rels=store.all(
      "SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND target=? AND kind IN ('IMPORTS','MAY_TEST') ORDER BY CASE kind WHEN 'IMPORTS' THEN 0 ELSE 1 END LIMIT 250",
      wsId,cur.id
    );
    if(rels.length===250)edgeLimited=true;
    for(const e of rels){
      if(!e.source.startsWith('file:')||!e.target.startsWith('file:'))continue;
      foundEdges.push(e);
      if(e.kind==='IMPORTS')observedConsumers.add(e.source.slice(5));
      if(e.kind==='MAY_TEST')heuristicTests.add(e.source.slice(5));
      // Test candidates are terminal: a heuristic MAY_TEST must never be
      // promoted into another source dependency during traversal.
      if(e.kind==='MAY_TEST'){
        if(!visited.has(e.source))visited.set(e.source,cur.depth+1);
        continue;
      }
      if(!visited.has(e.source)&&queue.length<1000)queue.push({id:e.source,depth:cur.depth+1});
      else if(queue.length>=1000)queueLimited=true;
    }
  }
  const traversalTruncated=head<queue.length||queueLimited||edgeLimited;
  const ids=[...visited.keys()];
  const rows=batchedSelect(store,'SELECT id,kind,label,file_path,basis FROM nodes WHERE workspace_id=? AND id IN ',wsId,ids);
  const nodes=rows.map(n=>({id:n.id,kind:n.kind,label:n.label,path:n.file_path,basis:n.basis}));
  const candidates=nodes.filter(n=>!changedIds.has(n.id));
  const relatedTests=candidates.filter(n=>n.kind==='test').map(n=>n.path);
  const allTests=store.all("SELECT file_path FROM nodes WHERE workspace_id=? AND kind='test' LIMIT 150",wsId).map(x=>x.file_path);
  const missingChanged=uniquePaths.filter(p=>!store.get('SELECT 1 AS present FROM files WHERE workspace_id=? AND path=?',wsId,p));
  const fallback=rankFallbackTests(uniquePaths,allTests);
  const risks=[];
  if(uniquePaths.some(p=>isSensitiveFeature(p))||nodes.some(n=>isSensitiveFeature(n.label)))risks.push('security-or-state-sensitive');
  if(uniquePaths.some(p=>/schema|migration|lock|config|middleware/i.test(p)))risks.push('cross-module-configuration');
  if(heuristicTests.size||nodes.some(n=>n.basis==='derived'))risks.push('heuristic-relations');
  if(!relatedTests.length)risks.push('no-mapped-tests');
  const entryReview=inferEntryPointRisks(uniquePaths);
  if(entryReview.requires_role_matrix||entryReview.requires_domain_invariant_tests)risks.push('unverified-runtime-authorization-or-domain-constraints');
  const risk=risks.includes('security-or-state-sensitive')?'high':risks.length>=2?'medium':uniquePaths.length?'low':'unknown';
  const affected=candidates.filter(n=>n.kind!=='symbol'&&n.kind!=='feature');
  const uniqueTests=uniq(relatedTests);
  return {
    changed:uniquePaths,affected:affected.slice(0,25),affected_total:affected.length,
    related_tests:uniqueTests.slice(0,10),related_tests_total:uniqueTests.length,
    fallback_test_candidates:relatedTests.length?[]:fallback,risk,signals:risks,
    direct_dependencies:[...directDependencies].slice(0,20),direct_dependencies_total:directDependencies.size,
    observed_consumers:[...observedConsumers].filter(p=>!uniquePaths.includes(p)).slice(0,25),
    heuristic_test_candidates:[...heuristicTests].slice(0,10),
    entry_point_review:entryReview,
    coverage:{graph_nodes_visited:visited.size,traversal_depth:cappedDepth,static_only:true,
      dependency_direction:'reverse-imports-for-affected;forward-imports-for-dependencies',
      result_truncated:affected.length>25||uniqueTests.length>10||directDependencies.size>20,
      graph_visit_limit_reached:traversalTruncated,indexed_changed_files:uniquePaths.length-missingChanged.length,
      unindexed_changed_files:missingChanged.length,unindexed_changed_paths:missingChanged.slice(0,10),
      mapped_test_evidence:uniqueTests.length?'static_graph_only':'none',
      fallback_test_confidence:fallback.length?'filename_heuristic_only':'none',
      analysis_complete:false},
    uncertainty:['Static references and naming heuristics cannot prove complete runtime impact.',
      ...(missingChanged.length?['Some changed files are not in the index: results may miss dependencies or tests.']:[]),
      ...(!uniqueTests.length?['No tests mapped by static graph; suggested filenames are not verified test coverage.']:[]),
      ...(traversalTruncated?['Graph traversal or per-node fan-out was capped. Results are incomplete.']:[]),
      ...(heuristicTests.size?['Heuristic test mappings are candidates, not execution evidence.']:[]),
      ...(entryReview.requires_role_matrix?['Role matrix, route middleware and background operation access have not been dynamically tested.']:[]),
      ...(entryReview.requires_domain_invariant_tests?['Financial and tenant/store relationships require independent integration assertions; static edges are insufficient.']:[]),
      ...(uniquePaths.length?[]:['No changed paths detected. Provide changed paths explicitly or modify the working tree.'])]
  };
}
export function validateChangedPaths(paths){if(!Array.isArray(paths)||paths.length>200)throw new Error('changed must be an array with at most 200 paths');for(const p of paths)if(!isSafeRelative(p)||shouldIgnore(p))throw new Error('Invalid changed file path')}
export function shortGraphSummary(store,wsId){return {files:store.get('SELECT COUNT(*) as n FROM files WHERE workspace_id=?',wsId)?.n||0,nodes:store.get('SELECT COUNT(*) as n FROM nodes WHERE workspace_id=?',wsId)?.n||0,relations:store.get('SELECT COUNT(*) as n FROM edges WHERE workspace_id=?',wsId)?.n||0,tests:store.get("SELECT COUNT(*) as n FROM nodes WHERE workspace_id=? AND kind='test'",wsId)?.n||0}}
