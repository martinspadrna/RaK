import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity,RELEASE_METADATA} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.119 has one unified runtime identity',()=>{
  assert.equal(RELEASE_METADATA.displayVersion,'1.7.119');
  const metadata=assertCurrentReleaseIdentity(read,'1.7.119');
  assert.equal(metadata.buildId,'v1.7.119-unplanned-scope1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.119');
  assert(read('index.html').includes('rak-runtime-diagnostics.js?v=1.7.119'));
  assert(read('index.html').includes('app.js?v=1.7.119'));
  assert(read('sw.js').includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.119'"));
});

test('1.7.119 keeps five reasons, fixes Kalírna availability and scopes unplanned regeneration',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const rotation=read('admin-rotation.js');
  const start=wizard.indexOf('const ADMIN_UNPLANNED_REASON_OPTIONS');
  const end=wizard.indexOf('\nfunction adminRotationUnplannedReasonOption',start);
  const block=wizard.slice(start,end);
  const values=[...block.matchAll(/value: '([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(values,['D','NV','§','LEK','kalirnaOut']);
  assert.equal((wizard.match(/allowScopedRuleErrors: true/g)||[]).length,2);
  assert(rotation.includes('const absent = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);'));
  assert(rotation.includes('if (criticalIssues.length && !allowScopedRuleErrors)'));
  assert(wizard.includes('Přepočítá se jen vybraný den nebo rozsah. Ostatní dny zůstanou beze změny.'));
});

test('1.7.119 compact popup and regression gates are wired into CI',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(wizard.includes('height:auto!important'));
  assert(wizard.includes('max-height:calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'));
  for(const name of ['tools/unplanned-scope-17119.test.mjs','tools/release-gate-17119.test.mjs']){
    assert(pkg.scripts.check.includes(name),name);
    assert(workflow.includes(name),name);
  }
  assert(workflow.includes('rak-170119-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(workflow.includes('rak-170118-isolated-build-'+'$'+'{{ github.sha }}'));
  assert(read('CHANGELOG.md').startsWith('## RaK 1.7.119 (development)'));
});
