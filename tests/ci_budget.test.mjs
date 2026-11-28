import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeWorkflow} from '../src/workflow-router.mjs';

const read = p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('routine CI runs 1 full-suite PR job, 3 OS main jobs, and 9 optional manual compatibility jobs',()=>{
 const yaml=read('.github/workflows/ci.yml');
 assert.match(yaml,/pull_request:\s*\n\s*branches: \[main\]/);
 assert.match(yaml,/push:\s*\n\s*branches: \[main\]/);
 assert.match(yaml,/workflow_dispatch:/);
 assert.doesNotMatch(yaml,/branches: \[main, 'v2\.0\.1'\]/);
 assert.match(yaml,/github\.event_name == 'pull_request' && '\["ubuntu-latest"\]'/);
 assert.match(yaml,/\["ubuntu-latest","macos-latest","windows-latest"\]/);
 assert.match(yaml,/github\.event_name == 'workflow_dispatch' && '\["22","24","26\.13\.1"\]'/);
 assert.match(yaml,/\|\| '\["24"\]'/);
 assert.match(yaml,/cancel-in-progress: true/);
 assert.match(yaml,/github\.event\.pull_request\.number \|\| github\.ref/);
 for(const check of ['npm run syntax','npm test','npm run benchmark:skills','node scripts/check-release.mjs','npm pack --dry-run','sqlite-compat.mjs'])
  assert.ok(yaml.includes(check),'CI skipped a mandatory gate: '+check);
});

test('routing public recommendations use PILAH, never a default legacy A2A tool',()=>{
 for(const profile of ['economy','balanced','deep-review']){
  for(const task of ['simple','cross-file','change-impact','verification','recovery']){
   const r=routeWorkflow({profile,task,uncertainty:true,risk:'critical'});
   assert.ok(r.proposal==='native-only'||/^pilah_(context|impact|verify|evidence)$/.test(r.proposal),r.proposal);
   assert.equal(r.automatic_tool_calls,0);
   assert.equal(r.estimated_token_savings,null);
  }
 }
 assert.equal(routeWorkflow({task:'cross-file',uncertainty:true}).proposal,'pilah_context');
 assert.equal(routeWorkflow({task:'verification',risk:'high',profile:'deep-review'}).proposal,'pilah_verify');
});

test('project efficiency guide distinguishes CI jobs from measured model token savings',()=>{
 const doc=read('docs/CI_EFFICIENCY.md');
 assert.match(doc,/Jobs/);
 assert.match(doc,/cost per accepted task/);
 assert.match(doc,/Not verified for PILAH/);
 assert.match(doc,/No new third-party dependencies/);
});
