#!/usr/bin/env node
// Read-only, metadata-only audit of locally captured Antigravity headless JSONL.
// No model calls. Does not print prompts, paths, tool args, results, or errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_CAPTURE = 32 * 1024 * 1024;
const MAX_STDERR = 1024 * 1024;
const MAX_FILES = 100;
const NAMES = /^(native|pilah)-\d{2,3}\.jsonl$|^pilah-smoke\.jsonl$/;
const PINNED_TOOLS = new Set(['read_file', 'run_command', 'call_mcp_tool', 'list_dir', 'grep_search', 'search_files', 'find_files', 'write_file', 'edit_file', 'apply_patch', 'replace_file', 'browser']);
const PILAH_OPS = new Set(['pilah_context', 'pilah_impact', 'pilah_verify', 'pilah_evidence']);
const safeNum = x => Number.isSafeInteger(x) && x >= 0 ? x : null;
const unique = xs => [...new Set(xs)];
function errorKind(value) {
  const s = String(value || '').slice(0, 20000);
  if (/individual quota reached|quota (?:exceeded|reached)|quota.exceeded/i.test(s)) return 'provider_quota';
  if (/no capacity available|http.?503|overloaded|service unavailable/i.test(s)) return 'provider_capacity';
  if (/a tool required the .* permission|auto.denied|permission check failed|permission denied|permissions? denied/i.test(s)) return 'permission_denied';
  if (/http.?429|rate.limit/i.test(s)) return 'provider_rate_limit';
  if (/invalid model selection|model unavailable|unsupported model/i.test(s)) return 'invalid_model';
  if (/timeout|timed out/i.test(s)) return 'timeout';
  if (/no output produced/i.test(s)) return 'missing_output';
  return null;
}
function readSafe(file, cap) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > cap) return null;
  return fs.readFileSync(file, 'utf8');
}
export function inspectCapture(raw, stderr = '') {
  const records = [];
  let malformed = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); } catch { malformed++; }
  }
  const terminal = records.filter(e => e?.event === 'result' && e.result && typeof e.result === 'object').at(-1)?.result ?? null;
  const stepRecords = new Map();
  let errorMessages = 0;
  for (let i = 0; i < records.length; i++) {
    const e = records[i];
    const s = e?.step_update;
    if (e?.event !== 'step_update' || !s || typeof s !== 'object') continue;
    if (s.step_type === 'error_message') errorMessages++;
    if (s.step_type !== 'tool') continue;
    // Prefer terminal state for one step; do not count ACTIVE updates as tool calls.
    const key = String(s.conversation_id || '') + ':' + String(s.step_index ?? i);
    const prev = stepRecords.get(key);
    const state = s.state === 'ERROR' ? 'ERROR' : s.state === 'DONE' ? 'DONE' : 'ACTIVE';
    if (!prev || state !== 'ACTIVE') stepRecords.set(key, { state, info: s.tool_info || {}, name: s.tool_name || s.tool_info?.name || '' });
  }
  const toolNames = {}, pilahOps = {};
  let done = 0, failedSteps = 0, toolErrors = 0, mcpCalls = 0, pilahCalls = 0;
  for (const t of stepRecords.values()) {
    if (t.state === 'ACTIVE') continue;
    if (t.state === 'DONE') done++;
    if (t.state === 'ERROR') failedSteps++;
    if (t.info?.error || t.info?.isError === true) toolErrors++;
    const safeName = PINNED_TOOLS.has(t.name) ? t.name : 'other';
    toolNames[safeName] = (toolNames[safeName] || 0) + 1;
    if (safeName === 'call_mcp_tool') {
      mcpCalls++;
      const args = t.info.parameters || {};
      const target = args.ToolName || args.tool_name || '';
      const server = args.ServerName || args.server_name || '';
      if (PILAH_OPS.has(target) && ['pilah_pilah', 'pilah'].includes(server)) {
        pilahCalls++;
        pilahOps[target] = (pilahOps[target] || 0) + 1;
      }
    }
  }
  const u = terminal?.usage;
  const usage = {
    input_tokens: safeNum(u?.input_tokens),
    output_tokens: safeNum(u?.output_tokens),
    total_tokens: safeNum(u?.total_tokens),
    cache_read_tokens: safeNum(u?.cache_read_tokens),
    duration_seconds: typeof terminal?.duration_seconds === 'number' && Number.isFinite(terminal.duration_seconds) ? terminal.duration_seconds : null
  };
  const usageConsistent = usage.total_tokens !== null && usage.input_tokens !== null && usage.output_tokens !== null && usage.total_tokens === usage.input_tokens + usage.output_tokens;
  const denied = Array.isArray(terminal?.denied_actions) ? terminal.denied_actions.length : 0;
  const responseLength = typeof terminal?.response === 'string' ? terminal.response.length : 0;
  const hint = errorKind(terminal?.error instanceof Object ? terminal.error?.message : terminal?.error) || errorKind(stderr);
  const reasons = [];
  if (!terminal) reasons.push('missing_terminal_result');
  else if (terminal.status !== 'SUCCESS') reasons.push('terminal_not_success');
  if (!usageConsistent || usage.total_tokens === 0) reasons.push('missing_or_invalid_official_usage');
  if (responseLength === 0) reasons.push('empty_response');
  if (denied) reasons.push('denied_actions');
  if (failedSteps) reasons.push('error_steps');
  if (toolErrors) reasons.push('tool_errors');
  if (hint) reasons.push(hint);
  if (malformed) reasons.push('malformed_jsonl');
  return {
    status: terminal?.status || 'MISSING',
    audit_status: reasons.length ? 'INVALID' : 'MECHANICALLY_COMPLETE',
    quality: 'unverified',
    reasons: unique(reasons),
    usage,
    response_length: responseLength,
    denied_actions_count: denied,
    error_step_count: failedSteps,
    tool_error_count: toolErrors,
    error_message_steps: errorMessages,
    completed_tool_calls: done,
    tool_names: toolNames,
    confirmed_pilah_mcp_calls: pilahCalls,
    pilah_operations: pilahOps,
    mcp_call_count: mcpCalls,
    malformed_jsonl_lines: malformed
  };
}
export function auditDirectory(folder) {
  const abs = path.resolve(folder);
  const st = fs.lstatSync(abs);
  if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('Input must be a real directory');
  const fileNames = fs.readdirSync(abs).filter(n => NAMES.test(n)).sort();
  if (fileNames.length > MAX_FILES) throw new Error('Too many captures');
  const runs = [];
  for (const name of fileNames) {
    const src = readSafe(path.join(abs, name), MAX_CAPTURE);
    const stderrPath = path.join(abs, name.replace(/\.jsonl$/, '.stderr'));
    const stderrSrc = readSafe(stderrPath, MAX_STDERR);
    const capture = src === null ? {status:'UNREADABLE',audit_status:'INVALID',quality:'unverified',reasons:['unsafe_or_oversized_capture']} : inspectCapture(src, stderrSrc || '');
    if (src !== null && stderrSrc === null && fs.existsSync(stderrPath)) {
      capture.reasons.push('unreadable_stderr'); capture.audit_status = 'INVALID';
    }
    runs.push({id:name.replace(/\.jsonl$/, ''), ...capture});
  }
  const byId = new Map(runs.map(x => [x.id, x]));
  const ids = unique(runs.map(x => x.id.match(/^(?:native|pilah)-(\d+)$/)?.[1]).filter(Boolean)).sort();
  const pairs = ids.map(id => {
    const native = byId.get('native-' + id), pilah = byId.get('pilah-' + id);
    const both = native?.audit_status === 'MECHANICALLY_COMPLETE' && pilah?.audit_status === 'MECHANICALLY_COMPLETE';
    return {
      repeat: id,
      native: native?.audit_status || 'MISSING',
      pilah: pilah?.audit_status || 'MISSING',
      eligible_for_quality_review: !!both,
      // Descriptive only, never claim savings until independent acceptance and parity.
      descriptive_total_token_delta: both ? pilah.usage.total_tokens - native.usage.total_tokens : null,
      causal_savings_established: false
    };
  });
  return {
    schema: 'pilah-headless-capture-audit-v1',
    read_only: true,
    privacy: 'metadata-only; no prompt, result, tool args, source paths or raw error strings',
    captures: runs.length,
    mechanically_complete: runs.filter(r => r.audit_status === 'MECHANICALLY_COMPLETE').length,
    invalid_or_incomplete: runs.filter(r => r.audit_status !== 'MECHANICALLY_COMPLETE').length,
    runs,
    pairs,
    interpretation: 'Success and official usage alone do not prove task completion; no pair can support savings until matched model/effort/permissions/source snapshots and independent quality acceptance are established.'
  };
}
const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node audit-headless-captures.mjs <private-benchmark-directory>');
    process.stdout.write(JSON.stringify(auditDirectory(process.argv[2]), null, 2) + '\n');
  } catch (e) {
    process.stderr.write('Audit failed: ' + e.message + '\n');
    process.exitCode = 1;
  }
}
