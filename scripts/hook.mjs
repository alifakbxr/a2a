#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, getA2AMode, getCompactMode } from '../src/security.mjs';
import { sanitizeConversationId } from '../src/tokens.mjs';
import { Store } from '../src/storage.mjs';

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

export function detectSideQuestionInfo(payload, transcriptPath) {
  let isSideQuestion = Boolean(payload?.isSideQuestion || payload?.sideQuestion);
  let parentConversationId = payload?.parentConversationId || null;
  let initialQuestion = null;
  const currentConvId = sanitizeConversationId(payload?.conversationId);

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    try {
      const stream = fs.readFileSync(transcriptPath, 'utf8');
      if (stream.includes('<side_question>') || stream.includes('side question (/btw)')) {
        isSideQuestion = true;
      }
      if (!parentConversationId) {
        const matches = [...stream.matchAll(/brain\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi)];
        for (const m of matches) {
          if (m[1] && m[1] !== currentConvId) {
            parentConversationId = m[1];
            break;
          }
        }
      }
      const lines = stream.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          if (row.type === 'USER_INPUT' && row.content) {
            const cleanText = row.content
              .replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '')
              .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
              .replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/g, '')
              .trim();
            if (cleanText) {
              initialQuestion = cleanText.slice(0, 1000);
              break;
            }
          }
        } catch {}
      }
    } catch {}
  }

  if (!isSideQuestion && currentConvId) {
    try {
      const metaCache = path.join(process.env.HOME || '', '.gemini/antigravity-cli/cache/conversation_metadata.json');
      if (fs.existsSync(metaCache)) {
        const data = JSON.parse(fs.readFileSync(metaCache, 'utf8'));
        const conv = data?.conversations?.[currentConvId];
        if (conv?.is_internal) {
          isSideQuestion = true;
        }
      }
    } catch {}
  }

  return { isSideQuestion, parentConversationId, initialQuestion };
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

  const sideQ = detectSideQuestionInfo(payload, transcriptPath);
  const now = new Date().toISOString();
  const entry = {
    conversationId: convId,
    transcriptPath,
    workspacePaths,
    cwd,
    modelName: typeof payload?.modelName === 'string' ? payload.modelName : null,
    updatedAt: now,
    ...(sideQ.isSideQuestion ? {
      sideQuestion: {
        isSideQuestion: true,
        parentConversationId: sideQ.parentConversationId,
        question: sideQ.initialQuestion,
      }
    } : {}),
  };

  if (sideQ.isSideQuestion && convId) {
    try {
      const store = new Store(baseDir);
      try {
        let wsId = null;
        if (workspacePaths.length > 0) {
          try { wsId = store.register(workspacePaths[0]); } catch {}
        }
        store.recordSideQuestion({
          workspaceId: wsId,
          conversationId: convId,
          parentConversationId: sideQ.parentConversationId,
          question: sideQ.initialQuestion || 'Side Question',
          transcriptPath,
          status: 'active'
        });
      } finally {
        store.close();
      }
    } catch {}
  }

  const byWorkspace = (existing.byWorkspace && typeof existing.byWorkspace === 'object') ? { ...existing.byWorkspace } : {};
  for (const ws of workspacePaths) {
    byWorkspace[ws] = { conversationId: convId, transcriptPath, updatedAt: now };
  }
  if (cwd && !byWorkspace[cwd]) {
    byWorkspace[cwd] = { conversationId: convId, transcriptPath, updatedAt: now };
  }

  writeJsonSecure(sessionFile, { updatedAt: now, latest: entry, byWorkspace });

  if (convId) {
    try {
      const store = new Store(baseDir);
      try {
        store.scanAndSnapshotBrainArtifacts(convId);
      } finally {
        store.close();
      }
    } catch {}
  }
}

function handleArtifactModification(payload, baseDir) {
  const toolName = payload?.toolName || payload?.toolCall?.name || '';
  if (toolName !== 'write_file' && toolName !== 'edit_file') return;
  const args = payload?.toolArgs || payload?.toolCall?.args || payload?.toolInput || payload?.arguments || {};
  const filePath = args?.Path || args?.path;
  if (typeof filePath !== 'string' || !filePath.includes('/brain/')) return;
  if (!filePath.endsWith('.md')) return;
  const convId = sanitizeConversationId(payload?.conversationId);
  if (!convId) return;
  try {
    const store = new Store(baseDir);
    try {
      store.snapshotArtifact({ conversationId: convId, artifactPath: filePath });
    } finally {
      store.close();
    }
  } catch {}
}

function recordCommandRun(payload, baseDir) {
  handleArtifactModification(payload, baseDir);
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
    const compact = getCompactMode();
    return {
      injectSteps: [
        {
          systemMessage: {
            systemMessage: compact ? 'A2A Compact active.' : 'A2A active.',
          },
        },
      ],
    };
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
