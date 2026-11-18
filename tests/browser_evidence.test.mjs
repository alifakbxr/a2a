import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBrowserEvidence} from '../src/browser-evidence.mjs';
const sha='a'.repeat(64);
const base=()=>({schema:'a2a-browser-evidence-v1',scenario_id:'offline-restart',source:{revision:'sha-a'},build:{artifact_sha256:sha,served_sha256:sha,source_revision:'sha-a'},environment:{browser:'Chrome',version:'150.0'},runner:{name:'playwright',version:'1.5'},started_at:'2026-11-18T09:00:00Z',finished_at:'2026-11-18T09:00:02Z',assertions:[{id:'queue-persists',status:'passed',executed:true,expected:1,observed:1}],artifacts:[{reference:'screen1',sha256:sha}]});
test('F17 stale source or served build cannot produce evidence-present',()=>{
 const r=base();r.source.revision='old';assert.equal(assessBrowserEvidence(r,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]}).status,'stale');
 const b=base();b.build.served_sha256='b'.repeat(64);assert.ok(assessBrowserEvidence(b,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]}).problem_codes.includes('served-build-not-matched'));
});
test('screenshot-only cannot prove an assertion',()=>{const r=base();r.assertions=[];assert.equal(assessBrowserEvidence(r,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]}).status,'inconclusive')});
test('unchecked local artifact hash prevents evidence-positive output',()=>{const r=base();assert.ok(assessBrowserEvidence(r,{expectedRevision:'sha-a'}).problem_codes.includes('artifact-not-intact'))});
test('valid self-reported browser evidence is still UNATTESTED',()=>{
 const r=assessBrowserEvidence(base(),{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]});
 assert.equal(r.status,'evidence-present-unattested');assert.equal(r.independently_verified,false);
});
test('F13 merely navigating to cashier dashboard with no observed forbidden response is insufficient',()=>{
 const r=base();r.assertions=[{id:'rbac',status:'passed',executed:false,expected:403,observed:undefined}];
 assert.equal(assessBrowserEvidence(r,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]}).status,'inconclusive');
});

test('duplicate browser assertion identifiers cannot turn a report green',()=>{
 const report=base();
 report.assertions.push({...report.assertions[0]});
 const result=assessBrowserEvidence(report,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]});
 assert.equal(result.status,'inconclusive');
 assert.ok(result.problem_codes.includes('duplicate-assertion'));
});
test('browser JSON object key ordering does not produce false negative evidence',()=>{
 const report=base();
 report.assertions=[{id:'json-result',status:'passed',executed:true,expected:{ok:true,count:2},observed:{count:2,ok:true}}];
 const result=assessBrowserEvidence(report,{expectedRevision:'sha-a',artifactChecks:[{reference:'screen1',sha256:sha,intact:true}]});
 assert.equal(result.status,'evidence-present-unattested');
 assert.equal(result.independently_verified,false);
});
