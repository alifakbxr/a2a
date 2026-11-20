import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {safeFile,sha256,readSafeBytesFile,readSafeJsonFile} from './security.mjs';
import {uniqueId} from './storage.mjs';
import {discoverTestCommands,gitChanges} from './scanner.mjs';

import {proposeRiskTests} from './risk-guidance.mjs';
import {normalizeAcceptanceCriterion,acceptanceCompletion,localEvidencePolicy} from './acceptance-matrix.mjs';

// Bounded structural guard: regex case extraction must never count cases outside
// a complete JUnit document as passing assertions. Unsupported XML fails closed.
function validJUnitStructure(xml){
 const source=xml.replace(/^\\s*<\\?xml\\s+[^?]*\\?>/i,'').trim();
 const stack=[];let rootSeen=false,completed=false,cursor=0;
 const tags=/<(\\/?)([A-Za-z][A-Za-z0-9:_.-]*)([^<>]*?)>/g;
 let match;
 while((match=tags.exec(source))!==null){
  const between=source.slice(cursor,match.index);
  if(completed||between.includes('<')||(!stack.length&&between.trim()))return false;
  const closing=match[1]==='/',name=match[2].toLowerCase();
  const selfClosing=!closing&&/\\/\\s*$/.test(match[3]);
  if(closing){
   if(stack.pop()!==name)return false;
   if(!stack.length)completed=true;
  }else{
   if(!stack.length){if(rootSeen||!['testsuite','testsuites'].includes(name))return false;rootSeen=true;}
   if(name==='testcase'&&stack.at(-1)!=='testsuite')return false;
   if(name==='testsuite'&&stack.length&&!['testsuite','testsuites'].includes(stack.at(-1)))return false;
   if(name==='testsuites'&&stack.length)return false;
   if(['failure','error','skipped'].includes(name)&&stack.at(-1)!=='testcase')return false;
   if(!selfClosing)stack.push(name);
   else if(!stack.length)completed=true;
  }
  cursor=tags.lastIndex;
 }
 const tail=source.slice(cursor);
 return rootSeen&&completed&&!stack.length&&!tail.includes('<')&&!tail.trim();
}

export function parseArtifact(text, filename){
  const ext=filename.toLowerCase().split('.').at(-1), sample=text.slice(0,1200000);
  if(ext==='xml' && /<(?:testsuite|testsuites)\b/.test(sample)){
    // A test report is untrusted local content. Fail closed on XML constructs
    // outside the narrow JUnit schema, and strip non-structural log content
    // BEFORE searching for testcase/failure tags.
    if(/<!DOCTYPE\b|<!ENTITY\b/i.test(sample))return {status:'inconclusive',reason:'Unsupported XML entity or DTD',assertions:0,cases:[]};
    const clean=sample
      .replace(/<!--[\s\S]*?-->/g,'')
      .replace(/<(?:system-out|system-err)\b[^>]*>[\s\S]*?<\/(?:system-out|system-err)\s*>/gi,'')
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g,'');
    if(/<!--|<!\[CDATA\[|<(?:system-out|system-err)\b/i.test(clean))
      return {status:'inconclusive',reason:'Incomplete XML comment or log content',assertions:0,cases:[]};
    if(!validJUnitStructure(clean)||!/<\/testsuite\s*>/.test(clean)||/<testcase\b/i.test(clean)===false)
      return {status:'inconclusive',reason:'Incomplete JUnit XML',assertions:0,cases:[]};
    const attrs=text=>Object.fromEntries([...text.matchAll(/([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(m=>[m[1],m[2]??m[3]]));
    const tags=[...clean.matchAll(/<testcase\b([^>]*)>/g)];
    const cases=[];let cursor=0;
    for(const item of tags){
      const tag=item[0],at=item.index;
      if(at<cursor)return {status:'inconclusive',reason:'Overlapping or malformed JUnit testcases',assertions:cases.length,cases};
      const attr=attrs(item[1]);
      if(!attr.name)return {status:'inconclusive',reason:'JUnit testcase name absent',assertions:cases.length,cases};
      const selfClosing=/\/\s*>$/.test(tag);
      const close=selfClosing?at+tag.length:clean.indexOf('</testcase>',at+tag.length);
      const next=clean.indexOf('<testcase',at+tag.length);
      if(close<0||(!selfClosing&&next>=0&&next<close))
        return {status:'inconclusive',reason:'Unclosed or nested JUnit testcase',assertions:cases.length,cases};
      const body=selfClosing?'':clean.slice(at+tag.length,close);
      cursor=selfClosing?at+tag.length:close+'</testcase>'.length;
      const state=/<(?:failure|error)\b/i.test(body)?'failed':/<skipped\b/i.test(body)?'skipped':'passed';
      cases.push({name:attr.name,state});
    }
    if(/<testcase\b/i.test(clean.slice(cursor))||/<!\[CDATA\[|<!--/.test(clean.slice(cursor)))
      return {status:'inconclusive',reason:'Unparsed JUnit testcase',assertions:cases.length,cases};
    const rootMatch=clean.match(/<testsuites\b([^>]*)>/);
    const rootAttrs=rootMatch?attrs(rootMatch[1]):{};
    const suites=[...clean.matchAll(/<testsuite\b([^>]*)>/g)];
    let expected=NaN,declaredFailed=0,declaredSkipped=0;
    if(rootAttrs.tests!==undefined){
      expected=Number(rootAttrs.tests);
      declaredFailed=Number(rootAttrs.failures||0)+Number(rootAttrs.errors||0);
      declaredSkipped=Number(rootAttrs.skipped||0);
    }else if(suites.length){
      let sum=0,found=false;
      for(const suite of suites){
        const a=attrs(suite[1]);
        if(a.tests!==undefined){found=true;sum+=Number(a.tests)}
        declaredFailed+=Number(a.failures||0)+Number(a.errors||0);
        declaredSkipped+=Number(a.skipped||0);
      }
      expected=found?sum:NaN;
    }
    const failed=cases.filter(c=>c.state==='failed').length,skipped=cases.filter(c=>c.state==='skipped').length;
    if(!cases.length||!Number.isSafeInteger(expected)||expected!==cases.length)
      return {status:'inconclusive',reason:'JUnit count mismatch or missing',assertions:cases.length,cases};
    if(!Number.isSafeInteger(declaredFailed)||!Number.isSafeInteger(declaredSkipped)
      ||declaredFailed!==failed||declaredSkipped!==skipped)
      return {status:'inconclusive',reason:'JUnit declared outcomes disagree with actual cases',assertions:cases.length,cases};
    return {status:failed?'failed':skipped===cases.length?'inconclusive':'passed',
      assertions:cases.length,failed,skipped,format:'junit-xml',cases};
  }
  if(/(?:^|\n)TAP version\s+\d+/.test(sample)||/^(?:ok|not ok)\s+\d+/m.test(sample)){
    const matches=[...sample.matchAll(/^(not ok|ok)\s+(\d+)\b(?:\s*-\s*([^\n#]*))?([^\n]*)$/gm)];
    const cases=matches.map(m=>({
      name:(m[3]||'').trim(),
      number:Number(m[2]),
      state:m[1]==='not ok'?'failed':/#\s*(?:SKIP|TODO)\b/i.test(m[4]||'')?'skipped':'passed'
    }));
    if(/^\s*Bail out!\b/im.test(sample))
      return {status:'failed',reason:'TAP bailout: run aborted',assertions:cases.length,cases};
    const plans=[...sample.matchAll(/^(\d+)\.\.(\d+)\s*(?:#.*)?$/gm)];
    if(plans.length!==1||Number(plans[0][1])!==1||Number(plans[0][2])<1)
      return {status:'inconclusive',reason:'TAP plan missing or invalid',assertions:cases.length,cases};
    const expected=Number(plans[0][2]);
    if(!cases.length||!Number.isSafeInteger(expected)||expected!==cases.length
      ||cases.some((c,i)=>c.number!==i+1))
      return {status:'inconclusive',reason:'TAP assertions are missing, duplicated or out of order',assertions:cases.length,cases};
    const failed=cases.filter(c=>c.state==='failed').length,skipped=cases.filter(c=>c.state==='skipped').length;
    return {status:failed?'failed':skipped===cases.length?'inconclusive':'passed',
      assertions:cases.length,failed,skipped,format:'tap',cases};
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

export function planVerification({index,impact,criteria=[],compact=false}){
  if(!Array.isArray(criteria)||criteria.length>40)throw new Error('criteria must be an array of at most 40 items');
  const seen=new Set();const plan=criteria.map(c=>{
    const item=normalizeAcceptanceCriterion(c);
    if(seen.has(item.id))throw new Error('Duplicate criterion');
    seen.add(item.id);
    return item;
  });
  const checks=discoverTestCommands(index);
  const riskGuidance=proposeRiskTests({paths:impact?.changed??[],criteria:plan.map(x=>[x.description,x.given,x.when,x.then].filter(Boolean).join(' ')),compact});
  const highRisk=impact?.risk==='high'||riskGuidance.findings.some(x=>x.priority==='critical');
  // Maintainer discipline is a bounded NOT-REVIEWED checklist, never a quality verdict.
  // It costs no extra tool call and is omitted for unrelated/trivial tasks.
  const maintainerReview=highRisk?{
    status:'not-reviewed',
    required_checks:[
      'Reproduce defect; failing regression before fix, passing after',
      'Minimal diff; preserve local conventions and public API compatibility',
      'Test observable behavior and adversarial boundary, not test names',
      'Review maintenance/performance cost; no unapproved dependencies'
    ],
    proof:'native-test-and-human-review-required'
  }:null;
  return {criteria:plan,impact:impact?{risk:impact.risk,related_tests:impact.related_tests,unknowns:impact.uncertainty}:null,risk_guidance:riskGuidance,...(maintainerReview?{maintainer_review:maintainerReview}:{}),checks,completion:acceptanceCompletion(plan,[],{planning:true}),execution:'Use existing Antigravity native terminal/browser with its permissions. A2A does not execute commands.',state:'not_run'};
}
function aggregate(results){if(results.some(r=>r.status==='failed'))return 'failed';if(results.some(r=>r.status==='blocked'))return 'blocked';if(results.length&&results.every(r=>r.status==='passed'))return 'passed';return 'inconclusive'}
export function assessVerification(store,wsId,root,rev,criteria,{planId=null}={}){
  // Either the entire verification run and its evidence records are committed,
  // or none are. Invalid later criteria must never leave orphaned passed evidence.
  return store.transaction(()=>{
  if(!Array.isArray(criteria)||criteria.length>40||(!planId&&criteria.length===0))
    throw new Error('Provide 1–40 criteria, or a persisted plan_id with optional evidence bindings');
  let boundRevision=null,requested=criteria;
  if(planId!==null){
    if(typeof planId!=='string'||!/^apl-[A-Za-z0-9-]{8,100}$/.test(planId))throw new Error('Invalid plan_id');
    const saved=store.get('SELECT * FROM acceptance_plans WHERE workspace_id=? AND id=?',wsId,planId);
    if(!saved)throw new Error('Unknown or unauthorized acceptance plan');
    if(sha256(saved.criteria_json)!==saved.manifest_sha)throw new Error('Acceptance plan integrity mismatch');
    const authoritative=JSON.parse(saved.criteria_json);
    if(!Array.isArray(authoritative)||authoritative.length===0||authoritative.length>40)throw new Error('Invalid persisted acceptance plan');
    boundRevision=saved.revision_id;
    const indexed=new Map();
    for(const item of criteria){
      if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||indexed.has(item.id))throw new Error('Invalid or duplicate plan evidence binding');
      indexed.set(item.id,item);
    }
    const expected=new Set(authoritative.map(c=>c.id));
    if([...indexed.keys()].some(id=>!expected.has(id)))throw new Error('Assessment criterion is not part of the persisted plan');
    requested=authoritative.map(original=>{
      const binding=indexed.get(original.id)||{};
      // The persisted plan controls the meaning of acceptance. Caller may
      // attach evidence but may not silently change its expected behavior.
      for(const key of ['description','given','when','then','evidence_type','viewport','ui_state','reference','source_revision','negative']){
        if(Object.hasOwn(binding,key)&&JSON.stringify(binding[key])!==JSON.stringify(original[key]))
          throw new Error('Acceptance contract changed: '+key);
      }
      return {...original,...(typeof binding.artifact==='string'?{artifact:binding.artifact}:{}),
        ...(typeof binding.test_name==='string'?{test_name:binding.test_name}:{}),
        ...(binding.blocked===true?{blocked:true}:{})};
    });
  }
  const ids=new Set(),results=[],plan=[];
  for(const c of requested){
    if(typeof c==='string')throw new Error('Assessment criteria require an explicit id and named test evidence');
    const criterion=normalizeAcceptanceCriterion(c);
    if(ids.has(criterion.id))throw new Error('Invalid or duplicate criterion ID');
    ids.add(criterion.id);plan.push(criterion);
    let result={id:criterion.id,status:criterion.contract==='acceptance-v1'?'not_tested':'inconclusive',reason:'No evidence artifact'};
    if(typeof c.artifact==='string'){
      const full=safeFile(root,c.artifact);const stat=fs.statSync(full);if(stat.size>1200000)throw new Error('Evidence report exceeds 1.2 MB');
      const bytes=fs.readFileSync(full),hash=sha256(bytes), parsed=parseArtifact(bytes.toString('utf8'),c.artifact);
      // An explicit test name prevents an arbitrary passing suite from proving an unrelated criterion.
      const matchName=typeof c.test_name==='string'?c.test_name.trim():'';
      let derivedStatus=parsed.status, reason=parsed.reason||null;
      if(!matchName){derivedStatus='inconclusive';reason='test_name is required to bind the criterion to actual test cases; use * only for legacy whole-suite checks';}
      else if(criterion.contract==='acceptance-v1'&&matchName==='*'){derivedStatus='inconclusive';reason='Structured acceptance requires an exact named test case';}
      else if(matchName!=='*'){
        const selected=parsed.cases.filter(t=>t.name===matchName);
        if(!selected.length){derivedStatus='inconclusive';reason='Named test case was not found in report';}
        else if(selected.some(t=>t.state==='failed')){derivedStatus='failed';reason='Named test case failed';}
        else if(selected.some(t=>t.state==='skipped')){derivedStatus='inconclusive';reason='Named test case was skipped';}
        else if(parsed.status==='inconclusive'){derivedStatus='inconclusive';reason=parsed.reason||'Report incomplete';}
        else if(parsed.status==='failed'){derivedStatus='failed';reason='The same test suite contains failures';}
        else {derivedStatus='passed';reason=null;}
      }
      if((criterion.source_revision&&criterion.source_revision!==rev)||(boundRevision&&boundRevision!==rev)){
        derivedStatus='stale';reason='Acceptance plan or explicit source revision differs from current workspace revision';
      }
      if(derivedStatus==='passed'&&!localEvidencePolicy(criterion).locally_attestable){
        derivedStatus='inconclusive';reason=localEvidencePolicy(criterion).reason;
      }
      const evidenceId=uniqueId('ev');
      store.run('INSERT INTO evidence VALUES(?,?,?,?,?,?,?,?,?,?)',evidenceId,wsId,rev,criterion.id,derivedStatus==='stale'?'inconclusive':derivedStatus,parsed.format||'unknown',c.artifact,hash,JSON.stringify({assertions:parsed.assertions||0,failed:parsed.failed||0,skipped:parsed.skipped||0,reason,test_name:matchName,requested_evidence_type:criterion.evidence_type||'unspecified',trust:'local-report-not-cryptographically-attested'}),new Date().toISOString());
      result={id:criterion.id,status:derivedStatus,evidence_id:evidenceId,assertions:parsed.assertions||0,...(reason?{reason}:{})};
    }else if(c.blocked===true){result={id:criterion.id,status:'blocked',reason:'Required environment unavailable; no runnable evidence supplied'}}
    if(boundRevision&&boundRevision!==rev){result={id:criterion.id,status:'stale',reason:'Persisted acceptance plan revision differs from current workspace source'};}
    results.push(result);
  }
  const verdict=aggregate(results),runId=uniqueId('run');store.run('INSERT INTO runs VALUES(?,?,?,?,?,?)',runId,wsId,rev,verdict,JSON.stringify(results),new Date().toISOString());
  return {run_id:runId,revision:rev,verdict,criteria:results,plan_id:planId||null,scope_bound:Boolean(planId),scope_source_revision:boundRevision,completion:acceptanceCompletion(plan,results),proof_scope:'named-machine-test-assertions-only',release_ready:false,semantic_requirements_proven:false,limits:['A passing JUnit/TAP/JSON suite is NOT a release-readiness or semantic concurrency/offline/security verdict.','Only independently signed acceptance evidence via assess_release can report release eligibility.','Report parsing does not attest origin or test execution authenticity.',...(!planId?['Acceptance scope is unbound: omitted planned scenarios cannot be detected without plan_id.']:[])]};
  });
}
export function listEvidence(store,wsId,root,currentRevision,{limit=20,id}={}){
  const check=x=>{let artifact_intact=false;try{const p=safeFile(root,x.artifact_path),bytes=readSafeBytesFile(p,{maxBytes:4*1024*1024});artifact_intact=bytes.ok&&sha256(bytes.bytes)===x.artifact_sha}catch{};return {fresh:x.revision_id===currentRevision&&artifact_intact,artifact_intact}};
  if(id){const e=store.get('SELECT * FROM evidence WHERE workspace_id=? AND id=?',wsId,id);if(!e)return {found:false};return {...e,...check(e),metadata:JSON.parse(e.metadata_json),metadata_json:undefined}}
  const n=Math.max(1,Math.min(50,Number(limit)||20));
  return {items:store.all('SELECT id,criterion_id,status,artifact_path,artifact_sha,revision_id,created_at FROM evidence WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?',wsId,n).map(x=>{const state=check(x);return {id:x.id,criterion_id:x.criterion_id,status:x.status,artifact_path:x.artifact_path,revision_id:x.revision_id,created_at:x.created_at,...state}})};
}
export function freshness(store,wsId,root,revision){const items=store.all('SELECT id,revision_id,criterion_id,status,artifact_path,artifact_sha FROM evidence WHERE workspace_id=? ORDER BY created_at DESC LIMIT 30',wsId);return items.map(x=>{let artifact_intact=false;try{const bytes=readSafeBytesFile(safeFile(root,x.artifact_path),{maxBytes:4*1024*1024});artifact_intact=bytes.ok&&sha256(bytes.bytes)===x.artifact_sha}catch{};return {id:x.id,revision_id:x.revision_id,criterion_id:x.criterion_id,status:x.status,artifact_intact,fresh:x.revision_id===revision&&artifact_intact}})}

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

export function nativeRunProvenance(store,root,changedFiles,relReport,reportHash){
  // This is a local hook-derived record, not a cryptographic attestation.
  if(!changedFiles.length || !store?.base)return {matched:false,reason:'No changed source files were bound to the native run'};
  try{
    const sameWorkspace=(a,b)=>a&&b&&fs.realpathSync(a)===fs.realpathSync(b);
    const recordFile=readSafeJsonFile(path.join(store.base,'last-test-run.json'),{maxBytes:128*1024});
    const activeFile=readSafeJsonFile(path.join(store.base,'active-session.json'),{maxBytes:128*1024});
    if(!recordFile.ok||!activeFile.ok)return {matched:false,reason:'Native run metadata is missing or unsafe'};
    const record=recordFile.value;
    const active=activeFile.value.latest;
    if(!active?.conversationId || active.conversationId!==record.conversationId
       || !Array.isArray(active.workspacePaths)
       || !active.workspacePaths.some(w=>{try{return sameWorkspace(w,root)}catch{return false}})){
      return {matched:false,reason:'Native-run record is not bound to the active workspace session'};
    }
    if(record.kind!=='native-test-tool-completed'||record.succeeded!==true||!sameWorkspace(record.workspace,root)){
      return {matched:false,reason:'No successful native test run recorded for this workspace'};
    }
    const age=Date.now()-Date.parse(record.updatedAt||'');
    if(!Number.isFinite(age)||age< -2000||age>15*60*1000)return {matched:false,reason:'Native run is outside freshness window'};
    if(record.report_hashes?.[relReport]!==reportHash)return {matched:false,reason:'Report hash differs from the last native test run'};
    for(const rel of changedFiles){
      const expected=record.source_hashes?.[rel];
      if(!expected || expected!==sha256(fs.readFileSync(safeFile(root,rel)))){
        return {matched:false,reason:'Changed source does not match the native test run'};
      }
    }
    return {matched:true,reason:null};
  }catch{return {matched:false,reason:'Native run provenance cannot be read'}}
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

  const isFresh=maxSourceMtimeMs===0||(stat.mtimeMs>=maxSourceMtimeMs-1500); // allow_stale never authorizes a PASS
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
  const criteriaSeen=new Set();
  if(hasExplicitCriteria){
    if(criteria.length>40)throw new Error('Too many handoff criteria');
    for(const c of criteria){
      if(typeof c!=='string' && (!c||typeof c!=='object'||Array.isArray(c)))throw new Error('Invalid handoff criterion');
      const typed=typeof c==='string'?null:normalizeAcceptanceCriterion(c);
      const cid=typed?.id??c.trim();
      if(!cid||criteriaSeen.has(cid))throw new Error('Invalid or duplicate handoff criterion ID');
      criteriaSeen.add(cid);
      const testName=typeof c==='object'&&typeof c.test_name==='string'?c.test_name.trim():(typeof c==='string'?c.trim():'*');
      let cStatus='passed';
      let cReason=null;
      if(testName==='*'){
        cStatus='inconclusive';
        cReason='Handoff verification requires an exact named testcase, not a wildcard';
      }else{
        const matching=parsed.cases.filter(tc=>tc.name===testName); // exact-case binding prevents ambiguous PASS
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
      }
      if(typed?.source_revision&&typed.source_revision!==rev){
        cStatus='inconclusive';cReason='Handoff criterion source revision is stale';
      }
      if(cStatus==='passed'&&!localEvidencePolicy(typed).locally_attestable){
        cStatus='inconclusive';cReason=localEvidencePolicy(typed).reason;
      }
      criteriaResults.push({id:cid,status:cStatus,...(typed?.evidence_type?{evidence_type:typed.evidence_type}:{}),...(cReason?{reason:cReason}:{})});
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
  const provenance=nativeRunProvenance(store,root,detectedChanged,relArtifact,hash);

  let deliverableVerified=false;
  if(!hasExplicitCriteria){
    deliverableVerified=false;
    if(testsPassed){
      derivedStatus='unverified_deliverable';
      reason='Test suite passed, but no acceptance criteria were mapped to test cases proving the deliverable.';
    }
  }else{
    deliverableVerified=testsPassed&&isFresh&&derivedStatus==='passed'&&provenance.matched;
    if(testsPassed&&isFresh&&derivedStatus==='passed'&&!provenance.matched){
      derivedStatus='unattested_report';
      reason='Report passed named criteria, but evidence is not bound to a recent native test execution: '+provenance.reason;
    }
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
      trust:provenance.matched?'native-hook-local-evidence':'unattested-local-report',
      provenance_matched:provenance.matched,
      provenance_reason:provenance.reason,
      allow_stale_requested:allow_stale===true,
      evidence_limit:'Local run metadata is not cryptographically attested'
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
    verified_scope:verified?'local-named-machine-assertions-only':'none',
    independently_attested:false,
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
      ?`Worker ${worker_name||'task'} local named test assertions verified (${parsed.assertions} passed, ${parsed.skipped||0} skipped). This is not independent deliverable or runtime acceptance.`
      :testsPassed
        ?`Worker ${worker_name||'task'} tests passed (${parsed.assertions} assertions), but deliverable is unverified: acceptance criteria must be mapped to test cases.`
        :`Worker ${worker_name||'task'} handoff unverified (${derivedStatus}): ${reason||'Test requirements not satisfied.'}`,
    ...(reason?{reason}:{}),
    ...(failedCases.length?{failed_cases:failedCases}:{}),
    ...(criteriaResults.length?{criteria:criteriaResults}:{}),
    ...(!deliverableVerified?{actionable_fix:hasExplicitCriteria?'Ensure all criteria map to passing test cases and tests are rerun after final edits.':'Specify acceptance criteria to verify that test cases prove the intended deliverable.'}:{})
  };
}
