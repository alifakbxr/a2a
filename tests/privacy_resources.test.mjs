import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldIgnore} from '../src/security.mjs';
import {saveRecoveryCheckpoint} from '../src/model-recovery.mjs';

test('credential locations and sensitive filenames are excluded from workspace indexing',()=>{
  for(const relative of [
    '.docker/config.json','.azure/accessTokens.json','.gcloud/application_default_credentials.json',
    'nested/id_ecdsa','nested/id_dsa','nested/secrets.jks','nested/recovery.keystore',
    'nested/personal.kdbx','nested/.htpasswd','nested/.pgpass','nested/.my.cnf',
    'nested/.vault-token','nested/.git-credentials','nested/production-service-account.json',
    'nested/service_account_prod.json'
  ])assert.equal(shouldIgnore(relative),true,relative);
  assert.equal(shouldIgnore('src/service-account.test.mjs'),false,'Ordinary source is not a credential JSON');
});

test('model recovery checkpoints refuse raw unassigned credential signatures',()=>{
  const store={run(){throw new Error('Credential reached persistence')}};
  for(const raw of [
    'ghp_'+'a'.repeat(28),
    'gho_'+'b'.repeat(28),
    'sk-'+'a'.repeat(28),
    'AKIA'+'A'.repeat(16),
    'npm_'+'b'.repeat(24),
    '-----BEGIN PRIVATE KEY-----'
  ]){
    assert.throws(()=>saveRecoveryCheckpoint(store,1,{
      conversationId:'test-privacy-checkpoint',revision:'r1',taskSummary:'Next action: '+raw
    }),/possible credential/i,raw);
  }
});
