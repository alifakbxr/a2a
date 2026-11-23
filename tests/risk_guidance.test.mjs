import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeRiskTests} from '../src/risk-guidance.mjs';
test('offline checkout surfaces tenant, financial and queue adversarial scenarios',()=>{
 const r=proposeRiskTests({paths:['src/api/offlineSync.ts','src/services/CheckoutService.php'],criteria:['Tenant authorization']});
 const domains=r.findings.map(x=>x.domain);
 assert.ok(domains.includes('authorization-and-tenant-isolation'));
 assert.ok(domains.includes('financial-integrity'));
 assert.ok(domains.includes('offline-security-and-recovery'));
 assert.ok(r.findings.every(x=>x.negative_test_scenarios.every(s=>s.status==='not-run')));
});
test('unrelated source returns unknown rather than secure verdict',()=>{
 const r=proposeRiskTests({paths:['src/components/Navbar.vue']});
 assert.equal(r.status,'suggestions-only');
 assert.deepEqual(r.findings.map(x=>x.domain),['web-usability-and-operations']);
 assert.ok(r.limitations.some(x=>x.includes('does not mean')));
});
test('risk output is bounded for large untrusted request',()=>{
 const r=proposeRiskTests({paths:Array.from({length:500},()=>('payment inventory offline '.repeat(500)))});
 assert.ok(r.findings.length<=4);assert.ok(JSON.stringify(r).length<8000);
});

test('routes/web.php and POS controllers require cross-entrypoint auth and financial checks',()=>{
 const r=proposeRiskTests({paths:['routes/web.php','app/Http/Controllers/PosController.php']});
 const ids=new Set(r.suggested_test_ids);
 assert.ok(ids.has('auth-entry-points'));assert.ok(ids.has('finance-paid-reconcile'));
 assert.ok(ids.has('idem-payload-conflict'));
});
test('refund and stock transfers require duplicate lines, amount-only refund and race checks',()=>{
 const r=proposeRiskTests({paths:['app/Services/RefundService.php','app/Services/StockTransferService.php']});
 for(const id of ['refund-duplicate-lines','refund-amount-only','transfer-race','concurrent-last-stock'])assert.ok(r.suggested_test_ids.includes(id),id);
 assert.ok(r.findings.every(f=>f.negative_test_scenarios.every(t=>t.status==='not-run')));
});
test('service worker triggers both offline cross-account and browser restart scenarios',()=>{
 const r=proposeRiskTests({paths:['public/sw.js']});
 assert.ok(r.suggested_test_ids.includes('offline-user-switch'));
 assert.ok(r.suggested_test_ids.includes('offline-process-restart'));
});

test('maintainer workflow for risky changes is opt-in within existing verify plan and never claims a pass',async()=>{
 const {planVerification}=await import('../src/verification.mjs');
 const plan=planVerification({index:{files:[]},impact:{changed:['app/Http/Controllers/PosController.php'],risk:'high',related_tests:[],uncertainty:['static only']},criteria:['Checkout cannot access foreign stores']});
 assert.equal(plan.maintainer_review.status,'not-reviewed');
 assert.equal(plan.maintainer_review.required_checks.length,4);
 assert.ok(plan.maintainer_review.required_checks.some(x=>x.includes('Minimal diff')));
 assert.ok(plan.maintainer_review.required_checks.some(x=>x.includes('regression')));
 assert.ok(plan.maintainer_review.required_checks.some(x=>x.includes('public API')));
 assert.equal(plan.maintainer_review.proof,'native-test-and-human-review-required');
 assert.equal(plan.state,'not_run');
 assert.ok(!('release_ready' in plan));
 assert.ok(JSON.stringify(plan.maintainer_review).length<500);
});
test('low-risk styling and no-op work does not receive extra maintainer guidance',async()=>{
 const {planVerification}=await import('../src/verification.mjs');
 const low=planVerification({index:{files:[]},impact:{changed:['src/components/Navbar.vue'],risk:'low',related_tests:[],uncertainty:[]},criteria:['Update padding']});
 assert.equal(low.maintainer_review,undefined);
 const none=planVerification({index:{files:[]},impact:{changed:[],risk:'unknown',related_tests:[],uncertainty:[]},criteria:[]});
 assert.equal(none.maintainer_review,undefined);
});

test('compact risk suggestions are scoped, counted and never auto-mandatory',()=>{
 const full=proposeRiskTests({paths:['src/api/offlineSync.ts','src/services/CheckoutService.php'],criteria:['Tenant authorization']});
 const compact=proposeRiskTests({paths:['src/api/offlineSync.ts','src/services/CheckoutService.php'],criteria:['Tenant authorization'],compact:true});
 assert.deepEqual(compact.required_test_ids,[]);
 assert.equal(compact.adopted_as_mandatory,false);
 assert.ok(compact.suggested_visible<=3);
 assert.ok(compact.suggested_total>=compact.suggested_visible);
 assert.equal(compact.more_available,compact.suggested_total>compact.suggested_visible);
 assert.equal(full.suggested_total,compact.suggested_total);
 assert.ok(compact.findings.some(x=>x.priority==='critical'));
 assert.ok(compact.findings.every(x=>x.negative_test_scenarios.every(y=>y.status==='not-run')));
 const {planVerification}=globalThis; // No agent model or extra tools are invoked by these heuristics.
 assert.equal(planVerification,undefined);
});
