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
 const ids=new Set(r.required_test_ids);
 assert.ok(ids.has('auth-entry-points'));assert.ok(ids.has('finance-paid-reconcile'));
 assert.ok(ids.has('idem-payload-conflict'));
});
test('refund and stock transfers require duplicate lines, amount-only refund and race checks',()=>{
 const r=proposeRiskTests({paths:['app/Services/RefundService.php','app/Services/StockTransferService.php']});
 for(const id of ['refund-duplicate-lines','refund-amount-only','transfer-race','concurrent-last-stock'])assert.ok(r.required_test_ids.includes(id),id);
 assert.ok(r.findings.every(f=>f.negative_test_scenarios.every(t=>t.status==='not-run')));
});
test('service worker triggers both offline cross-account and browser restart scenarios',()=>{
 const r=proposeRiskTests({paths:['public/sw.js']});
 assert.ok(r.required_test_ids.includes('offline-user-switch'));
 assert.ok(r.required_test_ids.includes('offline-process-restart'));
});
