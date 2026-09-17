#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimePath = path.join(root, 'rak-shift-report-share.js');
const helperPath = path.join(root, 'rak-shift-report-image.js');
const marker = '__rakShiftReportImageExport170Installed';

if (!fs.existsSync(runtimePath)) throw new Error('[shift-report-image-170] rak-shift-report-share.js missing');
if (!fs.existsSync(helperPath)) throw new Error('[shift-report-image-170] rak-shift-report-image.js missing');

let runtime = fs.readFileSync(runtimePath, 'utf8');
const helperSource = fs.readFileSync(helperPath, 'utf8');
const broadObserver = "    try { new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); }\n    catch (err) {}";
const targetedInstall = `    const reportApi = window.RakShiftReport;\n    if (reportApi && typeof reportApi.open === 'function' && !reportApi.__rakImageExportWrapped) {\n      const originalOpen = reportApi.open;\n      reportApi.open = function rakShiftReportOpenWithImageExport(...args) {\n        const result = originalOpen.apply(this, args);\n        setTimeout(scan, 0);\n        return result;\n      };\n      reportApi.__rakImageExportWrapped = true;\n    }\n    document.addEventListener('click', (event) => {\n      const trigger = event.target && event.target.closest ? event.target.closest('[data-admin-action=\\\"shift-report\\\"]') : null;\n      if (trigger) setTimeout(scan, 0);\n    }, true);`;
const helper = helperSource.includes(broadObserver) ? helperSource.replace(broadObserver, targetedInstall) : helperSource;
const helperMarkerCount = helper.split(marker).length - 1;

if (helperMarkerCount < 1) throw new Error('[shift-report-image-170] helper marker missing');
if (!helper.includes("./assets/rak-login-crab.png")) throw new Error('[shift-report-image-170] exact login crab asset missing');
if (helper.includes('new MutationObserver(scan)')) throw new Error('[shift-report-image-170] broad report observer must not reach deployed runtime');

if (runtime.includes(marker)) {
  const count = runtime.split(marker).length - 1;
  if (count !== helperMarkerCount) throw new Error('[shift-report-image-170] helper marker count mismatch in runtime');
  if (runtime.includes('new MutationObserver(scan)')) throw new Error('[shift-report-image-170] broad report observer returned in runtime');
  console.log('[shift-report-image-170] repeated build: PNG image export already attached');
  process.exit(0);
}

runtime = runtime.replace(/\s*$/, '') + '\n\n' + helper.trim() + '\n';
fs.writeFileSync(runtimePath, runtime, 'utf8');

const output = fs.readFileSync(runtimePath, 'utf8');
const outputMarkerCount = output.split(marker).length - 1;
if (outputMarkerCount !== helperMarkerCount) throw new Error('[shift-report-image-170] runtime append failed');
if (output.includes('new MutationObserver(scan)')) throw new Error('[shift-report-image-170] broad report observer leaked into output');
console.log('[shift-report-image-170] OK portrait PNG + exact login crab watermark + targeted report install + iOS file share attached');
