import {ALL_TOOLS} from './tools.mjs';
// Gives the agent a safe recovery path without changing tool authorization.
export function classifyMcpFailure(toolName,error){
  const message=String(error?.message||error||'Unknown error').slice(0,250);
  const spec=ALL_TOOLS.find(x=>x.name===toolName);
  if(/Unknown argument:|Missing (?!resource uri)|Invalid (type|value|integer|array|object|item):|Arguments must be/.test(message)){
    return {status:'error',code:'invalid_tool_arguments',message,accepted_parameters:spec?Object.keys(spec.inputSchema.properties):[],required_parameters:spec?.inputSchema.required??[],next_step:'Retry using the exact tools/list inputSchema. Do not guess parameter aliases.'};
  }
  if(/Workspace is not authorized/i.test(message)){
    return {status:'error',code:'workspace_authorization_required',message:'Workspace is not authorized for A2A.',next_step:'Ask the user to trust the intended workspace in Antigravity or explicitly run a2a allow <workspace>. Never bypass authorization.'};
  }
  if(/protected root|system directory|Symlink access denied|sensitive file denied|escapes authorized/i.test(message)){
    return {status:'error',code:'workspace_access_denied',message:'A2A denied this workspace or file access for safety.',next_step:'Choose an authorized project workspace or an allowed project file. Do not disable protected-root checks.'};
  }
  if(/Unknown tool/i.test(message))return {status:'error',code:'unknown_tool',message:'Unknown A2A tool.',available_tools:ALL_TOOLS.filter(x=>x.name.startsWith('a2a_')).map(x=>x.name),next_step:'Call tools/list to inspect available names and input schemas.'};
  return {status:'error',code:'tool_execution_error',message,next_step:'Check the A2A doctor output and the tool arguments; do not retry indefinitely.'};
}
