import {ALL_TOOLS} from './tools.mjs';
// Never copy untrusted exception text into a model response. Paths, credentials and
// tool arguments can appear in exceptions from external helpers and adapters.
export function classifyMcpFailure(toolName,error){
 const msg=String(error?.message||error||'').slice(0,2000);
 const spec=ALL_TOOLS.find(x=>x.name===toolName);
 if(/Unknown argument:|Missing (?!resource uri)|Invalid (type|value|integer|array|object|item):|Arguments must be|Value too long:/i.test(msg)){
  return {status:'error',code:'invalid_tool_arguments',message:'The tool request does not match the allowed input contract.',
   accepted_parameters:spec?Object.keys(spec.inputSchema.properties):[],
   required_parameters:spec?.inputSchema.required??[],
   next_step:'Inspect tools/list and retry with the documented parameter names and types. Do not guess aliases.'};
 }
 if(/Protected workspace denied/i.test(msg)){
  return {status:'error',code:'workspace_access_denied',
   message:'Protected application configuration paths cannot be used as PILAH project workspaces.',
   next_step:'Choose an already trusted ordinary project. Do not run allow or retry this protected path.'};
 }
 if(/Workspace is not authorized/i.test(msg)){
  return {status:'error',code:'workspace_authorization_required',
   message:'Workspace is not authorized for PILAH.',
   next_step:'Ask the user to trust the ordinary project in Antigravity, or use node <PLUGIN_ROOT>/scripts/pilah.mjs allow <workspace> from the installed plugin. Never bypass protected roots.'};
 }
 if(/protected root|system directory|Symlink access denied|sensitive file denied|escapes authorized|Path escapes|outside workspace|Permission denied/i.test(msg)){
  return {status:'error',code:'workspace_access_denied',
   message:'PILAH denied workspace or file access under its safety policy.',
   next_step:'Choose an authorized project and permitted project file. Do not change protected-root checks.'};
 }
 if(/ENOENT|no such file|does not exist|not found|cannot find (?:the )?(?:file|path)|unknown workspace|invalid workspace/i.test(msg)){
  return {status:'error',code:'workspace_not_found',message:'Requested workspace does not exist or is not accessible.',next_step:'Provide an existing authorized project path; no permissions are automatically changed.'};
 }
 if(/Unknown tool/i.test(msg)){
  return {status:'error',code:'unknown_tool',message:'Tool is not available.',
   available_tools:ALL_TOOLS.filter(x=>x.name.startsWith('pilah_')).map(x=>x.name),
   next_step:'Inspect tools/list for exact tool names.'};
 }
 return {status:'error',code:'tool_execution_error',message:'PILAH tool execution failed. Technical details were withheld to protect local data.',
  next_step:'Check private local diagnostics and validated arguments; do not retry indefinitely.'};
}
