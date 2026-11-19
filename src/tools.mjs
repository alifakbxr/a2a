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
        action:{type:'string',enum:['inspect','query','freshness','tokens','skeleton','orchestration'],default:'inspect'},
        task:{type:'object',description:'For action=orchestration: user-declared available native commands, tier, workstreams, milestones; no workers launched.',additionalProperties:false,properties:{tier:{type:'string',enum:['free','pro','ultra','paid-other','unknown']},available_commands:{type:'array',items:{type:'string',enum:['/swarm','/teamwork','/boost','@subagent']},maxItems:4},workstreams:{type:'array',items:{type:'string',maxLength:120},maxItems:30},dependencies:{type:'string',enum:['low','high','unknown']},milestones:{type:'integer',minimum:0,maximum:100},long_horizon:{type:'boolean'},hard_reasoning:{type:'boolean'},file_ownership:{type:'string',enum:['independent','shared','unknown']}}},
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
    inputSchema:{type:'object',additionalProperties:false,required:['workspace','operation'],properties:{workspace:ws,operation:{type:'string',enum:['plan','assess','verify_handoff','assess_release','assess_semantic','assess_browser']},changed:paths,worker_name:{type:'string',maxLength:128,description:'Optional subagent name for verify_handoff.'},artifact:{type:'string',maxLength:500,description:'Relative machine report path for verify_handoff.'},allow_stale:{type:'boolean',description:'Explicitly bypass source freshness (not recommended).'},persist_plan:{type:'boolean',description:'For plan: explicitly persist its full criterion scope locally, bound to the current source revision. Default false.'},plan_id:{type:'string',maxLength:120,description:'For assess: enforce every criterion of an explicit persisted plan, including omitted and stale scenarios.'},criteria:{type:'array',maxItems:40,items:{oneOf:[string,{type:'object',additionalProperties:false,required:['id'],properties:{id:{type:'string',maxLength:160},description:{type:'string',maxLength:160},given:{type:'string',maxLength:200},when:{type:'string',maxLength:200},then:{type:'string',maxLength:200},evidence_type:{type:'string',enum:['build','unit','integration','browser','visual','hardware','security','independent']},viewport:{type:'string',maxLength:160},ui_state:{type:'string',maxLength:160},reference:{type:'string',maxLength:160},negative:{type:'boolean'},source_revision:{type:'string',maxLength:160},artifact:{type:'string',maxLength:500},test_name:{type:'string',maxLength:160,description:'Exact testcase name to bind criterion; * only scopes legacy suite results.'},blocked:{type:'boolean'},reason:{type:'string',maxLength:240}}}]}}}}
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
        operation:{type:'string',enum:['list','runs','incidents','record_incident','add_hypothesis','assess_hypothesis','hypotheses','delete_incident','side_questions','record_side_question','artifact_versions','artifact_diff','snapshot_artifact','save_checkpoint','model_recovery','tool_recovery']},
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
        persist_rca:{type:'boolean',description:'Explicit opt-in to local private RCA text/experimental outcome retention. Never implied.'},
        confirm_deletion:{type:'boolean',description:'For delete_incident: confirm irreversible logical removal of incident plus hypothesis records; not cryptographic erasure.'},
        hypothesis_id:{type:'string',maxLength:128,description:'Existing hypothesis for assess_hypothesis.'},
        parent_hypothesis_id:{type:'string',maxLength:128,description:'Optional parent hypothesis in the same incident, for multi-branch Why chains.'},
        predicted_observation:{type:'string',maxLength:300,description:'Falsifiable observation expected if this hypothesis is true.'},
        disconfirming_test:{type:'string',maxLength:300,description:'A differentiating test or observation that would refute this hypothesis.'},
        expected_criterion_id:{type:'string',maxLength:160,description:'Exact machine assertion criterion for this hypothesis; not causal proof.'},
        plan_id:{type:'string',maxLength:120,description:'Optional persisted verification plan binding for this hypothesis.'},
        experiment_outcome:{type:'string',enum:['supports','refutes','inconclusive'],description:'Agent-reported experimental interpretation, not independently authenticated.'},
        observation:{type:'string',maxLength:400,description:'Sanitized observation explaining why a named test supports or refutes a prediction.'},
        conversation_id:{type:'string',maxLength:128},
        parent_conversation_id:{type:'string',maxLength:128},
        question:{type:'string',maxLength:4000},
        summary:{type:'string',maxLength:4000},
        status:{type:'string',maxLength:40},
        task_summary:{type:'string',maxLength:500,description:'For save_checkpoint: explicit short task summary, not raw conversation text.'},
        completed:{type:'array',maxItems:8,items:{type:'string',maxLength:200},description:'For save_checkpoint: user-reviewed completed work notes; unverified.'},
        next_steps:{type:'array',maxItems:8,items:{type:'string',maxLength:200},description:'For save_checkpoint: next steps after a manual model change.'},
        decisions:{type:'array',maxItems:8,items:{type:'string',maxLength:200},description:'For save_checkpoint: concise user-reviewed decisions, not secrets.'},
        pending_tests:{type:'array',maxItems:8,items:{type:'string',maxLength:200},description:'For save_checkpoint: specific untested acceptance scenarios.'},
        tool_family:{type:'string',enum:['mcp','browser','filesystem','terminal','other']},
        error_hint:{type:'string',maxLength:400,description:'Optional brief native error code/message. Never stored or echoed. Omit credentials.'},
        error_class:{type:'string',enum:['invalid_arguments','context_lost','timeout','permission_denied','missing_file','edit_conflict','unknown']},
        retry_count:{type:'integer',minimum:0,maximum:20},
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
        if (!Object.hasOwn(props,k)) throw new Error('Unknown argument: ' + key + '.' + k);
      }
    }
    for (const req of spec.required || []) {
      if (value[req] === undefined) throw new Error('Missing ' + key + '.' + req);
    }
    for (const [k, v] of Object.entries(value)) {
      if (Object.hasOwn(props,k)) validateValue(props[k], v, key + '.' + k);
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
  for(const key of Object.keys(args))if(!Object.hasOwn(props,key))throw new Error('Unknown argument: '+key);
  for(const key of tool.inputSchema.required||[])if(args[key]===undefined)throw new Error('Missing '+key);
  for(const [key,value] of Object.entries(args)){
    validateValue(props[key], value, key);
  }
}
