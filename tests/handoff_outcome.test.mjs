import test from 'node:test';
import assert from 'node:assert/strict';
import {handoffOutcome} from '../src/verification.mjs';

test('SAFE handoffs distinguish source freshness, test failures and incomplete worker claims',()=>{
 assert.equal(handoffOutcome('stale',{verified:true,testsPassed:true}),'stale','stale wins over an old passing report');
 assert.equal(handoffOutcome('failed',{testsPassed:false}),'failed');
 assert.equal(handoffOutcome('passed',{verified:true,testsPassed:true}),'completed');
 assert.equal(handoffOutcome('unverified_deliverable',{testsPassed:true}),'partial');
 assert.equal(handoffOutcome('unattested_report',{testsPassed:true}),'partial');
 assert.equal(handoffOutcome('inconclusive',{testsPassed:false}),'unknown');
 assert.equal(handoffOutcome('missing_evidence'),'unknown');
 assert.equal(handoffOutcome('blocked'),'partial');
 assert.equal(handoffOutcome('passed',{verified:false,testsPassed:false}),'unknown');
});
