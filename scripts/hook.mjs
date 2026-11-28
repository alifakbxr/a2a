#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import { dataDir, getA2AMode, getArtifactAutoSnapshotMode, getHomeDir, requireAuthorizedWorkspace } from '../src/security.mjs';
import { sanitizeConversationId, vettedTranscript } from '../src/tokens.mjs';
import { Store } from '../src/storage.mjs';
import {gitChanges} from '../src/scanner.mjs';
import {Engine} from '../src/engine.mjs';
import {CANDIDATE_ARTIFACTS} from '../src/verification.mjs';
import {safeFile,sha256,debugLog} from '../src/security.mjs';

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

function safeLocalJson(file,maxBytes=128*1024){
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)return null;
    const value=JSON.parse(fs.readFileSync(file,'utf8'));
    return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
  }catch(error){debugLog('hook_metadata',error);return null}
}
function hookArgs(payload){
  const input=payload?.toolCall?.args||payload?.toolArgs||payload?.toolInput||payload?.arguments;
  return input&&typeof input==='object'&&!Array.isArray(input)?input:{};
}
export function isDirectTestCommand(value){
  if(typeof value!=='string'||!value.trim()||value.length>2000)return false;
  let cmd=value.trim();
  // Refuse shell chaining, masked exit status, command substitution, pipes,
  // redirections, comments and multiline invocations. Only an optional cd
  // prefix is allowed before one direct test runner.
  if(/[\r\n;|<>\x60]/.test(cmd)||/\$\s*\(|\$\{/.test(cmd)||/\s#/.test(cmd))return false;
  if(cmd.includes('&&')){
    const match=cmd.match(/^cd\s+[A-Za-z0-9./_~-]+\s*&&\s*(.+)$/i);
    if(!match||match[1].includes('&&'))return false;
    cmd=match[1].trim();
  }
  if(/[&]/.test(cmd))return false;
  cmd=cmd.replace(/^(?:(?:[A-Za-z_][A-Za-z0-9_]*)=[A-Za-z0-9._:/=-]+\s+){0,8}/,'');
  cmd=cmd.replace(/^(?:npx|bunx|uv\s+run|poetry\s+run)\s+/i,'');
  const runner=/^(?:npm\s+(?:run\s+)?test(?:\b|:)|pnpm\s+(?:(?:run|exec)\s+)?(?:test|vitest|jest)(?:\b|:)|yarn\s+(?:(?:run)\s+)?(?:test|vitest|jest)(?:\b|:)|bun\s+(?:(?:run)\s+)?test\b|node\s+--test\b|python3?\s+-m\s+(?:pytest|unittest)\b|pytest\b|phpunit\b|pest\b|vitest\b|jest\b|mocha\b|cargo\s+test\b|go\s+test\b|dotnet\s+test\b|flutter\s+test\b|dart\s+test\b|swift\s+test\b|mvn\s+test\b|(?:\.\/)?gradlew\s+test\b|php\s+artisan\s+test\b)/i;
  return runner.test(cmd);
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
      const metaCache = path.join(getHomeDir(),'.gemini','antigravity-cli','cache','conversation_metadata.json');
      const data=safeLocalJson(metaCache,64*1024);
      if(data?.conversations?.[currentConvId]?.is_internal)isSideQuestion=true;
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
  const existing=safeLocalJson(sessionFile)||{};

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
  const args=hookArgs(payload);
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


function pendingTestFile(baseDir,payload){
 const conv=sanitizeConversationId(payload?.conversationId),idx=payload?.stepIdx;
 if(!conv||!Number.isSafeInteger(idx)||idx<0)return null;
 return path.join(baseDir,'pending-tests',sha256(conv+':'+idx).slice(0,32)+'.json');
}
function reporterSnapshot(root,rel){
 try{
  const file=safeFile(root,rel),st=fs.statSync(file);
  if(!st.isFile()||st.size>1200000)return null;
  return {exists:true,hash:sha256(fs.readFileSync(file))};
 }catch{return {exists:false}}
}
function recordPreTestRun(payload,baseDir){
 const args=hookArgs(payload),cmd=args.CommandLine||args.commandLine||args.command;
 if(!isDirectTestCommand(cmd))return;
 const file=pendingTestFile(baseDir,payload);
 if(!file)return;
 const candidates=[args.Cwd||args.cwd,payload?.cwd,...(payload?.workspacePaths||[])].filter(v=>typeof v==='string');
 let root=null;
 for(const candidate of candidates){try{root=requireAuthorizedWorkspace(candidate);break}catch{}}
 if(!root)return;
 const reports={};
 const cmdPath=cmd.replaceAll('\\','/');
 for(const rel of CANDIDATE_ARTIFACTS){
  if(cmdPath.includes(rel)||cmdPath.includes(path.posix.basename(rel)))
   reports[rel]=reporterSnapshot(root,rel);
 }
 writeJsonSecure(file,{
  kind:'native-test-preflight-v1',conversationId:sanitizeConversationId(payload.conversationId),
  stepIdx:payload.stepIdx,workspace:root,command_hash:sha256(cmd),started_at:Date.now(),reports
 });
}
function consumeTestPreflight(payload,baseDir,cmd,workspace){
 const file=pendingTestFile(baseDir,payload);if(!file)return null;
 const prior=safeLocalJson(file,32*1024);
 try{fs.unlinkSync(file)}catch{}
 if(prior?.kind!=='native-test-preflight-v1'
    ||prior.conversationId!==sanitizeConversationId(payload?.conversationId)
    ||prior.stepIdx!==payload.stepIdx||prior.workspace!==workspace
    ||prior.command_hash!==sha256(cmd))return null;
 const elapsed=Date.now()-prior.started_at;
 if(!Number.isFinite(elapsed)||elapsed<0||elapsed>15*60*1000)return null;
 return prior;
}

function recordCommandRun(payload, baseDir) {
  handleArtifactModification(payload, baseDir);
  const args=hookArgs(payload);
  const cmd=args.CommandLine||args.commandLine||args.command;
  if(typeof cmd!=='string'||!cmd.trim())return;
  const direct=isDirectTestCommand(cmd);
  const suspicious=!direct&&/\b(?:npm\s+(?:run\s+)?test|node\s+--test|pytest|phpunit|pest|vitest|jest|mocha|cargo\s+test|go\s+test|dotnet\s+test|flutter\s+test|swift\s+test|mvn\s+test|gradlew\s+test|php\s+artisan\s+test)\b/i.test(cmd);
  if(!direct&&!suspicious)return;
  const candidates=[args.Cwd||args.cwd,payload?.cwd,...(payload?.workspacePaths||[])].filter(p=>typeof p==='string');
  let root=null;
  for(const p of candidates){try{root=requireAuthorizedWorkspace(p);break}catch{}}
  if(!root)return;
  const exit=direct?nativeProcessExitStatus(payload):{status:'unknown',exit_code:null};
  // Failed/unknown processes need no expensive workspace/report hashing.
  const sourceHashes={};
  const changed=exit.status==='passed'
    ? gitChanges(root).filter(p=>/\.(?:js|ts|jsx|tsx|mjs|cjs|php|py|go|rs|kt|java|dart|gd|swift|cs|rb|vue|svelte|sql)$/i.test(p))
    : [];
  for(const rel of changed.slice(0,200)){
    try{sourceHashes[rel]=sha256(fs.readFileSync(safeFile(root,rel)))}catch{}
  }
  // A successful command is not proof it generated an unrelated existing report.
  // Only explicitly named, recently written reporter output is eligible for
  // bounded local correlation; no independent execution attestation is implied.
  let sourceRevision=null;
  if(exit.status==='passed'){
    let engine;
    try{engine=new Engine();const state=engine.sync(root,{verifyIntegrity:true});if(state.source_integrity_complete)sourceRevision=state.revision;}
    catch(error){debugLog('hook_source_revision',error)}finally{try{engine?.close()}catch{}}
  }
  const reportHashes={},reportBindings={};
  const preflight=consumeTestPreflight(payload,baseDir,cmd,root);
  const reportArg=cmd.replaceAll('\\\\','/');const finishedAt=Date.now();
  for(const rel of exit.status==='passed'&&sourceRevision?CANDIDATE_ARTIFACTS:[]){
    try{
      const file=safeFile(root,rel);
      const stat=fs.statSync(file);
      const before=preflight?.reports?.[rel];
      if(stat.size<=1200000&&stat.isFile()&&before&&
          (reportArg.includes(rel)||reportArg.includes(path.posix.basename(rel)))&&
          stat.mtimeMs>=preflight.started_at-2000&&stat.mtimeMs<=finishedAt+2000){
          const currentHash=sha256(fs.readFileSync(file));
          if(before.exists===false||(before.exists===true&&before.hash!==currentHash)){
            reportHashes[rel]=currentHash;reportBindings[rel]=true;
          }
      }
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
    report_bindings:exit.status==='passed'?reportBindings:{},
    source_revision:exit.status==='passed'?sourceRevision:null,
  });
}

export const ALWAYS_ON_POLICY = 'PILAH Always-On (opt-in): Native first; zero calls for clear tasks. On cross-file uncertainty use eager PILAH context (actual mcp_<server>_pilah_context; workspace=<trusted project>, limit=5) if listed in /mcp. Others lazy: discover their schema and call_mcp_tool with actual server. No chains without new evidence. Local PASS is not E2E.';

export function recommendSkillGuidance(payload,baseDir,{throwErrors=false}={}){
  const conversationId=sanitizeConversationId(payload?.conversationId);
  const task=typeof payload?.lastUserInput==='string'?payload.lastUserInput:'';
  if(!conversationId||!task.trim()||task.length>4000)return {};
  const candidates=[...(Array.isArray(payload?.workspacePaths)?payload.workspacePaths:[]),...(typeof payload?.cwd==='string'?[payload.cwd]:[])].filter(x=>typeof x==='string'&&x.length<=1024&&path.isAbsolute(x));
  let workspace=null;
  for(const candidate of candidates){try{workspace=requireAuthorizedWorkspace(candidate);break}catch{}}
  if(!workspace)return {};
  const rawHost=payload?.hostSurface||process.env.PILAH_HOST_SURFACE||'ide';
  const host=['app','cli','ide'].includes(rawHost)?rawHost:'ide';
  let store;
  try{
    store=new Store(baseDir);
    const workspaceId=store.register(workspace);
    const result=recommendSkills({task,host,home:getHomeDir(),workspace,workspaceId,store});
    if(result.status!=='recommended'||result.confidence!=='high'||!result.recommendations.length)return {};
    const names=result.recommendations.slice(0,2).map(x=>x.name);
    const fingerprint=sha256(names.join('|'));
    if(!store.shouldInjectSkillRecommendation({workspaceId,conversationId,fingerprint}))return {};
    const list=names.join(', ');
    return {injectSteps:[{systemMessage:{systemMessage:'Potentially relevant Agent Skills for this request: '+list+'. If the host exposes these Skills, consider using the most relevant one. Do not assume a Skill is loaded or claim it ran unless the host confirms it. Otherwise continue with native Antigravity capabilities.'}}]};
  }catch(error){debugLog('skill_recommendation',error);if(throwErrors)throw error;return {};}
  finally{try{store?.close()}catch{}}
}

export function handleHookEvent(payload, { baseDir = dataDir() } = {}) {
  if (!payload || typeof payload !== 'object') return {};
  const event = payload.hookEventName || payload.hook_event_name || '';

  if (event === 'PreInvocation') {
    return recommendSkillGuidance(payload,baseDir);
  } else if (event === 'SessionStart') {
    recordActiveSession(payload, baseDir);
  } else if (event === 'PreToolUse') {
    recordPreTestRun(payload, baseDir);
    return {decision:'allow'}; // Defer to native Antigravity permission policy.
  } else if (event === 'PostToolUse') {
    recordCommandRun(payload, baseDir);
    return {};
  }

  if (event === 'SessionStart') {
    // In on-demand mode do not inject instructions into every Antigravity session.
    if (getA2AMode() !== 'always-on') return {};
    return {
      injectSteps: [{systemMessage:{systemMessage:ALWAYS_ON_POLICY}}],
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
