import test from 'node:test';
import assert from 'node:assert/strict';
import {checkHost} from '../scripts/host-check.mjs';

const stub=({version=0,validation=0,list=0,listed=true}={})=>{
 const calls=[];
 const exec=(cmd,args)=>{calls.push(args.join(' '));const key=args[0]==='--version'?'version':args[1]==='validate'?'validation':'list';
  return {status:{version,validation,list}[key],stdout:key==='list'?(listed?'pilah enabled':'other-plugin enabled'):'0.1',stderr:''}};
 return {calls,exec};
};
test('host preflight never fabricates live IDE acceptance or token savings',()=>{
 const x=stub();
 const result=checkHost({exec:x.exec});
 assert.equal(result.status,'local-preflight-passed');
 assert.equal(result.validation,'passed');
 assert.equal(result.installed,'listed');
 assert.equal(result.live_agent_adoption,'not_tested');
 assert.equal(result.independent_e2e,'not_tested');
 assert.equal(result.model_token_savings,'not_measured');
 assert.deepEqual(x.calls,['--version','plugin validate --strict .','plugin list']);
});
test('host preflight fails closed when CLI missing, strict validation fails or plugin is not listed',()=>{
 const absent=checkHost({exec:()=>({status:null,error:{code:'ENOENT'}})});
 assert.equal(absent.status,'blocked');
 assert.equal(absent.validation,'not_run');
 const invalid=checkHost({exec:stub({validation:1}).exec});
 assert.equal(invalid.status,'failed');
 const notInstalled=checkHost({exec:stub({listed:false}).exec});
 assert.equal(notInstalled.status,'partial');
 assert.equal(notInstalled.installed,'not_listed');
 assert.equal(notInstalled.live_agent_adoption,'not_tested');
});
