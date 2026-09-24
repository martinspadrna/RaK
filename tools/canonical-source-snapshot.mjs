#!/usr/bin/env node
// Evidence-only migration bridge: capture built 1.7.69 runtime without changing application sources.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const SNAPSHOT_SCHEMA = 'rak-canonical-runtime-overlay-v1';
export const EXPECTED_RELEASE = '1.7.69';
export const EXPECTED_BUILD = 'v1.7.69-local-drafts1';
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotFolder = '.rak-canonical-snapshot';
const REQUIRED = ['index.html', 'sw.js', 'app.js', 'supabase-config.js', 'supabase-bridge.js', 'package.json'];

export function isRuntimePath(input) {
  const p = String(input || '').replaceAll('\\', '/');
  if (!p || p.startsWith('/') || p.split('/').some(part => part === '.' || part === '..' || !part)) return false;
  if (p.split('/').some(part => /^\.env(?:\.|$)/i.test(part) || ['node_modules','.git','.vercel','tools','supabase','.github'].includes(part))) return false;
  if (/\.(?:key|pem|p12|pfx|zip|log|map)$/i.test(p)) return false;
  if (p === 'package-lock.json') return false;
  if (p.includes('/')) return /^(?:api|assets|fonts|icons|images|vendor)\//.test(p) &&
    /\.(?:js|mjs|css|html|json|webmanifest|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i.test(p);
  return /\.(?:js|css|html|json|webmanifest|svg|png|jpe?g|gif|webp|ico|woff2?)$/i.test(p);
}

function git(root, ...args) {
  return execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:16*1024*1024});
}
function sha256(content) {return crypto.createHash('sha256').update(content).digest('hex');}
function names(output) {return output.split('\0').filter(Boolean).sort();}
function assert(condition, message) {if (!condition) throw Error('[canonical-snapshot] '+message);}
export function capture(root = DEFAULT_ROOT, target = process.env.RAK_BUILD_TARGET || 'test') {
  const sha = git(root,'rev-parse','HEAD').trim();
  assert(/^[a-f0-9]{40}$/i.test(sha), 'invalid HEAD SHA');
  const tracked = names(git(root,'ls-files','-z')).filter(isRuntimePath);
  const untracked = names(git(root,'ls-files','--others','--exclude-standard','-z')).filter(isRuntimePath);
  const files = [...new Set([...tracked,...untracked])].sort().map(relative => {
    const buffer=fs.readFileSync(path.join(root,relative));
    return {path:relative,bytes:buffer.length,sha256:sha256(buffer)};
  });
  const changed = new Set([...names(git(root,'diff','--name-only','-z','HEAD','--')), ...untracked]);
  const changedPaths = files.filter(entry=>changed.has(entry.path)).map(entry=>entry.path);
  for (const required of REQUIRED) assert(files.some(entry=>entry.path===required),'missing runtime '+required);
  assert(changedPaths.length>10, 'built runtime appears unchanged; refusing to capture raw baseline');
  const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  assert(read('index.html').includes(`var build='${EXPECTED_BUILD}';`),'wrong HTML build');
  assert(read('sw.js').includes(`const CACHE_VERSION = 'v${EXPECTED_RELEASE}';`),'wrong worker version');
  const supabaseConfig=read('supabase-config.js');
  assert(['test','production'].includes(target),'unknown build target');
  if(target==='production') {
    assert(supabaseConfig.includes('bkqamcbkiwumsvelahxr') && !supabaseConfig.includes('cgshssdjgzzuprlwnabl'),'not production Supabase');
  } else {
    assert(supabaseConfig.includes('cgshssdjgzzuprlwnabl') && !supabaseConfig.includes('bkqamcbkiwumsvelahxr'),'not TEST Supabase');
  }
  assert(JSON.parse(read('package.json')).version==='1.7.0','technical version must remain 1.7.0');
  const manifest={schema:SNAPSHOT_SCHEMA, sourceCommit:sha, release:EXPECTED_RELEASE, buildId:EXPECTED_BUILD,
    files, changedPaths, runtimeDigest:sha256(JSON.stringify(files))};
  return manifest;
}
function storage(root=DEFAULT_ROOT) {return path.join(root,snapshotFolder);}
function readSnapshot(root) {
  const file=path.join(storage(root),'first.json');
  assert(fs.existsSync(file),'first-pass manifest missing');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
export function compareManifests(first,second) {
  assert(first.schema===SNAPSHOT_SCHEMA && second.schema===SNAPSHOT_SCHEMA,'snapshot schema mismatch');
  assert(first.sourceCommit===second.sourceCommit,'HEAD changed between builds');
  assert(first.runtimeDigest===second.runtimeDigest,'runtime differs after an additional build:\n'+
    [...new Set([...first.files.map(f=>f.path),...second.files.map(f=>f.path)])]
      .filter(p=>first.files.find(x=>x.path===p)?.sha256!==second.files.find(x=>x.path===p)?.sha256).slice(0,30).join(', '));
  assert(JSON.stringify(first.changedPaths)===JSON.stringify(second.changedPaths),'changed-path list differs between builds');
  return true;
}
function run() {
  const mode=process.argv[2];
  assert(['capture','compare'].includes(mode),'expected capture or compare');
  const root=DEFAULT_ROOT, folder=storage(root);
  if(mode==='capture') {
    const manifest=capture(root);
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'first.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(`[canonical-snapshot] captured ${manifest.files.length} runtime files, ${manifest.changedPaths.length} transformed; HEAD ${manifest.sourceCommit}; digest ${manifest.runtimeDigest}`);
    return;
  }
  const first=readSnapshot(root), second=capture(root);
  compareManifests(first,second);
  const overlay=path.join(folder,'overlay');
  for(const relative of second.changedPaths) {
    const dest=path.join(overlay,relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(path.join(root,relative),dest);
  }
  const manifest=Object.assign({},second,{overlayBytes:second.files.filter(e=>second.changedPaths.includes(e.path)).reduce((n,e)=>n+e.bytes,0)});
  fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.rmSync(path.join(folder,'first.json'));
  console.log(`[canonical-snapshot] VERIFIED repeatable 1.7.69 runtime: ${manifest.files.length} files; ${manifest.changedPaths.length} overlay files, ${manifest.overlayBytes} bytes; digest ${manifest.runtimeDigest}; unchanged HEAD ${manifest.sourceCommit}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();