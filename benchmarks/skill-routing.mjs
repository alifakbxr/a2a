#!/usr/bin/env node
import {performance} from 'node:perf_hooks';
import {rankSkills} from '../src/skill-ranking.mjs';

const skills=[
 {name:'laravel-api',description:'Laravel PHP REST API controllers request validation authorization middleware and backend endpoints'},
 {name:'vue-ui',description:'Vue JavaScript frontend components reactive state composables and user interface interactions'},
 {name:'database-migrations',description:'SQL PostgreSQL MySQL schema design database migrations indexes constraints and data models'},
 {name:'documentation',description:'Write maintain README guides API references tutorials and developer documentation'},
 {name:'browser-testing',description:'Playwright browser automation end-to-end tests user journeys assertions selectors and screenshots'},
 {name:'security-review',description:'Security audit threat modeling authentication authorization secrets vulnerabilities dependency review'},
 {name:'python-data',description:'Python scripts data processing pandas ETL parsing and analytics pipelines'},
 {name:'ci-automation',description:'GitHub Actions continuous integration CI workflows automation build test and release pipelines'}
];
const cases=[
 {task:'Implement Laravel REST API controllers with request validation and authorization middleware',expected:'laravel-api'},
 {task:'Build Vue reactive components and composables for frontend interactions',expected:'vue-ui'},
 {task:'Create PostgreSQL schema migrations and add database indexes and constraints',expected:'database-migrations'},
 {task:'Write a README and API reference documentation for developers',expected:'documentation'},
 {task:'Add Playwright end-to-end browser tests for checkout user journey',expected:'browser-testing'},
 {task:'Review authentication authorization vulnerabilities and secret handling',expected:'security-review'},
 {task:'Create Python pandas ETL data processing and analytics script',expected:'python-data'},
 {task:'Fix GitHub Actions CI workflow to run tests and release build',expected:'ci-automation'},
 {task:'Explain the history of coffee culture in Indonesia',expected:null},
 {task:'Plan a weekend hiking trip near the coast',expected:null},
 {task:'Tell me a funny story about a sleepy cat',expected:null}
];
const durations=[],results=[];
for(const item of cases){
 const start=performance.now();
 const result=rankSkills({task:item.task,skills});
 durations.push(performance.now()-start);
 const selected=result.status==='recommended'?result.recommendations[0]?.name:null;
 results.push({expected:item.expected,selected,status:result.status,correct:item.expected?selected===item.expected:selected===null});
}
const positives=cases.filter(x=>x.expected!==null).length;
const negatives=cases.length-positives;
const truePositives=results.filter((x,i)=>cases[i].expected&&x.selected===cases[i].expected).length;
const falsePositives=results.filter((x,i)=>cases[i].expected===null&&x.selected!==null).length;
const sorted=[...durations].sort((a,b)=>a-b);
const percentile=(p)=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
process.stdout.write(JSON.stringify({
 benchmark:'synthetic-skill-routing-v1',
 tasks:cases.length,
 skills:skills.length,
 top1_accuracy:positives?Number((truePositives/positives).toFixed(3)):null,
 positive_coverage:positives?Number((results.filter((x,i)=>cases[i].expected&&x.selected).length/positives).toFixed(3)):null,
 negative_false_positive_rate:negatives?Number((falsePositives/negatives).toFixed(3)):null,
 latency_ms:{mean:Number((durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(3)),p95:Number(percentile(0.95).toFixed(3))},
 model_calls:0,
 notes:'Synthetic lexical benchmark only. It does not measure real-world Skill activation, task quality, token savings or Antigravity host behavior.',
 results
},null,2)+'\n');
