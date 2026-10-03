import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function fail(message){
  throw new Error('[portable-check] '+message);
}

const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const source=String(pkg.scripts?.check||'').trim();
if(!source)fail('package.json scripts.check is missing');

const commands=source.split(/\s*&&\s*/).filter(Boolean);
console.log('[portable-check] running '+commands.length+' checks sequentially');

for(const [index,command] of commands.entries()){
  const parts=command.trim().split(/\s+/);
  if(parts.shift()!=='node')fail('unsupported command: '+command);
  const result=spawnSync(process.execPath,parts,{cwd:ROOT,env:process.env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0){
    fail('step '+(index+1)+'/'+commands.length+' failed with exit code '+String(result.status)+': '+command);
  }
}

console.log('[portable-check] PASS '+commands.length+' checks');
