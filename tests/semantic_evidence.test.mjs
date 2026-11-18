import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSemanticClaims,inspectScenarioFacts} from '../src/semantic-evidence.mjs';
const report=(scenario,observations,witnessed_capabilities=[])=>({revision:'snapshot-1',claims:[{id:'case-one',scenario,evidence:[{origin:'external-test-harness',verdict:'passed',revision:'snapshot-1',checked_at:'2026-11-18T09:00:00Z',reference:'ci:test-run-1',witnessed_capabilities,observations}]}]});
test('F08 sequential requests with a fake complete witness list do not prove concurrency',()=>{
 const f={requests:[{connection_id:'a',resource_id:'stock-1',started_at_ms:0,completed_at_ms:4,outcome:'success'},{connection_id:'b',resource_id:'stock-1',started_at_ms:5,completed_at_ms:9,outcome:'failed'}],database_transactions_observed:true,database_dialect:'postgres',orders_created:1,stock_after:0};
 const r=evaluateSemanticClaims(report('true-concurrency',f,['parallel_clients','shared_stock_record','atomic_commit','one_winner_asserted']));
 assert.equal(r.release_verified,false);assert.ok(r.claims[0].missing.includes('parallel_clients'));assert.equal(r.accepted,0);
});
test('F08 overlapping independent transactions give structured but UNATTESTED evidence',()=>{
 const f={requests:[{connection_id:'a',resource_id:'stock-1',started_at_ms:0,completed_at_ms:10,outcome:'success'},{connection_id:'b',resource_id:'stock-1',started_at_ms:3,completed_at_ms:12,outcome:'failed'}],database_transactions_observed:true,database_dialect:'postgres',orders_created:1,stock_after:0};
 const r=evaluateSemanticClaims(report('true-concurrency',f));
 assert.equal(r.claims[0].status,'evidence-present-unattested');assert.equal(r.accepted,0);
});
test('F10 offline tab close inside same browser process fails full restart requirement',()=>{
 const f={network_disconnected_before_checkout:true,queued_before_restart:1,queue_written_to_persistent_storage:true,browser_process_terminated:false,process_before:'p1',process_after:'p1',profile_before:'a',profile_after:'a',queued_after_restart:1,recovered_same_operation_id:true,orders_created:1,ledger_movements:1,queue_after_sync:0,backend_assertions_executed:true};
 const r=evaluateSemanticClaims(report('offline-restart',f));
 assert.ok(r.claims[0].missing.includes('browser_closed'));assert.ok(r.claims[0].missing.includes('browser_reopened'));
});
test('F04 $100 less $10 plus $9 tax must produce $99 order and payment',()=>{
 const f={price_source:'server',override_policy_checked:true,gross_minor:10000,item_discount_minor:1000,tax_minor:900,total_minor:11000,payment_sum_minor:11000};
 const bad=evaluateSemanticClaims(report('financial-reconciliation',f));
 assert.ok(bad.claims[0].missing.includes('item_order_reconcile'));
 f.total_minor=9900;f.payment_sum_minor=9900;
 assert.equal(evaluateSemanticClaims(report('financial-reconciliation',f)).structurally_supported,1);
});
test('F05 zero payment on paid order cannot satisfy payment reconciliation',()=>{
 const f={price_source:'server',override_policy_checked:true,gross_minor:10000,item_discount_minor:0,tax_minor:0,total_minor:10000,payment_sum_minor:0};
 assert.ok(evaluateSemanticClaims(report('financial-reconciliation',f)).claims[0].missing.includes('payment_reconcile'));
});
test('F06 duplicate refund item IDs require bounded restock or rejection',()=>{
 const f={same_item_id_appears_twice_in_single_request:true,request_rejected_or_aggregated:false,restock_qty:2,qty_purchased:1};
 assert.ok(evaluateSemanticClaims(report('refund-duplicate-lines',f)).claims[0].missing.includes('bounded_refund_and_restock'));
});
test('F07 $1 amount-only refund must never automatically restore entire stock',()=>{
 const f={refund_minor:100,original_paid_minor:10000,explicit_return_items:false,restock_qty:5};
 assert.ok(evaluateSemanticClaims(report('refund-amount-only',f)).claims[0].missing.includes('no_implicit_restock'));
});
test('F02 online checkout auth cannot substitute offline sync, refund and inventory denials',()=>{
 const f={denied_entry_points:['online'],forbidden_requests_db_unchanged:true,cross_org_relations_rejected:true};
 assert.ok(evaluateSemanticClaims(report('tenant-entry-points',f)).claims[0].missing.includes('cross_tenant_denials'));
});
test('F09 transfer receive/cancel sequential is not a concurrent test',()=>{
 const f={requests:[{connection_id:'a',resource_id:'transfer-1',started_at_ms:0,completed_at_ms:2,outcome:'success'},{connection_id:'b',resource_id:'transfer-1',started_at_ms:3,completed_at_ms:5,outcome:'failed'}],stock_movements:1,final_state:'received'};
 assert.ok(evaluateSemanticClaims(report('transfer-race',f)).claims[0].missing.includes('parallel_transitions'));
});
test('F11 account switch with stale personalized HTML fails isolation',()=>{
 const f={user_before:'a',user_after:'b',foreign_queue_visible:0,personalized_cache_leaks:1,account_switch_completed:true};
 assert.ok(evaluateSemanticClaims(report('offline-account-switch',f)).claims[0].missing.includes('no_cross_account_cache'));
});
test('F12 idempotency key reused with different payload without conflict must fail',()=>{
 const f={first_transaction_committed:true,response_dropped_after_commit:true,same_operation_id:true,same_payload_hash:true,orders_created:1,ledger_movements:1,different_payload_rejected:false,conflict_status:200};
 assert.ok(evaluateSemanticClaims(report('lost-response-retry',f)).claims[0].missing.includes('no_duplicate_asserted'));
});
test('F14 fabricated external origin and all claims cannot provide independent verification',()=>{
 const x=report('true-concurrency',{},['parallel_clients','shared_stock_record','atomic_commit','one_winner_asserted']);x.claims[0].evidence[0].independent=true;
 const r=evaluateSemanticClaims(x);
 assert.equal(r.accepted,0);assert.equal(r.release_verified,false);assert.equal(r.report_status,'insufficient-evidence');
});
test('unknown custom scenario is conservatively unsupported',()=>{
 const x={revision:'r',claims:[{id:'custom',scenario:'no-risk',required_capabilities:['custom-cap'],evidence:[{origin:'external-test-harness',verdict:'passed',revision:'r',checked_at:'2026-11-18T09:00:00Z',reference:'ci:run1',witnessed_capabilities:['custom-cap']}]}]};
 assert.equal(evaluateSemanticClaims(x).report_status,'insufficient-evidence');
});
test('duplicate claim identifiers rejected',()=>{
 const c={id:'same',scenario:'true-concurrency',evidence:[]};
 assert.throws(()=>evaluateSemanticClaims({revision:'r',claims:[c,c]}),/duplicate/);
});
