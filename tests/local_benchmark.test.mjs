import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('local indexing benchmark measures I/O without pretending to measure model tokens',()=>{
 const result=spawnSync(process.execPath,['benchmarks/bench.mjs'],{
  encoding:'utf8',env:{...process.env,BENCH_FILES:'12'},timeout:25000});
 assert.equal(result.status,0,result.stderr);
 const body=JSON.parse(result.stdout);
 assert.equal(body.files,13,'12 generated modules plus package manifest');
 for(const metric of ['index_ms','warm_index_ms','impact_ms'])assert.ok(Number.isFinite(body[metric])&&body[metric]>=0,metric);
 for(const field of ['cold_scan','warm_scan']){
  assert.ok(body[field].read_files>=12);
  assert.ok(body[field].read_bytes>0);
 }
 assert.match(body.notes,/not an AI benchmark|not.*token savings/i);
 assert.equal(body.net_token_savings,undefined);
});
