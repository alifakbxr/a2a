import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSemanticClaims} from '../scripts/semantic-evidence.mjs';
const base={revision:'abc',claims:[{id:'stock-last-one',scenario:'true-concurrency',evidence:[{origin:'external-test-harness',verdict:'passed',revision:'abc',reference:'ci/realtime-1',checked_at:'2026-11-17T07:00:00Z',witnessed_capabilities:['shared_stock_record','atomic_commit','one_winner_asserted']}]}]};
test('sequential checkout cannot prove simultaneous race safety',()=>{
 let result=evaluateSemanticClaims(base);assert.equal(result.report_status,'insufficient-evidence');assert.deepEqual(result.claims[0].missing,['parallel_clients']);
});
test('API sync cannot prove browser offline reopening',()=>{
 let result=evaluateSemanticClaims({...base,claims:[{id:'offline',scenario:'offline-restart',evidence:[{origin:'external-test-harness',verdict:'passed',revision:'abc',checked_at:'2026-11-17T07:00:00Z',reference:'ci/api',witnessed_capabilities:['network_disconnected','sync_exactly_once']}]}]});
 assert.ok(result.claims[0].missing.includes('browser_reopened'));assert.ok(result.claims[0].missing.includes('durable_queue_written'));
});
test('valid external witness maps all required capabilities',()=>{
 const b=structuredClone(base);b.claims[0].evidence[0].witnessed_capabilities.push('parallel_clients');
 assert.equal(evaluateSemanticClaims(b).report_status,'evidence-present');
});
test('untrusted self-reported witness does not count',()=>{const b=structuredClone(base);b.claims[0].evidence[0].origin='agent-self-report';b.claims[0].evidence[0].witnessed_capabilities.push('parallel_clients');assert.equal(evaluateSemanticClaims(b).accepted,0)});
