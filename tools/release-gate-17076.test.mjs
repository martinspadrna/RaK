import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const {displayVersion:VERSION}=RELEASE_METADATA;

test('1.7.76 and verified successors keep one unified release identity and TEST Supabase',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.76');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
});

test('runtime and canonical build consume metadata instead of copying the current version',()=>{
  const current=[RELEASE_METADATA.displayVersion,RELEASE_METADATA.buildId];
  for(const file of ['index.html','app.js','sw.js','supabase-config.js','tools/canonical-build.mjs']){
    const source=read(file);
    for(const literal of current){
      if((file==='index.html'||file==='sw.js')&&literal===RELEASE_METADATA.displayVersion) continue;
      assert(!source.includes(literal),file+' duplicates '+literal);
    }
  }
  const build=read('tools/canonical-build.mjs');
  assert(build.includes("import RELEASE_METADATA from '../rak-release-metadata.js';"));
  assert(build.includes('technicalVersion:TECHNICAL_VERSION'));
  assert(build.includes("'rak-release-metadata.js'"));
});

test('metadata loads before the first version decision and is available offline',()=>{
  const index=read('index.html'),sw=read('sw.js');
  assert(index.indexOf('<script src="rak-release-metadata.js"></script>')<index.indexOf('rak-dev-17001-update-unblock'));
  assert(sw.indexOf("importScripts('./rak-release-metadata.js?sw=")<sw.indexOf('const CACHE_VERSION'));
  const core=sw.slice(sw.indexOf('const CORE = ['),sw.indexOf('const WARM_START = ['));
  assert(core.includes("'./rak-release-metadata.js'"));
});

test('strict CI checks metadata after both canonical builds and keeps reproducibility evidence',()=>{
  const pkg=JSON.parse(read('package.json')),workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/release-gate-17076.test.mjs'));
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  assert(workflow.includes('node --test tools/release-gate-17076.test.mjs'));
  assert(workflow.includes('rak-170'+VERSION.split('.').at(-1)+'-isolated-build-'));
});
