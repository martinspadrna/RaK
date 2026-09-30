import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.125 remains a historical milestone while successors keep unified identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.125');
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('CHANGELOG.md').includes('## RaK 1.7.125 (development)'));
});

test('1.7.125 binds visible navigation before local Rotation hydration in successors',()=>{
  const app=read('app.js');
  const bind=app.indexOf('RAK_17125_EARLY_INTERACTION');
  const hydrate=app.indexOf('const rakReturningServiceWorkerStart');
  assert(bind>=0&&hydrate>bind);
  assert(app.includes("markRakFirstInteractive('startup-shell-bound')"));
  assert(app.includes('firstInteractiveMs: Number(window.__rakFirstInteractiveMs || 0) || null'));
});

test('1.7.125 keeps More local-first while Admin remains auth-ordered in successors',()=>{
  const routing=read('rak-feature-routing.js');
  assert(routing.includes("if (key === 'menu') return window.rakEnsureFeature('menu');"));
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
});

test('1.7.125 interaction regression gate remains wired after successor releases',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const name of ['tools/startup-interaction-17125.test.mjs','tools/release-gate-17125.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(/rak-1701\d{2}-isolated-build-/.test(workflow));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.125 (development)'));
});
