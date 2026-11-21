import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getListedTools} from '../src/tools.mjs';
import {ALWAYS_ON_POLICY} from '../scripts/hook.mjs';

const read = name => fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('A2A exposes exactly one eagerly registered model-discoverable entrypoint',()=>{
 const config=JSON.parse(read('mcp_config.json'));
 const server=config.mcpServers.a2a;
 assert.equal(server.command,'node');
 assert.ok(server.args.some(arg=>arg.includes('/src/mcp.mjs')));
 const listed=getListedTools();
 assert.deepEqual(listed.map(x=>x.name).sort(),['a2a_context','a2a_evidence','a2a_impact','a2a_verify']);
 const eager=Object.entries(server.tools||{}).filter(([,v])=>v?.eager===true).map(([k])=>k);
 assert.deepEqual(eager,['a2a_context'],'Only the core context tool may be eager by default');
 assert.ok(listed.some(x=>x.name==='a2a_context'&&x.inputSchema.required.includes('workspace')));
 assert.equal(server.force_all_tools_eager,undefined);
 assert.ok(!server.enabledTools&&!server.disabledTools);
});

test('Always-On policy explains eager core entrypoint and native-first no-call exit',()=>{
 assert.ok(ALWAYS_ON_POLICY.length<=350);
 assert.match(ALWAYS_ON_POLICY,/Native first; zero calls/i);
 assert.match(ALWAYS_ON_POLICY,/eager A2A context/i);
 assert.match(ALWAYS_ON_POLICY,/lazy: discover their schema/i);
 assert.match(ALWAYS_ON_POLICY,/workspace=<trusted project>/);
 assert.match(ALWAYS_ON_POLICY,/No chains without new evidence/);
});

test('On-demand skill does not demand A2A use and documents core and lazy fallback',()=>{
 const s=read('skills/a2a/SKILL.md');
 assert.match(s,/0 calls/);
 assert.match(s,/eager.*a2a_context/);
 assert.match(s,/discover lazy.*a2a_impact/);
 assert.ok(s.length<=3000,'Skill must remain progressive and compact');
});
