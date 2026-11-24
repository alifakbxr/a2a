import fs from 'node:fs';
import path from 'node:path';
import { dataDir,getHomeDir } from './security.mjs';

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
 * A2A cannot infer billable savings from tool/source-size estimates. Retained
 * as a compatibility helper but deliberately does not fabricate a USD amount.
 */
export function estimateCostSavings() { return null; }

export function estimateSessionCost() {
  return {
    approximate:false,
    estimated_usd:null,
    reason:'Model-specific price, billing plan, and verified token accounting were not provided.',
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
  const home = getHomeDir();
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

// A transcript reference is metadata supplied by a hook or caller, not permission
// to read arbitrary local files. Require the exact Antigravity brain layout.
export function vettedTranscript(candidate,expectedId=null){
  if(typeof candidate!=='string'||!candidate)return null;
  const requested=path.resolve(candidate);
  for(const brain of getBrainRoots()){
    const base=path.resolve(brain);
    const rel=path.relative(base,requested);
    const seg=rel.split(path.sep);
    if(seg.length!==4||!sanitizeConversationId(seg[0])||
       seg[1]!=='.system_generated'||seg[2]!=='logs'||seg[3]!=='transcript.jsonl'||
       (expectedId&&seg[0]!==expectedId))continue;
    try{
      // Reject symlinks at every descendant path component, including files.
      let cursor=base;
      for(const part of seg){
        cursor=path.join(cursor,part);
        if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Symlink transcript denied');
      }
      const canonical=fs.realpathSync(requested);
      const realRel=path.relative(fs.realpathSync(base),canonical);
      if(realRel!==rel||!fs.statSync(canonical).isFile())continue;
      return {convId:seg[0],logFile:canonical};
    }catch{}
  }
  return null;
}
function resolveTranscriptTarget({ conversationId = null, transcriptPath = null, workspace = null, dataDirPath = null } = {}) {
  const cleanId = sanitizeConversationId(conversationId);
  if (conversationId && !cleanId) return null;

  if(transcriptPath){
    const candidate=vettedTranscript(transcriptPath,cleanId);
    return candidate?{...candidate,source:'explicit-transcript-path'}:null;
  }
  if(cleanId){
    for(const brain of getBrainRoots()){
      const candidate=vettedTranscript(path.join(brain,cleanId,'.system_generated','logs','transcript.jsonl'),cleanId);
      if(candidate)return {...candidate,source:'explicit-conversation-id'};
    }
    return null;
  }
  const envId=sanitizeConversationId(process.env.ANTIGRAVITY_CONVERSATION_ID);
  if(envId){
    for(const brain of getBrainRoots()){
      const candidate=vettedTranscript(path.join(brain,envId,'.system_generated','logs','transcript.jsonl'),envId);
      if(candidate)return {...candidate,source:'env-conversation-id'};
    }
  }
  try{
    const base=dataDirPath||dataDir();
    const sessionFile=path.join(base,'active-session.json');
    const stat=fs.lstatSync(sessionFile);
    if(!stat.isFile()||stat.size>128*1024)return null;
    const sessionData=JSON.parse(fs.readFileSync(sessionFile,'utf8'));
    const entry=(workspace&&sessionData?.byWorkspace?.[workspace])||sessionData?.latest;
    const sid=sanitizeConversationId(entry?.conversationId);
    if(entry?.transcriptPath){
      const candidate=vettedTranscript(entry.transcriptPath,sid);
      if(candidate)return {...candidate,source:'active-session-hook'};
    }
    if(sid){
      for(const brain of getBrainRoots()){
        const candidate=vettedTranscript(path.join(brain,sid,'.system_generated','logs','transcript.jsonl'),sid);
        if(candidate)return {...candidate,source:'active-session-hook'};
      }
    }
  }catch{}
  // Never guess the most recent transcript: it may belong to another session.
  return null;
}

export function getSessionTokenUsage(conversationId = null, opts = {}) {
  const target = resolveTranscriptTarget({ conversationId, ...opts });
  if (!target || !fs.existsSync(target.logFile)) return null;

  try {
    if(fs.statSync(target.logFile).size > 8*1024*1024){
      return {status:'unavailable',reason:'Transcript is too large for safe synchronous parsing',source:target.source};
    }
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
          if (inp > 0 || cr > 0) currentContextTokens = inp;
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

    // PLANNER_RESPONSE is an undocumented internal format. Its input/cache
    // accounting is not guaranteed to match the CLI's official usage object.
    // Expose diagnostics only, not invented billable tokens or fake totals.
    return {
      status:'diagnostic_only',
      source:target.source,
      conversation_id:target.convId,
      latest_model:lastModel,
      llm_steps:llmSteps,
      user_turns:userTurns,
      tool_calls:{
        total:totalToolCalls,
        a2a_calls:a2aToolCalls,
        read_file_calls:readFileCalls,
      },
      usage:null,
      total_tokens_consumed:null,
      cache_hit_ratio:null,
      cost_estimate:null,
      note:'Internal transcript counters have unknown accounting semantics. For real token totals, import Antigravity CLI JSON usage with a2a tokens --usage-file <path>.',
    };
  } catch {
    return null;
  }
}

export function analyzeWorkspaceTokens(index, changedFiles = [], telemetrySummary = null) {
  const files=index?.files||[];
  const fileBreakdown=files.map(f=>{
    const bytes=Math.max(0,Number(f.bytes)||0);
    return {path:f.path,language:f.language,bytes,estimated_source_tokens:estimateTokens(bytes)};
  }).sort((a,b)=>b.bytes-a.bytes);
  const totalBytes=fileBreakdown.reduce((n,f)=>n+f.bytes,0);
  const indexBytes=Buffer.byteLength(JSON.stringify(files.map(f=>({p:f.path,l:f.language,b:f.bytes||0}))),'utf8');
  const changedSet=new Set(changedFiles||[]);
  const changedBytes=fileBreakdown.filter(f=>changedSet.has(f.path)).reduce((n,f)=>n+f.bytes,0);
  const scopeEstimate={
    calls:Math.max(0,Number(telemetrySummary?.calls)||0),
    estimated_scope_tokens:Math.max(0,Number(telemetrySummary?.raw_scope_tokens)||0),
    estimated_tool_response_tokens:Math.max(0,Number(telemetrySummary?.response_tokens)||0),
    scan_read_files:Math.max(0,Number(telemetrySummary?.scan_read_files)||0),
    scan_reused_files:Math.max(0,Number(telemetrySummary?.scan_reused_files)||0),
    scan_read_bytes:Math.max(0,Number(telemetrySummary?.scan_read_bytes)||0),
    average_scan_duration_ms:telemetrySummary?.average_scan_duration_ms??null,
    data_quality:'estimated_character_count',
    note:'These are approximate tool/source payload sizes, NOT actual model usage. Summed tool calls may overlap and cached content is not accounted for.',
  };
  return {
    measurement_status:'source_inventory_only',
    total_files:files.length,
    total_source_bytes:totalBytes,
    total_estimated_tokens:estimateTokens(totalBytes),
    compact_index_tokens:estimateTokens(indexBytes),
    changed_files_tokens:estimateTokens(changedBytes),
    top_consumers:fileBreakdown.slice(0,10),
    tool_payload_estimates:scopeEstimate,
    net_token_savings:null,
    net_token_savings_pct:null,
    model_usage:null,
    // Explicitly preserve compatibility with consumers of the old efficiency
    // object, but do not populate its unreliable token-savings claims.
    efficiency:{
      measurement_basis:'no_controlled_baseline',
      raw_source_tokens:null,
      a2a_compact_tokens:null,
      estimated_tokens_saved:null,
      savings_ratio:null,
      estimated_cost_saved:null,
      limitation:'No A/B baseline or provider token usage was observed. Source-byte estimates cannot prove actual Gemini token savings.',
    },
    caveat:'Estimated source inventory size is NOT Gemini context window, session token usage, or billed tokens.',
  };
}

// Only provider-reported output can be used for a trustworthy per-run total.
// The official CLI emits usage.total_tokens, with total=input+output;
// cache_read and thinking are separate informational counters, not additions.
export function parseOfficialAgyUsage(envelope) {
  const result=envelope?.event==='result'?envelope.result:envelope?.result?.usage?envelope.result:envelope;
  const usage=result?.usage;
  if(!usage||typeof usage!=='object')throw new Error('Missing official Antigravity CLI usage object');
  const read=(key,required=true)=>{
    const value=usage[key];
    if(value===undefined||value===null){
      if(required)throw new Error('Missing usage.'+key);
      return null;
    }
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('Invalid usage.'+key);
    return value;
  };
  const input=read('input_tokens'),output=read('output_tokens'),total=read('total_tokens');
  const thinking=read('thinking_tokens',false),cache=read('cache_read_tokens',false);
  // Optional fields are reported only when the host provides them; no cache miss is inferred.
  const cacheWrite=read('cache_write_tokens',false),cacheCreation=read('cache_creation_tokens',false),cacheMiss=read('cache_miss_tokens',false);
  if(total!==input+output)throw new Error('Inconsistent CLI usage total: expected input_tokens + output_tokens');
  return {
    status:'reported',
    source:'antigravity-cli-json',
    conversation_id:typeof result.conversation_id==='string'?result.conversation_id:null,
    run_status:typeof result.status==='string'?result.status:null,
    duration_seconds:typeof result.duration_seconds==='number'&&result.duration_seconds>=0?result.duration_seconds:null,
    num_turns:Number.isSafeInteger(result.num_turns)&&result.num_turns>=0?result.num_turns:null,
    usage:{input_tokens:input,output_tokens:output,total_tokens:total,thinking_tokens:thinking,cache_read_tokens:cache,cache_write_tokens:cacheWrite,cache_creation_tokens:cacheCreation,cache_miss_tokens:cacheMiss},
    cost_usd:null,
    net_token_savings:null,
    note:'Reported by Antigravity CLI for this specific run only. Cache/thinking fields are not added to the reported total. No controlled native-versus-PILAH baseline is available.',
  };
}

export function readOfficialAgyUsageFile(file) {
  if(typeof file!=='string'||!file.trim())throw new Error('Provide a JSON file path');
  const full=fs.realpathSync(path.resolve(file));
  const stat=fs.statSync(full);
  if(!stat.isFile()||stat.size>4*1024*1024)throw new Error('Usage file must be a regular JSON/NDJSON file of at most 4 MiB');
  const raw=fs.readFileSync(full,'utf8');
  try{return parseOfficialAgyUsage(JSON.parse(raw))}catch(e){
    // Stream JSON ends with event=result. Ignore earlier step_update totals:
    // summing them would double-count a run already summarized by result. 
    const lines=raw.trimEnd().split(/\r?\n/);
    for(let i=lines.length-1;i>=0;i--){
      try{
        const event=JSON.parse(lines[i]);
        if(event?.event==='result')return parseOfficialAgyUsage(event);
      }catch{}
    }
    throw e;
  }
}
