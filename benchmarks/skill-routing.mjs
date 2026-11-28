#!/usr/bin/env node
import {performance} from 'node:perf_hooks';
import {rankSkills} from '../src/skill-ranking.mjs';
const skills=[
 {name:'laravel-api',description:'Laravel PHP REST API controllers request validation authorization middleware backend endpoints'},
 {name:'vue-ui',description:'Vue JavaScript frontend components reactive state composables user interface interactions'},
 {name:'database-migrations',description:'SQL PostgreSQL MySQL schema design database migrations indexes constraints data models'},
 {name:'documentation',description:'Write maintain README guides API references tutorials developer documentation'},
 {name:'browser-testing',description:'Playwright browser automation end-to-end tests user journeys assertions selectors screenshots'},
 {name:'security-review',description:'Security audit threat modeling authentication authorization secrets vulnerabilities dependency review'},
 {name:'python-data',description:'Python scripts data processing pandas ETL parsing analytics pipelines'},
 {name:'ci-automation',description:'GitHub Actions continuous integration CI workflows automation build test release pipelines'}
];
const cases=[
 ['Implement Laravel REST API controllers with request validation and authorization middleware','laravel-api'],
 ['Build Vue reactive components and composables for frontend interactions','vue-ui'],
 ['Create PostgreSQL schema migrations and add database indexes and constraints','database-migrations'],
 ['Write a README and API reference documentation for developers','documentation'],
 ['Add Playwright end-to-end browser tests for checkout user journey','browser-testing'],
 ['Review authentication authorization vulnerabilities and secret handling','security-review'],
 ['Create Python pandas ETL data processing and analytics script','python-data'],
 ['Fix GitHub Actions CI workflow to run tests and release build','ci-automation'],
 ['Perbaiki validasi endpoint Laravel dan hak akses pengguna','laravel-api'],
 ['Buat tampilan Vue untuk dashboard pengguna','vue-ui'],
 ['Tambahkan migrasi basis data PostgreSQL','database-migrations'],
 ['Audit keamanan login dan izin akses akun','security-review'],
 ['Buat pengujian browser otomatis untuk alur checkout','browser-testing'],
 ['Jelaskan sejarah kopi di Indonesia',null],
 ['Rencanakan perjalanan akhir pekan dekat pantai',null],
 ['Ceritakan kisah lucu tentang kucing mengantuk',null],
 ['Bantu saya mengerjakan aplikasi ini',null]
];
const durations=[],results=[];
for(const [task,expected] of cases){const start=performance.now(),r=rankSkills({task,skills});durations.push(performance.now()-start);const selected=r.status==='recommended'?r.recommendations[0]?.name:null;results.push({expected,selected,status:r.status,correct:expected?selected===expected:selected===null})}
const positives=cases.filter(x=>x[1]).length,negatives=cases.length-positives,correct=results.filter((x,i)=>cases[i][1]&&x.selected===cases[i][1]).length,falsePositives=results.filter((x,i)=>!cases[i][1]&&x.selected!==null).length,sorted=[...durations].sort((a,b)=>a-b),p95=sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)];
process.stdout.write(JSON.stringify({benchmark:'synthetic-bilingual-skill-routing-v2',tasks:cases.length,skills:skills.length,top1_accuracy:Number((correct/positives).toFixed(3)),positive_coverage:Number((results.filter((x,i)=>cases[i][1]&&x.selected).length/positives).toFixed(3)),negative_false_positive_rate:Number((falsePositives/negatives).toFixed(3)),latency_ms:{mean:Number((durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(3)),p95:Number(p95.toFixed(3))},model_calls:0,notes:'Synthetic English/Indonesian lexical benchmark only. Does not measure real-world Skill activation, task quality, token savings or Antigravity host behavior.',results},null,2)+'\n');
