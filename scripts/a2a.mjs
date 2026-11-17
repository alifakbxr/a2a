#!/usr/bin/env node
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {allowlistPath,settingsPath,getA2AMode,setA2AMode,loadAllowlist,loadAntigravityWorkspaces,authorizeWorkspace,revokeWorkspace,dataDir} from '../src/security.mjs';
import {parseArtifact} from '../src/verification.mjs';
const [cmd,...argv]=process.argv.slice(2);
function print(obj){process.stdout.write(JSON.stringify(obj,null,2)+'\n')}
if(!cmd||['help','--help','-h'].includes(cmd)){
  console.log(`A2A CLI - Agent to Alif (Smart Code Intelligence & Verification)\n
Commands:\n  doctor                     show runtime, workspace permissions, active mode & telemetry
  mode [always-on|on-demand] get or set active A2A mode (default: always-on)
  toggle                     switch between always-on and on-demand
  allow <absolute-workspace> authorize one project manually
  revoke <absolute-workspace> revoke one project
  inspect <workspace>        index project & show code graph coverage
  tokens [workspace]         detect source tokens, Antigravity session consumption & savings
  context <workspace> <query> query symbols and feature relations
  impact <workspace> [paths...] analyze impact & calculate tokens affected
  plan <workspace> [criterion ...] suggest native checks
  assess <workspace> <criterion_id> <relative-report-file> <test-name|*> validate test report
  evidence <workspace>       list verified evidence and regression history
  mcp                        start A2A stdio server via src/mcp.mjs
  Note: Antigravity IDE projects are automatically recognized without manual allow.`);process.exit(0);
}
try{
  if(cmd==='doctor'){print({name:'a2a',title:'Agent to Alif',version:'2.0.0',node:process.versions.node,node_requirement:'>=22.13.0',sqlite:'node:sqlite (experimental in some Node versions)',mode:getA2AMode(),settings:settingsPath(),data_dir:dataDir(),allowlist:allowlistPath(),allowed_workspaces:loadAllowlist(),antigravity_workspaces:loadAntigravityWorkspaces(),network:'no outbound requests',shell_execution:'disabled'});}
  else if(cmd==='mode'){
    const target=argv[0];
    if(!target||target==='status'){print({mode:getA2AMode()});}
    else {print({mode:setA2AMode(target)});}
  }
  else if(cmd==='toggle'){
    const current=getA2AMode();
    const next=current==='always-on'?'on-demand':'always-on';
    print({previous:current,mode:setA2AMode(next)});
  }
  else if(cmd==='allow'){print({authorized:authorizeWorkspace(argv[0])})}
  else if(cmd==='revoke'){print({remaining:revokeWorkspace(argv[0])})}
  else if(cmd==='mcp'){await import('../src/mcp.mjs')}
  else {
    const engine=new Engine();let result;
    const workspace=argv[0];
    if(cmd==='inspect')result=engine.context({workspace});
    else if(cmd==='tokens')result=engine.context({workspace:workspace||process.cwd(),action:'tokens'});
    else if(cmd==='context')result=engine.context({workspace,action:'query',query:argv.slice(1).join(' ')});
    else if(cmd==='impact')result=engine.impact({workspace,changed:argv.slice(1)});
    else if(cmd==='plan')result=engine.verify({workspace,operation:'plan',criteria:argv.slice(1)});
    else if(cmd==='assess')result=engine.verify({workspace,operation:'assess',criteria:[{id:argv[1],artifact:argv[2],test_name:argv[3]}]});
    else if(cmd==='evidence')result=engine.evidence({workspace});
    else throw new Error('Unknown command '+cmd);
    engine.close();print(result);
  }
}catch(e){process.stderr.write('A2A: '+String(e.message||e)+'\n');process.exitCode=1}
