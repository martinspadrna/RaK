#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE = path.join(ROOT, '.rak-canonical-build');
export const WORK = path.join(STATE, 'work');
export const OUTPUT = path.join(ROOT, '.rak-dist');
export const VARIABLE_OUTPUTS = Object.freeze(['rak-complete-backup-source.zip']);
const REQUIRED = Object.freeze(['index.html','sw.js','app.js','supabase-config.js','supabase-bridge.js','rak-complete-backup-source.zip']);
const STATIC_EXT = /\.(?:js|mjs|css|html|json|webmanifest|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip)$/i;
const STATIC_DIR = /^(?:assets|fonts|icons|images|vendor)\//;
const SOURCE_ONLY_ROOT = new Set(['package.json','package-lock.json','vercel.json']);

function run(command,args,options={}) {
  return execFileSync(command,args,{cwd:options.cwd||ROOT,encoding:'utf8',stdio:options.stdio||'pipe',
    maxBuffer:128*1024*1024,env:options.env||process.env});
}
function assert(condition,message){if(!condition)throw Error('[canonical-build] '+message);}
function split0(value){return value.split('\0').filter(Boolean);}
function hash(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function trackedFiles(){return split0(run('git',['ls-files','-z']));}
function isStatic(relative) {
  const p=relative.replaceAll('\\','/');
  if(!STATIC_EXT.test(p)||p.startsWith('api/')||p.startsWith('tools/')||p.startsWith('supabase/')||p.startsWith('.github/'))return false;
  if(!p.includes('/'))return !SOURCE_ONLY_ROOT.has(p);
  return STATIC_DIR.test(p);
}
function copy(relative,from,to) {
  const source=path.join(from,relative),destination=path.join(to,relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(source,destination);
  fs.chmodSync(destination,fs.statSync(source).mode);
}
function prepareWork() {
  fs.rmSync(WORK,{recursive:true,force:true});
  fs.mkdirSync(WORK,{recursive:true});
  for(const relative of trackedFiles())copy(relative,ROOT,WORK);
}
function publish() {
  fs.rmSync(OUTPUT,{recursive:true,force:true});
  fs.mkdirSync(OUTPUT,{recursive:true});
  const candidates=trackedFiles().filter(isStatic);
  if(fs.existsSync(path.join(WORK,'rak-complete-backup-source.zip'))&&!candidates.includes('rak-complete-backup-source.zip'))candidates.push('rak-complete-backup-source.zip');
  for(const relative of candidates.sort())if(fs.existsSync(path.join(WORK,relative)))copy(relative,WORK,OUTPUT);
  for(const required of REQUIRED)assert(fs.existsSync(path.join(OUTPUT,required)),'missing output '+required);
}
function manifest() {
  const files=[];
  const visit=(folder,prefix='')=>{
    for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const relative=prefix?prefix+'/'+entry.name:entry.name,absolute=path.join(folder,entry.name);
      if(entry.isDirectory())visit(absolute,relative);
      else if(entry.isFile()){const data=fs.readFileSync(absolute);files.push({path:relative,bytes:data.length,sha256:hash(data)});}
    }
  };
  visit(OUTPUT);
  const stable=files.filter(file=>!VARIABLE_OUTPUTS.includes(file.path));
  return {schema:'rak-isolated-canonical-build-v1',sourceCommit:run('git',['rev-parse','HEAD']).trim(),
    release:'1.7.69',technicalVersion:'1.7.0',variableOutputs:[...VARIABLE_OUTPUTS],files,
    stableDigest:hash(Buffer.from(JSON.stringify(stable)))};
}
function compare(first,second) {
  assert(first.sourceCommit===second.sourceCommit,'commit changed between builds');
  assert(first.stableDigest===second.stableDigest,'repeat build differs outside declared variable outputs');
  const firstMap=new Map(first.files.map(file=>[file.path,file.sha256]));
  const secondMap=new Map(second.files.map(file=>[file.path,file.sha256]));
  const names=[...new Set([...firstMap.keys(),...secondMap.keys()])];
  const differences=names.filter(file=>firstMap.get(file)!==secondMap.get(file));
  assert(differences.every(file=>VARIABLE_OUTPUTS.includes(file)),'undeclared variable output: '+differences.join(', '));
  return differences;
}
export function build() {
  fs.mkdirSync(STATE,{recursive:true});
  const before=run('git',['diff','--name-only','HEAD','--']).trim();
  assert(!before,'source tree is dirty before build: '+before);
  prepareWork();
  const env={...process.env,GIT_DIR:path.join(ROOT,'.git'),GIT_WORK_TREE:WORK};
  run(process.platform==='win32'?'npm.cmd':'npm',['run','legacy:vercel-build'],{cwd:WORK,env,stdio:'inherit'});
  publish();
  const after=run('git',['diff','--name-only','HEAD','--']).trim();
  assert(!after,'build modified canonical sources: '+after);
  const result=manifest(),lastPath=path.join(STATE,'last.json');
  if(fs.existsSync(lastPath)){
    const previous=JSON.parse(fs.readFileSync(lastPath,'utf8'));
    if(previous.sourceCommit===result.sourceCommit){
      const differences=compare(previous,result);
      fs.writeFileSync(path.join(STATE,'verified.json'),JSON.stringify({...result,repeatBuild:true,
        firstStableDigest:previous.stableDigest,differences},null,2)+'\n');
      console.log('[canonical-build] VERIFIED second clean pass; declared variable differences: '+(differences.join(', ')||'none'));
    }
  }
  fs.writeFileSync(lastPath,JSON.stringify(result,null,2)+'\n');
  console.log('[canonical-build] PASS '+result.files.length+' files; stable digest '+result.stableDigest+'; source unchanged');
  return result;
}
export function verifyRepeat() {
  fs.rmSync(path.join(STATE,'last.json'),{force:true});
  fs.rmSync(path.join(STATE,'verified.json'),{force:true});
  build();build();
  assert(fs.existsSync(path.join(STATE,'verified.json')),'repeat proof was not written');
}
const mode=process.argv[2]||'build';
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  if(mode==='build')build();
  else if(mode==='verify-repeat')verifyRepeat();
  else throw Error('[canonical-build] expected build or verify-repeat');
}
