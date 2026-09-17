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
const helper = fs.readFileSync(helperPath, 'utf8');

if (!helper.includes(marker)) throw new Error('[shift-report-image-170] helper marker missing');
if (!helper.includes("./assets/rak-login-crab.png")) throw new Error('[shift-report-image-170] exact login crab asset missing');

if (runtime.includes(marker)) {
  const count = runtime.split(marker).length - 1;
  if (count !== 1) throw new Error('[shift-report-image-170] helper marker duplicated in runtime');
  console.log('[shift-report-image-170] repeated build: PNG image export already attached');
  process.exit(0);
}

runtime = runtime.replace(/\s*$/, '') + '\n\n' + helper.trim() + '\n';
fs.writeFileSync(runtimePath, runtime, 'utf8');

const output = fs.readFileSync(runtimePath, 'utf8');
if (!output.includes(marker)) throw new Error('[shift-report-image-170] runtime append failed');
console.log('[shift-report-image-170] OK portrait PNG + exact login crab watermark + iOS file share attached');
