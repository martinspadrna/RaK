#!/usr/bin/env node
// P1.5: rehearse restoring the exact allowlisted SOURCE archive into an isolated temp folder.
// No network, credentials, database calls, private exports or persistent extracted files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const archive='rak-complete-backup-source.zip';
const gitRoot=run('git',['rev-parse','--show-toplevel']);
const git=args=>execFileSync('git',['-C',gitRoot,...args],{encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const sha=git(['rev-parse','HEAD']);
assert.match(sha,/^[a-f0-9]{40}$/,'exact Git SHA is required');
for(const [environment,ref] of [['GitHub',process.env.GITHUB_REF_NAME],['Vercel',process.env.VERCEL_GIT_COMMIT_REF]]){
  if(ref)assert.equal(ref,'development',`${environment}: never rehearse main`);
}
if(process.env.GITHUB_SHA)assert.equal(process.env.GITHUB_SHA,sha,'workflow is not building its exact commit');
if(process.env.VERCEL_GIT_COMMIT_SHA)assert.equal(process.env.VERCEL_GIT_COMMIT_SHA,sha,'Vercel build SHA mismatch');
const config=fs.readFileSync('supabase-config.js','utf8');
assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'),'only the TEST configuration is supported');
const backup=fs.readFileSync('rak-complete-backup.js','utf8');
assert(backup.includes(`const RAK_COMPLETE_BACKUP_BUILD_SHA = '${sha}';`),'backup UI refers to another Git commit');
const found=backup.match(/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\((\[[\s\S]*?\])\);/);
assert(found,'no baked-in owner backup source inventory');
const expected=JSON.parse(found[1]);
assert(Array.isArray(expected)&&expected.length>80,'incomplete source inventory');
assert.deepEqual(expected,[...new Set(expected)].sort(),'inventory must be sorted and unique');
assert(fs.statSync(archive).size>100000,'source archive is missing or suspiciously small');
const listing=run('unzip',['-Z','-1',archive]).split(/\r?\n/).filter(Boolean);
const dirs=new Set(expected.flatMap(name=>{const parts=name.split('/');return parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/')+'/');}));
assert(listing.filter(name=>name.endsWith('/')).every(name=>dirs.has(name)),'archive has an unexpected directory entry');
const entries=listing.filter(name=>!name.endsWith('/'));
assert.deepEqual(entries.slice().sort(),expected,'restore inventory differs from the owner-visible source list');
const tracked=new Map();
for(const entry of execFileSync('git',['-C',gitRoot,'ls-files','-s','-z'],{encoding:'utf8',maxBuffer:128*1024*1024}).split('\0').filter(Boolean)){
  const match=entry.match(/^(\d{6}) ([0-9a-f]{40}) 0\t(.+)$/s);
  assert(match,'unexpected unmerged or nonstandard Git index entry');
  tracked.set(match[3],{mode:match[1],sha:match[2]});
}
for(const name of expected){
  assert(typeof name==='string'&&name&&!name.includes('\\')&&!name.includes('\0')&&!name.includes('\n')
    &&!path.posix.isAbsolute(name)&&!name.split('/').some(p=>!p||p==='.'||p==='..'),'unsafe source path in ZIP');
  assert(tracked.has(name),'source archive contains a file absent from the exact Git checkout');
  assert(['100644','100755'].includes(tracked.get(name).mode),'source ZIP symlinks and special files are forbidden');
}
// Test extraction only after validating every pathname and file type. Temp files are always removed.
const dest=fs.mkdtempSync(path.join(os.tmpdir(),'rak-source-restore-'));
try{
  execFileSync('unzip',['-q',archive,'-d',dest],{stdio:'pipe',maxBuffer:128*1024*1024});
  let bytes=0;
  for(const name of expected){
    const restored=path.join(dest,...name.split('/'));
    const stat=fs.lstatSync(restored);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'source restore produced non-regular file');
    const contentSha=git(['hash-object','--',restored]);
    assert.equal(contentSha,tracked.get(name).sha,`restored bytes differ from Git HEAD: ${name}`);
    bytes+=stat.size;
  }
  const dirFiles=[];
  const walk=folder=>{for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    const full=path.join(folder,entry.name);
    if(entry.isDirectory())walk(full);
    else dirFiles.push(path.relative(dest,full).split(path.sep).join('/'));
  }};
  walk(dest);
  assert.deepEqual(dirFiles.sort(),expected,'extra or missing extracted source files');
  assert(fs.existsSync(path.join(dest,'package.json'))&&fs.existsSync(path.join(dest,'supabase-config.js'))
    &&fs.existsSync(path.join(dest,'tools','development-version-17048.mjs')),'restored repository lacks essential rebuild inputs');
  // This historical stage runs before the release transform bumps package.json from its Git source version.
  // The archive must faithfully restore HEAD; final technical version 1.7.0 has its separate release gates.
  const restoredPackage=JSON.parse(fs.readFileSync(path.join(dest,'package.json'),'utf8'));
  const originalPackage=JSON.parse(git(['show','HEAD:package.json']));
  assert.equal(restoredPackage.version,originalPackage.version,'restored source package version differs from Git HEAD');
  console.log(`[17069-source-rehearsal] PASS ${expected.length} files / ${bytes} bytes recovered; every Git blob hash matches ${sha}; temp restore removed. Source-only: independent Supabase/Auth/Storage restoration remains unverified.`);
}finally{
  fs.rmSync(dest,{recursive:true,force:true});
}
