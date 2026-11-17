import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Engine} from '../src/engine.mjs';
import {authorizeWorkspace} from '../src/security.mjs';
const cases=[
 {name:'php',manifest:'composer.json',body:'{}',file:'app/AuthController.php',source:'<?php class AuthController {}'},
 {name:'python',manifest:'pyproject.toml',body:'[project]\nname="myapp"',file:'app/auth.py',source:'def login():\n  return True\n'},
 {name:'go',manifest:'go.mod',body:'module example.com/app\ngo 1.22',file:'app/auth.go',source:'package app\nfunc Login() bool { return true }'},
 {name:'rust',manifest:'Cargo.toml',body:'[package]\nname="myapp"\nversion="0.1.0"',file:'src/lib.rs',source:'pub fn login() -> bool { true }'},
 {name:'java',manifest:'pom.xml',body:'<project></project>',file:'src/Auth.java',source:'public class Auth {}'},
 {name:'flutter',manifest:'pubspec.yaml',body:'name: app',file:'lib/auth.dart',source:'class Auth {}'},
 {name:'godot',manifest:'project.godot',body:'[application]\nconfig/name="App"',file:'scripts/player.gd',source:'extends Node\nfunc move():\n  pass'},
 {name:'swift',manifest:'Package.swift',body:'// swift-tools-version:5.9',file:'Sources/App/Auth.swift',source:'class Auth {}'},
 {name:'dotnet',manifest:'App.csproj',body:'<Project/>',file:'Auth.cs',source:'public class Auth {}'},
 {name:'cmake',manifest:'CMakeLists.txt',body:'cmake_minimum_required(VERSION 3.20)',file:'src/auth.cpp',source:'int login(){return 1;}'},
];
for(const variant of cases){test('recognizes '+variant.name+' without additional MCP plugins',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'verifykit-lang-'));const home=path.join(base,'home'),work=path.join(base,'work');fs.mkdirSync(home);fs.mkdirSync(work);
  const old={HOME:process.env.HOME,VERIFYKIT_DATA_DIR:process.env.VERIFYKIT_DATA_DIR};process.env.HOME=home;process.env.VERIFYKIT_DATA_DIR=path.join(base,'data');
  const write=(f,t)=>{const p=path.join(work,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,t)};
  try{write(variant.manifest,variant.body);write(variant.file,variant.source);authorizeWorkspace(work);const e=new Engine();try{
    const r=e.context({workspace:work});assert.ok(r.ecosystems.length>0);assert.ok(r.coverage.files>=2);
    const impact=e.impact({workspace:work,changed:[variant.file]});assert.equal(impact.changed[0],variant.file);
    const plan=e.verify({workspace:work,operation:'plan',criteria:['A sample criterion']});assert.ok(plan.checks.suggestions.length>0);
  }finally{e.close()}}
  finally{for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;fs.rmSync(base,{recursive:true,force:true})}
})}
