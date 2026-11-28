import test from 'node:test';
import assert from 'node:assert/strict';
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
 ['Implement Laravel REST API controllers with request validation and authorization middleware','laravel-api'],
 ['Build Vue reactive components and composables for frontend interactions','vue-ui'],
 ['Create PostgreSQL schema migrations and add database indexes and constraints','database-migrations'],
 ['Write a README and API reference documentation for developers','documentation'],
 ['Add Playwright end-to-end browser tests for checkout user journey','browser-testing'],
 ['Review authentication authorization vulnerabilities and secret handling','security-review'],
 ['Create Python pandas ETL data processing and analytics script','python-data'],
 ['Fix GitHub Actions CI workflow to run tests and release build','ci-automation'],
 ['Explain the history of coffee culture in Indonesia',null],
 ['Plan a weekend hiking trip near the coast',null],
 ['Tell me a funny story about a sleepy cat',null]
];

test('synthetic routing benchmark selects the expected Skill and abstains on unrelated tasks',()=>{
 let correct=0,falsePositives=0;
 for(const [task,expected] of cases){
  const result=rankSkills({task,skills});
  const selected=result.status==='recommended'?result.recommendations[0]?.name:null;
  if(expected)assert.equal(selected,expected,task);
  else if(selected!==null)falsePositives++;
  if(expected&&selected===expected)correct++;
 }
 assert.equal(correct,8);
 assert.equal(falsePositives,0);
});
