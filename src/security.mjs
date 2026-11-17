import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
export const MAX_INDEX_FILES = 9000;
export const MAX_SOURCE_BYTES = 160 * 1024;
const BLOCKED_PARTS = new Set(['.git','node_modules','vendor','.next','.nuxt','.dart_tool','.gradle','target','dist','build','coverage','.venv','venv','__pycache__','.idea','.vscode','.verifykit','.cache','.terraform','.pnpm-store','.gitlab','.ssh','.aws','.kube','.gnupg','.config','.gemini','.claude','.cursor']);
const SENSITIVE = /(^|\/)(\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|.*\.pem|.*\.key|.*\.p12|.*\.pfx|secrets?(?:\..*)?|credentials?(?:\..*)?|.*\.sqlite(?:-wal|-shm)?|.*\.db)$/i;
export const isSafeRelative = (rel) => typeof rel === 'string' && rel.length > 0 && rel.length <= 500 && !rel.includes('\0') && !path.isAbsolute(rel) && !rel.split(/[\\/]/).some(p=>p==='..') && !rel.startsWith('~');
export const shouldIgnore = rel => rel.split(/[\\/]/).some(p=>BLOCKED_PARTS.has(p)) || SENSITIVE.test(rel) || /\.(?:min\.(?:js|css)|map|lock|png|jpe?g|gif|webp|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|exe|dll|so|dylib)$/i.test(rel);
export const dataDir = () => {
  if (process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA) {
    return path.resolve(process.env.A2A_DATA_DIR || process.env.VERIFYKIT_DATA_DIR || process.env.PLUGIN_DATA);
  }
  const a2aDir = path.join(os.homedir(), '.config', 'a2a', 'data');
  const legacyDir = path.join(os.homedir(), '.config', 'verifykit', 'data');
  if (fs.existsSync(legacyDir) && !fs.existsSync(a2aDir)) return legacyDir;
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
  if (fs.existsSync(legacy) && !fs.existsSync(p)) return legacy;
  return p;
};

export function getVerifyKitMode() {
  try {
    const file = settingsPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.mode === 'always-on' || data.mode === 'on-demand') return data.mode;
    }
  } catch {}
  return 'always-on';
}
export const getA2AMode = getVerifyKitMode;

export function getCompactMode() {
  try {
    const file = settingsPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof data.compact === 'boolean') return data.compact;
      if (data.compact === 'on' || data.compact === 'enabled' || data.compact === 'true') return true;
    }
  } catch {}
  return false;
}

export function setCompactMode(val) {
  let boolVal;
  if (val === 'toggle') {
    boolVal = !getCompactMode();
  } else {
    boolVal = (val === true || val === 'on' || val === 'enable' || val === 'enabled' || val === 'true');
  }
  const file = settingsPath();
  const parent = path.dirname(file);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  let data = {};
  try {
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    }
  } catch {}
  data.compact = boolVal;
  data.updatedAt = new Date().toISOString();
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(file, flags, 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  return boolVal;
}

export function setVerifyKitMode(mode) {
  if (mode !== 'always-on' && mode !== 'on-demand') {
    throw new Error('Invalid mode. Expected "always-on" or "on-demand"');
  }
  const file = settingsPath();
  const parent = path.dirname(file);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  let data = {};
  try {
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    }
  } catch {}
  data.mode = mode;
  data.updatedAt = new Date().toISOString();
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(file, flags, 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  return mode;
}
export const setA2AMode = setVerifyKitMode;
export const normalizeWorkspace = input => {
  if (!input || typeof input !== 'string') throw new Error('workspace must be an absolute directory path');
  const full = path.resolve(input);
  if (!path.isAbsolute(input)) throw new Error('workspace must be an absolute directory path');
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error('workspace does not exist');
  return fs.realpathSync(full);
};
export function loadAntigravityWorkspaces() {
  const dirs = new Set();
  const home = os.homedir();

  // 1. ~/.gemini/config/projects/*.json
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
                const p = decodeURIComponent(new URL(res.folderUri).pathname);
                if (p && fs.existsSync(p)) dirs.add(fs.realpathSync(p));
              } catch {}
            }
          }
        } catch {}
      }
    }
  } catch {}

  // 2. ~/.gemini/projects.json
  try {
    const pJson = path.join(home, '.gemini', 'projects.json');
    if (fs.existsSync(pJson)) {
      const content = JSON.parse(fs.readFileSync(pJson, 'utf8'));
      if (content?.projects && typeof content.projects === 'object') {
        for (const p of Object.keys(content.projects)) {
          if (p && fs.existsSync(p)) {
            try { dirs.add(fs.realpathSync(p)); } catch {}
          }
        }
      }
    }
  } catch {}

  // 3. ~/.config/Antigravity IDE/User/workspaceStorage/*/workspace.json
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
                let p = decodeURIComponent(new URL(uri).pathname);
                if (p.endsWith('.code-workspace')) p = path.dirname(p);
                if (p && fs.existsSync(p)) dirs.add(fs.realpathSync(p));
              } catch {}
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 4. Running processes with --add-dir=...
  try {
    if (process.platform === 'linux') {
      const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
      for (const pid of pids) {
        try {
          const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
          if (cmdline.includes('agy') || cmdline.includes('antigravity')) {
            const matches = cmdline.matchAll(/--add-dir=([^\0]+)/g);
            for (const match of matches) {
              const dir = match[1];
              if (dir && fs.existsSync(dir)) {
                try { dirs.add(fs.realpathSync(dir)); } catch {}
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  return [...dirs].sort();
}

export function loadAllowlist(){
  try {
    const stat = fs.lstatSync(allowlistPath());
    if(!stat.isFile() || stat.isSymbolicLink()) return [];
    const data = JSON.parse(fs.readFileSync(allowlistPath(),'utf8'));
    return Array.isArray(data.allowed) ? data.allowed.filter(s=>typeof s==='string') : [];
  } catch {return []}
}

export function isWorkspaceAuthorized(ws){
  const home = fs.realpathSync(os.homedir());
  if (ws === path.parse(ws).root || ws === home) return false;
  const allowed = loadAllowlist();
  if (allowed.includes(ws)) return true;
  for (const a of allowed) {
    if (ws.startsWith(a + path.sep) || a.startsWith(ws + path.sep)) {
      return true;
    }
  }
  const agWorkspaces = loadAntigravityWorkspaces();
  if (agWorkspaces.includes(ws)) return true;
  for (const a of agWorkspaces) {
    if (ws.startsWith(a + path.sep) || a.startsWith(ws + path.sep)) {
      return true;
    }
  }
  return false;
}

export function requireAuthorizedWorkspace(input){
  const ws=normalizeWorkspace(input);
  if (!isWorkspaceAuthorized(ws)) throw new Error('Workspace is not authorized. Run: node scripts/verifykit.mjs allow "'+ws+'" (local user approval).');
  return ws;
}
function writeAllowlist(allowed){
  const target=allowlistPath(),parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_TRUNC|(fs.constants.O_NOFOLLOW||0);
  const fd=fs.openSync(target,flags,0o600);
  try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,JSON.stringify({version:1,allowed},null,2)+'\n')}finally{fs.closeSync(fd)}
}
export function authorizeWorkspace(input) {
  const ws=normalizeWorkspace(input);
  const home=fs.realpathSync(os.homedir());
  if(ws === path.parse(ws).root || ws === home) throw new Error('Refusing to authorize a filesystem root or entire home directory');
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
export function cleanError(error) {return String(error?.message||error).replace(/[\r\n\t]/g,' ').slice(0,400)}
