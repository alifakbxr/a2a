#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, getA2AMode, getCompactMode } from '../src/security.mjs';
import { sanitizeConversationId } from '../src/tokens.mjs';

function writeJsonSecure(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(filePath, flags, 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, JSON.stringify(obj, null, 2) + '\n');
  } finally {
    fs.closeSync(fd);
  }
}

function recordActiveSession(payload, baseDir) {
  const convId = sanitizeConversationId(payload?.conversationId);
  const transcriptPath = typeof payload?.transcriptPath === 'string' ? payload.transcriptPath : null;
  const workspacePaths = Array.isArray(payload?.workspacePaths)
    ? payload.workspacePaths.filter(w => typeof w === 'string' && path.isAbsolute(w))
    : [];
  const cwd = typeof payload?.cwd === 'string' && path.isAbsolute(payload.cwd) ? payload.cwd : null;
  if (!convId && !transcriptPath) return;

  const sessionFile = path.join(baseDir, 'active-session.json');
  let existing = {};
  try {
    if (fs.existsSync(sessionFile)) {
      existing = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) || {};
    }
  } catch {}

  const prev = existing.latest || {};
  const prevWs = Array.isArray(prev.workspacePaths) ? prev.workspacePaths.join('|') : '';
  const nextWs = workspacePaths.join('|');
  if (prev.conversationId === convId && prev.transcriptPath === transcriptPath && prevWs === nextWs && prev.cwd === cwd) {
    return;
  }

  const now = new Date().toISOString();
  const entry = {
    conversationId: convId,
    transcriptPath,
    workspacePaths,
    cwd,
    modelName: typeof payload?.modelName === 'string' ? payload.modelName : null,
    updatedAt: now,
  };

  const byWorkspace = (existing.byWorkspace && typeof existing.byWorkspace === 'object') ? { ...existing.byWorkspace } : {};
  for (const ws of workspacePaths) {
    byWorkspace[ws] = { conversationId: convId, transcriptPath, updatedAt: now };
  }
  if (cwd && !byWorkspace[cwd]) {
    byWorkspace[cwd] = { conversationId: convId, transcriptPath, updatedAt: now };
  }

  writeJsonSecure(sessionFile, { updatedAt: now, latest: entry, byWorkspace });
}

function recordCommandRun(payload, baseDir) {
  const cmd = payload?.toolCall?.args?.CommandLine;
  if (typeof cmd !== 'string' || !cmd.trim()) return;
  const isTestLike = /\b(?:test|pytest|phpunit|pest|vitest|jest|mocha|cargo\s+test|go\s+test|dotnet\s+test|flutter\s+test|swift\s+test|mvn\s+test|gradlew\s+test)\b/i.test(cmd);
  if (!isTestLike) return;
  const reportFile = path.join(baseDir, 'last-test-run.json');
  writeJsonSecure(reportFile, {
    updatedAt: new Date().toISOString(),
    conversationId: sanitizeConversationId(payload?.conversationId),
    cwd: typeof payload?.cwd === 'string' ? payload.cwd : null,
    command: cmd.slice(0, 200),
    errored: Boolean(payload?.error),
  });
}

export function handleHookEvent(payload, { baseDir = dataDir() } = {}) {
  if (!payload || typeof payload !== 'object') return {};
  const event = payload.hookEventName || '';

  if (event === 'SessionStart' || event === 'PreInvocation') {
    recordActiveSession(payload, baseDir);
  } else if (event === 'PostToolUse') {
    recordCommandRun(payload, baseDir);
    return {};
  }

  if (event === 'SessionStart') {
    const mode = getA2AMode();
    const compact = getCompactMode();
    if (mode === 'always-on' || compact) {
      const convId = sanitizeConversationId(payload.conversationId) || 'unknown';
      const parts = [`A2A session active (mode=${mode}, compact=${compact ? 'on' : 'off'}, conversation_id=${convId}).`];
      if (mode === 'always-on') {
        parts.push('Run a2a_impact before edits and a2a_verify(assess) after tests.');
      }
      if (compact) {
        parts.push('Compact protocol active: concise bullet output, zero filler, preserve exact code/paths/commands.');
      }
      return {
        injectSteps: [
          {
            systemMessage: {
              systemMessage: parts.join(' '),
            },
          },
        ],
      };
    }
  }

  return {};
}

const isEntry = import.meta.url === new URL(`file://${path.resolve(process.argv[1] || '')}`).href;
if (isEntry) {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
    const payload = raw.trim() ? JSON.parse(raw) : {};
    const out = handleHookEvent(payload);
    process.stdout.write(JSON.stringify(out) + '\n');
  } catch {
    process.stdout.write('{}\n');
  }
  process.exit(0);
}
