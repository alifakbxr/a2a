import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const spec=JSON.parse(fs.readFileSync(new URL('./fixtures/pilah-eval-scenarios.json',import.meta.url),'utf8'));

test('benchmark fixture has six explicit, independent and untested scenarios',()=>{
 assert.equal(spec.schema,'pilah-eval-scenarios-v1');
 assert.equal(spec.status,'not_tested');
 assert.equal(spec.scenarios.length,6);
 const ids=spec.scenarios.map(s=>s.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const scenario of spec.scenarios){
  assert.ok(/^[a-z0-9-]+$/.test(scenario.id));
  assert.ok(scenario.task.length>10);
  assert.ok(scenario.required.length>=2);
  assert.ok(scenario.negative.length>=2);
  assert.ok(scenario.evidence_type);
  assert.equal(scenario.passed,undefined);
 }
 assert.ok(spec.purpose.includes('NOT an independent signed acceptance registry'));
});
