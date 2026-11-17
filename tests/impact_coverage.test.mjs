import test from 'node:test';
import assert from 'node:assert/strict';
import {rankFallbackTests} from '../src/graph.mjs';
test('fallback suggestions prefer same feature and never claim a passing test',()=>{
 const files=['tests/Feature/OrderCheckoutTest.php','tests/Feature/StockTest.php','tests/Unit/MathTest.php'];
 const ranked=rankFallbackTests(['app/Services/OrderCheckoutService.php'],files);
 assert.deepEqual(ranked,['tests/Feature/OrderCheckoutTest.php']);
});
test('unknown tests are not blindly returned as related tests',()=>assert.deepEqual(rankFallbackTests(['src/sessions.ts'],['test/checkout.test.ts']),[]));
