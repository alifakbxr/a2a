#!/usr/bin/env node
import fs from 'node:fs';
import {TOOLS} from '../src/tools.mjs';
const target=new URL('../schemas/mcp-tools.json',import.meta.url);
fs.writeFileSync(target,JSON.stringify({schema_version:'1.0.0',tools:TOOLS},null,2)+'\n');
console.log('Wrote schemas/mcp-tools.json');
