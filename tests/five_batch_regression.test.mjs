import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGraph,discover,GRAPH_INDEX_VERSION} from '../src/scanner.mjs';
import {Store} from '../src/storage.mjs';
import {exportRedacted} from '../src/redacted-export.mjs';
import {analyzeWorkspaceTokens} from '../src/tokens.mjs';

test('Composer grouped imports resolve existing PSR-4 classes only',()=>{
 const files=[
 {path:'composer.json',language:'config',text:JSON.stringify({autoload:{'psr-4':{'App\\':'app/'}}})},
 {path:'app/Http/Checkout.php',language:'php',text:'<?php\nuse App\\Services\\{BillingService, MissingService, RefundService as Refund};\nclass Checkout {}'},
 {path:'app/Services/BillingService.php',language:'php',text:'<?php class BillingService {}'},
 {path:'app/Services/RefundService.php',language:'php',text:'<?php class RefundService {}'}
 ];
 const graph=createGraph({files});
 const outgoing=graph.edges.filter(e=>e.from==='file:app/Http/Checkout.php'&&e.kind==='IMPORTS').map(e=>e.to);
 assert.ok(outgoing.includes('file:app/Services/BillingService.php'));
 assert.ok(outgoing.includes('file:app/Services/RefundService.php'));
 assert.ok(!outgoing.some(x=>x.includes('MissingService')));
 assert.equal(GRAPH_INDEX_VERSION,'pilah-graph-v3');
});

test('diagnostic export never exposes local paths, source or stored questions',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-redact-'));
 let store;
 try{
   store=new Store(base);
   const ws=store.register(path.join(base,'private-work'));
   store.run('INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)',ws,'untrusted sensitive tool name','secret prompt',100000,20,99980,new Date().toISOString());
   store.run('INSERT INTO telemetry(workspace_id,tool_name,action,raw_scope_tokens,response_tokens,tokens_saved,created_at) VALUES(?,?,?,?,?,?,?)',ws,'pilah_context','inspect',100,20,0,new Date().toISOString());
   const out=exportRedacted(store.file),serialized=JSON.stringify(out);
   assert.equal(out.table_counts.telemetry,2);
   assert.ok(out.tool_calls.some(x=>x.tool==='other'&&x.calls===1));
   for(const privateValue of ['private-work','secret prompt','untrusted sensitive tool name','99980',base])assert.ok(!serialized.includes(privateValue));
   assert.equal(out.model_token_savings,null);
   assert.equal(out.schema,'pilah-redacted-diagnostics-v1');
 }finally{store?.close();fs.rmSync(base,{recursive:true,force:true})}
});

test('scan performance instrumentation is metadata, never billable usage',()=>{
 const out=analyzeWorkspaceTokens({files:[]},[],{calls:2,raw_scope_tokens:200,scan_read_files:9,scan_reused_files:3,scan_read_bytes:2048,average_scan_duration_ms:12.5});
 assert.equal(out.tool_payload_estimates.scan_read_files,9);
 assert.equal(out.tool_payload_estimates.average_scan_duration_ms,12.5);
 assert.equal(out.net_token_savings,null);
});
