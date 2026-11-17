import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { dataDir } from './security.mjs';

export const estimateTokens = (textOrBytes) => {
  if (typeof textOrBytes === 'string') {
    if (textOrBytes.length === 0) return 0;
    return Math.max(1, Math.round(textOrBytes.length / 3.8));
  }
  if (typeof textOrBytes === 'number') {
    if (!Number.isFinite(textOrBytes) || textOrBytes <= 0) return 0;
    return Math.max(1, Math.round(textOrBytes / 3.8));
  }
  return 0;
};

const C_STYLE_EXTS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts',
  '.go', '.rs', '.java', '.kt', '.kts', '.swift', '.dart', '.cs',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.php', '.scss',
]);
const JS_LIKE_EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const HASH_EXTS = new Set(['.py', '.rb', '.sh', '.bash', '.zsh', '.yaml', '.yml', '.toml', '.php', '.ex', '.exs', '.gd']);
const DASH_EXTS = new Set(['.sql', '.lua']);
const HTML_EXTS = new Set(['.html', '.htm', '.xml', '.vue', '.svelte']);
const REGEX_PREFIX_KEYWORDS = new Set([
  'return', 'throw', 'case', 'in', 'of', 'typeof', 'void', 'delete', 'yield', 'await', 'else', 'new', 'do',
]);

/**
 * Single-pass state-machine lexer that strips comments while preserving string literals,
 * template literals (including ${...} expressions), and JS/TS regex literals.
 */
export function stripCommentsLex(code, ext = '', { preserveLines = false } = {}) {
  if (!code || typeof code !== 'string') return '';
  let normExt = String(ext || '').trim().toLowerCase();
  if (normExt && !normExt.startsWith('.')) normExt = '.' + normExt;

  const isHtml = HTML_EXTS.has(normExt);
  const isCssOnly = normExt === '.css';
  const isCStyle = !normExt || C_STYLE_EXTS.has(normExt);
  const isHash = HASH_EXTS.has(normExt);
  const isDashDash = DASH_EXTS.has(normExt);
  const isJsLike = !normExt || JS_LIKE_EXTS.has(normExt);
  const isGo = normExt === '.go';
  const isRust = normExt === '.rs';
  const isPhp = normExt === '.php';
  const isPython = normExt === '.py';

  const len = code.length;
  let out = '';
  let i = 0;
  let canStartRegex = true;
  const templateBraceStack = [];

  const emitCommentGap = (start, end) => {
    if (!preserveLines) {
      for (let k = start; k < end; k++) {
        if (code[k] === '\n') { out += '\n'; break; }
      }
      return;
    }
    for (let k = start; k < end; k++) {
      out += code[k] === '\n' ? '\n' : ' ';
    }
  };

  while (i < len) {
    const ch = code[i];

    // Inside template literal backtick text when returning from a ${...} expression
    if (ch === '}' && templateBraceStack.length > 0 && templateBraceStack[templateBraceStack.length - 1] === 0) {
      templateBraceStack.pop();
      out += '}';
      i++;
      // Continue consuming template literal until closing ` or next ${
      while (i < len) {
        const tc = code[i];
        if (tc === '\\' && i + 1 < len) {
          out += tc + code[i + 1];
          i += 2;
          continue;
        }
        if (tc === '$' && code[i + 1] === '{') {
          out += '${';
          i += 2;
          templateBraceStack.push(0);
          canStartRegex = true;
          break;
        }
        out += tc;
        i++;
        if (tc === '`') {
          canStartRegex = false;
          break;
        }
      }
      continue;
    }

    // Track brace nesting inside ${...}
    if (templateBraceStack.length > 0) {
      if (ch === '{') templateBraceStack[templateBraceStack.length - 1]++;
      else if (ch === '}') templateBraceStack[templateBraceStack.length - 1]--;
    }

    // HTML / XML / Vue / Svelte comments <!-- ... -->
    if (isHtml && code.startsWith('<!--', i)) {
      const endIdx = code.indexOf('-->', i + 4);
      const end = endIdx === -1 ? len : endIdx + 3;
      emitCommentGap(i, end);
      i = end;
      continue;
    }

    // Block comments /* ... */
    if ((isCStyle || isCssOnly) && ch === '/' && code[i + 1] === '*') {
      const endIdx = code.indexOf('*/', i + 2);
      const end = endIdx === -1 ? len : endIdx + 2;
      emitCommentGap(i, end);
      i = end;
      continue;
    }

    // Line comments // ...
    if (isCStyle && ch === '/' && code[i + 1] === '/') {
      let end = code.indexOf('\n', i + 2);
      if (end === -1) end = len;
      if (preserveLines) emitCommentGap(i, end);
      i = end;
      continue;
    }

    // Hash comments # ... (preserve PHP 8 attributes #[...])
    if (isHash && ch === '#' && !(isPhp && code[i + 1] === '[')) {
      let end = code.indexOf('\n', i + 1);
      if (end === -1) end = len;
      if (preserveLines) emitCommentGap(i, end);
      i = end;
      continue;
    }

    // SQL / Lua comments -- ...
    if (isDashDash && ch === '-' && code[i + 1] === '-') {
      let end = code.indexOf('\n', i + 2);
      if (end === -1) end = len;
      if (preserveLines) emitCommentGap(i, end);
      i = end;
      continue;
    }

    // Python triple-quoted strings
    if (isPython && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const delim = code.slice(i, i + 3);
      out += delim;
      i += 3;
      while (i < len) {
        if (code[i] === '\\' && i + 1 < len) {
          out += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        if (code.startsWith(delim, i)) {
          out += delim;
          i += 3;
          break;
        }
        out += code[i++];
      }
      canStartRegex = false;
      continue;
    }

    // Double-quoted strings
    if (ch === '"') {
      out += ch;
      i++;
      while (i < len) {
        const sc = code[i];
        out += sc;
        i++;
        if (sc === '\\' && i < len) {
          out += code[i++];
          continue;
        }
        if (sc === '"') break;
      }
      canStartRegex = false;
      continue;
    }

    // Single-quoted strings (skip Rust lifetimes like 'a or 'static)
    if (ch === "'") {
      let isCharOrStr = true;
      if (isRust) {
        const isEscChar = code[i + 1] === '\\' && i + 3 < len && code[i + 3] === "'";
        const isPlainChar = code[i + 1] && code[i + 1] !== '\\' && code[i + 2] === "'";
        isCharOrStr = isEscChar || isPlainChar;
      }
      if (isCharOrStr) {
        out += ch;
        i++;
        while (i < len) {
          const sc = code[i];
          out += sc;
          i++;
          if (sc === '\\' && i < len) {
            out += code[i++];
            continue;
          }
          if (sc === "'") break;
        }
        canStartRegex = false;
        continue;
      }
    }

    // Backtick template literals (JS/TS) or raw strings (Go)
    if (ch === '`' && (isJsLike || isGo)) {
      out += ch;
      i++;
      while (i < len) {
        const tc = code[i];
        if (!isGo && tc === '\\' && i + 1 < len) {
          out += tc + code[i + 1];
          i += 2;
          continue;
        }
        if (isJsLike && tc === '$' && code[i + 1] === '{') {
          out += '${';
          i += 2;
          templateBraceStack.push(0);
          canStartRegex = true;
          break;
        }
        out += tc;
        i++;
        if (tc === '`') {
          canStartRegex = false;
          break;
        }
      }
      continue;
    }

    // JS/TS regex literals /.../flags
    if (isJsLike && ch === '/' && canStartRegex && code[i + 1] !== '/' && code[i + 1] !== '*') {
      out += ch;
      i++;
      let inClass = false;
      while (i < len) {
        const rc = code[i];
        if (rc === '\n') break;
        out += rc;
        i++;
        if (rc === '\\' && i < len) {
          out += code[i++];
          continue;
        }
        if (rc === '[') inClass = true;
        else if (rc === ']' && inClass) inClass = false;
        else if (rc === '/' && !inClass) break;
      }
      while (i < len && /[a-zA-Z]/.test(code[i])) out += code[i++];
      canStartRegex = false;
      continue;
    }

    // Identifiers and keywords
    if (/[A-Za-z_$]/.test(ch)) {
      let end = i + 1;
      while (end < len && /[\w$]/.test(code[end])) end++;
      const word = code.slice(i, end);
      out += word;
      i = end;
      canStartRegex = REGEX_PREFIX_KEYWORDS.has(word);
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let end = i + 1;
      while (end < len && /[\w.]/.test(code[end])) end++;
      out += code.slice(i, end);
      i = end;
      canStartRegex = false;
      continue;
    }

    out += ch;
    i++;
    if (ch === ')' || ch === ']' || ch === '}') {
      canStartRegex = false;
    } else if ('([,;:?=!&|^~+-*%<>\n'.includes(ch)) {
      canStartRegex = true;
    }
  }

  return out;
}

/**
 * A2A Code Skeletonizer: Strips comments and redundant blank lines using a
 * single-pass lexer while preserving strings, templates, regexes, and code structure.
 */
export function skeletonizeCode(code, ext = '') {
  if (!code || typeof code !== 'string') return '';
  const stripped = stripCommentsLex(code, ext, { preserveLines: false });
  return stripped
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * A2A Context Minifier: Compacts whitespace while preserving leading indentation.
 */
export function minifyContext(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .split('\n')
    .map(line => {
      const m = line.match(/^([ \t]*)(.*)$/);
      const indent = m[1];
      const body = m[2].replace(/[ \t]+/g, ' ').trimEnd();
      return indent + body;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Approximate USD savings estimate from saved tokens based on configurable rate.
 */
export function estimateCostSavings(tokensSaved, ratePerMillion = 3.50) {
  if (!tokensSaved || tokensSaved <= 0) return '$0.00';
  const val = (tokensSaved / 1_000_000) * ratePerMillion;
  return `$${val.toFixed(4)}`;
}

export function estimateSessionCost({ uncachedInputTokens = 0, cacheReadTokens = 0, outputTokens = 0 } = {}) {
  const inputRate = 2.50;
  const cacheRate = 0.25;
  const outputRate = 10.00;
  const usd =
    (uncachedInputTokens / 1_000_000) * inputRate +
    (cacheReadTokens / 1_000_000) * cacheRate +
    (outputTokens / 1_000_000) * outputRate;
  return {
    approximate: true,
    estimated_usd: `$${usd.toFixed(4)}`,
    rates_per_million_usd: { uncached_input: inputRate, cache_read: cacheRate, output: outputRate },
    note: 'Approximate estimate using configurable blended rates; actual billing varies by model and tier.',
  };
}

export function sanitizeConversationId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(trimmed)) return null;
  return trimmed;
}

function getBrainRoots() {
  if (process.env.ANTIGRAVITY_APP_DATA_DIR) {
    return [path.join(path.resolve(process.env.ANTIGRAVITY_APP_DATA_DIR), 'brain')];
  }
  const home = os.homedir();
  return ['antigravity', 'antigravity-cli', 'antigravity-ide'].map(d => path.join(home, '.gemini', d, 'brain'));
}

function isSubagentTranscript(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(4096);
      const read = fs.readSync(fd, buf, 0, 4096, 0);
      return buf.subarray(0, read).toString('utf8').includes('<subagent_reminder>');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

function resolveTranscriptTarget({ conversationId = null, transcriptPath = null, workspace = null, dataDirPath = null } = {}) {
  const cleanId = sanitizeConversationId(conversationId);
  if (conversationId && !cleanId) return null;

  if (transcriptPath && typeof transcriptPath === 'string') {
    try {
      const resolved = path.resolve(transcriptPath);
      if (resolved.endsWith('transcript.jsonl') && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const inferredId = cleanId || sanitizeConversationId(path.basename(path.dirname(path.dirname(path.dirname(resolved))))) || 'explicit';
        return { convId: inferredId, logFile: resolved, source: 'explicit-transcript-path' };
      }
    } catch {}
    return null;
  }

  if (cleanId) {
    for (const brainDir of getBrainRoots()) {
      const candidate = path.join(brainDir, cleanId, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(candidate)) {
        return { convId: cleanId, logFile: candidate, source: 'explicit-conversation-id' };
      }
    }
    return null;
  }

  const envId = sanitizeConversationId(process.env.ANTIGRAVITY_CONVERSATION_ID);
  if (envId) {
    for (const brainDir of getBrainRoots()) {
      const candidate = path.join(brainDir, envId, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(candidate)) {
        return { convId: envId, logFile: candidate, source: 'env-conversation-id' };
      }
    }
  }

  // Check active-session.json persisted by Antigravity hooks
  try {
    const base = dataDirPath || dataDir();
    const sessionFile = path.join(base, 'active-session.json');
    if (fs.existsSync(sessionFile)) {
      const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      const entry = (workspace && sessionData?.byWorkspace?.[workspace]) || sessionData?.latest;
      const sid = sanitizeConversationId(entry?.conversationId);
      if (entry?.transcriptPath && fs.existsSync(entry.transcriptPath)) {
        return { convId: sid || 'hook-session', logFile: entry.transcriptPath, source: 'active-session-hook' };
      }
      if (sid) {
        for (const brainDir of getBrainRoots()) {
          const candidate = path.join(brainDir, sid, '.system_generated', 'logs', 'transcript.jsonl');
          if (fs.existsSync(candidate)) {
            return { convId: sid, logFile: candidate, source: 'active-session-hook' };
          }
        }
      }
    }
  } catch {}

  // Fallback: scan brain directories by mtimeMs, skipping subagent transcripts first
  const candidates = [];
  for (const brainDir of getBrainRoots()) {
    try {
      if (!fs.existsSync(brainDir)) continue;
      for (const d of fs.readdirSync(brainDir)) {
        const sid = sanitizeConversationId(d);
        if (!sid) continue;
        const logFile = path.join(brainDir, sid, '.system_generated', 'logs', 'transcript.jsonl');
        try {
          const st = fs.statSync(logFile);
          if (st.isFile()) candidates.push({ convId: sid, logFile, mtimeMs: st.mtimeMs });
        } catch {}
      }
    } catch {}
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const nonSubagent = candidates.find(c => !isSubagentTranscript(c.logFile));
  if (nonSubagent) return { convId: nonSubagent.convId, logFile: nonSubagent.logFile, source: 'latest-primary-transcript' };
  if (candidates.length > 0) return { convId: candidates[0].convId, logFile: candidates[0].logFile, source: 'latest-transcript-fallback' };
  return null;
}

export function getSessionTokenUsage(conversationId = null, opts = {}) {
  const target = resolveTranscriptTarget({ conversationId, ...opts });
  if (!target || !fs.existsSync(target.logFile)) return null;

  try {
    const content = fs.readFileSync(target.logFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    let uncachedInputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let currentContextTokens = 0;
    let llmSteps = 0;
    let userTurns = 0;
    let totalToolCalls = 0;
    let a2aToolCalls = 0;
    let readFileCalls = 0;
    let lastModel = null;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') userTurns++;
        const isPlanner = obj.type === 'PLANNER_RESPONSE' || (!obj.type && obj.input_tokens !== undefined);
        if (isPlanner) {
          llmSteps++;
          const inp = Number(obj.input_tokens || 0);
          const cr = Number(obj.cache_read_tokens || 0);
          const out = Number(obj.output_tokens || 0);
          uncachedInputTokens += inp;
          cacheReadTokens += cr;
          outputTokens += out;
          if (inp > 0 || cr > 0) currentContextTokens = inp + cr;
        }
        if (obj.model) lastModel = obj.model;
        if (Array.isArray(obj.tool_calls)) {
          for (const tc of obj.tool_calls) {
            totalToolCalls++;
            const name = String(tc?.name || '');
            if (name.startsWith('a2a_') || name.startsWith('verifykit_') || (name === 'call_mcp_tool' && (tc?.args?.ServerName === 'a2a_a2a' || String(tc?.args?.ToolName || '').startsWith('a2a_')))) {
              a2aToolCalls++;
            } else if (name === 'read_file' || name === 'view_file') {
              readFileCalls++;
            }
          }
        }
      } catch {}
    }

    const totalInput = uncachedInputTokens + cacheReadTokens;
    const cacheHitRatio = totalInput > 0 ? ((cacheReadTokens / totalInput) * 100).toFixed(1) + '%' : '0%';

    return {
      conversation_id: target.convId,
      source: target.source,
      turns_recorded: llmSteps,
      llm_steps: llmSteps,
      user_turns: userTurns,
      latest_model: lastModel,
      current_context_tokens: currentContextTokens,
      input_tokens: uncachedInputTokens,
      uncached_input_tokens: uncachedInputTokens,
      cache_read_tokens: cacheReadTokens,
      output_tokens: outputTokens,
      cache_hit_ratio: cacheHitRatio,
      total_tokens_consumed: uncachedInputTokens + outputTokens + cacheReadTokens,
      tool_calls: {
        total: totalToolCalls,
        a2a_calls: a2aToolCalls,
        read_file_calls: readFileCalls,
      },
      cost_estimate: estimateSessionCost({ uncachedInputTokens, cacheReadTokens, outputTokens }),
    };
  } catch {
    return null;
  }
}

export function analyzeWorkspaceTokens(index, changedFiles = [], telemetrySummary = null) {
  const files = index?.files || [];
  let totalBytes = 0;
  const fileBreakdown = [];
  const compactIndexRows = [];

  for (const f of files) {
    const b = f.bytes || 0;
    totalBytes += b;
    fileBreakdown.push({
      path: f.path,
      language: f.language,
      bytes: b,
      estimated_tokens: estimateTokens(b),
    });
    compactIndexRows.push({ p: f.path, l: f.language, b });
  }

  fileBreakdown.sort((a, b) => b.estimated_tokens - a.estimated_tokens);
  const totalTokens = estimateTokens(totalBytes);
  const compactIndexTokens = files.length > 0 ? estimateTokens(JSON.stringify(compactIndexRows)) : 0;

  let affectedTokens = 0;
  if (Array.isArray(changedFiles) && changedFiles.length > 0) {
    const changedSet = new Set(changedFiles);
    for (const f of fileBreakdown) {
      if (changedSet.has(f.path)) affectedTokens += f.estimated_tokens;
    }
  }

  const hasMeasuredTelemetry = Boolean(telemetrySummary && telemetrySummary.calls > 0 && telemetrySummary.raw_scope_tokens > 0);
  const basisRaw = hasMeasuredTelemetry ? telemetrySummary.raw_scope_tokens : totalTokens;
  const basisDelivered = hasMeasuredTelemetry ? telemetrySummary.response_tokens : compactIndexTokens;
  const tokensSaved = hasMeasuredTelemetry
    ? telemetrySummary.tokens_saved
    : Math.max(0, totalTokens - compactIndexTokens);
  const savingsPct = basisRaw > 0 ? ((tokensSaved / basisRaw) * 100).toFixed(1) + '%' : '0%';

  return {
    total_files: files.length,
    total_source_bytes: totalBytes,
    total_estimated_tokens: totalTokens,
    compact_index_tokens: compactIndexTokens,
    changed_files_tokens: affectedTokens,
    top_consumers: fileBreakdown.slice(0, 10),
    measured_cumulative: telemetrySummary
      ? {
          calls: telemetrySummary.calls || 0,
          raw_scope_tokens: telemetrySummary.raw_scope_tokens || 0,
          response_tokens: telemetrySummary.response_tokens || 0,
          tokens_saved: telemetrySummary.tokens_saved || 0,
          savings_ratio:
            telemetrySummary.raw_scope_tokens > 0
              ? (((telemetrySummary.tokens_saved || 0) / telemetrySummary.raw_scope_tokens) * 100).toFixed(1) + '%'
              : '0%',
          estimated_cost_saved: estimateCostSavings(telemetrySummary.tokens_saved || 0),
        }
      : null,
    efficiency: {
      measurement_basis: hasMeasuredTelemetry ? 'measured-scoped-telemetry' : 'measured-index-vs-source',
      raw_source_tokens: basisRaw,
      a2a_compact_tokens: basisDelivered,
      compact_index_tokens: compactIndexTokens,
      estimated_tokens_saved: tokensSaved,
      savings_ratio: savingsPct,
      estimated_cost_saved: estimateCostSavings(tokensSaved),
    },
  };
}
