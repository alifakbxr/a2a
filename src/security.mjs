import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
export const MAX_INDEX_FILES = 9000;
export const MAX_SOURCE_BYTES = 160 * 1024;
const BLOCKED_PARTS = new Set(['.git','node_modules','vendor','.next','.nuxt','.svelte-kit','.turbo','.parcel-cache','.dart_tool','.gradle','target','dist','build','coverage','.venv','venv','__pycache__','.pytest_cache','.mypy_cache','.ruff_cache','.idea','.vscode','.verifykit','.a2a','.cache','.terraform','.pnpm-store','.gitlab','.ssh','.aws','.kube','.gnupg','.docker','.azure','.gcloud','.config','.gemini','.claude','.cursor']);
const SENSITIVE = /(^|\/)(\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|id_ecdsa|id_dsa|\.htpasswd|\.pgpass|\.my\.cnf|\.vault-token|\.git-credentials|.*service[-_]account.*\.json|.*\.jks|.*\.keystore|.*\.kdbx|.*\.pem|.*\.key|.*\.p12|.*\.pfx|secrets?(?:\..*)?|credentials?(?:\..*)?|.*\.sqlite(?:-wal|-shm)?|.*\.db|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock|npm-shrinkwrap\.json)$/i;
const IGNORED_SUBPATHS = /(^|\/)storage\/logs(\/|$)/i;
export const isSafeRelative = (rel) => typeof rel === 'string' && rel.length > 0 && rel.length <= 500 && !rel.includes('\0') && !path.isAbsolute(rel) && !rel.split(/[\\/]/).some(p=>p==='..') && !rel.startsWith('~');
export const shouldIgnore = (rel) => {
  const norm = String(rel || '').replaceAll('\\', '/');
  return norm.split('/').some(p => BLOCKED_PARTS.has(p))
    || SENSITIVE.test(norm)
    || IGNORED_SUBPATHS.test(norm)
    || /\.(?:min\.(?:js|css)|map|lock|tsbuildinfo|png|jpe?g|gif|webp|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|exe|dll|so|dylib)$/i.test(norm);
};
export function getHomeDir() {
  if (process.env.HOME && process.env.HOME.trim()) return process.env.HOME;
  if (process.env.USERPROFILE && process.env.USERPROFILE.trim()) return process.env.USERPROFILE;
  return os.homedir();
}
export const dataDir = () => {
  if (process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA) {
    return path.resolve(process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA);
  }
  const home = getHomeDir();
  const pluginData = path.join(home, '.gemini', 'antigravity', 'plugin_data', 'a2a');
  if (fs.existsSync(pluginData)) return pluginData;
  const a2aDir = path.join(home, '.config', 'a2a', 'data');
  if (fs.existsSync(a2aDir)) return a2aDir;
  const legacyDir = path.join(home, '.config', 'verifykit', 'data');
  if (fs.existsSync(legacyDir)) return legacyDir;
  return a2aDir;
};
export const allowlistPath = () => {
  const home = getHomeDir();
  const p = path.join(home, '.config', 'a2a', 'allowed-workspaces.json');
  const legacy = path.join(home, '.config', 'verifykit', 'allowed-workspaces.json');
  if (fs.existsSync(legacy) && !fs.existsSync(p)) return legacy;
  return p;
};
export const settingsPath = () => {
  const home = getHomeDir();
  const p = path.join(home, '.config', 'a2a', 'settings.json');
  const legacy = path.join(home, '.config', 'verifykit', 'settings.json');
  if (fs.existsSync(p)) return p;
  if (fs.existsSync(legacy)) return legacy;
  return p;
};

function readSettings() {
  try {
    const file=settingsPath(),stat=fs.lstatSync(file);
    if(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=64*1024){
      const result=JSON.parse(fs.readFileSync(file,'utf8'));
      return result&&typeof result==='object'&&!Array.isArray(result)?result:{};
    }
  } catch {}
  return {};
}

function writeSettings(patch) {
  const target = path.join(getHomeDir(), '.config', 'a2a', 'settings.json');
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const data = { ...readSettings(), ...patch, updatedAt: new Date().toISOString() };
  // Atomic replacement, unlike O_TRUNC, keeps a complete previous settings
  // file if a process is interrupted midway through a write.
  const temp=target+'.'+process.pid+'.'+crypto.randomUUID()+'.tmp';
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0);
  let fd=null;
  try{
    fd=fs.openSync(temp,flags,0o600);
    fs.writeFileSync(fd,JSON.stringify(data,null,2)+'\n');
    fs.closeSync(fd);fd=null;
    fs.renameSync(temp,target);
  }finally{
    if(fd!==null)fs.closeSync(fd);
    try{fs.unlinkSync(temp)}catch{}
  }
  return data;
}

export function getVerifyKitMode() {
  const data = readSettings();
  if (data.mode === 'always-on' || data.mode === 'on-demand') return data.mode;
  // Opt-in to proactive analysis; avoid extra model/tool turns for ordinary tasks.
  return 'on-demand';
}
export const getA2AMode = getVerifyKitMode;

export function getCompactMode() {
  const data = readSettings();
  if (typeof data.compact === 'boolean') return data.compact;
  if (data.compact === 'on' || data.compact === 'enabled' || data.compact === 'true') return true;
  // New installs default to bounded responses. Explicit compact off is honored.
  return true;
}

// Full-content Antigravity brain artifact retention is sensitive: default OFF.
// Manual snapshot_artifact calls remain explicit and unaffected.
export function getArtifactAutoSnapshotMode(){
  return readSettings().artifact_auto_snapshot===true;
}
export function setArtifactAutoSnapshotMode(value){
  if(value!==true&&value!==false&&value!=='on'&&value!=='off')throw new Error('Expected auto-snapshot on or off');
  const enabled=value===true||value==='on';
  writeSettings({artifact_auto_snapshot:enabled});
  return enabled;
}

export function setCompactMode(val) {
  let boolVal;
  if (val === 'toggle') {
    boolVal = !getCompactMode();
  } else if (val === true || val === 'on' || val === 'enable' || val === 'enabled' || val === 'true') {
    boolVal = true;
  } else if (val === false || val === 'off' || val === 'disable' || val === 'disabled' || val === 'false') {
    boolVal = false;
  } else {
    throw new Error('Invalid compact setting. Expected "on", "off", or "toggle"');
  }
  writeSettings({ compact: boolVal });
  return boolVal;
}

export function setVerifyKitMode(mode) {
  if (mode !== 'always-on' && mode !== 'on-demand') {
    throw new Error('Invalid mode. Expected "always-on" or "on-demand"');
  }
  writeSettings({ mode });
  return mode;
}
export const setA2AMode = setVerifyKitMode;

const VALID_AUTO_TRUST = new Set(['antigravity-trust', 'active-only', 'project-markers', 'off']);
export function getAutoTrustMode() {
  const data = readSettings();
  if (VALID_AUTO_TRUST.has(data.autoTrust)) return data.autoTrust;
  return 'antigravity-trust';
}
export function setAutoTrustMode(mode) {
  if (!VALID_AUTO_TRUST.has(mode)) {
    throw new Error('Invalid autoTrust mode. Expected "antigravity-trust", "active-only", "project-markers", or "off"');
  }
  writeSettings({ autoTrust: mode });
  invalidateWorkspaceCache();
  return mode;
}

export const normalizeWorkspace = input => {
  if (!input || typeof input !== 'string') throw new Error('workspace must be an absolute directory path');
  const full = path.resolve(input);
  if (!path.isAbsolute(input)) throw new Error('workspace must be an absolute directory path');
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error('workspace does not exist');
  return fs.realpathSync(full);
};

export function realpathIfExists(p) {
  try {
    if (fs.existsSync(p)) return fs.realpathSync(p);
  } catch {}
  return path.resolve(p);
}

export function getProtectedRoots() {
  const homeRaw = getHomeDir();
  const home = realpathIfExists(homeRaw);
  const tmpRaw = os.tmpdir();
  const tmp = realpathIfExists(tmpRaw);
  const candidates = [
    path.parse(home).root,
    home,
    path.join(home, 'Documents'),
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'Music'),
    path.join(home, 'Pictures'),
    path.join(home, 'Videos'),
    path.join(home, '.config'),
    path.join(home, '.gemini'),
    path.join(home, '.gemini', 'config'),
    path.join(home, '.gemini', 'antigravity'),
    path.join(home, '.ssh'),
    path.join(home, '.aws'),
    path.join(home, '.gnupg'),
    path.resolve(tmpRaw),
    tmp,
  ];
  const roots = new Set();
  for (const c of candidates) {
    roots.add(path.resolve(c));
    roots.add(realpathIfExists(c));
  }
  return roots;
}

export function isProtectedRoot(ws) {
  if (!ws || typeof ws !== 'string') return true;
  const canonical = realpathIfExists(ws);
  const home = realpathIfExists(getHomeDir());
  if (canonical === path.parse(canonical).root) return true;
  if (process.platform === 'win32') {
    const cLower = canonical.toLowerCase();
    const hLower = home.toLowerCase();
    if (cLower === path.parse(cLower).root.toLowerCase()) return true;
    if (cLower === hLower || hLower.startsWith(cLower.endsWith(path.sep) ? cLower : cLower + path.sep)) return true;
  } else {
    if (canonical === home || home.startsWith(canonical.endsWith(path.sep) ? canonical : canonical + path.sep)) return true;
  }
  // Deny descendants of credential/application state directories, not just
  // the directory itself. Ordinary projects in Documents remain permitted.
  for (const sensitive of ['.ssh','.aws','.gnupg','.config','.gemini','.docker','.azure','.gcloud']) {
    const target=realpathIfExists(path.join(home,sensitive));
    if (isSameOrDescendantPath(target,canonical)) return true;
  }
  const protRoots = getProtectedRoots();
  if (protRoots.has(canonical)) return true;
  if (process.platform === 'win32' || process.platform === 'darwin') {
    const cLower = canonical.toLowerCase();
    for (const pr of protRoots) {
      if (pr.toLowerCase() === cLower) return true;
    }
  }
  return false;
}

const PROJECT_MARKERS = [
  '.git', 'package.json', 'composer.json', 'pyproject.toml', 'go.mod', 'Cargo.toml',
  'pubspec.yaml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'Package.swift',
  'project.godot', 'CMakeLists.txt', 'Makefile'
];

function hasProjectMarker(dir) {
  try {
    for (const m of PROJECT_MARKERS) {
      if (fs.existsSync(path.join(dir, m))) return true;
    }
    const entries = fs.readdirSync(dir);
    return entries.some(e => /\.(?:sln|csproj)$/i.test(e));
  } catch {
    return false;
  }
}

function parseJsonc(raw) {
  try { return JSON.parse(raw); } catch {}
  let out = '', i = 0, inStr = false, esc = false;
  while (i < raw.length) {
    const ch = raw[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      i++;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; i++; continue; }
    if (ch === '/' && raw[i + 1] === '/') {
      while (i < raw.length && raw[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && raw[i + 1] === '*') {
      i += 2;
      while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  out = out.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(out);
}

function extractWorkspaceFolderPaths(wsFilePath) {
  const results = [];
  try {
    if (!fs.existsSync(wsFilePath) || !fs.statSync(wsFilePath).isFile()) return results;
    const data = parseJsonc(fs.readFileSync(wsFilePath, 'utf8'));
    const folders = Array.isArray(data?.folders) ? data.folders : [];
    const baseDir = path.dirname(wsFilePath);
    for (const f of folders) {
      if (!f || typeof f !== 'object') continue;
      if (typeof f.uri === 'string' && f.uri.startsWith('file://')) {
        try { results.push(fileURLToPath(f.uri)); } catch {}
      } else if (typeof f.path === 'string' && f.path.trim()) {
        results.push(path.resolve(baseDir, f.path));
      }
    }
  } catch {}
  return results;
}

const WORKSPACE_CACHE_TTL_MS = 10_000;
let workspaceCache = null;

export function invalidateWorkspaceCache() {
  workspaceCache = null;
}

export function loadAntigravityWorkspaces({ bypassCache = false } = {}) {
  const autoTrust = getAutoTrustMode();
  if (autoTrust === 'off') return [];

  const home = getHomeDir();
  // The active SessionStart record is a cache input in active-only mode.
  // A workspace switch must invalidate permissions without waiting for TTL.
  let activeVersion='';
  if(autoTrust==='active-only'){
    try{
      const stat=fs.lstatSync(path.join(dataDir(),'active-session.json'));
      activeVersion=stat.isFile()&&!stat.isSymbolicLink()?`${stat.mtimeMs}:${stat.size}`:'unsafe';
    }catch{activeVersion='missing'}
  }
  const cacheKey = `${home}|${autoTrust}|${settingsPath()}|${activeVersion}`;
  const now = Date.now();
  if (!bypassCache && workspaceCache && workspaceCache.key === cacheKey && (now - workspaceCache.ts) < WORKSPACE_CACHE_TTL_MS) {
    return workspaceCache.dirs;
  }

  const dirs = new Set();
  const addPath = (rawPath, { requireMarker = true } = {}) => {
    if (!rawPath || typeof rawPath !== 'string') return;
    if (rawPath.endsWith('.code-workspace')) {
      for (const folder of extractWorkspaceFolderPaths(rawPath)) {
        addPath(folder, { requireMarker });
      }
      return;
    }
    if (path.basename(rawPath) === 'workspace.json') {
      for (const folder of extractWorkspaceFolderPaths(rawPath)) {
        addPath(folder, { requireMarker });
      }
      return;
    }
    try {
      if (!fs.existsSync(rawPath) || !fs.statSync(rawPath).isDirectory()) return;
      const real = fs.realpathSync(rawPath);
      if (isProtectedRoot(real)) return;
      if (requireMarker && !hasProjectMarker(real)) return;
      dirs.add(real);
    } catch {}
  };

  // 1. Antigravity IDE built-in Workspace Trust (globalStorage/state.vscdb -> content.trust.model.key)
  try {
    const stateCandidates = [
      path.join(home, '.config', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
      path.join(home, 'Library', 'Application Support', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
      ...(process.env.APPDATA ? [path.join(process.env.APPDATA, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb')] : []),
    ];
    for (const dbFile of stateCandidates) {
      if (!fs.existsSync(dbFile)) continue;
      let db;
      try {
        db = new DatabaseSync(dbFile, { readOnly: true });
        const row = db.prepare("SELECT value FROM ItemTable WHERE key='content.trust.model.key'").get();
        if (row?.value) {
          const parsed = JSON.parse(row.value);
          const entries = Array.isArray(parsed?.uriTrustInfo) ? parsed.uriTrustInfo : [];
          for (const entry of entries) {
            if (!entry || entry.trusted !== true || !entry.uri) continue;
            let raw = entry.uri.fsPath || entry.uri.path || null;
            if (!raw && typeof entry.uri.external === 'string' && entry.uri.external.startsWith('file://')) {
              try { raw = fileURLToPath(entry.uri.external); } catch {}
            }
            if (raw) addPath(raw, { requireMarker: false });
          }
        }
      } catch {} finally {
        try { db?.close(); } catch {}
      }
    }
  } catch {}

  // 2. Antigravity CLI & App settings.json (explicit trustedWorkspaces)
  try {
    for (const appDir of ['antigravity-cli', 'antigravity', 'antigravity-ide']) {
      const cliSettings = path.join(home, '.gemini', appDir, 'settings.json');
      if (!fs.existsSync(cliSettings)) continue;
      try {
        const content = JSON.parse(fs.readFileSync(cliSettings, 'utf8'));
        const trusted = Array.isArray(content?.trustedWorkspaces) ? content.trustedWorkspaces : [];
        for (const p of trusted) {
          addPath(p, { requireMarker: false });
        }
      } catch {}
    }
  } catch {}

  // Never grant workspace authorization from /proc command-line text.
  // A separate, unrelated user process can spoof "agy --add-dir=<victim>"
  // in its argv. Only IDE/CLI trust state, user allowlist, and narrowly
  // reviewed project records are eligible authorization sources.

  if (autoTrust === 'project-markers') {
    // 4. ~/.gemini/config/projects/*.json (historical projects — require project marker)
    try {
      const projDir = path.join(home, '.gemini', 'config', 'projects');
      if (fs.existsSync(projDir)) {
        for (const f of fs.readdirSync(projDir)) {
          if (!f.endsWith('.json')) continue;
          try {
            const content = JSON.parse(fs.readFileSync(path.join(projDir, f), 'utf8'));
            const resources = content?.projectResources?.resources || [];
            for (const res of resources) {
              if (res.folderUri && typeof res.folderUri === 'string' && res.folderUri.startsWith('file://')) {
                try {
                  addPath(fileURLToPath(res.folderUri), { requireMarker: true });
                } catch {}
              }
            }
          } catch {}
        }
      }
    } catch {}

    // 4. ~/.gemini/projects.json (historical projects — require project marker)
    try {
      const pJson = path.join(home, '.gemini', 'projects.json');
      if (fs.existsSync(pJson)) {
        const content = JSON.parse(fs.readFileSync(pJson, 'utf8'));
        if (content?.projects && typeof content.projects === 'object') {
          for (const p of Object.keys(content.projects)) {
            addPath(p, { requireMarker: true });
          }
        }
      }
    } catch {}

    // 5. ~/.config/Antigravity IDE/User/workspaceStorage/*/workspace.json (historical IDE storage — require project marker)
    try {
      const wsStorage = path.join(home, '.config', 'Antigravity IDE', 'User', 'workspaceStorage');
      if (fs.existsSync(wsStorage)) {
        for (const d of fs.readdirSync(wsStorage)) {
          const wsFile = path.join(wsStorage, d, 'workspace.json');
          if (fs.existsSync(wsFile)) {
            try {
              const data = JSON.parse(fs.readFileSync(wsFile, 'utf8'));
              const uri = data.folder || data.workspace;
              if (uri && typeof uri === 'string' && uri.startsWith('file://')) {
                try {
                  addPath(fileURLToPath(uri), { requireMarker: true });
                } catch {}
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  if(autoTrust==='active-only'){
    // Active-only is an intersection of two independent local records:
    // (1) an explicitly trusted Antigravity workspace and
    // (2) the last bounded SessionStart workspace. A hook record by itself
    // can NEVER authorize a new workspace.
    const active=[];
    try{
      const sessionFile=path.join(dataDir(),'active-session.json');
      const stat=fs.lstatSync(sessionFile);
      if(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=128*1024){
        const latest=JSON.parse(fs.readFileSync(sessionFile,'utf8'))?.latest;
        const candidates=[...(Array.isArray(latest?.workspacePaths)?latest.workspacePaths.slice(0,32):[]),latest?.cwd];
        for(const candidate of candidates){
          if(typeof candidate!=='string'||!path.isAbsolute(candidate))continue;
          const real=realpathIfExists(candidate);
          if(!fs.existsSync(real)||!fs.statSync(real).isDirectory()||isProtectedRoot(real))continue;
          if([...dirs].some(trusted=>isSameOrDescendantPath(trusted,real)))active.push(real);
        }
      }
    }catch{}
    dirs.clear();
    for(const activeRoot of active)dirs.add(activeRoot);
  }
  const sorted = [...dirs].sort();
  workspaceCache = { key: cacheKey, ts: now, dirs: sorted };
  return sorted;
}

function readWorkspaceGrants(){
  const file=allowlistPath();
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128*1024)throw Error('Unsafe workspace grants file');
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!data||!Array.isArray(data.allowed)||!Array.isArray(data.revoked??[]))throw Error('Malformed workspace grants');
    const validList=xs=>xs.every(x=>typeof x==='string'&&x.length<=1024&&path.isAbsolute(x));
    const revoked=data.revoked??[];
    if(!validList(data.allowed)||!validList(revoked))throw Error('Invalid workspace grants');
    return {allowed:data.allowed,revoked,valid:true};
  }catch(e){
    if(e.code==='ENOENT')return {allowed:[],revoked:[],valid:true};
    // A damaged grants file must never silently reactivate auto-trusted paths.
    return {allowed:[],revoked:[],valid:false};
  }
}
export function loadAllowlist(){return readWorkspaceGrants().allowed}
export function loadRevokedWorkspaces(){return readWorkspaceGrants().revoked}

export function isSameOrDescendantPath(parent, child) {
  if (!parent || !child) return false;
  const p = path.resolve(parent);
  const c = path.resolve(child);
  if (p === c) return true;

  const pWithSep = p.endsWith(path.sep) ? p : p + path.sep;
  if (c.startsWith(pWithSep)) return true;

  // Case-insensitive check (Windows and macOS default filesystems)
  if (process.platform === 'win32' || process.platform === 'darwin') {
    const pLower = p.toLowerCase();
    const cLower = c.toLowerCase();
    const pLowerWithSep = pLower.endsWith(path.sep) ? pLower : pLower + path.sep;
    if (cLower === pLower || cLower.startsWith(pLowerWithSep)) return true;
  }

  // macOS /private symlink alias check (/var -> /private/var, /tmp -> /private/tmp)
  if (process.platform === 'darwin') {
    const pPriv = p.startsWith('/private/') ? p : '/private' + p;
    const cPriv = c.startsWith('/private/') ? c : '/private' + c;
    const pPrivWithSep = pPriv.endsWith('/') ? pPriv : pPriv + '/';
    if (cPriv === pPriv || cPriv.startsWith(pPrivWithSep)) return true;

    const pNoPriv = p.startsWith('/private/') ? p.slice('/private'.length) : p;
    const cNoPriv = c.startsWith('/private/') ? c.slice('/private'.length) : c;
    const pNoPrivWithSep = pNoPriv.endsWith('/') ? pNoPriv : pNoPriv + '/';
    if (cNoPriv === pNoPriv || cNoPriv.startsWith(pNoPrivWithSep)) return true;
  }

  return false;
}

export function isWorkspaceAuthorized(ws){
  if (isProtectedRoot(ws)) return false;
  const canonical = realpathIfExists(ws);
  const grants=readWorkspaceGrants();
  if(!grants.valid)return false;
  if(grants.revoked.some(p=>isSameOrDescendantPath(p,canonical)||isSameOrDescendantPath(p,ws)))return false;
  const allowed = grants.allowed;
  for (const a of allowed) {
    if (isProtectedRoot(a)) continue;
    if (isSameOrDescendantPath(a, canonical) || isSameOrDescendantPath(a, ws)) {
      return true;
    }
  }
  const agWorkspaces = loadAntigravityWorkspaces();
  for (const a of agWorkspaces) {
    if (isProtectedRoot(a)) continue;
    if (isSameOrDescendantPath(a, canonical) || isSameOrDescendantPath(a, ws)) {
      return true;
    }
  }
  return false;
}

export function requireAuthorizedWorkspace(input){
  const ws=normalizeWorkspace(input);
  if (!isWorkspaceAuthorized(ws)) throw new Error('Workspace is not authorized. Run: node scripts/a2a.mjs allow "'+ws+'" (local user approval).');
  return ws;
}
function writeAllowlist(allowed,revoked=[]){
  const target=path.join(getHomeDir(), '.config', 'a2a', 'allowed-workspaces.json');
  const parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true,mode:0o700});
  // A replace prevents partial/truncated grant files on interruption and never
  // follows a symlink at the target pathname.
  const temp=target+'.'+process.pid+'.'+crypto.randomUUID()+'.tmp';
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW||0);
  let fd=null;
  try{
    fd=fs.openSync(temp,flags,0o600);
    fs.writeFileSync(fd,JSON.stringify({version:1,allowed,revoked},null,2)+'\n');
    fs.closeSync(fd);fd=null;
    fs.renameSync(temp,target);
  }finally{
    if(fd!==null)fs.closeSync(fd);
    try{fs.unlinkSync(temp)}catch{}
  }
}
export function authorizeWorkspace(input) {
  const ws=normalizeWorkspace(input);
  if(isProtectedRoot(ws)) throw new Error('Refusing to authorize a protected root or system directory');
  const current=readWorkspaceGrants();
  if(!current.valid)throw new Error('Workspace grants file is invalid; repair it before allowing access');
  const allowed=[...new Set([...current.allowed,ws])].sort();
  const revoked=current.revoked.filter(x=>x!==ws);
  writeAllowlist(allowed,revoked);
  return ws;
}
export function revokeWorkspace(input){
  const ws=normalizeWorkspace(input);
  const current=readWorkspaceGrants();
  if(!current.valid)throw new Error('Workspace grants file is invalid; cannot safely revoke access');
  const allowed=current.allowed.filter(x=>x!==ws);
  const revoked=[...new Set([...current.revoked,ws])].sort();
  writeAllowlist(allowed,revoked);
  return allowed;
}
export function safeFile(root,rel,{mustExist=true}={}) {
  if (!isSafeRelative(rel) || shouldIgnore(rel)) throw new Error('Blocked unsafe or sensitive file path');
  const full=path.resolve(root,rel);
  if (full === root || !full.startsWith(root+path.sep)) throw new Error('Path escapes workspace');
  if (mustExist){
    const segments=path.relative(root,full).split(path.sep);let cursor=root;
    for(const segment of segments){cursor=path.join(cursor,segment);const st=fs.lstatSync(cursor);if(st.isSymbolicLink()) throw new Error('Symlink access denied');}
    if(!fs.statSync(full).isFile())throw new Error('Not a regular file');
  }
  return full;
}

export const MAX_ARTIFACT_BYTES = 500 * 1024;

export function safeArtifactPath(workspaceRoot, conversationId, targetPath, { mustExist = true } = {}) {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.includes('\0')) {
    throw new Error('Invalid artifact path');
  }
  const resolved = path.resolve(targetPath);

  let authorizedBoundary = null;
  let trustedBrainArtifact=false;
  if (workspaceRoot) {
    try {
      const authWs = requireAuthorizedWorkspace(workspaceRoot);
      if (isSameOrDescendantPath(authWs, resolved) || isSameOrDescendantPath(workspaceRoot, resolved)) {
        authorizedBoundary = authWs;
      }
    } catch {}
  }
  if (!authorizedBoundary && conversationId && /^[a-zA-Z0-9_\-.]{4,64}$/.test(conversationId)) {
    const brainDir = path.resolve(getHomeDir(), '.gemini', 'antigravity', 'brain', conversationId);
    // Only top-level Markdown artifacts can be read from a conversation brain.
    // Never allow .system_generated or nested internal conversation content.
    if (path.dirname(resolved) === brainDir && path.extname(resolved).toLowerCase()==='.md'
        && !path.basename(resolved).startsWith('.')) {
      // The special brain exception does not rely on workspace approval.
      // Every directory segment below HOME must therefore be a real directory,
      // never a symlink that redirects private reads elsewhere.
      let safeBrain=true;
      let segment=getHomeDir();
      for (const part of ['.gemini','antigravity','brain',conversationId]) {
        segment=path.join(segment,part);
        try {
          const st=fs.lstatSync(segment);
          if(st.isSymbolicLink()||!st.isDirectory()){safeBrain=false;break}
        } catch {safeBrain=false;break}
      }
      if (!safeBrain)throw new Error('Symlink access denied for brain artifact');
      authorizedBoundary = brainDir;
      trustedBrainArtifact=true;
    }
  }
  // No global allowlist fallback: authorization is bound to the *requested* workspace.
  // For hook-driven snapshots (no workspaceRoot), only the session's brain directory is valid.
  if (!authorizedBoundary) {
    throw new Error('Path escapes authorized workspace or brain boundary');
  }

  if (isProtectedRoot(resolved) && !trustedBrainArtifact) {
    throw new Error('Access to protected root denied');
  }

  const base = path.basename(resolved);
  const relativeInsideBoundary=path.relative(authorizedBoundary,resolved);
  if (shouldIgnore(relativeInsideBoundary) || /(?:^\.env|\.pem$|\.key$|\.sqlite|\.git$)/i.test(base)) {
    throw new Error('Access to sensitive file denied');
  }

  if (mustExist) {
    if (!fs.existsSync(resolved)) {
      throw new Error('Artifact file does not exist');
    }

    let boundaryForSegments = authorizedBoundary;
    if (process.platform === 'darwin') {
      if (resolved.startsWith('/private/') && !boundaryForSegments.startsWith('/private/')) {
        boundaryForSegments = '/private' + boundaryForSegments;
      } else if (!resolved.startsWith('/private/') && boundaryForSegments.startsWith('/private/')) {
        boundaryForSegments = boundaryForSegments.slice('/private'.length);
      }
    }

    const relFromBoundary = path.relative(boundaryForSegments, resolved);
    const segments = relFromBoundary.split(path.sep);
    let cursor = boundaryForSegments;
    for (const seg of segments) {
      if (!seg || seg === '.') continue;
      cursor = path.join(cursor, seg);
      const st = fs.lstatSync(cursor);
      if (st.isSymbolicLink()) {
        throw new Error('Symlink access denied');
      }
    }
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      throw new Error('Not a regular file');
    }
    if (stat.size > MAX_ARTIFACT_BYTES) {
      throw new Error(`Artifact file exceeds maximum allowed size (${MAX_ARTIFACT_BYTES / 1024} KB)`);
    }
  }

  return resolved;
}
export function cleanError(error) {return String(error?.message||error).replace(/[\r\n\t]/g,' ').slice(0,400)}

/**
 * The refresh RPC carries an Antigravity CSRF token. Never send it to a
 * non-loopback endpoint supplied through process environment variables.
 */
export function localAntigravityRpcUrl(address){
  if(typeof address!=='string'||address.length>100)throw new Error('Invalid local language server address');
  const match=/^(127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/i.exec(address);
  const port=match?Number(match[2]):0;
  if(!match||port<1||port>65535)throw new Error('Language server must use a loopback host and valid port');
  return 'http://'+match[1]+':'+port+'/exa.language_server_pb.LanguageServerService/RefreshMcpServers';
}
