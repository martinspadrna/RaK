import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8').replace(/\r\n?/g,'\n');

test('authenticated Home hydration and live sync still start before background audits',()=>{
  const src=read('app.js');
  const ready=src.indexOf('window.__rakBootV2StartupReady = true;');
  const sync=src.indexOf('const startSync = () => ensureFeature(\'sync\')',ready);
  const audit=src.indexOf('const runIdleAudits = () =>',sync);
  const scheduled=src.indexOf('setTimeout(() => {',audit);
  assert(ready>0&&sync>ready&&audit>sync&&scheduled>audit);
  const region=src.slice(audit,scheduled+300);
  assert(region.includes('12000'),'diagnostics must not compete with the initial 12-second sync window');
  assert(region.includes('requestIdleCallback(runIdleAudits, { timeout: 5000 })'));
  assert(region.includes('else runIdleAudits()'));
  assert(src.includes('loadFiles(idleFoundationFiles).then(() => Promise.all(idleAuditFiles.map(loadScript)))'));
  assert(src.includes('window.__rakIdleAuditsReady = true'));
  assert(src.includes('await ensureFeature(\'rotation\')'),'Rotation must still hydrate locally before startupReady');
  assert(src.includes('if (typeof requestIdleCallback === \'function\') requestIdleCallback(startSync, { timeout: 1200 })'));
});

test('unused automatic stylesheet slot scan is removed without deferring established parser CSS',()=>{
  const app=read('app.js'),html=read('index.html');
  assert(!app.includes('warmPostReadyStyles'),'no idle CSS scan for zero current slots');
  assert(!html.includes('data-rak-post-ready-style='));
  for(const href of ['styles-dashboard-fit.css','styles-dashboard-polish.css','styles-bottom-nav-runtime.css','styles-settings-runtime.css','styles-admin-polish.css']){
    assert(html.includes('rel="stylesheet" href="'+href+'"'),'existing CSS order/appearance must remain intact: '+href);
  }
  assert(app.includes('function loadFeatureStyles(styles)'),'CSS intent/on-demand API remains available');
});

test('offline PWA still contains the diagnostic foundation and executable auditing modules',()=>{
  const sw=read('sw.js');
  for(const f of ['rak-audit-baseline.js','rak-runtime-health.js','app-health-audits.js','app-postload-audits.js']){
    assert(sw.includes(f),'offline audit asset missing '+f);
  }
  const metadata=read('rak-release-metadata.js');
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'2.0.37');
  assert(metadata.includes("displayVersion: '2.0.37'"));
  assert(read('tools/performance-parity-17069.json').includes('"version": "2.0.37"'));
  assert(!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
});
