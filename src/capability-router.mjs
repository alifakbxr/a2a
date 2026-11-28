import {routeWorkflow} from './workflow-router.mjs';
import {recommendSkills} from './skill-discovery.mjs';

// One advisory routing result for native workflow guidance and installed Skills.
// It never invokes MCP, activates a Skill, or changes host permissions.
export function routeCapabilities({task,host='ide',home,workspace=null,workspaceId=null,store=null,workflow={}}={}){
 const skillResult=recommendSkills({task,host,home,workspace,workspaceId,store});
 const workflowResult=routeWorkflow(workflow);
 return {
  skills:{status:skillResult.status,confidence:skillResult.confidence||null,recommendations:skillResult.recommendations||[]},
  workflow:{proposal:workflowResult.proposal,reason:workflowResult.reason,automatic_tool_calls:0,mode:workflowResult.mode},
  authority:'antigravity-host',
  execution:'advisory-only'
 };
}
