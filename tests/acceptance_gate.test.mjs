import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRelease} from '../scripts/evaluate-acceptance.mjs';
const base={revision:'sha-123',evaluator:{name:'external-ci',independent:true},scenarios:[{id:'checkout',requirement:'Checkout response retry exactly once',critical:true,verdict:'passed',required_evidence_types:['integration'],evidence:[{type:'integration',outcome:'passed',revision:'sha-123',reference:'run/test-1',checked_at:'2026-11-17T09:00:00Z'}]}],critical_defects:[]};
test('requires independently identified matching-revision evidence',()=>{
 assert.equal(assessRelease(base).release_ready,true);
 const copy=structuredClone(base);copy.scenarios[0].evidence[0].revision='old';
 const r=assessRelease(copy);assert.equal(r.release_ready,false);assert.equal(r.scenarios.results[0].verdict,'not-tested');
});
test('release blocked by any critical unknown and any unresolved critical defect',()=>{
 const a=structuredClone(base);a.scenarios.push({id:'offline',requirement:'Queue survives browser restart',critical:true,verdict:'partial',evidence:[]});
 assert.equal(assessRelease(a).blockers.length,1);
 const b=structuredClone(base);b.critical_defects=[{id:'SEC-1',status:'open'}];
 assert.equal(assessRelease(b).release_ready,false);
});
test('required evidence types prevent proxy tests from passing',()=>{
 const a=structuredClone(base);a.scenarios[0].required_evidence_types=['browser'];
 const r=assessRelease(a);assert.equal(r.scenarios.results[0].verdict,'partial');
});
test('self-evaluated claims are rejected',()=>assert.throws(()=>assessRelease({...base,evaluator:{name:'coding-agent',independent:false}}),/independent/));
