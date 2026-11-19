// Node 22 exposes only DatabaseSync; Node 26.11+ renamed this synchronous
// class to Database and retains DatabaseSync as a deprecated compatibility alias.
// Prefer the current API without abandoning users on supported older LTS lines.
import * as sqlite from 'node:sqlite';

export const sqliteApiName = typeof sqlite.Database === 'function' ? 'Database' : 'DatabaseSync';
export const Database = sqlite[sqliteApiName];

if (typeof Database !== 'function') {
  throw new Error('A2A requires the built-in node:sqlite synchronous Database API (Node >=22.13.0)');
}
