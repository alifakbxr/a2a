#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {TOOLS} from '../src/tools.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

const manifest=read('plugin.json');
const pkg=read('package.json');
assert.equal(pkg.version,manifest.version,'Package and plugin version must match');
assert.match(fs.readFileSync(path.join(root,'.npmignore'),'utf8'),/(?:^|\n)benchmarks\/[^\n]*\n?/,'Benchmark evaluator is intentionally source-checkout-only');
assert.match(manifest.name,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
assert.ok(manifest.displayName&&manifest.description&&manifest.license&&manifest.author);

const mcpCfg=read('mcp_config.json');
assert.equal(mcpCfg.mcpServers.pilah.command,'node');
assert.ok(fs.existsSync(path.join(root,manifest.logo)));

const hooksFile=path.join(root,'hooks.json');
assert.ok(fs.existsSync(hooksFile),'hooks.json must exist');
const hooksCfg=read('hooks.json');
assert.ok(hooksCfg && typeof hooksCfg==='object' && Object.keys(hooksCfg).length>0,'hooks.json must define at least one hook');

const rulesFile=path.join(root,'rules','AGENTS.md');
assert.ok(fs.existsSync(rulesFile),'rules/AGENTS.md must exist');

assert.deepEqual(read('schemas/mcp-tools.json').tools,TOOLS,'Generated MCP schemas are out of sync');
assert.equal(TOOLS.length,4);

for(const file of ['src/mcp.mjs','scripts/a2a.mjs','scripts/hook.mjs','schemas/database.sql','README.md','docs/ARCHITECTURE.md','docs/COMPATIBILITY.md','docs/CONTRACTS.md','docs/SECURITY.md','docs/RELEASE.md']){
  assert.ok(fs.existsSync(path.join(root,file)),'Missing required file: '+file);
}

console.log(JSON.stringify({
  status:'passed',
  checks:['manifest-shape','mcp-transport','hooks-present','rules-present','schema-drift','documentation-presence'],
  warning:'Not a replacement for agy plugin validate --strict or a live Antigravity install.'
},null,2));
