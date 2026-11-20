import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const registry=JSON.parse(fs.readFileSync(fileURLToPath(new URL('./fixtures/stockroom-acceptance-18.json',import.meta.url)),'utf8'));
test('18 external specs are unique and cannot be marked passed by their existence',()=>{
 assert.equal(registry.scenarios.length,18);
 assert.equal(new Set(registry.scenarios.map(x=>x.id)).size,18);
 assert.deepEqual(registry.scenarios.map(x=>x.id),Array.from({length:18},(_,i)=>'F'+String(i+1).padStart(2,'0')));
 assert.ok(registry.scenarios.every(x=>x.independently_tested===false));
});
test('critical scenarios never treat test count or self-reported browser confidence as an assertion',()=>{
 assert.equal(registry.scenarios.find(x=>x.id==='F18').priority,'critical');
 assert.equal(registry.scenarios.find(x=>x.id==='F14').independently_tested,false);
});
