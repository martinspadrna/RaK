#!/usr/bin/env node
// Temporary read-only audit of removed Games feature. Do not change runtime or data.
import fs from 'node:fs';
import path from 'node:path';
const pattern=/(?:games?|herní|hern[ií]|hry|\bhra\b|hráč|hrac|piškv|lodě|battleship|top.?score|top výsledky|achiev|leaderboard|ranky|bomber|flappy|2048|snake|tetris|game_accounts|game_profile|game-engine)/i;
const ignore=new Set(['.git','node_modules','.vercel','.next','dist','coverage']);
const accepted=/\.(?:m?js|html?|css|json|md|sql|txt|yml|yaml)$/i;
const found=[];
function walk(folder='.') {
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
  const file=path.join(folder,entry.name);
  if(entry.isDirectory()){if(!ignore.has(entry.name))walk(file);continue;}
  if(!entry.isFile()||!accepted.test(file)||fs.statSync(file).size>400000)continue;
  const lines=fs.readFileSync(file,'utf8').split(/\r?\n/); const hits=[];
  lines.forEach((line,i)=>{if(pattern.test(line))hits.push(`${i+1}:${line.trim().replace(/\s+/g,' ').slice(0,155)}`);});
  if(hits.length)found.push({file:file.replace(/^\.\//,''),hits});
 }
}
walk();
const runtime=found.filter(x=>!x.file.startsWith('tools/')&&!x.file.startsWith('assets/')&&!/^(?:CHANGELOG|DEV_BASELINE|SECURITY_DEPLOYMENT)\.md$/.test(x.file));
const archive=found.filter(x=>!runtime.includes(x));
console.log(`[games-residue-audit] scanned runtime: ${runtime.length} matching files, ${runtime.reduce((sum,f)=>sum+f.hits.length,0)} lines; tools/docs: ${archive.length} matching files, ${archive.reduce((sum,f)=>sum+f.hits.length,0)} lines`);
for(const item of runtime){
 console.log(`[games-residue-audit] ${item.file} (${item.hits.length}): ${item.hits.slice(0,30).join(' || ')}${item.hits.length>30?' || MORE:'+String(item.hits.length-30):''}`);
}
for(const item of archive){
 console.log(`[games-residue-archive] ${item.file} (${item.hits.length}): ${item.hits.slice(0,2).join(' || ')}`);
}
