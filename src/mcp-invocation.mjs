// Strict, metadata-only detector of PILAH MCP invocations in Antigravity traces.
// A skill mention, CLI invocation, MCP server listing or tool name inside a
// native file read is NOT evidence of an MCP tool call.
const TOOLS=new Set(['pilah_context','pilah_impact','pilah_verify','pilah_evidence',
 'a2a_context','a2a_impact','a2a_verify','a2a_evidence',
 'verifykit_context','verifykit_impact','verifykit_verify','verifykit_evidence']);
const SERVERS=new Set(['pilah','pilah_pilah','a2a','a2a_a2a','verifykit','verifykit_verifykit']);
const clean=value=>typeof value==='string'?value.trim().replace(/^["']|["']$/g,''):'';
const serverArg=call=>clean(call?.args?.ServerName??call?.args?.server_name??call?.args?.serverName??call?.serverName??call?.server_name);
const toolArg=call=>clean(call?.args?.ToolName??call?.args?.tool_name??call?.args?.toolName);
export function isPilahMcpCall(call){
 if(!call||typeof call!=='object')return false;
 const name=clean(call.name??call.toolName);
 const declaredServer=serverArg(call);
 if(TOOLS.has(name))return !declaredServer||SERVERS.has(declaredServer);
 if(name==='call_mcp_tool')return SERVERS.has(declaredServer)&&TOOLS.has(toolArg(call));
 for(const server of SERVERS)for(const tool of TOOLS){
  if(name===`mcp_${server}_${tool}`||name===`mcp__${server}__${tool}`||name===`${server}/${tool}`)return true;
 }
 return false;
}
