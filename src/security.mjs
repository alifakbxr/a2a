import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
export const MAX_INDEX_FILES = 9000;
export const MAX_SOURCE_BYTES = 160 * 1024;
const BLOCKED_PARTS = new Set(['.git','node_modules','vendor','.next','.nuxt','.svelte-kit','.turbo','.parcel-cache','.dart_tool','.gradle','target','dist','build','coverage','.venv','venv','__pycache__','.pytest_cache','.mypy_cache','.ruff_cache','.idea','.vscode','.verifykit','.a2a','.cache','.terraform','.pnpm-store','.gitlab','.ssh','.aws','.kube','.gnupg','.config','.gemini','.claude','.cursor']);
const SENSITIVE = /(^|\/)(\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|.*\.pem|.*\.key|.*\.p12|.*\.pfx|secrets?(?:\..*)?|credentials?(?:\..*)?|.*\.sqlite(?:-wal|-shm)?|.*\.db|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock|npm-shrinkwrap\.json)$/i;
const IGNORED_SUBPATHS = /(^|\/)storage\/logs(\/|$)/i;
export const isSafeRelative = (rel) => typeof rel === 'string' && rel.length > 0 && rel.length <= 500 && !rel.includes('\0') && !path.isAbsolute(rel) && !rel.split(/[\\/]/).some(p=>p==='..') && !rel.startsWith('~');
export const shouldIgnore = (rel) => {
  const norm = String(rel || '').replaceAll('\\', '/');
  return norm.split('/').some(p => BLOCKED_PARTS.has(p))
    || SENSITIVE.test(norm)
    || IGNORED_SUBPATHS.test(norm)
    || /\.(?:min\.(?:js|css)|map|lock|tsbuildinfo|png|jpe?g|gif|webp|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|exe|dll|so|dylib)$/i.test(norm);
};
export const dataDir = () => {
  if (process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA) {
    return path.resolve(process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA);
  }
  const pluginData = path.join(os.homedir(), '.gemini', 'antigravity', 'plugin_data', 'a2a');
  if (fs.existsSync(pluginData)) return pluginData;
  const a2aDir = path.join(os.homedir(), '.config', 'a2a', 'data');
  if (fs.existsSync(a2aDir)) return a2aDir;
  const legacyDir = path.join(os.homedir(), '.config', 'verifykit', 'data');
  if (fs.existsSync(legacyDir)) return legacyDir;
  return a2aDir;
};
export const allowlistPath = () => {
  const p = path.join(os.homedir(), '.config', 'a2a', 'allowed-workspaces.json');
  const legacy = path.join(os.homedir(), '.config', 'verifykit', 'allowed-workspaces.json');
  if (fs.existsSync(legacy) && !fs.existsSync(p)) return legacy;
  return p;
};
export const settingsPath = () => {
  const p = path.join(os.homedir(), '.config', 'a2a', 'settings.json');
  const legacy = path.join(os.homedir(), '.config', 'verifykit', 'settings.json');
  if (fs.existsSync(p)) return p;
  if (fs.existsSync(legacy)) return legacy;
  return p;
};

function readSettings() {
  try {
    const file = settingsPath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    }
  } catch {}
  return {};
}

function writeSettings(patch) {
  const target = path.join(os.homedir(), '.config', 'a2a', 'settings.json');
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const data = { ...readSettings(), ...patch, updatedAt: new Date().toISOString() };
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(target, flags, 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  return data;
}

export function getVerifyKitMode() {
  const data = readSettings();
  if (data.mode === 'always-on' || data.mode === 'on-demand') return data.mode;
  return 'always-on';
}
export const getA2AMode = getVerifyKitMode;

export function getCompactMode() {
  const data = readSettings();
  if (typeof data.compact === 'boolean') return data.compact;
  if (data.compact === 'on' || data.compact === 'enabled' || data.compact === 'true') return true;
  return false;
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
  const homeRaw = os.homedir();
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
  const home = realpathIfExists(os.homedir());
  if (canonical === path.parse(canonical).root) return true;
  if (process.platform === 'win32') {
    const cLower = canonical.toLowerCase();
    const hLower = home.toLowerCase();
    if (cLower === path.parse(cLower).root.toLowerCase()) return true;
    if (cLower === hLower || hLower.startsWith(cLower.endsWith(path.sep) ? cLower : cLower + path.sep)) return true;
  } else {
    if (canonical === home || home.startsWith(canonical.endsWith(path.sep) ? canonical : canonical + path.sep)) return true;
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
        try { results.push(decodeURIComponent(new URL(f.uri).pathname)); } catch {}
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

  const home = os.homedir();
  const cacheKey = `${home}|${autoTrust}|${settingsPath()}`;
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
              try { raw = decodeURIComponent(new URL(entry.uri.external).pathname); } catch {}
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

  if (autoTrust === 'active-only' || autoTrust === 'project-markers') {
    // 3. Running Antigravity processes with --add-dir=... (active sessions)
    try {
      if (process.platform === 'linux') {
        const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
        for (const pid of pids) {
          try {
            const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
            if (cmdline.includes('agy') || cmdline.includes('antigravity')) {
              const matches = cmdline.matchAll(/--add-dir=([^\0]+)/g);
              for (const match of matches) {
                addPath(match[1], { requireMarker: false });
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

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
                  addPath(decodeURIComponent(new URL(res.folderUri).pathname), { requireMarker: true });
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
                  addPath(decodeURIComponent(new URL(uri).pathname), { requireMarker: true });
                } catch {}
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  const sorted = [...dirs].sort();
  workspaceCache = { key: cacheKey, ts: now, dirs: sorted };
  return sorted;
}

export function loadAllowlist(){
  try {
    const stat = fs.lstatSync(allowlistPath());
    if(!stat.isFile() || stat.isSymbolicLink()) return [];
    const data = JSON.parse(fs.readFileSync(allowlistPath(),'utf8'));
    return Array.isArray(data.allowed) ? data.allowed.filter(s=>typeof s==='string') : [];
  } catch {return []}
}

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
  const allowed = loadAllowlist();
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
function writeAllowlist(allowed){
  const target=path.join(os.homedir(), '.config', 'a2a', 'allowed-workspaces.json');
  const parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|(fs.constants.O_NOFOLLOW||0);
  const fd=fs.openSync(target,flags,0o600);
  try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,JSON.stringify({version:1,allowed},null,2)+'\n')}finally{fs.closeSync(fd)}
}
export function authorizeWorkspace(input) {
  const ws=normalizeWorkspace(input);
  if(isProtectedRoot(ws)) throw new Error('Refusing to authorize a protected root or system directory');
  const allowed=[...new Set([...loadAllowlist(),ws])].sort();
  writeAllowlist(allowed);
  return ws;
}
export function revokeWorkspace(input){
  const ws=normalizeWorkspace(input);const allowed=loadAllowlist().filter(x=>x!==ws);
  writeAllowlist(allowed);
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
  if (workspaceRoot) {
    try {
      const authWs = requireAuthorizedWorkspace(workspaceRoot);
      if (isSameOrDescendantPath(authWs, resolved) || isSameOrDescendantPath(workspaceRoot, resolved)) {
        authorizedBoundary = authWs;
      }
    } catch {}
  }
  if (!authorizedBoundary && conversationId && /^[a-zA-Z0-9_\-.]{4,64}$/.test(conversationId)) {
    const brainDir = path.resolve(os.homedir(), '.gemini', 'antigravity', 'brain', conversationId);
    if (isSameOrDescendantPath(brainDir, resolved)) {
      authorizedBoundary = brainDir;
    }
  }
  if (!authorizedBoundary) {
    const allowed = loadAllowlist();
    for (const a of allowed) {
      if (isProtectedRoot(a)) continue;
      const canonical = realpathIfExists(a);
      if (isSameOrDescendantPath(canonical, resolved) || isSameOrDescendantPath(a, resolved)) {
        authorizedBoundary = canonical;
        break;
      }
    }
  }
  if (!authorizedBoundary) {
    const agWorkspaces = loadAntigravityWorkspaces();
    for (const a of agWorkspaces) {
      if (isProtectedRoot(a)) continue;
      const canonical = realpathIfExists(a);
      if (isSameOrDescendantPath(canonical, resolved) || isSameOrDescendantPath(a, resolved)) {
        authorizedBoundary = canonical;
        break;
      }
    }
  }

  if (!authorizedBoundary) {
    throw new Error('Path escapes authorized workspace or brain boundary');
  }

  if (isProtectedRoot(resolved)) {
    throw new Error('Access to protected root denied');
  }

  const base = path.basename(resolved);
  if (shouldIgnore(base) || /(?:^\.env|\.pem$|\.key$|\.sqlite|\.git$)/i.test(base)) {
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
