import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.99 uses one unified release identity',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.99');
  assert.equal(metadata.displayVersion,'1.7.99');
  assert.equal(metadata.technicalVersion,'1.7.99');
  assert.equal(metadata.moduleCacheVersion,'1.7.99');
  assert.equal(metadata.cacheVersion,'v1.7.99');
  assert.equal(metadata.buildId,'v1.7.99-bug-report-screenshot1');
  assert.equal(JSON.parse(read('package.json')).version,'1.7.99');
  assert(read('index.html').includes('app.js?v=1.7.99'));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw=1.7.99');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v1.7.99';"));
});

test('bug report screenshot is optional, client-reencoded and never stored in offline queue',()=>{
  const menu=read('app-menu-bug-report.js');
  const bridge=read('supabase-bridge.js');
  assert(menu.includes('RAK_BUG_SCREENSHOT_MAX_SOURCE_BYTES = 12 * 1024 * 1024'));
  assert(menu.includes('RAK_BUG_SCREENSHOT_MAX_BYTES = 650000'));
  assert(menu.includes('RAK_BUG_SCREENSHOT_MAX_EDGE = 1400'));
  assert(menu.includes("bugReportCanvasBlob(canvas, 'image/jpeg'"));
  assert(menu.includes('id="bugReportScreenshot"'));
  assert(menu.includes('localBackup: true, hasScreenshot: !!rakBugReportScreenshot'));
  assert(!menu.includes('localBackup: true, screenshot:'));
  assert(bridge.includes("client.rpc('rak_submit_bug_report_v3'"));
  assert(bridge.includes("reason: 'screenshot-online-required'"));
  assert(bridge.includes("reason: 'screenshot-upload-failed'"));
});

test('admin screenshot bytes require explicit admin-only fetch and stay out of list/export rows',()=>{
  const admin=read('admin-reports.js');
  const bridge=read('supabase-bridge.js');
  const menu=read('app-menu.js');
  assert(admin.includes('row.has_screenshot && isAdminReportUuid(row.id)'));
  assert(admin.includes('data-admin-action="report-screenshot"'));
  assert(admin.includes('bridge.loadBugReportScreenshot(id)'));
  assert(!admin.includes('row.screenshot_base64'));
  assert(bridge.includes("client.rpc('rak_admin_get_bug_report_screenshot_v3'"));
  assert(menu.includes("adminAction === 'report-screenshot'"));
});

test('screenshot SQL is bounded, RLS locked and does not create a Storage bucket',()=>{
  const sql=read('supabase/migrations/20260924201500_rak_bug_report_optional_screenshot_17099.sql');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.bug_report_attachments'));
  assert(sql.includes('ALTER TABLE public.bug_report_attachments ENABLE ROW LEVEL SECURITY'));
  assert(sql.includes('REVOKE ALL ON TABLE public.bug_report_attachments FROM PUBLIC,anon,authenticated'));
  assert(sql.includes("mime_type IN ('image/jpeg','image/png','image/webp')"));
  assert(sql.includes('pg_catalog.octet_length(content_bytes) BETWEEN 1 AND 750000'));
  assert(sql.includes("MESSAGE='screenshot_mime_mismatch'"));
  assert(sql.includes('PERFORM private.rak_require_admin(false)'));
  assert(sql.includes('DELETE FROM public.bug_report_attachments WHERE report_id=p_id'));
  assert(!sql.includes('storage.buckets'));
  assert(!sql.includes('storage.objects'));
  assert(!sql.includes('CREATE OR REPLACE FUNCTION public.rak_submit_bug_report_v2'));
});

test('runtime screenshot unit suite is mandatory in npm check',()=>{
  const pkg=JSON.parse(read('package.json'));
  const unit=read('tools/bug-report-screenshot-17099.test.mjs');
  assert(pkg.scripts.check.includes('tools/bug-report-screenshot-17099.test.mjs'));
  assert(unit.includes("assert.equal(rpc[0].name,'rak_submit_bug_report_v3')"));
  assert(unit.includes("assert.equal(rpc.length,1)"));
  assert(unit.includes("admin screenshot read uses dedicated admin RPC"));
});

test('mandatory CI and npm check execute the 1.7.99 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17099.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17099.test.mjs'));
  assert(workflow.includes('rak-17099-isolated-build-'+'$'+'{{ github.sha }}'));
});
