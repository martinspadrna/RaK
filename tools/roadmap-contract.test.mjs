import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RAK_ROADMAP_IDS,verifyRoadmapSummary,verifyRoadmapProgress} from './roadmap-contract.mjs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const current = () => read('RAK_HANDOFF.md');
const root=fileURLToPath(new URL('..',import.meta.url));

function syntheticRoadmap(){
  const rows=RAK_ROADMAP_IDS.map(id=>'| '+id+' | test | **100 % (3/3)** | '+(id==='P0.2'?'přijaté riziko – rozhodnutí':'done')+' |').join('\n');
  const details=RAK_ROADMAP_IDS.map(id=>'### '+id+' – test\n\n- [x] one\n- [x] two\n- [x] three\n'+(id==='P0.2'?'\nPřijaté riziko – rozhodnutí.\n':'')).join('\n');
  return '| ID | Task | Progress | Note |\n|---|---|---|---|\n'+rows+'\n\n'+details;
}

test('completed thirteen-point roadmap stays retired from the live handoff', () => {
  const handoff=current();
  assert(!fs.existsSync(path.join(root,['RAK','PLAN','13.md'].join('_'))));
  assert.equal([...handoff.matchAll(/^\| (P[012]\.\d) \|/gm)].length,0);
  assert.equal([...handoff.matchAll(/^### (P[012]\.\d)\s*[–-]/gm)].length,0);
  assert(handoff.includes('Aktuálně není evidovaný žádný otevřený produktový bod.'));
  assert(handoff.includes('Automaticky neotvírat znovu historický 13bodový audit'));
});

test('taxonomy catches missing, duplicate or reordered tasks without depending on prose', () => {
  const plan = syntheticRoadmap();
  assert.deepEqual(verifyRoadmapSummary(plan),RAK_ROADMAP_IDS);
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P2\.4 \|.*$/m, '')), /thirteen unique/);
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P2\.4 \|.*$/m, '| P2.3 | duplicated |')), /thirteen unique/);
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P0\.1 \|.*\r?\n\| P0\.2 \|.*$/m, match => match.split(/\r?\n/).reverse().join('\n'))), /thirteen unique/);
});

test('progress catches incorrect percentage and silently flipped checkboxes', () => {
  const plan = syntheticRoadmap();
  const progress=verifyRoadmapProgress(plan);
  assert.deepEqual(progress.map(item=>item.id),RAK_ROADMAP_IDS);
  const p22Row = plan.match(/^\| P2\.2 \|.*$/m)?.[0];
  assert(p22Row, 'P2.2 summary row missing');
  const corruptedP22 = p22Row.replace(/\*\*(\d+) %/, (_, value) => {
    const currentValue = Number(value);
    return '**' + (currentValue === 100 ? 99 : currentValue + 1) + ' %';
  });
  assert.notEqual(corruptedP22, p22Row, 'percentage mutation must change the roadmap');
  assert.throws(() => verifyRoadmapProgress(plan.replace(p22Row, corruptedP22)), /percentage differs/);
  assert.throws(() => verifyRoadmapProgress(plan.replace('- [x] one', '- [ ] one')), /completed count differs/);
  assert.throws(() => verifyRoadmapProgress(plan.replace('### P2.4 –', '### P2.3 –')), /detailed acceptance section/);
});

test('risk decision must remain distinguishable from technical security', () => {
  const plan = syntheticRoadmap();
  const withoutRisk=plan.replace('přijaté riziko – rozhodnutí','Technically secure').replace('Přijaté riziko – rozhodnutí.','Technically secure.');
  assert.throws(() => verifyRoadmapProgress(withoutRisk), /accepted risk/);
});

test('historic stage is independent of live roadmap wording and never rewrites it', () => {
  const stage = read('tools/development-version-17065.mjs');
  assert(stage.includes("read('RAK_PLAN_17065_STATUS.md')"));
  assert(!stage.includes("read('RAK_HANDOFF.md')"));
  assert(!stage.includes("write('RAK_HANDOFF.md'"));
  assert.equal([...read('RAK_PLAN_17065_STATUS.md').matchAll(/^\| (P[012]\.\d)(?:\s|\|)/gm)].length, 13);
});

test('audit inventories legacy dependencies for subsequent canonical-source migration', () => {
  const directory = new URL('./', import.meta.url);
  const references = fs.readdirSync(directory)
    .filter(name => /^(development-version-|release-gate-|rotation-release-gate-|two-pass-release-)/.test(name) && name.endsWith('.mjs'))
    .filter(name => fs.readFileSync(new URL(name, directory), 'utf8').includes("RAK_HANDOFF.md"));
  console.log('[P1.3] Historical modules still mentioning living roadmap: ' + (references.join(', ') || 'none'));
  assert(references.length < 100, 'roadmap dependency inventory unexpectedly large');
});
