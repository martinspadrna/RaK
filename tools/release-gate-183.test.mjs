import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.3 vacation-report spacing milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.3');
  const css=read('styles-modal.css');
  assert(css.includes('.adminVacationReportCalendarCard{margin-bottom:12px;}'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.8.3 feature and release gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/admin-vacation-report-spacing-183.test.mjs','tools/release-gate-183.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-183-isolated-build-${{ github.sha }}'));
});

test('1.8.3 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assert(config.includes('cgshssdjgzzuprlwnabl'));
  assert(!config.includes('bkqamcbkiwumsvelahxr'));
});
