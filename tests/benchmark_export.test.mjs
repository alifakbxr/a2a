import test from 'node:test';
import assert from 'node:assert/strict';
import {safeBenchmarkExport} from '../scripts/export-benchmark.mjs';
test('strict whitelist does not leak paths, prompts, tokens or customer data',()=>{
 const raw={schema:'a2a-ab-evaluation-v1',setup:{workspace:'/home/alif/.env',prompt:'SECRET_PROMPT',api_key:'sk-123'},runs:[{variant:'native',status:'SUCCESS',usage:{total_tokens:250,cache_read_tokens:150,api_key:'secret_in_usage'},duration_seconds:90,num_turns:8,tool_calls:12,acceptance_passed:2,acceptance_total:6,transcript:'top secret',customer:{email:'person@example.com'},workspace:'/private/location'}],side_questions:['sensitive']};
 const out=safeBenchmarkExport(raw);const string=JSON.stringify(out);
 for(const secret of ['SECRET_PROMPT','sk-123','secret_in_usage','top secret','person@example.com','/private/','/home/alif'])assert.ok(!string.includes(secret),secret);
 assert.equal(out.runs[0].reported_tokens,250);assert.equal(out.review.auto_uploaded,false);
 assert.equal(out.review.user_review_required,true);
});
test('invalid schema or unknown variant fails closed',()=>{
 assert.throws(()=>safeBenchmarkExport({schema:'arbitrary',runs:[]}),/Only/);
 assert.throws(()=>safeBenchmarkExport({schema:'a2a-ab-evaluation-v1',runs:[{variant:'secret-site.com'}]}),/Unknown/);
});
test('malicious string in numeric slot never emitted',()=>{
 const r=safeBenchmarkExport({schema:'a2a-ab-evaluation-v1',runs:[{variant:'native',usage:{total_tokens:'secret-token'},status:'SECRET_STATUS'}]});
 assert.equal(r.runs[0].reported_tokens,null);assert.equal(r.runs[0].status,'UNKNOWN');
});

test('combined multi-run output discards nested Windows/Unix paths, logs and PII',()=>{
 const payload={schema:'a2a-ab-evaluation-v1',
  setup:{root:'C:\\\\Users\\\\user\\\\.env',secret:'env=ABC',model_input:'private prompt',response:'https://internal.example'},
  runs:[{variant:'native',status:'SUCCESS',usage:{total_tokens:900,cache_read_tokens:800},duration_seconds:35,num_turns:10,tool_calls:12,acceptance_passed:1,acceptance_total:6,raw:'Authorization: Bearer XYZ',workspace:'/home/private/.ssh/id_rsa',email:'person@internal.test'},
        {variant:'a2a-on-demand',status:'ERROR',usage:{total_tokens:800,cache_read_tokens:700},duration_seconds:40,num_turns:11,tool_calls:11,acceptance_passed:2,acceptance_total:6,context:{token:'sk-secret',cookies:['session=123']}}],
  errors:['private SQL SELECT * from customers'],notes:{nested:{api_key:'secret'}}};
 const exported=JSON.stringify(safeBenchmarkExport(payload));
 for(const secret of ['C:\\\\Users','/home/private','Bearer XYZ','person@internal.test','session=123','sk-secret','private SQL','internal.example','env=ABC'])assert.ok(!exported.includes(secret),secret);
 assert.equal(safeBenchmarkExport(payload).runs.length,2);
});
