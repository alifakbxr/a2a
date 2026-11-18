import test from 'node:test';
import assert from 'node:assert/strict';
import {rankFallbackTests,inferEntryPointRisks} from '../src/graph.mjs';
test('fallback suggestions prefer same feature and never claim a passing test',()=>{
 const files=['tests/Feature/OrderCheckoutTest.php','tests/Feature/StockTest.php','tests/Unit/MathTest.php'];
 const ranked=rankFallbackTests(['app/Services/OrderCheckoutService.php'],files);
 assert.deepEqual(ranked,['tests/Feature/OrderCheckoutTest.php']);
});
test('unknown tests are not blindly returned as related tests',()=>assert.deepEqual(rankFallbackTests(['src/sessions.ts'],['test/checkout.test.ts']),[]));

test('Laravel route and offline service changes require independent role matrix',()=>{
 const r=inferEntryPointRisks(['routes/web.php','app/Services/OfflineSyncService.php']);
 assert.equal(r.requires_role_matrix,true);
 assert.equal(r.requires_domain_invariant_tests,true);
 assert.equal(r.verified_coverage,false);
 assert.ok(r.entry_points.includes('offline-sync'));
});
test('frontend style-only change is not a proven security bug',()=>{
 const r=inferEntryPointRisks(['resources/js/components/Badge.vue']);
 assert.equal(r.requires_role_matrix,false);
 assert.equal(r.verified_coverage,false);
});
