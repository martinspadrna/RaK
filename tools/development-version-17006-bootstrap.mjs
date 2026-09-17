#!/usr/bin/env node
// Build-only repair for the 1.7.06 release helper: normalize an accidentally over-escaped regex literal before executing it.
import fs from 'node:fs';

const target = 'tools/development-version-17006.mjs';
let source = fs.readFileSync(target, 'utf8');
const bad = 'window\\\\.RAK_';
const good = 'window\\.RAK_';
if (source.includes(bad)) {
  source = source.split(bad).join(good);
  fs.writeFileSync(target, source, 'utf8');
}
if (source.includes(bad)) throw new Error('[development-version-17006-bootstrap] over-escaped version regex remains');
await import('./development-version-17006.mjs');
console.log('[development-version-17006-bootstrap] OK corrected build regex and executed 1.7.06 stage');
