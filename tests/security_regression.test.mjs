import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.mjs';
import { Store } from '../src/storage.mjs';
import {
  safeArtifactPath,
  authorizeWorkspace,
  requireAuthorizedWorkspace,
  invalidateWorkspaceCache,
  MAX_ARTIFACT_BYTES
} from '../src/security.mjs';
import { verifyHandoff, computeSourceFingerprint } from '../src/verification.mjs';

function createSecurityFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-sec-test-'));
  const home = path.join(base, 'home');
  const ws1 = path.join(base, 'workspaces', 'ws1');
  const ws2 = path.join(base, 'workspaces', 'ws2');
  const outsideDir = path.join(base, 'outside');

  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(ws1, { recursive: true });
  fs.mkdirSync(ws2, { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });

  const envBackup = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
    VERIFYKIT_DATA_DIR: process.env.VERIFYKIT_DATA_DIR,
    A2A_DATA_DIR: process.env.A2A_DATA_DIR,
    ANTIGRAVITY_CONVERSATION_ID: process.env.ANTIGRAVITY_CONVERSATION_ID,
  };

  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = path.join(home, 'AppData', 'Roaming');
  process.env.VERIFYKIT_DATA_DIR = path.join(base, 'data');
  delete process.env.A2A_DATA_DIR;
  delete process.env.ANTIGRAVITY_CONVERSATION_ID;

  invalidateWorkspaceCache();

  // Create project markers
  fs.writeFileSync(path.join(ws1, 'package.json'), JSON.stringify({ name: 'ws1', scripts: { test: 'node --test' } }));
  fs.writeFileSync(path.join(ws2, 'package.json'), JSON.stringify({ name: 'ws2', scripts: { test: 'node --test' } }));

  authorizeWorkspace(ws1);
  authorizeWorkspace(ws2);

  const cleanup = () => {
    Object.assign(process.env, envBackup);
    if (!envBackup.A2A_DATA_DIR) delete process.env.A2A_DATA_DIR;
    if (!envBackup.VERIFYKIT_DATA_DIR) delete process.env.VERIFYKIT_DATA_DIR;
    if (!envBackup.ANTIGRAVITY_CONVERSATION_ID) delete process.env.ANTIGRAVITY_CONVERSATION_ID;
    if (!envBackup.USERPROFILE) delete process.env.USERPROFILE;
    if (!envBackup.APPDATA) delete process.env.APPDATA;
    try {
      fs.rmSync(base, { recursive: true, force: true });
    } catch {}
  };

  return { base, home, ws1, ws2, outsideDir, cleanup };
}

test('Security: Arbitrary file read outside workspace is blocked', (t) => {
  const { ws1, outsideDir, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const sensitiveOutside = path.join(outsideDir, 'secret.txt');
  fs.writeFileSync(sensitiveOutside, 'TOP_SECRET_DATA');

  const convId = 'conv-sec-1234-test';

  // Attempting safeArtifactPath on outside file without workspace or brain containment
  assert.throws(() => {
    safeArtifactPath(ws1, convId, sensitiveOutside);
  }, /escapes authorized workspace|denied/i);

  // Attempting to read system file
  assert.throws(() => {
    safeArtifactPath(ws1, convId, '/etc/passwd');
  }, /escapes authorized workspace|denied/i);
});

test('Security: Sensitive files inside workspace are blocked from snapshot', (t) => {
  const { ws1, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const envFile = path.join(ws1, '.env');
  fs.writeFileSync(envFile, 'DB_PASSWORD=secret123');

  const keyFile = path.join(ws1, 'server.key');
  fs.writeFileSync(keyFile, '-----BEGIN PRIVATE KEY-----');

  const convId = 'conv-sec-sensitive';

  assert.throws(() => {
    safeArtifactPath(ws1, convId, envFile);
  }, /sensitive file denied/i);

  assert.throws(() => {
    safeArtifactPath(ws1, convId, keyFile);
  }, /sensitive file denied/i);
});

test('Security: Symlink escape attempt is denied', (t) => {
  const { ws1, outsideDir, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const outsideFile = path.join(outsideDir, 'external.txt');
  fs.writeFileSync(outsideFile, 'external content');

  const symlinkPath = path.join(ws1, 'link-outside.txt');
  try {
    fs.symlinkSync(outsideFile, symlinkPath);
  } catch (err) {
    if (err.code === 'EPERM') return; // Skip on Windows if permissions insufficient
  }

  const convId = 'conv-sec-symlink';

  assert.throws(() => {
    safeArtifactPath(ws1, convId, symlinkPath);
  }, /symlink access denied/i);
});

test('Security: Oversized artifacts exceeding 500 KB are rejected', (t) => {
  const { ws1, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const hugeFile = path.join(ws1, 'huge_artifact.md');
  const buffer = Buffer.alloc(MAX_ARTIFACT_BYTES + 1024, 'A');
  fs.writeFileSync(hugeFile, buffer);

  const convId = 'conv-sec-huge';

  assert.throws(() => {
    safeArtifactPath(ws1, convId, hugeFile);
  }, /maximum allowed size/i);
});

test('Security & Ownership: Artifact versions are isolated per workspace', (t) => {
  const { ws1, ws2, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const store = new Store();
  t.after(() => store.close());

  const ws1Id = store.register(ws1);
  const ws2Id = store.register(ws2);

  const convId = '00000000-0000-0000-0000-000000000001';
  const brainDir = path.join(process.env.HOME, '.gemini', 'antigravity', 'brain', convId);
  fs.mkdirSync(brainDir, { recursive: true });

  const artifactFile = path.join(brainDir, 'architecture_plan.md');
  fs.writeFileSync(artifactFile, '# Architecture Plan v1\nInitial design.');

  // Snapshot under Workspace 1
  const snap1 = store.snapshotArtifact({
    workspaceId: ws1Id,
    workspaceRoot: ws1,
    conversationId: convId,
    artifactPath: artifactFile
  });

  assert.equal(snap1.version_number, 1);

  // Listing artifacts under Workspace 1 finds it
  const listWs1 = store.listArtifactVersions({
    workspaceId: ws1Id,
    conversationId: convId,
    artifactName: 'architecture_plan.md'
  });
  assert.equal(listWs1.length, 1);
  assert.equal(listWs1[0].workspace_id, ws1Id);

  // Listing artifacts under Workspace 2 does NOT find it
  const listWs2 = store.listArtifactVersions({
    workspaceId: ws2Id,
    conversationId: convId,
    artifactName: 'architecture_plan.md'
  });
  assert.equal(listWs2.length, 0);

  // getArtifactVersion under Workspace 2 returns null
  const verWs2 = store.getArtifactVersion({
    workspaceId: ws2Id,
    conversationId: convId,
    artifactName: 'architecture_plan.md',
    versionNumber: 1
  });
  assert.equal(verWs2, null);
});

test('Security: Source fingerprint staleness detects post-test modifications', (t) => {
  const { ws1, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const store = new Store();
  t.after(() => store.close());
  const wsId = store.register(ws1);

  const srcFile = path.join(ws1, 'math.js');
  fs.writeFileSync(srcFile, 'export function add(a, b) { return a + b; }\n');

  const testReport = path.join(ws1, 'report.tap');
  fs.writeFileSync(testReport, 'TAP version 13\n1..1\nok 1 - test add\n');

  // Compute initial source fingerprint
  const fp1 = computeSourceFingerprint(ws1, ['math.js']);

  // Record verification run
  const res1 = verifyHandoff(store, wsId, ws1, 'rev-initial', {
    worker_name: 'test-worker',
    changed: ['math.js'],
    artifact: 'report.tap',
    criteria: ['test add']
  });

  assert.equal(res1.tests_passed, true);
  assert.equal(res1.deliverable_verified, false);
  assert.equal(res1.status,'unattested_report');
  assert.equal(res1.source_fingerprint, fp1);

  // Backdate test report by 5 seconds to simulate prior test run before modification
  const tOld = (Date.now() - 5000) / 1000;
  fs.utimesSync(testReport, tOld, tOld);

  // Modify source code without re-running test
  fs.writeFileSync(srcFile, 'export function add(a, b) { return a - b; /* BUG INJECTED */ }\n');

  const fp2 = computeSourceFingerprint(ws1, ['math.js']);
  assert.notEqual(fp1, fp2, 'Source fingerprint must change when source is modified');

  // Verifying again without allow_stale must fail with stale status
  const res2 = verifyHandoff(store, wsId, ws1, 'rev-stale', {
    worker_name: 'test-worker',
    changed: ['math.js'],
    artifact: 'report.tap',
    criteria: ['test add'],
    allow_stale: false
  });

  assert.equal(res2.verified, false);
  assert.equal(res2.status, 'stale');
});

test('False-PASS Prevention: Passing test without mapped criteria cannot verify deliverable', (t) => {
  const { ws1, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const store = new Store();
  t.after(() => store.close());
  const wsId = store.register(ws1);

  const srcFile = path.join(ws1, 'feature.js');
  fs.writeFileSync(srcFile, 'export function feature() { return "incomplete"; }\n');

  // Report contains an unrelated passing test (e.g. ExampleTest)
  const testReport = path.join(ws1, 'unrelated.tap');
  fs.writeFileSync(testReport, 'TAP version 13\n1..1\nok 1 - sample default sanity check\n');

  // Call verifyHandoff with NO criteria
  const resNoCriteria = verifyHandoff(store, wsId, ws1, 'rev-crit', {
    worker_name: 'worker-a',
    changed: ['feature.js'],
    artifact: 'unrelated.tap',
    criteria: []
  });

  // tests_passed is true (runner succeeded), but deliverable_verified is false!
  assert.equal(resNoCriteria.tests_passed, true);
  assert.equal(resNoCriteria.deliverable_verified, false);
  assert.equal(resNoCriteria.verified, false);
  assert.equal(resNoCriteria.status, 'unverified_deliverable');
  assert.ok(/no acceptance criteria/i.test(resNoCriteria.reason));

  // Call verifyHandoff with unmapped criteria
  const resUnmapped = verifyHandoff(store, wsId, ws1, 'rev-crit', {
    worker_name: 'worker-a',
    changed: ['feature.js'],
    artifact: 'unrelated.tap',
    criteria: ['feature returns complete output']
  });

  assert.equal(resUnmapped.tests_passed, true);
  assert.equal(resUnmapped.deliverable_verified, false);
  assert.equal(resUnmapped.verified, false);
  assert.equal(resUnmapped.status, 'inconclusive');
  assert.ok(/could not be verified/i.test(resUnmapped.reason));
});

test('Cross-platform: macOS /private and Windows case-insensitive path boundaries', (t) => {
  const { ws1, cleanup } = createSecurityFixture();
  t.after(cleanup);

  const envFile = path.join(ws1, '.env');
  fs.writeFileSync(envFile, 'SECRET=123');

  const hugeFile = path.join(ws1, 'huge.md');
  fs.writeFileSync(hugeFile, Buffer.alloc(MAX_ARTIFACT_BYTES + 1024, 'B'));

  const canonicalWs = fs.realpathSync(ws1);
  assert.throws(() => {
    safeArtifactPath(canonicalWs, 'conv-cross-plat', envFile);
  }, /sensitive file denied/i);

  assert.throws(() => {
    safeArtifactPath(canonicalWs, 'conv-cross-plat', hugeFile);
  }, /maximum allowed size/i);
});
