const string={type:'string'};
const ws={type:'string',description:'Absolute path of an authorized workspace (Antigravity IDE workspaces authorized automatically).'};
const paths={type:'array',items:{type:'string',maxLength:500},maxItems:200};

const BASE_SPECS = [
  {name:'context',description:'A2A (Agent to Alif) read-only project index, symbol relationships, freshness & token usage detection.',inputSchema:{type:'object',additionalProperties:false,required:['workspace'],properties:{workspace:ws,action:{type:'string',enum:['inspect','query','freshness','tokens'],default:'inspect'},query:{type:'string',maxLength:160},limit:{type:'integer',minimum:1,maximum:40}}}},
  {name:'impact',description:'A2A (Agent to Alif) static impact analysis, reverse dependencies, and affected token metrics.',inputSchema:{type:'object',additionalProperties:false,required:['workspace'],properties:{workspace:ws,changed:paths,depth:{type:'integer',minimum:1,maximum:4}}}},
  {name:'verify',description:'A2A (Agent to Alif) native test planning and JUnit/TAP/JSON evidence assessment.',inputSchema:{type:'object',additionalProperties:false,required:['workspace','operation'],properties:{workspace:ws,operation:{type:'string',enum:['plan','assess']},changed:paths,criteria:{type:'array',maxItems:40,items:{oneOf:[string,{type:'object',additionalProperties:false,required:['id'],properties:{id:{type:'string',maxLength:160},artifact:{type:'string',maxLength:500},test_name:{type:'string',maxLength:160,description:'Exact testcase name to bind to criterion, or * for entire report.'},blocked:{type:'boolean'},reason:{type:'string',maxLength:240}}}]}}}}},
  {name:'evidence',description:'A2A (Agent to Alif) historical evidence, runs, regression hypotheses, and incident tracking.',inputSchema:{type:'object',additionalProperties:false,required:['workspace','operation'],properties:{workspace:ws,operation:{type:'string',enum:['list','runs','incidents','record_incident','add_hypothesis','hypotheses']},id:string,limit:{type:'integer',minimum:1,maximum:50},title:{type:'string',maxLength:240},root_cause:{type:'string',maxLength:1400},paths,criteria:{type:'array',items:string,maxItems:40},evidence_ids:{type:'array',items:string,maxItems:20},hypothesis:{type:'string',maxLength:1000},experiment:{type:'string',maxLength:1000},incident_id:string}}}
];

export const TOOLS = [
  ...BASE_SPECS.map(s => ({name: `a2a_${s.name}`, description: s.description, inputSchema: s.inputSchema})),
  ...BASE_SPECS.map(s => ({name: `verifykit_${s.name}`, description: s.description, inputSchema: s.inputSchema}))
];
export const TOOL_NAMES=new Set(TOOLS.map(x=>x.name));
export function validateArgs(name,args){
  const tool=TOOLS.find(t=>t.name===name);if(!tool)throw new Error('Unknown tool');
  if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Arguments must be an object');
  const props=tool.inputSchema.properties;
  for(const key of Object.keys(args))if(!(key in props))throw new Error('Unknown argument: '+key);
  for(const key of tool.inputSchema.required||[])if(args[key]===undefined)throw new Error('Missing '+key);
  for(const [key,value] of Object.entries(args)){
    const spec=props[key];const kind=spec.type;
    if(kind==='string'&&typeof value!=='string')throw new Error('Invalid type: '+key);
    if(kind==='integer'&&(!Number.isInteger(value)|| (spec.minimum!==undefined&&value<spec.minimum)||(spec.maximum!==undefined&&value>spec.maximum)))throw new Error('Invalid integer: '+key);
    if(kind==='boolean'&&typeof value!=='boolean')throw new Error('Invalid boolean: '+key);
    if(spec.enum&&!spec.enum.includes(value))throw new Error('Invalid value: '+key);
    if(spec.maxLength&&String(value).length>spec.maxLength)throw new Error('Value too long: '+key);
    if(kind==='array'&&(!Array.isArray(value)|| (spec.maxItems&&value.length>spec.maxItems)))throw new Error('Invalid array: '+key);
  }
}
