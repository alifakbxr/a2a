import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {safeFile,sha256} from './security.mjs';
import {uniqueId} from './storage.mjs';
import {discoverTestCommands,gitChanges} from './scanner.mjs';

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
    const rootMatch=sample.match(/<testsuites\b([^>]*)>/);
    const rootAttrs=rootMatch?attrs(rootMatch[1]):{};
    const suiteMatches=[...sample.matchAll(/<testsuite\b([^>]*)>/g)];
    let expected=NaN, declaredFailed=0, declaredSkipped=0;
    if(rootAttrs.tests!==undefined){
      expected=Number(rootAttrs.tests);
      declaredFailed=Number(rootAttrs.failures||0)+Number(rootAttrs.errors||0);
      declaredSkipped=Number(rootAttrs.skipped||0);
    }else if(suiteMatches.length>0){
      let sumTests=0, hasTestsAttr=false;
      for(const sm of suiteMatches){
        const a=attrs(sm[1]);
        if(a.tests!==undefined){hasTestsAttr=true;sumTests+=Number(a.tests)}
        declaredFailed+=Number(a.failures||0)+Number(a.errors||0);
        declaredSkipped+=Number(a.skipped||0);
      }
      expected=hasTestsAttr?sumTests:NaN;
    }
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
      const validFormats=new Set(['a2a-test-report-v1','verifykit-test-report-v1']);
      if(!validFormats.has(obj?.format)||!Array.isArray(obj.cases)||obj.cases.length<1||obj.cases.length>10000||obj.completed!==true)return {status:'inconclusive',assertions:0,reason:'Unsupported or incomplete report schema',cases:[]};
      const cases=obj.cases.map(c=>({name:String(c.name||'').slice(0,160),state:['passed','failed','skipped'].includes(c.state)?c.state:'unknown'}));
      if(cases.some(c=>!c.name||c.state==='unknown'))return {status:'inconclusive',assertions:cases.length,reason:'Invalid test cases',cases};
      const failed=cases.filter(c=>c.state==='failed').length,skipped=cases.filter(c=>c.state==='skipped').length;
      return {status:failed?'failed':skipped===cases.length?'inconclusive':'passed',assertions:cases.length,failed,skipped,format:obj.format,cases};
    }catch{}
  }
  return {status:'inconclusive',assertions:0,reason:'Unsupported artifact type; require JUnit, TAP, or a2a-test-report-v1',cases:[]};
}

export function planVerification({index,impact,criteria=[]}){
  if(!Array.isArray(criteria)||criteria.length>40)throw new Error('criteria must be an array of at most 40 items');
  const seen=new Set();const plan=criteria.map(c=>{
    if(typeof c!=='string' || c.length>160||!c.trim())throw new Error('Invalid criterion');
    const id=sha256(c.trim().toLowerCase()).slice(0,20);if(seen.has(id))throw new Error('Duplicate criterion');seen.add(id);
    return {id,description:c,status:'not_run',evidence_required:true};
  });
  const checks=discoverTestCommands(index);
  return {criteria:plan,impact:impact?{risk:impact.risk,related_tests:impact.related_tests,unknowns:impact.uncertainty}:null,checks,execution:'Use existing Antigravity native terminal/browser with its permissions. A2A does not execute commands.',state:'not_run'};
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

export const CANDIDATE_ARTIFACTS = [
  'report.xml',
  'junit.xml',
  'test-results.xml',
  'test-report.xml',
  'junit-report.xml',
  'tests.tap',
  'test.tap',
  'report.tap',
  'test-results.json',
  'a2a-test-report.json',
  'test-results/junit.xml',
  'test-results/test-results.xml',
  'coverage/junit.xml',
  'reports/junit.xml',
  'reports/test-results.xml',
  'build/test-results/test/TESTS-TestSuites.xml'
];

export function computeSourceFingerprint(root, changedFiles = []) {
  const fileHashes = [];
  for (const rel of changedFiles) {
    try {
      const full = safeFile(root, rel);
      fileHashes.push(`${rel}:${sha256(fs.readFileSync(full))}`);
    } catch {}
  }
  fileHashes.sort();
  return sha256(fileHashes.join('\n'));
}

export function verifyHandoff(store,wsId,root,rev,{
  worker_name=null,
  changed=[],
  artifact=null,
  criteria=[],
  allow_stale=false
}={}){
  let detectedChanged=Array.isArray(changed)&&changed.length>0?changed:gitChanges(root);
  if(!Array.isArray(detectedChanged)) detectedChanged=[];
  detectedChanged=detectedChanged.map(p=>String(p).replaceAll('\\','/'));

  let maxSourceMtimeMs=0;
  for(const rel of detectedChanged){
    try{
      const full=safeFile(root,rel);
      const st=fs.statSync(full);
      if(st.mtimeMs>maxSourceMtimeMs) maxSourceMtimeMs=st.mtimeMs;
    }catch{}
  }

  let relArtifact=artifact;
  if(!relArtifact){
    let newestTime=0;
    for(const cand of CANDIDATE_ARTIFACTS){
      try{
        const full=safeFile(root,cand);
        const st=fs.statSync(full);
        if(st.isFile()&&st.mtimeMs>newestTime){
          newestTime=st.mtimeMs;
          relArtifact=cand;
        }
      }catch{}
    }
  }

  if(!relArtifact){
    return {
      operation:'verify_handoff',
      verified:false,
      status:'missing_evidence',
      worker:worker_name||null,
      revision:rev,
      changed_files:detectedChanged,
      reason:'No machine-readable test report artifact found (JUnit XML, TAP, or JSON). Subagents must run tests with a machine reporter before reporting completion.',
      actionable_fix:'Run native tests with a reporter flag: npm test -- --reporter=tap, pytest --junitxml=report.xml, go test -v ./... > tests.tap, or php artisan test --log-junit=report.xml'
    };
  }

  const full=safeFile(root,relArtifact);
  const stat=fs.statSync(full);
  if(stat.size>1200000)throw new Error('Evidence report exceeds 1.2 MB');

  const isFresh=allow_stale||maxSourceMtimeMs===0||(stat.mtimeMs>=maxSourceMtimeMs-1500);
  if(!isFresh){
    return {
      operation:'verify_handoff',
      verified:false,
      status:'stale',
      worker:worker_name||null,
      revision:rev,
      artifact:relArtifact,
      fresh:false,
      changed_files:detectedChanged,
      reason:'Test evidence artifact is stale: source files were modified after the test report was generated.',
      actionable_fix:'Re-run native test suite to generate a fresh report matching the latest code changes.'
    };
  }

  const bytes=fs.readFileSync(full);
  const hash=sha256(bytes);
  const parsed=parseArtifact(bytes.toString('utf8'),path.basename(relArtifact));

  let derivedStatus=parsed.status;
  let reason=parsed.reason||null;
  let failedCases=[];

  if(parsed.status==='failed'){
    derivedStatus='failed';
    failedCases=parsed.cases.filter(c=>c.state==='failed').slice(0,10).map(c=>c.name);
    reason=`Test report contains ${parsed.failed} failing test case(s).`;
  }else if(parsed.status==='inconclusive'){
    derivedStatus='inconclusive';
    reason=parsed.reason||'Test report incomplete or contains 0 assertions.';
  }else if((parsed.assertions||0)===0){
    derivedStatus='inconclusive';
    reason='No test assertions found in report.';
  }

  let criteriaResults=[];
  const hasExplicitCriteria = Array.isArray(criteria) && criteria.length > 0;
  if(hasExplicitCriteria){
    for(const c of criteria){
      const cid=typeof c==='string'?c:c.id;
      const testName=typeof c==='object'&&c.test_name?c.test_name.trim():(typeof c==='string'?c.trim():'*');
      let cStatus='passed';
      let cReason=null;
      if(testName!=='*'){
        const matching=parsed.cases.filter(tc=>tc.name===testName||tc.name.includes(testName));
        if(!matching.length){
          cStatus='inconclusive';
          cReason=`Test case "${testName}" not found in report`;
        }else if(matching.some(tc=>tc.state==='failed')){
          cStatus='failed';
          cReason=`Test case "${testName}" failed`;
        }else if(matching.some(tc=>tc.state==='skipped')){
          cStatus='inconclusive';
          cReason=`Test case "${testName}" was skipped`;
        }
      }else if(parsed.status!=='passed'){
        cStatus=parsed.status;
        cReason=reason;
      }
      criteriaResults.push({id:cid,status:cStatus,...(cReason?{reason:cReason}:{})});
    }
    if(criteriaResults.some(r=>r.status==='failed')){
      derivedStatus='failed';
      reason='One or more required criteria failed.';
    }else if(criteriaResults.some(r=>r.status==='inconclusive')){
      derivedStatus='inconclusive';
      reason='One or more required criteria could not be verified.';
    }
  }

  const sourceFingerprint=computeSourceFingerprint(root,detectedChanged);

  const testsPassed=parsed.status==='passed'&&parsed.failed===0&&(parsed.assertions||0)>0;
  let deliverableVerified=false;
  if(!hasExplicitCriteria){
    deliverableVerified=false;
    if(testsPassed){
      derivedStatus='unverified_deliverable';
      reason='Test suite passed, but no acceptance criteria were mapped to test cases proving the deliverable.';
    }
  }else{
    deliverableVerified=testsPassed&&isFresh&&derivedStatus==='passed';
  }

  const verified=deliverableVerified;

  const dbStatus=(derivedStatus==='passed')?'passed':(derivedStatus==='failed')?'failed':(derivedStatus==='blocked')?'blocked':'inconclusive';

  const evidenceId=uniqueId('ev');
  store.run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',
    evidenceId,
    wsId,
    rev,
    worker_name?`teamwork:${worker_name}`:'teamwork_handoff',
    dbStatus,
    parsed.format||'unknown',
    relArtifact,
    hash,
    JSON.stringify({
      worker_name:worker_name||'worker',
      changed_files:detectedChanged,
      source_fingerprint:sourceFingerprint,
      assertions:parsed.assertions||0,
      failed:parsed.failed||0,
      skipped:parsed.skipped||0,
      fresh:isFresh,
      tests_passed:testsPassed,
      deliverable_verified:deliverableVerified,
      verified,
      trust:'local-machine-report'
    }),
    new Date().toISOString()
  );

  const runId=uniqueId('run');
  store.run('INSERT INTO runs VALUES(?,?,?,?,?,?)',
    runId,
    wsId,
    rev,
    dbStatus,
    JSON.stringify([{
      operation:'verify_handoff',
      worker:worker_name,
      artifact:relArtifact,
      source_fingerprint:sourceFingerprint,
      assertions:parsed.assertions||0,
      failed:parsed.failed||0,
      tests_passed:testsPassed,
      deliverable_verified:deliverableVerified,
      verified,
      criteria:criteriaResults
    }]),
    new Date().toISOString()
  );

  return {
    operation:'verify_handoff',
    verified,
    tests_passed:testsPassed,
    deliverable_verified:deliverableVerified,
    status:derivedStatus,
    worker:worker_name||null,
    revision:rev,
    source_fingerprint:sourceFingerprint,
    artifact:relArtifact,
    artifact_sha:hash,
    assertions:parsed.assertions||0,
    failed:parsed.failed||0,
    skipped:parsed.skipped||0,
    format:parsed.format,
    fresh:isFresh,
    changed_files:detectedChanged,
    run_id:runId,
    evidence_id:evidenceId,
    summary:deliverableVerified
      ?`Worker ${worker_name||'task'} deliverable verified: ${parsed.assertions} assertions passed (${parsed.skipped||0} skipped) with mapped acceptance criteria across ${detectedChanged.length} changed files.`
      :testsPassed
        ?`Worker ${worker_name||'task'} tests passed (${parsed.assertions} assertions), but deliverable is unverified: acceptance criteria must be mapped to test cases.`
        :`Worker ${worker_name||'task'} handoff unverified (${derivedStatus}): ${reason||'Test requirements not satisfied.'}`,
    ...(reason?{reason}:{}),
    ...(failedCases.length?{failed_cases:failedCases}:{}),
    ...(criteriaResults.length?{criteria:criteriaResults}:{}),
    ...(!deliverableVerified?{actionable_fix:hasExplicitCriteria?'Ensure all criteria map to passing test cases and tests are rerun after final edits.':'Specify acceptance criteria to verify that test cases prove the intended deliverable.'}:{})
  };
}
