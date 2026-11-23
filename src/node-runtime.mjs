import path from 'node:path';

// Advisory only: never probe shells, execute commands or modify IDE configuration.
export function nodeVersionManagerAdvisory(binary=process.execPath){
  const normalized=typeof binary==='string'?path.normalize(binary).replaceAll('\\','/').toLowerCase():'';
  const managed=/(?:^|\/)(?:\.nvm\/versions\/node\/[^/]+\/bin|\.fnm\/node-versions\/[^/]+\/installation\/bin|\.fnm\/[^/]+\/bin|\.volta\/(?:tools\/image\/node\/[^/]+\/bin|bin)|\.asdf\/(?:installs\/nodejs\/[^/]+\/bin|shims)|\.nodenv\/(?:versions\/[^/]+\/bin|shims))(?:\/node(?:\.exe)?)?$/.test(normalized);
  return {
    node_version_manager_path:managed,
    path_advisory:managed
      ? 'Node is under a shell-managed version manager. A desktop-launched Antigravity process may not inherit its PATH. Confirm node availability in the IDE environment; no configuration changes were made.'
      : null
  };
}
