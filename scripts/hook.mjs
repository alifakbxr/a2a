#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import { dataDir, getA2AMode, getCompactMode, getArtifactAutoSnapshotMode, requireAuthorizedWorkspace } from '../src/security.mjs';
import { sanitizeConversationId, vettedTranscript } from '../src/tokens.mjs';
import { Store } from '../src/storage.mjs';
import {gitChanges} from '../src/scanner.mjs';
import {CANDIDATE_ARTIFACTS} from '../src/verification.mjs';
import {safeFile,sha256} from '../src/security.mjs';

function writeJsonSecure(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Atomic replacement avoids a torn active-session record after interruption.
  const temp=filePath+'.'+process.pid+'.'+globalThis.crypto.randomUUID()+'.tmp';
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0);
  let fd=null;
  try{
    fd=fs.openSync(temp,flags,0o600);
    fs.writeFileSync(fd,JSON.stringify(obj,null,2)+'\n');
    fs.closeSync(fd);fd=null;
    fs.renameSync(temp,filePath);
  }finally{
    if(fd!==null)fs.closeSync(fd);
    try{fs.unlinkSync(temp)}catch{}
  }
}

export function detectSideQuestionInfo(payload, transcriptPath) {
  let isSideQuestion = Boolean(payload?.isSideQuestion || payload?.sideQuestion);
  let parentConversationId = payload?.parentConversationId || null;
  let initialQuestion = null;
  const currentConvId = sanitizeConversationId(payload?.conversationId);

  // Internal transcripts are diagnostic only; never read arbitrarily large logs in a hook.
  const vetted=vettedTranscript(transcriptPath,currentConvId);
  if (vetted && fs.statSync(vetted.logFile).size <= 64 * 1024) {
    try {
      const stream = fs.readFileSync(vetted.logFile, 'utf8');
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
  const transcriptPath = vettedTranscript(payload?.transcriptPath,convId)?.logFile||null;
  const workspacePaths = Array.isArray(payload?.workspacePaths)
    ? payload.workspacePaths.filter(w => typeof w === 'string' && w.length<=1024 && path.isAbsolute(w)).slice(0,32)
    : [];
  const cwd = typeof payload?.cwd === 'string' && payload.cwd.length<=1024 && path.isAbsolute(payload.cwd) ? payload.cwd : null;
  if (!convId) return;

  const sessionFile = path.join(baseDir, 'active-session.json');
  let existing = {};
  try {
    if (fs.lstatSync(sessionFile).isFile() && fs.statSync(sessionFile).size<=128*1024) {
      existing = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) || {};
    }
  } catch {}

  const prev = existing.latest || {};
  const prevWs = Array.isArray(prev.workspacePaths) ? prev.workspacePaths.join('|') : '';
  const nextWs = workspacePaths.join('|');
  if (prev.conversationId === convId && prev.transcriptPath === transcriptPath && prevWs === nextWs && prev.cwd === cwd) {
    return;
  }

  const sideQ = process.env.A2A_TRACK_SIDE_QUESTIONS==='1'
    ? detectSideQuestionInfo(payload, transcriptPath)
    : {isSideQuestion:false,parentConversationId:null,initialQuestion:null};
  const now = new Date().toISOString();
  const entry = {
    conversationId: convId,
    transcriptPath,
    workspacePaths,
    cwd,
    modelName: typeof payload?.modelName === 'string' ? payload.modelName.slice(0,100) : null,
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
          try { wsId = store.register(requireAuthorizedWorkspace(workspacePaths[0])); } catch {}
        }
        if(wsId) store.recordSideQuestion({
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

  // Cap retained workspace metadata; the current session is stored separately.
  const recent=Object.entries(byWorkspace).sort((a,b)=>Date.parse(b[1]?.updatedAt||0)-Date.parse(a[1]?.updatedAt||0)).slice(0,100);
  writeJsonSecure(sessionFile, { updatedAt: now, latest: entry, byWorkspace:Object.fromEntries(recent) });

  // Do not bulk-copy conversation artifacts when a session starts. Only snapshot
  // explicit edit events or direct user requests; avoids needless I/O and retention.
}

function handleArtifactModification(payload, baseDir) {
  // Full-content brain Markdown history is opt-in; session metadata remains
  // independent and does not itself grant content-retention consent.
  if(!getArtifactAutoSnapshotMode() || payload?.error) return;
  const toolName = payload?.toolCall?.name || payload?.toolName || '';
  if (!['write_to_file','replace_file_content','multi_replace_file_content','write_file','edit_file'].includes(toolName)) return;
  const args = payload?.toolCall?.args || payload?.toolArgs || payload?.toolInput || payload?.arguments || {};
  const filePath = args?.TargetFile || args?.Path || args?.path;
  const convId = sanitizeConversationId(payload?.conversationId);
  if (!convId || typeof filePath !== 'string' || !filePath.endsWith('.md')) return;
  // Accept Windows separators for matching, but let safeArtifactPath validate the
  // actual OS path and session-specific boundary (including symlinks).
  const normalized = filePath.replaceAll('\\','/');
  if (!normalized.includes('/brain/'+convId+'/')) return;
  const workspaces = Array.isArray(payload?.workspacePaths) ? payload.workspacePaths : [];
  const candidates = [...workspaces, payload?.cwd].filter(p=>typeof p==='string');
  let root=null;
  for(const candidate of candidates){
    try{root=requireAuthorizedWorkspace(candidate);break}catch{}
  }
  if(!root) return;
  try{
    const store=new Store(baseDir);
    try{
      const wsId=store.register(root);
      store.snapshotArtifact({workspaceId:wsId,workspaceRoot:root,conversationId:convId,artifactPath:filePath});
    }finally{store.close()}
  }catch{}
}

// A completed tool call is not proof of a successful test process. Accept
// explicit numeric exit statuses only; missing/conflicting signals fail closed.
// Antigravity versions can expose different nested response objects.
export function nativeProcessExitStatus(payload){
  const sources=[payload,payload?.toolCallResult,payload?.toolResponse,payload?.response,payload?.result,payload?.toolResult];
  const codes=[];
  for(const source of sources){
    if(!source||typeof source!=='object'||Array.isArray(source))continue;
    for(const key of ['exitCode','exit_code','commandExitCode','processExitCode']){
      if(Object.hasOwn(source,key) && source[key]!==null && source[key]!==undefined){
        const code=source[key];
        if(!Number.isSafeInteger(code))return {status:'unknown',exit_code:null,reason:'Invalid exit status representation'};
        codes.push(code);
      }
    }
  }
  if(payload?.error || payload?.toolResponse?.error || payload?.toolCallResult?.error)return {status:'failed',exit_code:codes[0]??null,reason:'Native tool reported an error'};
  if(!codes.length)return {status:'unknown',exit_code:null,reason:'No explicit process exit status available'};
  if(codes.some(x=>x!==codes[0]))return {status:'unknown',exit_code:null,reason:'Conflicting native process exit statuses'};
  return {status:codes[0]===0?'passed':'failed',exit_code:codes[0],reason:null};
}

function recordCommandRun(payload, baseDir) {
  handleArtifactModification(payload, baseDir);
  const cmd = payload?.toolCall?.args?.CommandLine;
  if (typeof cmd !== 'string' || !cmd.trim()) return;
  const isTestLike = /\b(?:npm\s+(?:run\s+)?test|node\s+--test|pytest|phpunit|pest|vitest|jest|mocha|cargo\s+test|go\s+test|dotnet\s+test|flutter\s+test|swift\s+test|mvn\s+test|gradlew\s+test|php\s+artisan\s+test)\b/i.test(cmd);
  if (!isTestLike) return;
  const candidates = [payload?.toolCall?.args?.Cwd,payload?.cwd,...(payload?.workspacePaths||[])].filter(p=>typeof p==='string');
  let root=null;
  for(const p of candidates){try{root=requireAuthorizedWorkspace(p);break}catch{}}
  if(!root)return;
  const exit=nativeProcessExitStatus(payload);
  // Failed/unknown processes need no expensive workspace/report hashing.
  const sourceHashes={};
  const changed=exit.status==='passed'
    ? gitChanges(root).filter(p=>/\.(?:js|ts|jsx|tsx|mjs|cjs|php|py|go|rs|kt|java|dart|gd|swift|cs|rb|vue|svelte|sql)$/i.test(p))
    : [];
  for(const rel of changed.slice(0,200)){
    try{sourceHashes[rel]=sha256(fs.readFileSync(safeFile(root,rel)))}catch{}
  }
  const reportHashes={};
  for(const rel of exit.status==='passed'?CANDIDATE_ARTIFACTS:[]){
    try{
      const file=safeFile(root,rel);
      const stat=fs.statSync(file);
      if(stat.size<=1200000 && stat.isFile())reportHashes[rel]=sha256(fs.readFileSync(file));
    }catch{}
  }
  // Clear positive provenance after unsuccessful or ambiguous runs. A pre-existing
  // passing report must not be re-attested by a failed/unknown native command.
  const reportFile=path.join(baseDir,'last-test-run.json');
  writeJsonSecure(reportFile,{
    updatedAt:new Date().toISOString(),
    conversationId:sanitizeConversationId(payload?.conversationId),
    workspace:root,
    kind:'native-test-tool-completed',
    succeeded:exit.status==='passed',
    exit_status:exit.status,
    exit_code:exit.exit_code,
    source_hashes:exit.status==='passed'?sourceHashes:{},
    report_hashes:exit.status==='passed'?reportHashes:{},
  });
}

export function handleHookEvent(payload, { baseDir = dataDir() } = {}) {
  if (!payload || typeof payload !== 'object') return {};
  const event = payload.hookEventName || '';

  if (event === 'SessionStart') {
    recordActiveSession(payload, baseDir);
  } else if (event === 'PostToolUse') {
    recordCommandRun(payload, baseDir);
    return {};
  }

  if (event === 'SessionStart') {
    // In on-demand mode do not inject instructions into every Antigravity session.
    if (getA2AMode() !== 'always-on') return {};
    const compact = getCompactMode();
    const policy = 'A2A Always-On (adaptive): For docs, typos, styles, isolated edits or research, use native tools without A2A calls. For shared APIs, auth, schema or multi-module changes, call a2a_impact once with summary=true. Use targeted symbol queries to navigate; do not fetch a skeleton and then the same full file unless needed. Reuse existing analysis until the changed scope differs. Run targeted native tests for testable behavior and assess evidence once. Verify worker handoffs only for testable code with named criteria. Keep uncertainty and limitations. No forced teamwork, repeated token footers or unverified savings claims.';
    return {
      injectSteps: [{
        systemMessage: {
          systemMessage: compact ? policy + ' Keep responses concise without dropping evidence.' : policy,
        },
      }],
    };
  }

  return {};
}

const isEntry = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntry) {
  let raw = '';
  try {
    // Hooks are best-effort metadata handlers, never unbounded stdin consumers.
    const chunks=[],buffer=Buffer.alloc(32768);let bytes=0;
    for(;;){
      const count=fs.readSync(0,buffer,0,buffer.length,null);
      if(!count)break;
      bytes+=count;
      if(bytes>256*1024)throw Error('Hook payload exceeds safe limit');
      chunks.push(Buffer.from(buffer.subarray(0,count)));
    }
    raw = Buffer.concat(chunks).toString('utf8');
    const payload = raw.trim() ? JSON.parse(raw) : {};
    const out = handleHookEvent(payload);
    process.stdout.write(JSON.stringify(out) + '\n');
  } catch {
    process.stdout.write('{}\n');
  }
  process.exit(0);
}
