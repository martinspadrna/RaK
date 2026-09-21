#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const count=(source,needle)=>source.split(needle).length-1;

test('third clean build leaves known generated markers single-shot',()=>{
  const sw=read('sw.js');
  const connectivity=read('app-pwa-connectivity.js');
  const backup=read('rak-complete-backup.js');
  assert.equal(count(sw,"// Previous Home marker kept for diagnostics: const DEVELOPMENT_BUILD_ID = '1.6.03-home2';"),1);
  assert.equal(count(connectivity,"    if (/^[0-9]+[.][0-9]+[.][0-9]+$/.test(raw)) return 'v' + raw;"),1);
  for(const line of [
    "      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),
    "      'Řádků aplikačních tabulek: ' + String(metrics.publicRows || 0),",
    "      'Soukromých importů: ' + String(metrics.privateImports || 0),",
    "      'Sanitizovaných Auth účtů: ' + String(metrics.sanitizedAuthAccounts || 0),"
  ]) assert.equal(count(backup,line),1,line);
});
