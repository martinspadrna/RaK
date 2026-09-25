#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import RELEASE_METADATA from '../rak-release-metadata.js';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const STATE=path.join(ROOT,'.rak-canonical-build');
export const WORK=path.join(STATE,'work');
export const OUTPUT=path.join(ROOT,'.rak-dist');
export const VARIABLE_OUTPUTS=Object.freeze(['rak-complete-backup-source.zip']);
export const RELEASE=RELEASE_METADATA.displayVersion;
export const BUILD_ID=RELEASE_METADATA.buildId;
export const TECHNICAL_VERSION=RELEASE_METADATA.technicalVersion;
const SUPABASE_VENDOR_RELATIVE='supabase-vendor-2.110.7.js';
const SUPABASE_VENDOR_SOURCE=path.join(ROOT,'node_modules','@supabase','supabase-js','dist','umd','supabase.js');
const SUPABASE_VENDOR_SHA384='hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD';
const REQUIRED=Object.freeze(['index.html','sw.js','app.js','supabase-config.js','supabase-bridge.js','rak-release-metadata.js','rak-runtime-diagnostics.js',SUPABASE_VENDOR_RELATIVE,'rak-complete-backup-source.zip']);
const STATIC_EXT=/\.(?:js|mjs|css|html|json|webmanifest|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip)$/i;
const STATIC_DIR=/^(?:assets|fonts|icons|images|vendor)\//;
const SOURCE_ONLY_ROOT=new Set(['package.json','package-lock.json','vercel.json']);
const EXCLUDED_ARCHIVE_DIRS=new Set(['.git','node_modules','.vercel','.next','dist','coverage','.cache','.rak-canonical-build','.rak-dist','.rak-promotion']);

function run(command,args,options={}){
  return execFileSync(command,args,{cwd:options.cwd||ROOT,encoding:'utf8',stdio:options.stdio||'pipe',
    maxBuffer:128*1024*1024,env:options.env||process.env});
}
function assert(condition,message){if(!condition)throw Error('[canonical-build] '+message);}
function split0(value){return value.split('\0').filter(Boolean);}
function hash(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
export function equivalentJsonText(left,right){
  const normalize=value=>{
    if(Array.isArray(value))return value.map(normalize);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]));
    return value;
  };
  try{return JSON.stringify(normalize(JSON.parse(left)))===JSON.stringify(normalize(JSON.parse(right)));}
  catch{return false;}
}
function validateSourceTree(phase){
  const changed=run('git',['diff','--name-only','HEAD','--']).trim();
  if(!changed)return;
  if(changed==='vercel.json'&&process.env.VERCEL==='1'){
    const canonical=run('git',['show','HEAD:vercel.json']);
    const working=fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8');
    assert(equivalentJsonText(canonical,working),'Vercel changed vercel.json semantics '+phase);
    console.log('[canonical-build] accepted Vercel formatting-only vercel.json normalization '+phase);
    return;
  }
  assert(false,'source tree is dirty '+phase+': '+changed);
}
function sourceFingerprint(){
  const digest=crypto.createHash('sha256');
  for(const relative of trackedFiles().sort()){
    digest.update(relative);digest.update('\0');digest.update(fs.readFileSync(path.join(ROOT,relative)));digest.update('\0');
  }
  return digest.digest('hex');
}
function trackedFiles(){return split0(run('git',['ls-files','-z']));}
function isStatic(relative){
  const p=relative.replaceAll('\\','/');
  if(!STATIC_EXT.test(p)||p.startsWith('api/')||p.startsWith('tools/')||p.startsWith('supabase/')||p.startsWith('.github/'))return false;
  if(!p.includes('/'))return !SOURCE_ONLY_ROOT.has(p);
  return STATIC_DIR.test(p);
}
function safeArchivePath(relative){
  const p=String(relative||'').replaceAll('\\','/'),base=path.posix.basename(p).toLowerCase();
  if(!p||p.startsWith('../')||p.split('/').some(part=>EXCLUDED_ARCHIVE_DIRS.has(part)))return false;
  if(/^\.env(?:\.|$)/i.test(base)||/\.(?:pem|key|p12|pfx|zip|log)$/i.test(base))return false;
  return !/^(?:id_rsa|id_ed25519)(?:\.|$)/i.test(base);
}
function copy(relative,from,to){
  const source=path.join(from,relative),destination=path.join(to,relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);fs.chmodSync(destination,fs.statSync(source).mode);
}
function prepareWork(){
  fs.rmSync(WORK,{recursive:true,force:true});fs.mkdirSync(WORK,{recursive:true});
  for(const relative of trackedFiles())copy(relative,ROOT,WORK);
}
function prepareVendor(){
  assert(fs.existsSync(SUPABASE_VENDOR_SOURCE),'pinned Supabase SDK missing from node_modules; run npm install');
  const data=fs.readFileSync(SUPABASE_VENDOR_SOURCE);
  const digest=crypto.createHash('sha384').update(data).digest('base64');
  assert(digest===SUPABASE_VENDOR_SHA384,'pinned Supabase SDK SHA-384 mismatch');
  const destination=path.join(WORK,SUPABASE_VENDOR_RELATIVE);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,data);
}
function prepareBackup(){
  const commit=run('git',['rev-parse','HEAD']).trim();
  assert(/^[a-f0-9]{40}$/.test(commit),'invalid source commit');
  const inventory=trackedFiles().map(p=>p.replaceAll('\\','/')).filter(safeArchivePath).sort();
  assert(inventory.length>80&&inventory.includes('rak-complete-backup.js'),'source inventory incomplete');
  const backupFile=path.join(WORK,'rak-complete-backup.js');
  let source=fs.readFileSync(backupFile,'utf8');
  assert(/const RAK_COMPLETE_BACKUP_BUILD_SHA = '[a-f0-9]{40}';/.test(source),'backup SHA marker missing');
  source=source.replace(/const RAK_COMPLETE_BACKUP_BUILD_SHA = '[a-f0-9]{40}';/,"const RAK_COMPLETE_BACKUP_BUILD_SHA = '"+commit+"';");
  const inventoryRe=/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[[\s\S]*?\]\);/;
  assert(inventoryRe.test(source),'backup inventory marker missing');
  source=source.replace(inventoryRe,'const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([\n'+inventory.map(file=>'    '+JSON.stringify(file)).join(',\n')+'\n  ]);');
  fs.writeFileSync(backupFile,source);
  const archive=execFileSync('git',['archive','--format=zip','HEAD','--',...inventory],{cwd:ROOT,encoding:null,maxBuffer:128*1024*1024});
  assert(Buffer.isBuffer(archive)&&archive.length>100000,'source archive incomplete');
  fs.writeFileSync(path.join(WORK,'rak-complete-backup-source.zip'),archive);
}
function publish(){
  fs.rmSync(OUTPUT,{recursive:true,force:true});fs.mkdirSync(OUTPUT,{recursive:true});
  const candidates=trackedFiles().filter(isStatic);
  if(!candidates.includes(SUPABASE_VENDOR_RELATIVE))candidates.push(SUPABASE_VENDOR_RELATIVE);
  if(!candidates.includes('rak-complete-backup-source.zip'))candidates.push('rak-complete-backup-source.zip');
  for(const relative of candidates.sort())if(fs.existsSync(path.join(WORK,relative)))copy(relative,WORK,OUTPUT);
  for(const required of REQUIRED)assert(fs.existsSync(path.join(OUTPUT,required)),'missing output '+required);
}
function manifest(){
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
    release:RELEASE,buildId:BUILD_ID,technicalVersion:TECHNICAL_VERSION,variableOutputs:[...VARIABLE_OUTPUTS],files,
    stableDigest:hash(Buffer.from(JSON.stringify(stable)))};
}
function compare(first,second){
  assert(first.sourceCommit===second.sourceCommit,'commit changed between builds');
  assert(first.stableDigest===second.stableDigest,'repeat build differs outside declared variable outputs');
  const a=new Map(first.files.map(file=>[file.path,file.sha256])),b=new Map(second.files.map(file=>[file.path,file.sha256]));
  const differences=[...new Set([...a.keys(),...b.keys()])].filter(file=>a.get(file)!==b.get(file));
  assert(differences.every(file=>VARIABLE_OUTPUTS.includes(file)),'undeclared variable output: '+differences.join(', '));
  return differences;
}
export function build(){
  fs.mkdirSync(STATE,{recursive:true});
  validateSourceTree('before build');
  const beforeFingerprint=sourceFingerprint();
  prepareWork();prepareBackup();prepareVendor();
  const env={...process.env,GIT_DIR:path.join(ROOT,'.git'),GIT_WORK_TREE:WORK};
  if(process.platform==='win32')run(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm.cmd run check'],{cwd:WORK,env,stdio:'inherit'});
  else run('npm',['run','check'],{cwd:WORK,env,stdio:'inherit'});
  publish();
  validateSourceTree('after build');
  assert(sourceFingerprint()===beforeFingerprint,'build modified tracked source bytes');
  const result=manifest(),lastPath=path.join(STATE,'last.json');
  if(fs.existsSync(lastPath)){
    const previous=JSON.parse(fs.readFileSync(lastPath,'utf8'));
    if(previous.sourceCommit===result.sourceCommit){
      const differences=compare(previous,result);
      fs.writeFileSync(path.join(STATE,'verified.json'),JSON.stringify({...result,repeatBuild:true,firstStableDigest:previous.stableDigest,differences},null,2)+'\n');
      console.log('[canonical-build] VERIFIED second clean pass; declared variable differences: '+(differences.join(', ')||'none'));
    }
  }
  fs.writeFileSync(lastPath,JSON.stringify(result,null,2)+'\n');
  console.log('[canonical-build] PASS '+result.files.length+' files; stable digest '+result.stableDigest+'; source unchanged');
  return result;
}
export function verifyRepeat(){
  fs.rmSync(path.join(STATE,'last.json'),{force:true});fs.rmSync(path.join(STATE,'verified.json'),{force:true});
  build();build();assert(fs.existsSync(path.join(STATE,'verified.json')),'repeat proof was not written');
}
const mode=process.argv[2]||'build';
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  if(mode==='build')build();else if(mode==='verify-repeat')verifyRepeat();else throw Error('[canonical-build] expected build or verify-repeat');
}

