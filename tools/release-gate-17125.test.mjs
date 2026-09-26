import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.125 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.125');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.125');
  assert.equal(metadata.buildId,'v1.7.125-early-interaction1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.125');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.125'));
  assert(read('index.html').includes('app.js?v=1.7.125'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.125'"));
});

test('1.7.125 binds visible navigation before local Rotation hydration',()=>{
  const app=read('app.js');
  const bind=app.indexOf('RAK_17125_EARLY_INTERACTION');
  const hydrate=app.indexOf('const rakReturningServiceWorkerStart');
  assert(bind>=0&&hydrate>bind);
  assert(app.includes("markRakFirstInteractive('startup-shell-bound')"));
  assert(app.includes('firstInteractiveMs: Number(window.__rakFirstInteractiveMs || 0) || null'));
});

test('1.7.125 keeps More local-first while Admin remains auth-ordered',()=>{
  const routing=read('rak-feature-routing.js');
  assert(routing.includes("if (key === 'menu') return window.rakEnsureFeature('menu');"));
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
});

test('1.7.125 interaction regression and evidence gates are wired into CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/startup-interaction-17125.test.mjs','tools/release-gate-17125.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170125-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170124-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.125 (development)'));
});
