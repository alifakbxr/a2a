// Browser Evidence v1 contract: read-only and conservative.
// A local artifact hash verifies unchanged bytes, NOT browser execution authenticity.
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const bounded=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const id=x=>bounded(x)&&/^[a-zA-Z0-9_.:-]+$/.test(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
export function assessBrowserEvidence(report,{expectedRevision,artifactChecks=[]}={}){
 if(!object(report)||report.schema!=='a2a-browser-evidence-v1')throw Error('Unsupported browser evidence schema');
 if(!id(report.scenario_id)||!object(report.source)||!object(report.build)||!object(report.environment)||!Array.isArray(report.assertions)||report.assertions.length>100)throw Error('Incomplete browser evidence');
 if(!bounded(expectedRevision))throw Error('Expected trusted source revision required');
 const problems=[];
 if(report.source.revision!==expectedRevision)problems.push('source-revision-mismatch');
 if(!sha(report.build.artifact_sha256)||!sha(report.build.served_sha256)||report.build.artifact_sha256!==report.build.served_sha256)problems.push('served-build-not-matched');
 if(report.build.source_revision!==expectedRevision)problems.push('build-source-unbound');
 if(!bounded(report.environment.browser)||!bounded(report.environment.version))problems.push('browser-environment-incomplete');
 if(!bounded(report.runner?.name)||!bounded(report.runner?.version))problems.push('runner-missing');
 if(!report.started_at||!report.finished_at||!Number.isFinite(Date.parse(report.started_at))||!Number.isFinite(Date.parse(report.finished_at))||Date.parse(report.started_at)>Date.parse(report.finished_at))problems.push('timing-invalid');
 const cases=[];
 for(const a of report.assertions){
  if(!object(a)||!id(a.id)||!['passed','failed','skipped','not-run'].includes(a.status)){problems.push('invalid-assertion');continue}
  const outcome=a.status==='passed'&&a.executed===true&&a.observed!==undefined&&a.expected!==undefined&&JSON.stringify(a.observed)===JSON.stringify(a.expected)?'reported-passed':a.status==='failed'?'reported-failed':'insufficient';
  cases.push({id:a.id,outcome});
 }
 if(!cases.length)problems.push('no-machine-assertions');
 if(cases.some(c=>c.outcome==='reported-failed'))problems.push('assertion-failed');
 if(cases.some(c=>c.outcome==='insufficient'))problems.push('assertions-not-verified');
 const artifacts=Array.isArray(report.artifacts)?report.artifacts:[];
 if(artifacts.length>40)problems.push('too-many-artifacts');
 const byRef=new Map(artifactChecks.map(x=>[x.reference,x]));
 for(const art of artifacts){
  if(!object(art)||!id(art.reference)||!sha(art.sha256)){problems.push('unsafe-artifact-reference');continue}
  const observed=byRef.get(art.reference);
  if(!observed||observed.sha256!==art.sha256||observed.intact!==true)problems.push('artifact-not-intact');
 }
 const stale=problems.includes('source-revision-mismatch')||problems.includes('build-source-unbound');
 return {schema:'a2a-browser-assessment-v1',scenario_id:report.scenario_id,revision:expectedRevision,status:stale?'stale':problems.length?'inconclusive':'evidence-present-unattested',independently_verified:false,artifact_count:artifacts.length,assertions:cases,problem_codes:[...new Set(problems)],trust:'unattested-browser-report',limits:['Metadata and assertions originate from the supplied report; reporter identity is not authenticated','Same build digest in two report fields does not prove browser loaded the expected build','Only trusted external browser/backend harness execution can establish scenario correctness']};
}
