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
 assert.equal(r.status,'no-domain-signals-detected');
 assert.ok(r.limitations.some(x=>x.includes('does not mean')));
});
test('risk output is bounded for large untrusted request',()=>{
 const r=proposeRiskTests({paths:Array.from({length:500},()=>('payment inventory offline '.repeat(500)))});
 assert.ok(r.findings.length<=4);assert.ok(JSON.stringify(r).length<8000);
});
