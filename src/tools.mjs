const string={type:'string'};
const ws={type:'string',description:'Absolute path of an authorized workspace (Antigravity IDE workspaces authorized automatically).'};
const paths={type:'array',items:{type:'string',maxLength:500},maxItems:200};

const BASE_SPECS = [
  {
    name:'context',
    description:'A2A project context and transparent conversation token history. History totals from internal logs are not provider-verified.',
    inputSchema:{
      type:'object',
      additionalProperties:false,
      required:['workspace'],
      properties:{
        workspace:ws,
        action:{type:'string',enum:['inspect','query','freshness','tokens','skeleton'],default:'inspect'},
        query:{type:'string',maxLength:160},
        limit:{type:'integer',minimum:1,maximum:40},
        conversation_id:{type:'string',maxLength:128,description:'Optional Antigravity conversation ID for exact session token lookup.'},
        transcript_path:{type:'string',maxLength:500,description:'Optional path to transcript.jsonl for exact session token lookup.'},
        history_scope:{type:'string',enum:['current','all'],description:'For tokens: current session by default; all explicitly reads local historical conversations.'},
        history_limit:{type:'integer',minimum:1,maximum:10,description:'Maximum recent conversations returned for history.'},
        file:{type:'string',maxLength:500,description:'Relative file path for action="skeleton".'},
        files:{type:'array',items:{type:'string',maxLength:500},maxItems:20,description:'Relative file paths for action="skeleton".'}
      }
    }
  },
  {
    name:'impact',
    description:'A2A static impact analysis, reverse dependencies, and affected token metrics.',
    inputSchema:{type:'object',additionalProperties:false,required:['workspace'],properties:{workspace:ws,changed:paths,depth:{type:'integer',minimum:1,maximum:4},summary:{type:'boolean',description:'Return a bounded risk/test triage summary while retaining uncertainty and full affected counts.'}}}
  },
  {
    name:'verify',
    description:'A2A native test planning and JUnit/TAP/JSON evidence assessment.',
    inputSchema:{type:'object',additionalProperties:false,required:['workspace','operation'],properties:{workspace:ws,operation:{type:'string',enum:['plan','assess','verify_handoff','assess_release']},changed:paths,worker_name:{type:'string',maxLength:128,description:'Optional subagent name for verify_handoff.'},artifact:{type:'string',maxLength:500,description:'Relative machine report path for verify_handoff.'},allow_stale:{type:'boolean',description:'Explicitly bypass source freshness (not recommended).'},criteria:{type:'array',maxItems:40,items:{oneOf:[string,{type:'object',additionalProperties:false,required:['id'],properties:{id:{type:'string',maxLength:160},artifact:{type:'string',maxLength:500},test_name:{type:'string',maxLength:160,description:'Exact testcase name to bind to criterion, or * for entire report.'},blocked:{type:'boolean'},reason:{type:'string',maxLength:240}}}]}}}}
  },
  {
    name:'evidence',
    description:'A2A historical evidence, runs, regression hypotheses, incident tracking, side questions, and artifact versioning.',
    inputSchema:{
      type:'object',
      additionalProperties:false,
      required:['workspace','operation'],
      properties:{
        workspace:ws,
        operation:{type:'string',enum:['list','runs','incidents','record_incident','add_hypothesis','hypotheses','side_questions','record_side_question','artifact_versions','artifact_diff','snapshot_artifact']},
        id:string,
        limit:{type:'integer',minimum:1,maximum:50},
        title:{type:'string',maxLength:240},
        root_cause:{type:'string',maxLength:1400},
        paths,
        criteria:{type:'array',items:string,maxItems:40},
        evidence_ids:{type:'array',items:string,maxItems:20},
        hypothesis:{type:'string',maxLength:1000},
        experiment:{type:'string',maxLength:1000},
        incident_id:string,
        conversation_id:{type:'string',maxLength:128},
        parent_conversation_id:{type:'string',maxLength:128},
        question:{type:'string',maxLength:4000},
        summary:{type:'string',maxLength:4000},
        status:{type:'string',maxLength:40},
        artifact_name:{type:'string',maxLength:240},
        artifact_path:{type:'string',maxLength:500},
        version_number:{type:'integer',minimum:1},
        v1:{type:'integer',minimum:0},
        v2:{type:'integer',minimum:1}
      }
    }
  }
];

export const TOOLS = BASE_SPECS.map(s => ({name: `a2a_${s.name}`, description: s.description, inputSchema: s.inputSchema}));
export const LEGACY_TOOLS = BASE_SPECS.map(s => ({name: `verifykit_${s.name}`, description: s.description, inputSchema: s.inputSchema}));
export const ALL_TOOLS = [...TOOLS, ...LEGACY_TOOLS];
export const TOOL_NAMES = new Set(ALL_TOOLS.map(x=>x.name));
export function getListedTools() {
  return process.env.A2A_LEGACY_TOOL_ALIASES === '1' ? ALL_TOOLS : TOOLS;
}

function validateValue(spec, value, key) {
  if (!spec || typeof spec !== 'object') return;
  if (Array.isArray(spec.oneOf)) {
    let matched = false;
    for (const sub of spec.oneOf) {
      try { validateValue(sub, value, key); matched = true; break; } catch {}
    }
    if (!matched) throw new Error('Invalid item: ' + key);
    return;
  }
  const kind = spec.type;
  if (kind === 'string') {
    if (typeof value !== 'string') throw new Error('Invalid type: ' + key);
    if (spec.enum && !spec.enum.includes(value)) throw new Error('Invalid value: ' + key);
    if (spec.maxLength && value.length > spec.maxLength) throw new Error('Value too long: ' + key);
    return;
  }
  if (kind === 'integer') {
    if (!Number.isInteger(value) || (spec.minimum !== undefined && value < spec.minimum) || (spec.maximum !== undefined && value > spec.maximum)) {
      throw new Error('Invalid integer: ' + key);
    }
    return;
  }
  if (kind === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Invalid boolean: ' + key);
    return;
  }
  if (kind === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object: ' + key);
    const props = spec.properties || {};
    if (spec.additionalProperties === false) {
      for (const k of Object.keys(value)) {
        if (!(k in props)) throw new Error('Unknown argument: ' + key + '.' + k);
      }
    }
    for (const req of spec.required || []) {
      if (value[req] === undefined) throw new Error('Missing ' + key + '.' + req);
    }
    for (const [k, v] of Object.entries(value)) {
      if (k in props) validateValue(props[k], v, key + '.' + k);
    }
    return;
  }
  if (kind === 'array') {
    if (!Array.isArray(value) || (spec.maxItems !== undefined && value.length > spec.maxItems)) {
      throw new Error('Invalid array: ' + key);
    }
    if (spec.items) {
      for (let i = 0; i < value.length; i++) {
        validateValue(spec.items, value[i], `${key}[${i}]`);
      }
    }
  }
}

export function validateArgs(name,args){
  const tool=ALL_TOOLS.find(t=>t.name===name);if(!tool)throw new Error('Unknown tool');
  if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Arguments must be an object');
  const props=tool.inputSchema.properties;
  for(const key of Object.keys(args))if(!(key in props))throw new Error('Unknown argument: '+key);
  for(const key of tool.inputSchema.required||[])if(args[key]===undefined)throw new Error('Missing '+key);
  for(const [key,value] of Object.entries(args)){
    validateValue(props[key], value, key);
  }
}
