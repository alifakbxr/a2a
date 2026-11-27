import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkHost,inspectPluginList} from '../scripts/host-check.mjs';

const packageVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;

const stub=({version=0,validation=0,list=0,plugins=[{name:'pilah',enabled:true,mcpServers:['pilah'],path:'/sensitive/private/path'}],jsonSupported=true,plain=null}={})=>{
 const calls=[];
 const exec=(command,args)=>{
   const cmd=args.join(' ');calls.push(cmd);
   if(cmd==='--version')return {status:version,stdout:'2.8.0',stderr:''};
   if(cmd==='plugin validate --strict .')return {status:validation,stdout:'valid',stderr:''};
   if(cmd==='plugin list --json')return jsonSupported
     ?{status:list,stdout:JSON.stringify(plugins),stderr:''}
     :{status:1,stdout:'',stderr:'Unknown option'};
   if(cmd==='plugin list')return {status:list,stdout:plain??'- pilah (enabled, 1.1.0)\n',stderr:''};
   return {status:1,stdout:'',stderr:'unsupported'};
 };
 return {calls,exec};
};
test('CLI preflight never fabricates live IDE acceptance or token savings',()=>{
 const x=stub(),r=checkHost({exec:x.exec});
 assert.equal(r.status,'local-preflight-passed');
 assert.equal(r.installed,'listed');
 assert.equal(r.plugin_name,'pilah');
 assert.equal(r.host_surface,'cli-preflight-only');
 assert.equal(r.ide_plugin_loaded,'not_tested');
 assert.equal(r.live_agent_adoption,'not_tested');
 assert.equal(r.independent_e2e,'not_tested');
 assert.equal(r.model_token_savings,'not_measured');
 assert.deepEqual(x.calls,['--version','plugin validate --strict .','plugin list --json']);
 assert.ok(!JSON.stringify(r).includes('/sensitive/private/path'));
});
test('disabled, absent or missing-MCP plugins cannot report PASS',()=>{
 for(const [plugins,state] of [
   [[{name:'pilah',enabled:false,mcpServers:['pilah']}],'disabled'],
   [[{name:'pilah',enabled:true,mcpServers:[]}],'missing_mcp_component'],
   [[{name:'unrelated',enabled:true}],'not_listed']
 ]){
   const result=checkHost({exec:stub({plugins}).exec});
   assert.equal(result.status,'partial');
   assert.equal(result.installed,state);
 }
});
test('missing CLI, failed strict validation and unreliable listing cannot PASS',()=>{
 assert.equal(checkHost({exec:()=>({status:null,error:{code:'ENOENT'}})}).status,'blocked');
 assert.equal(checkHost({exec:stub({validation:1}).exec}).status,'failed');
 assert.equal(checkHost({exec:stub({jsonSupported:false,plain:'something pilah enabled'}).exec}).status,'partial');
});
test('legacy name compatibility uses explicit enablement, not arbitrary text',()=>{
 assert.deepEqual(inspectPluginList('- a2a (enabled, 2.1.0)',{format:'text'}),
   {installed:'listed',plugin_name:'a2a',inventory:'text'});
 assert.equal(inspectPluginList(`- pilah (disabled, ${packageVersion})`,{format:'text'}).installed,'disabled');
 assert.equal(inspectPluginList('Other plugin mentions pilah is enabled',{format:'text'}).installed,'not_listed');
 assert.equal(inspectPluginList(JSON.stringify([{name:'a2a',enabled:true,mcpServers:['a2a']}])).installed,'listed');
 assert.equal(inspectPluginList('garbled').installed,'unknown');
 const x=stub({jsonSupported:false,plain:'Installed plugins:\n- pilah (enabled, 1.1.0)\n'});
 assert.equal(checkHost({exec:x.exec}).status,'local-preflight-passed');
 assert.ok(x.calls.includes('plugin list'));
});
