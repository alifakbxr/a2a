#!/usr/bin/env node
// Independent, conservative software-release acceptance gate. No tests are executed here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const check=(v,m)=>{if(!v)throw new Error(m)};
const statuses=new Set(['passed','failed','partial','blocked','not-tested']);
const types=new Set(['junit','tap','browser','security','performance','accessibility','manual','integration']);
export function assessRelease(input){
  check(isObj(input)&&Array.isArray(input.scenarios)&&input.scenarios.length>0&&input.scenarios.length<=100,'Expected 1-100 scenarios');
  check(isObj(input.evaluator)&&input.evaluator.independent===true&&typeof input.evaluator.name==='string'&&input.evaluator.name.trim(),'Explicit independent evaluator required');
  check(typeof input.revision==='string'&&input.revision.trim(),'Code revision is required');
  const ids=new Set(),results=[],blockers=[];
  for(const s of input.scenarios){
    check(isObj(s)&&typeof s.id==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(s.id)&&!ids.has(s.id),'Invalid or duplicate scenario ID');
    ids.add(s.id);
    check(typeof s.requirement==='string'&&s.requirement.trim()&&statuses.has(s.verdict),'Scenario requires description and valid verdict');
    check(typeof s.critical==='boolean','critical must be explicit');
    check(Array.isArray(s.evidence),'Every scenario needs an evidence array');
    let note=null, verdict=s.verdict;
    if(verdict==='passed'){
      const valid=s.evidence.some(e=>isObj(e)&&types.has(e.type)&&e.outcome==='passed'&&e.revision===input.revision&&typeof e.reference==='string'&&e.reference.trim()&&typeof e.checked_at==='string'&&!Number.isNaN(Date.parse(e.checked_at)));
      if(!valid){verdict='not-tested';note='No matching-version, independently identified passing evidence';}
      else if(s.required_evidence_types?.length){
        const missing=s.required_evidence_types.filter(t=>!s.evidence.some(e=>e.type===t&&e.outcome==='passed'&&e.revision===input.revision));
        if(missing.length){verdict='partial';note='Missing required evidence types: '+missing.join(', ');}
      }
    }
    const row={id:s.id,requirement:s.requirement,critical:s.critical,verdict,evidence_count:s.evidence.length,...(note?{note}:{})};results.push(row);
    if(s.critical&&verdict!=='passed')blockers.push({scenario_id:s.id,verdict,reason:note||'Critical scenario not verified'});
  }
  const defects=Array.isArray(input.critical_defects)?input.critical_defects:[];
  for(const d of defects){check(isObj(d)&&typeof d.id==='string'&&d.id.trim(),'Invalid critical defect record');if(d.status!=='resolved-and-retested')blockers.push({defect_id:d.id,reason:'Unresolved or unverified critical defect'});}
  const passed=results.filter(x=>x.verdict==='passed').length;
  const release_ready=passed===results.length&&blockers.length===0;
  return {schema:'a2a-release-gate-v1',revision:input.revision,verdict:release_ready?'eligible-for-review':'blocked',release_ready,scenarios:{passed,total:results.length,results},blockers,limitations:['Evidence references are externally supplied, not cryptographically attested','This assessment does not run tests or replace a human security review','A passing automated suite does not prove untested requirements']};
}
export function assessFile(file){
  const stat=fs.statSync(file);check(stat.isFile()&&stat.size<=1024*1024,'Evaluation file must be <=1 MiB');
  return assessRelease(JSON.parse(fs.readFileSync(file,'utf8')));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{check(process.argv.length===3,'Usage: node scripts/evaluate-acceptance.mjs <evidence.json>');process.stdout.write(JSON.stringify(assessFile(process.argv[2]),null,2)+'\n')}
  catch(e){process.stderr.write('Acceptance evaluation failed: '+e.message+'\n');process.exitCode=1}
}
