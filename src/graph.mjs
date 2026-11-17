import {sha256,isSafeRelative,shouldIgnore} from './security.mjs';
import {gitChanges} from './scanner.mjs';

const uniq=xs=>[...new Set(xs)];
const isSensitiveFeature=s=>/(auth|login|session|payment|checkout|security|permission|access|transaction|migration|database|crypto|billing|order|credential)/i.test(s);
export function contextQuery(store,wsId,{query='',limit=12}={}){
  const q=String(query).trim().slice(0,160).toLowerCase();const n=Math.max(1,Math.min(40,Number(limit)||12));
  let nodes;
  if(q) nodes=store.all('SELECT * FROM nodes WHERE workspace_id=? AND (LOWER(label) LIKE ? OR LOWER(file_path) LIKE ?) ORDER BY CASE WHEN LOWER(label)=? THEN 0 ELSE 1 END,kind LIMIT ?',wsId,'%'+q.replace(/[%_]/g,'')+'%','%'+q.replace(/[%_]/g,'')+'%',q,n);
  else nodes=store.all('SELECT * FROM nodes WHERE workspace_id=? AND kind IN (\'feature\',\'test\') ORDER BY kind,label LIMIT ?',wsId,n);
  const relationships=[];for(const node of nodes.slice(0,15)){
    const edges=store.all('SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND (source=? OR target=?) LIMIT 12',wsId,node.id,node.id);
    relationships.push(...edges);
  }
  return {nodes:nodes.map(({id,kind,label,file_path,line,basis})=>({id,kind,label,file:file_path,line,basis})),relations:[...new Map(relationships.map(e=>[e.source+'|'+e.target+'|'+e.kind,e])).values()].slice(0,80),uncertainty:['Static discovery is not full behavioral or runtime dependency coverage.']};
}
export function analyzeImpact(store,wsId,workspace,{changed=[],depth=3}={}){
  const paths=(changed.length?changed:gitChanges(workspace)).slice(0,200);
  for(const rel of paths)if(!isSafeRelative(rel)||shouldIgnore(rel))throw new Error('Unsafe changed path');
  const cappedDepth=Math.min(4,Math.max(1,Number(depth)||3));
  const queue=paths.map(p=>({id:'file:'+p,depth:0})),visited=new Map();
  const foundEdges=[];
  while(queue.length&&visited.size<350){const cur=queue.shift();if(visited.has(cur.id)&&visited.get(cur.id)<=cur.depth)continue;visited.set(cur.id,cur.depth);
    if(cur.depth>=cappedDepth)continue;
    const rels=store.all('SELECT source,target,kind,basis,state FROM edges WHERE workspace_id=? AND (target=? OR source=?) LIMIT 120',wsId,cur.id,cur.id);
    for(const e of rels){foundEdges.push(e);
      let next=e.source===cur.id?e.target:e.source;
      if(!visited.has(next)||visited.get(next)>cur.depth+1)queue.push({id:next,depth:cur.depth+1});
    }
  }
  const ids=[...visited.keys()],nodes=[];
  for(const id of ids){const n=store.get('SELECT id,kind,label,file_path,basis FROM nodes WHERE workspace_id=? AND id=?',wsId,id);if(n)nodes.push({id:n.id,kind:n.kind,label:n.label,path:n.file_path,basis:n.basis})}
  let relatedTests=nodes.filter(n=>n.kind==='test').map(n=>n.path);const allTests=store.all("SELECT file_path FROM nodes WHERE workspace_id=? AND kind='test' LIMIT 150",wsId).map(x=>x.file_path);
  const risks=[];
  if(paths.some(p=>isSensitiveFeature(p))||nodes.some(n=>isSensitiveFeature(n.label)))risks.push('security-or-state-sensitive');
  if(paths.some(p=>/schema|migration|lock|config|middleware/i.test(p)))risks.push('cross-module-configuration');
  if(nodes.some(n=>n.basis==='derived')||foundEdges.some(e=>e.state==='derived'))risks.push('heuristic-relations');
  if(!relatedTests.length)risks.push('no-mapped-tests');
  const risk=risks.includes('security-or-state-sensitive')?'high':risks.length>=2?'medium':paths.length?'low':'unknown';
  return {changed:paths,affected:nodes.filter(n=>n.kind!=='symbol').slice(0,100),related_tests:uniq(relatedTests).slice(0,40),fallback_test_candidates:uniq(allTests).slice(0,30),risk,signals:risks,coverage:{graph_nodes_visited:visited.size,traversal_depth:cappedDepth,static_only:true},uncertainty:["Static references and naming heuristics cannot prove complete runtime impact.", ...(paths.length?[]:['No changed paths detected. Provide changed paths explicitly or modify the working tree.'])]};
}
export function validateChangedPaths(paths){if(!Array.isArray(paths)||paths.length>200)throw new Error('changed must be an array with at most 200 paths');for(const p of paths)if(!isSafeRelative(p)||shouldIgnore(p))throw new Error('Invalid changed file path')}
export function shortGraphSummary(store,wsId){return {files:store.get('SELECT COUNT(*) as n FROM files WHERE workspace_id=?',wsId)?.n||0,nodes:store.get('SELECT COUNT(*) as n FROM nodes WHERE workspace_id=?',wsId)?.n||0,relations:store.get('SELECT COUNT(*) as n FROM edges WHERE workspace_id=?',wsId)?.n||0,tests:store.get("SELECT COUNT(*) as n FROM nodes WHERE workspace_id=? AND kind='test'",wsId)?.n||0}}
