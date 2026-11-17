#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {TOOLS} from '../src/tools.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const manifest=read('plugin.json');
assert.match(manifest.name,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
assert.ok(manifest.displayName&&manifest.description&&manifest.license&&manifest.author);
assert.equal(read('mcp_config.json').mcpServers.engine.command,'node');
assert.ok(fs.existsSync(path.join(root,manifest.logo)));
assert.ok(!fs.existsSync(path.join(root,'hooks.json')),'Hooks must not be enabled by default');
assert.ok(!fs.existsSync(path.join(root,'rules','AGENTS.md')),'Always-on rules must not be included');
assert.deepEqual(read('schemas/mcp-tools.json').tools,TOOLS,'Generated MCP schemas are out of sync');
assert.equal(TOOLS.length,4);
for(const file of ['src/mcp.mjs','schemas/database.sql','README.md','docs/ARCHITECTURE.md','docs/SECURITY.md','docs/RELEASE.md'])assert.ok(fs.existsSync(path.join(root,file)));
console.log(JSON.stringify({status:'passed',checks:['manifest-shape','mcp-transport','no-forced-hooks','no-always-on-rules','schema-drift','documentation-presence'],warning:'Not a replacement for agy plugin validate --strict or a live Antigravity install.'},null,2));
