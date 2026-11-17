#!/usr/bin/env node
import {Engine} from '../src/engine.mjs';
import {
  allowlistPath,settingsPath,getA2AMode,setA2AMode,getCompactMode,setCompactMode,
  getAutoTrustMode,setAutoTrustMode,loadAllowlist,loadAntigravityWorkspaces,
  authorizeWorkspace,revokeWorkspace,dataDir
} from '../src/security.mjs';
import {getSessionTokenUsage} from '../src/tokens.mjs';

const [cmd,...argv]=process.argv.slice(2);
function print(obj){process.stdout.write(JSON.stringify(obj,null,2)+'\n')}
if(!cmd||['help','--help','-h'].includes(cmd)){
  console.log(`A2A CLI - Smart Code Intelligence & Verification\n
Commands:\n  doctor                     show runtime, workspace permissions, active mode & telemetry
  mode [always-on|on-demand] get or set active A2A mode (default: always-on)
  toggle                     switch between always-on and on-demand
  compact [on|off|toggle|status] get, set, or toggle A2A Compact mode
  autotrust [antigravity-trust|active-only|project-markers|off] get or set Antigravity workspace auto-trust policy
  allow <absolute-workspace> authorize one project manually
  revoke <absolute-workspace> revoke one project
  inspect <workspace>        index project & show code graph coverage
  tokens [workspace] [--conv <id>] detect source tokens, session consumption & measured savings
  skeleton <workspace> <file...>   strip comments via lexer and report measured token savings
  context <workspace> <query> query symbols and feature relations
  impact <workspace> [paths...] analyze impact & calculate tokens affected
  plan <workspace> [criterion ...] suggest native checks
  assess <workspace> <criterion_id> <relative-report-file> <test-name|*> validate test report
  verify-handoff <workspace> [--artifact <file>] [--worker <name>] [--allow-stale] verify subagent/teamwork test evidence
  evidence <workspace>       list verified evidence and regression history
  side-questions [workspace] [--conv <id>] [--parent <id>] list recorded Antigravity side questions (/btw)
  artifacts [list|diff|show|snapshot] [file] [--conv <id>] [--v1 N] [--v2 M] version & diff brain artifacts
  refresh [serverName]       hot-reload A2A MCP server via Antigravity Language Server RPC
  stats                      view install metrics, clone traffic & unique users from GitHub
  mcp                        start A2A stdio server via src/mcp.mjs`);process.exit(0);
}
try{
  if(cmd==='doctor'){
    print({
      name:'a2a',
      title:'A2A',
      version:'2.0.0',
      node:process.versions.node,
      node_requirement:'>=22.13.0',
      sqlite:'node:sqlite',
      mode:getA2AMode(),
      compact_mode:getCompactMode()?'enabled':'disabled',
      auto_trust:getAutoTrustMode(),
      settings:settingsPath(),
      data_dir:dataDir(),
      allowlist:allowlistPath(),
      allowed_workspaces:loadAllowlist(),
      antigravity_workspaces:loadAntigravityWorkspaces(),
      session_tokens:getSessionTokenUsage(null,{dataDirPath:dataDir()}),
      network:'no outbound requests',
      shell_execution:'disabled',
    });
  }
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
  else if(cmd==='compact'){
    const target=argv[0];
    if(!target||target==='status'){print({compact:getCompactMode()?'enabled':'disabled'});}
    else if(target==='toggle'){print({compact:setCompactMode('toggle')?'enabled':'disabled'});}
    else {print({compact:setCompactMode(target)?'enabled':'disabled'});}
  }
  else if(cmd==='autotrust'){
    const target=argv[0];
    if(!target||target==='status'){print({auto_trust:getAutoTrustMode()});}
    else {print({auto_trust:setAutoTrustMode(target)});}
  }
  else if(cmd==='allow'){print({authorized:authorizeWorkspace(argv[0])})}
  else if(cmd==='revoke'){print({remaining:revokeWorkspace(argv[0])})}
  else if(cmd==='refresh'){
    const addr=process.env.ANTIGRAVITY_LS_ADDRESS;
    const csrf=process.env.ANTIGRAVITY_CSRF_TOKEN;
    const serverName=(argv[0]&&/^[A-Za-z0-9_-]{1,64}$/.test(argv[0]))?argv[0]:'a2a_a2a';
    if(!addr||!csrf){
      print({status:'skipped',serverName,reason:'ANTIGRAVITY_LS_ADDRESS or ANTIGRAVITY_CSRF_TOKEN not set'});
    }else{
      const url=`http://${addr}/exa.language_server_pb.LanguageServerService/RefreshMcpServers`;
      const res=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json','x-codeium-csrf-token':csrf},
        body:JSON.stringify({serverName}),
        signal:AbortSignal.timeout(5000),
      });
      const body=await res.text();
      if(!res.ok) throw new Error(`RefreshMcpServers failed (${res.status}): ${body.slice(0,200)}`);
      let parsed=null;try{parsed=body?JSON.parse(body):{}}catch{parsed=body}
      print({status:'refreshed',serverName,response:parsed});
    }
  }
  else if(cmd==='stats'){
    const {execFileSync}=await import('node:child_process');
    try{
      const clonesRaw=execFileSync('gh',['api','/repos/alifakbxr/a2a/traffic/clones'],{encoding:'utf8',timeout:6000});
      const viewsRaw=execFileSync('gh',['api','/repos/alifakbxr/a2a/traffic/views'],{encoding:'utf8',timeout:6000});
      const repoRaw=execFileSync('gh',['api','/repos/alifakbxr/a2a'],{encoding:'utf8',timeout:6000});
      const clones=JSON.parse(clonesRaw);
      const views=JSON.parse(viewsRaw);
      const repo=JSON.parse(repoRaw);
      print({
        repository:'alifakbxr/a2a',
        install_metrics:{
          total_clones_last_14d: clones.count||0,
          unique_installers_last_14d: clones.uniques||0,
          active_clone_days: (clones.clones||[]).filter(c=>c.count>0),
        },
        traffic_metrics:{
          total_views_last_14d: views.count||0,
          unique_visitors_last_14d: views.uniques||0,
        },
        community:{
          stars: repo.stargazers_count||0,
          forks: repo.forks_count||0,
          watchers: repo.subscribers_count||0,
        }
      });
    }catch(err){
      print({error:'Failed to fetch GitHub traffic stats',details:err.message});
    }
  }
  else if(cmd==='mcp'){await import('../src/mcp.mjs')}
  else {
    const engine=new Engine();let result;
    try{
      if(cmd==='inspect'){result=engine.context({workspace:argv[0]});}
      else if(cmd==='tokens'){
        let ws=null, convId=null;
        for(let i=0;i<argv.length;i++){
          if(argv[i]==='--conv'&&argv[i+1]){convId=argv[++i];}
          else if(argv[i].startsWith('--conv=')){convId=argv[i].slice(7);}
          else if(!ws){ws=argv[i];}
        }
        result=engine.context({workspace:ws||process.cwd(),action:'tokens',conversation_id:convId});
      }
      else if(cmd==='skeleton'){
        const workspace=argv[0];
        const files=argv.slice(1);
        result=engine.context({workspace,action:'skeleton',files});
      }
      else if(cmd==='context')result=engine.context({workspace:argv[0],action:'query',query:argv.slice(1).join(' ')});
      else if(cmd==='impact')result=engine.impact({workspace:argv[0],changed:argv.slice(1)});
      else if(cmd==='plan')result=engine.verify({workspace:argv[0],operation:'plan',criteria:argv.slice(1)});
      else if(cmd==='assess')result=engine.verify({workspace:argv[0],operation:'assess',criteria:[{id:argv[1],artifact:argv[2],test_name:argv[3]}]});
      else if(cmd==='verify-handoff'||cmd==='verify_handoff'){
        let ws=null;let artifact=null;let workerName=null;let allowStale=false;
        for(let i=0;i<argv.length;i++){
          if(argv[i]==='--artifact'&&argv[i+1]){artifact=argv[++i];}
          else if(argv[i].startsWith('--artifact=')){artifact=argv[i].slice(11);}
          else if(argv[i]==='--worker'&&argv[i+1]){workerName=argv[++i];}
          else if(argv[i].startsWith('--worker=')){workerName=argv[i].slice(9);}
          else if(argv[i]==='--allow-stale'){allowStale=true;}
          else if(!ws&&!argv[i].startsWith('-')){ws=argv[i];}
        }
        result=engine.verify({
          workspace:ws||process.cwd(),
          operation:'verify_handoff',
          artifact,
          worker_name:workerName,
          allow_stale:allowStale
        });
      }
      else if(cmd==='evidence')result=engine.evidence({workspace:argv[0]});
      else if(cmd==='side-questions'||cmd==='side_questions'){
        let ws=null;let convId=null;let parentId=null;
        for(let i=0;i<argv.length;i++){
          if(argv[i]==='--conv'&&argv[i+1]){convId=argv[++i];}
          else if(argv[i].startsWith('--conv=')){convId=argv[i].slice(7);}
          else if(argv[i]==='--parent'&&argv[i+1]){parentId=argv[++i];}
          else if(argv[i].startsWith('--parent=')){parentId=argv[i].slice(9);}
          else if(!ws&&!argv[i].startsWith('-')){ws=argv[i];}
        }
        let wsId=null;
        if(ws){try{wsId=engine.store.register(normalizeWorkspace(ws));}catch{}}
        const items=engine.store.listSideQuestions({workspaceId:wsId,conversationId:convId,parentConversationId:parentId});
        result={count:items.length,side_questions:items};
      }
      else if(cmd==='artifacts'){
        const sub=argv[0]||'list';
        let artifactName=null;
        let convId=null;
        let v1=null;
        let v2=null;
        const subIsCmd=['list','diff','show','snapshot'].includes(sub);
        const action=subIsCmd?sub:'list';
        const restArgs=subIsCmd?argv.slice(1):argv;
        for(let i=0;i<restArgs.length;i++){
          if(restArgs[i]==='--conv'&&restArgs[i+1]){convId=restArgs[++i];}
          else if(restArgs[i].startsWith('--conv=')){convId=restArgs[i].slice(7);}
          else if(restArgs[i]==='--v1'&&restArgs[i+1]){v1=Number(restArgs[++i]);}
          else if(restArgs[i].startsWith('--v1=')){v1=Number(restArgs[i].slice(5));}
          else if(restArgs[i]==='--v2'&&restArgs[i+1]){v2=Number(restArgs[++i]);}
          else if(restArgs[i].startsWith('--v2=')){v2=Number(restArgs[i].slice(5));}
          else if(!artifactName&&!restArgs[i].startsWith('-')){artifactName=restArgs[i];}
        }
        if(!convId){
          try{
            const sf=path.join(engine.store.base,'active-session.json');
            if(fs.existsSync(sf)){
              const d=JSON.parse(fs.readFileSync(sf,'utf8'));
              convId=d?.latest?.conversationId||null;
            }
          }catch{}
          if(!convId) convId=process.env.ANTIGRAVITY_CONVERSATION_ID||'default';
        }
        if(action==='list'){
          const items=engine.store.listArtifactVersions({conversationId:convId,artifactName});
          result={conversation_id:convId,artifact_name:artifactName||null,count:items.length,versions:items};
        }else if(action==='diff'){
          if(!artifactName)throw new Error('artifact name required for diff (e.g. a2a artifacts diff walkthrough.md)');
          const diffRes=engine.store.getArtifactDiff({conversationId:convId,artifactName,v1,v2});
          result={conversation_id:convId,...(diffRes||{artifact_name:artifactName,v1,v2,diff:''})};
        }else if(action==='show'){
          if(!artifactName)throw new Error('artifact name required for show');
          const row=engine.store.getArtifactVersion({conversationId:convId,artifactName,versionNumber:v1||v2});
          result=row||{status:'not_found'};
        }else if(action==='snapshot'){
          if(!artifactName)throw new Error('artifact name or path required for snapshot');
          const targetPath=path.isAbsolute(artifactName)?artifactName:path.join(process.env.HOME||'','.gemini/antigravity/brain',convId,artifactName);
          const snap=engine.store.snapshotArtifact({conversationId:convId,artifactPath:targetPath});
          result={status:'snapshotted',snapshot:snap};
        }
      }
      else throw new Error('Unknown command '+cmd);
    }finally{engine.close();}
    print(result);
  }
}catch(e){process.stderr.write('A2A: '+String(e.message||e)+'\n');process.exitCode=1}
