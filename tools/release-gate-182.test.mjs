import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity,assertSupabaseTarget} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.8.2 vacation-report calendar milestone remains present in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.8.2');
  const core=read('core.js');
  const report=read('rak-vacation-report.js');
  assert(core.includes('vacationReportCalendarKey'));
  assert(core.includes('getRakVacationReportCalendarContext'));
  assert(report.includes('getRakVacationReportCalendarContext'));
  assert.equal(JSON.parse(read('tools/performance-parity-17069.json')).current.version,metadata.displayVersion);
});

test('1.8.2 feature and release gates remain mandatory locally and in CI',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  for(const file of ['tools/vacation-report-calendar-182.test.mjs','tools/release-gate-182.test.mjs']){
    assert(pkg.scripts.check.includes(file));
    assert(workflow.includes(file));
  }
  assert(workflow.includes('rak-182-isolated-build-${{ github.sha }}'));
});

test('1.8.2 successors remain TEST-only',()=>{
  const config=read('supabase-config.js');
  assertSupabaseTarget(config,'release milestone');
});
