import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const estimateTokens = (textOrBytes) => {
  if (typeof textOrBytes === 'string') return Math.max(1, Math.round(textOrBytes.length / 3.8));
  if (typeof textOrBytes === 'number') return Math.max(1, Math.round(textOrBytes / 3.8));
  return 0;
};

export function getSessionTokenUsage(conversationId = null) {
  const appDataDir = process.env.ANTIGRAVITY_APP_DATA_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
  let convId = conversationId || process.env.ANTIGRAVITY_CONVERSATION_ID;

  if (!convId) {
    const brainDir = path.join(appDataDir, 'brain');
    if (fs.existsSync(brainDir)) {
      const dirs = fs.readdirSync(brainDir).filter(d => {
        try {
          return fs.existsSync(path.join(brainDir, d, '.system_generated', 'logs', 'transcript.jsonl'));
        } catch {
          return false;
        }
      });
      if (dirs.length) {
        dirs.sort((a, b) => {
          try {
            return fs.statSync(path.join(brainDir, b, '.system_generated', 'logs', 'transcript.jsonl')).mtimeMs -
                   fs.statSync(path.join(brainDir, a, '.system_generated', 'logs', 'transcript.jsonl')).mtimeMs;
          } catch {
            return 0;
          }
        });
        convId = dirs[0];
      }
    }
  }

  if (!convId) return null;

  const logFile = path.join(appDataDir, 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl');
  if (!fs.existsSync(logFile)) return null;

  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, steps = 0, lastModel = null;
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.input_tokens) inputTokens += obj.input_tokens;
        if (obj.output_tokens) outputTokens += obj.output_tokens;
        if (obj.cache_read_tokens) cacheReadTokens += obj.cache_read_tokens;
        if (obj.model) lastModel = obj.model;
        if (obj.step_index !== undefined) steps++;
      } catch {}
    }

    return {
      conversation_id: convId,
      turns_recorded: steps,
      latest_model: lastModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_tokens: cacheReadTokens,
      total_tokens_consumed: inputTokens + outputTokens + cacheReadTokens
    };
  } catch {
    return null;
  }
}

export function analyzeWorkspaceTokens(index, changedFiles = []) {
  const files = index?.files || [];
  let totalBytes = 0;
  const fileBreakdown = [];

  for (const f of files) {
    const b = f.bytes || 0;
    totalBytes += b;
    fileBreakdown.push({
      path: f.path,
      language: f.language,
      bytes: b,
      estimated_tokens: estimateTokens(b)
    });
  }

  fileBreakdown.sort((a, b) => b.estimated_tokens - a.estimated_tokens);
  const totalTokens = estimateTokens(totalBytes);

  let affectedTokens = 0;
  if (Array.isArray(changedFiles) && changedFiles.length > 0) {
    const changedSet = new Set(changedFiles);
    for (const f of fileBreakdown) {
      if (changedSet.has(f.path)) affectedTokens += f.estimated_tokens;
    }
  }

  const estimatedCompactTokens = Math.min(800, Math.max(150, Math.round(files.length * 15)));
  const tokensSaved = Math.max(0, totalTokens - estimatedCompactTokens);
  const savingsPct = totalTokens > 0 ? ((tokensSaved / totalTokens) * 100).toFixed(1) + '%' : '0%';

  return {
    total_files: files.length,
    total_source_bytes: totalBytes,
    total_estimated_tokens: totalTokens,
    changed_files_tokens: affectedTokens,
    top_consumers: fileBreakdown.slice(0, 10),
    efficiency: {
      raw_source_tokens: totalTokens,
      verifykit_compact_tokens: estimatedCompactTokens,
      estimated_tokens_saved: tokensSaved,
      savings_ratio: savingsPct
    }
  };
}
