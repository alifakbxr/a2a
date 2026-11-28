import test from 'node:test';
import assert from 'node:assert/strict';
import {rankSkills} from '../src/skill-ranking.mjs';

const skills=[
 {name:'laravel-api',description:'Build Laravel API endpoints, validation and authorization',source:'workspace'},
 {name:'vue-ui',description:'Build Vue components and frontend interactions',source:'global'},
 {name:'database-migrations',description:'Design database schema and migration changes',source:'global'}
];

test('ranks Skills from task terms and returns at most two recommendations',()=>{
 const result=rankSkills({task:'Implement Laravel API endpoint validation and authorization',skills});
 assert.equal(result.status,'recommended');
 assert.equal(result.recommendations[0].name,'laravel-api');
 assert.ok(result.recommendations.length<=2);
});

test('does not recommend a Skill for routine or underspecified tasks by default',()=>{
 assert.equal(rankSkills({task:'fix typo',skills}).status,'skipped');
 assert.equal(rankSkills({task:'',skills}).status,'skipped');
});

test('usage is a bounded tie-breaker and cannot create a match',()=>{
 const none=rankSkills({task:'Write documentation for product roadmap',skills,usage:{'vue-ui':1000}});
 assert.notEqual(none.status,'recommended');
 const ranked=rankSkills({task:'Build Vue components and frontend interactions',skills,usage:{'vue-ui':1000}});
 assert.equal(ranked.recommendations[0].name,'vue-ui');
 assert.ok(ranked.recommendations[0].score<=10);
});

test('rejects malformed limits and oversized inputs',()=>{
 assert.throws(()=>rankSkills({task:'x',skills,maxResults:3}),/maxResults/);
 assert.throws(()=>rankSkills({task:'x'.repeat(4001),skills}),/task/);
 assert.throws(()=>rankSkills({task:'valid enough task terms',skills:Array(201).fill(skills[0])}),/skills/);
});

test('ambiguous or weak matches are not promoted as recommendations',()=>{
 const result=rankSkills({task:'Find useful item',skills:[{name:'data-tool',description:'Useful data work'}],threshold:1});
 assert.ok(['ambiguous','skipped','no_match'].includes(result.status));
});
