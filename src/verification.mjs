import fs from 'node:fs';
import crypto from 'node:crypto';
import {safeFile,sha256} from './security.mjs';
import {uniqueId} from './storage.mjs';
import {discoverTestCommands} from './scanner.mjs';

export function parseArtifact(text, filename){
  const ext=filename.toLowerCase().split('.').at(-1), sample=text.slice(0,1200000);
  if(ext==='xml' && /<(?:testsuite|testsuites)\b/.test(sample)){
    if(!/<\/testsuite>/.test(sample))return {status:'inconclusive',reason:'Incomplete JUnit XML',assertions:0,cases:[]};
    const attrs=s=>Object.fromEntries([...s.matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
    const caseTags=[...sample.matchAll(/<testcase\b([^>]*)>/g)].map(x=>({tag:x[0],at:x.index,a:attrs(x[1])}));
    const unclosed=caseTags.some((v,i)=>!v.tag.endsWith('/>') && (()=>{const end=sample.indexOf('</testcase>',v.at),next=caseTags[i+1]?.at??Infinity;return end<0||end>=next})());
    if(unclosed)return {status:'inconclusive',reason:'Unclosed JUnit testcase',assertions:caseTags.length,cases:[]};
    const cases=caseTags.map((v,i)=>{
      const end=sample.indexOf('</testcase>',v.at),next=caseTags[i+1]?.at??Infinity;
      const body=v.tag.endsWith('/>')?'':end>=0&&end<next?sample.slice(v.at+v.tag.length,end):'';
      const state=/<(?:failure|error)\b/.test(body)?'failed':/<skipped\b/.test(body)?'skipped':'passed';
      return {name:v.a.name||'',state};
    });
    const rootMatch=sample.match(/<testsuites\b([^>]*)>/), suiteMatch=sample.match(/<testsuite\b([^>]*)>/);
    const totals=attrs((rootMatch||suiteMatch)?.[1]||'');
    const expected=Number(totals.tests), declaredFailed=Number(totals.failures||0)+Number(totals.errors||0), declaredSkipped=Number(totals.skipped||0);
    const actualFailed=cases.filter(c=>c.state==='failed').length,actualSkipped=cases.filter(c=>c.state==='skipped').length;
    if(!cases.length || !Number.isFinite(expected)||expected!==cases.length)return {status:'inconclusive',reason:'JUnit test count missing or does not match testcase elements',assertions:cases.length,cases};
    if(declaredFailed!==actualFailed||declaredSkipped!==actualSkipped)return {status:'inconclusive',reason:'JUnit suite totals disagree with testcase outcomes',assertions:cases.length,cases};
    return {status:actualFailed?'failed':actualSkipped===cases.length?'inconclusive':'passed',assertions:cases.length,failed:actualFailed,skipped:actualSkipped,format:'junit-xml',cases};
  }
  if(/(?:^|\n)TAP version\s+\d+/.test(sample)||/^(?:ok|not ok)\s+\d+/m.test(sample)){
    const matches=[...sample.matchAll(/^(not ok|ok)\s+(\d+)\b(?:\s*-\s*([^\n#]*))?([^\n]*)$/gm)];
    const cases=matches.map(m=>({name:(m[3]||'').trim(),state:m[1]==='not ok'?'failed':/#\s*SKIP\b/i.test(m[4]||'')?'skipped':'passed'}));
    const expectedPlan=[...sample.matchAll(/^(\d+)\.\.(\d+)\s*$/gm)].at(-1);
    if(!cases.length)return {status:'inconclusive',assertions:0,reason:'No TAP assertions',cases};
    if(expectedPlan && Number(expectedPlan[2])-Number(expectedPlan[1])+1!==cases.length)return {status:'inconclusive',assertions:cases.length,reason:'TAP plan does not match assertions',cases};
    const failed=cases.filter(c=>c.state==='failed').length,skipped=cases.filter(c=>c.state==='skipped').length;
    return {status:failed?'failed':skipped===cases.length?'inconclusive':'passed',assertions:cases.length,failed,skipped,format:'tap',cases};
  }
  if(ext==='json'){
    try {
      const obj=JSON.parse(sample);
      if(obj?.format!=='verifykit-test-report-v1'||!Array.isArray(obj.cases)||obj.cases.length<1||obj.cases.length>10000||obj.completed!==true)return {status:'inconclusive',assertions:0,reason:'Unsupported or incomplete report schema',cases:[]};
      const cases=obj.cases.map(c=>({name:String(c.name||'').slice(0,160),state:['passed','failed','skipped'].includes(c.state)?c.state:'unknown'}));
      if(cases.some(c=>!c.name||c.state==='unknown'))return {status:'inconclusive',assertions:cases.length,reason:'Invalid test cases',cases};
      const failed=cases.filter(c=>c.state==='failed').length,skipped=cases.filter(c=>c.state==='skipped').length;
      return {status:failed?'failed':skipped===cases.length?'inconclusive':'passed',assertions:cases.length,failed,skipped,format:'verifykit-test-report-v1',cases};
    }catch{}
  }
  return {status:'inconclusive',assertions:0,reason:'Unsupported artifact type; require JUnit, TAP, or verifykit-test-report-v1',cases:[]};
}

export function planVerification({index,impact,criteria=[]}){
  if(!Array.isArray(criteria)||criteria.length>40)throw new Error('criteria must be an array of at most 40 items');
  const seen=new Set();const plan=criteria.map(c=>{
    if(typeof c!=='string' || c.length>160||!c.trim())throw new Error('Invalid criterion');
    const id=sha256(c.trim().toLowerCase()).slice(0,20);if(seen.has(id))throw new Error('Duplicate criterion');seen.add(id);
    return {id,description:c,status:'not_run',evidence_required:true};
  });
  const checks=discoverTestCommands(index);
  return {criteria:plan,impact:impact?{risk:impact.risk,related_tests:impact.related_tests,unknowns:impact.uncertainty}:null,checks,execution:'Use existing Antigravity native terminal/browser with its permissions. VerifyKit does not execute commands.',state:'not_run'};
}
function aggregate(results){if(results.some(r=>r.status==='failed'))return 'failed';if(results.some(r=>r.status==='blocked'))return 'blocked';if(results.length&&results.every(r=>r.status==='passed'))return 'passed';return 'inconclusive'}
export function assessVerification(store,wsId,root,rev,criteria){
  if(!Array.isArray(criteria)||criteria.length===0||criteria.length>40)throw new Error('Provide 1–40 criteria including artifact paths');
  const ids=new Set();const results=[];
  for(const c of criteria){if(!c || typeof c.id!=='string'||c.id.length>160||!c.id.trim()||ids.has(c.id))throw new Error('Invalid or duplicate criterion ID');ids.add(c.id);
    let result={id:c.id,status:'inconclusive',reason:'No evidence artifact'};
    if(typeof c.artifact==='string'){
      const full=safeFile(root,c.artifact);const stat=fs.statSync(full);if(stat.size>1200000)throw new Error('Evidence report exceeds 1.2 MB');
      const bytes=fs.readFileSync(full),hash=sha256(bytes), parsed=parseArtifact(bytes.toString('utf8'),c.artifact);
      // An explicit test name prevents an arbitrary passing suite from proving an unrelated criterion.
      const matchName=typeof c.test_name==='string'?c.test_name.trim():'';
      let derivedStatus=parsed.status, reason=parsed.reason||null;
      if(!matchName){derivedStatus='inconclusive';reason='test_name is required to bind the criterion to actual test cases; use * for the entire suite';}
      else if(matchName!=='*'){
        const selected=parsed.cases.filter(t=>t.name===matchName);
        if(!selected.length){derivedStatus='inconclusive';reason='Named test case was not found in report';}
        else if(selected.some(t=>t.state==='failed')){derivedStatus='failed';reason='Named test case failed';}
        else if(selected.some(t=>t.state==='skipped')){derivedStatus='inconclusive';reason='Named test case was skipped';}
        else if(parsed.status==='inconclusive'){derivedStatus='inconclusive';reason=parsed.reason||'Report incomplete';}
        else {derivedStatus='passed';reason=null;}
      }
      const evidenceId=uniqueId('ev');
      store.run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',evidenceId,wsId,rev,c.id,derivedStatus,parsed.format||'unknown',c.artifact,hash,JSON.stringify({assertions:parsed.assertions||0,failed:parsed.failed||0,skipped:parsed.skipped||0,reason,test_name:matchName,trust:'local-report-not-cryptographically-attested'}),new Date().toISOString());
      result={id:c.id,status:derivedStatus,evidence_id:evidenceId,assertions:parsed.assertions||0,...(reason?{reason}:{})};
    }else if(c.blocked===true){result={id:c.id,status:'blocked',reason:String(c.reason||'Required environment is unavailable').slice(0,240)}}
    results.push(result);
  }
  const verdict=aggregate(results),runId=uniqueId('run');store.run('INSERT INTO runs VALUES(?,?,?,?,?,?)',runId,wsId,rev,verdict,JSON.stringify(results),new Date().toISOString());
  return {run_id:runId,revision:rev,verdict,criteria:results,limits:['Report parsing does not cryptographically attest the origin of artifacts.','PASSED means supplied machine-readable assertions passed in this revision; untested behaviors remain out of scope.']};
}
export function listEvidence(store,wsId,root,currentRevision,{limit=20,id}={}){
  const check=x=>{let artifact_intact=false;try{const p=safeFile(root,x.artifact_path);artifact_intact=sha256(fs.readFileSync(p))===x.artifact_sha}catch{};return {fresh:x.revision_id===currentRevision&&artifact_intact,artifact_intact}};
  if(id){const e=store.get('SELECT * FROM evidence WHERE workspace_id=? AND id=?',wsId,id);if(!e)return {found:false};return {...e,...check(e),metadata:JSON.parse(e.metadata_json),metadata_json:undefined}}
  const n=Math.max(1,Math.min(50,Number(limit)||20));
  return {items:store.all('SELECT id,criterion_id,status,artifact_path,artifact_sha,revision_id,created_at FROM evidence WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,n).map(x=>{const state=check(x);return {id:x.id,criterion_id:x.criterion_id,status:x.status,artifact_path:x.artifact_path,revision_id:x.revision_id,created_at:x.created_at,...state}})};
}
export function freshness(store,wsId,root,revision){const items=store.all('SELECT id,revision_id,criterion_id,status,artifact_path,artifact_sha FROM evidence WHERE workspace_id=? ORDER BY created_at DESC LIMIT 30',wsId);return items.map(x=>{let artifact_intact=false;try{artifact_intact=sha256(fs.readFileSync(safeFile(root,x.artifact_path)))===x.artifact_sha}catch{};return {id:x.id,revision_id:x.revision_id,criterion_id:x.criterion_id,status:x.status,artifact_intact,fresh:x.revision_id===revision&&artifact_intact}})}
