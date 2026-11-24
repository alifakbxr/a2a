import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace,invalidateWorkspaceCache} from '../src/security.mjs';

function fixture(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'pilah-config-imports-'));
 const home=path.join(base,'home'),root=path.join(base,'project');
 fs.mkdirSync(home);fs.mkdirSync(root);
 const env={HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,A2A_DATA_DIR:process.env.A2A_DATA_DIR};
 let engine;
 try{
  process.env.HOME=home;process.env.USERPROFILE=home;process.env.A2A_DATA_DIR=path.join(base,'store');
  invalidateWorkspaceCache();
  const write=(p,content)=>{const full=path.join(root,p);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content)};
  fn({write,root,make:()=>{authorizeWorkspace(root);engine=new Engine();return engine}});
 }finally{
  engine?.close();
  for(const [k,v] of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;
  invalidateWorkspaceCache();fs.rmSync(base,{recursive:true,force:true});
 }
}

test('Composer PSR-4 static use imports produce observed reverse dependencies, never dynamic service guesses',()=>fixture(({write,root,make})=>{
 write('composer.json',JSON.stringify({autoload:{'psr-4':{'App\\':'app/'}},'autoload-dev':{'psr-4':{'Tests\\':'tests/'}}}));
 write('app/Services/BillingService.php','<?php namespace App\\Services; class BillingService {}');
 write('app/Http/Controllers/BillingController.php','<?php\nnamespace App\\Http\\Controllers;\nuse App\\Services\\BillingService;\nclass BillingController {}');
 write('tests/Feature/BillingTest.php','<?php\nuse App\\Services\\BillingService;\nclass BillingTest {}');
 write('app/Http/Controllers/ElsewhereController.php','<?php\nuse Vendor\\External\\Driver;\nclass ElsewhereController {}');
 const e=make(),impact=e.impact({workspace:root,changed:['app/Services/BillingService.php']});
 const affected=impact.affected.map(x=>x.path);
 assert.ok(affected.includes('app/Http/Controllers/BillingController.php'));
 assert.ok(affected.includes('tests/Feature/BillingTest.php'));
 assert.ok(!affected.includes('app/Http/Controllers/ElsewhereController.php'));
 const fromConsumer=e.impact({workspace:root,changed:['app/Http/Controllers/BillingController.php']});
 assert.ok(fromConsumer.direct_dependencies.includes('app/Services/BillingService.php'));
 assert.ok(!fromConsumer.affected.some(x=>x.path==='app/Services/BillingService.php'));
}));

test('Configured TypeScript and Vue aliases resolve only exact existing local files',()=>fixture(({write,root,make})=>{
 write('tsconfig.json',JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@/*':['resources/js/*'],'@bad/*':['../../outside/*']}}}));
 write('resources/js/components/UserBadge.vue','<script setup lang="ts">export const badge=true</script>');
 write('resources/js/pages/Dashboard.vue','<script setup lang="ts">\nimport UserBadge from "@/components/UserBadge.vue";\nimport external from "@bad/secret";\n</script>');
 write('resources/js/pages/Other.vue','<script setup lang="ts">import x from "external-sdk";</script>');
 const e=make(),result=e.impact({workspace:root,changed:['resources/js/components/UserBadge.vue']});
 assert.ok(result.affected.some(x=>x.path==='resources/js/pages/Dashboard.vue'));
 assert.ok(!result.affected.some(x=>x.path==='resources/js/pages/Other.vue'));
 assert.equal(result.coverage.static_only,true);
}));
