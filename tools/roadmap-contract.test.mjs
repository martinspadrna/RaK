import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RAK_ROADMAP_IDS,verifyRoadmapSummary,verifyRoadmapProgress} from './roadmap-contract.mjs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const current = () => read('RAK_PLAN_13.md');

test('living roadmap has thirteen detailed tasks and truthful percentages', () => {
  const progress = verifyRoadmapProgress(current());
  assert.deepEqual(progress.map(item => item.id), RAK_ROADMAP_IDS);
  assert.equal(progress.length, 13);
  for (const item of progress) assert(item.total >= item.completed);
});

test('taxonomy catches missing, duplicate or reordered tasks without depending on prose', () => {
  const plan = current();
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P2\.4 \|.*$/m, '')), /thirteen unique/);
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P2\.4 \|.*$/m, '| P2.3 | duplicated |')), /thirteen unique/);
  assert.throws(() => verifyRoadmapSummary(plan.replace(/^\| P0\.1 \|.*\n\| P0\.2 \|.*$/m, match => match.split('\n').reverse().join('\n'))), /thirteen unique/);
});

test('progress catches incorrect percentage and silently flipped checkboxes', () => {
  const plan = current();
  const p22Row = plan.match(/^\| P2\.2 \|.*$/m)?.[0];
  assert(p22Row, 'P2.2 summary row missing');
  const corruptedP22 = p22Row.replace(/\*\*(\d+) %/, (_, value) => {
    const currentValue = Number(value);
    return '**' + (currentValue === 100 ? 99 : currentValue + 1) + ' %';
  });
  assert.notEqual(corruptedP22, p22Row, 'percentage mutation must change the roadmap');
  assert.throws(() => verifyRoadmapProgress(plan.replace(p22Row, corruptedP22)), /percentage differs/);
  assert.throws(() => verifyRoadmapProgress(plan.replace('- [x] Zabránit anonymnímu', '- [ ] Zabránit anonymnímu')), /completed count differs/);
  assert.throws(() => verifyRoadmapProgress(plan.replace('### P2.4 –', '### P2.3 –')), /detailed acceptance section/);
});

test('risk decision must remain distinguishable from technical security', () => {
  const plan = current();
  assert.throws(() => verifyRoadmapProgress(plan.replace(/(\| P0\.2 \|[^\n]*\| \*\*100 % \(5\/5\)\*\* \|)[^\n]*/, '$1 Technically secure |')), /accepted risk/);
});

test('historic stage is independent of live roadmap wording and never rewrites it', () => {
  const stage = read('tools/development-version-17065.mjs');
  assert(stage.includes("read('RAK_PLAN_17065_STATUS.md')"));
  assert(!stage.includes("read('RAK_PLAN_13.md')"));
  assert(!stage.includes("write('RAK_PLAN_13.md'"));
  assert.equal([...read('RAK_PLAN_17065_STATUS.md').matchAll(/^\| (P[012]\.\d)(?:\s|\|)/gm)].length, 13);
});

test('audit inventories legacy dependencies for subsequent canonical-source migration', () => {
  const directory = new URL('./', import.meta.url);
  const references = fs.readdirSync(directory)
    .filter(name => /^(development-version-|release-gate-|rotation-release-gate-|two-pass-release-)/.test(name) && name.endsWith('.mjs'))
    .filter(name => fs.readFileSync(new URL(name, directory), 'utf8').includes("RAK_PLAN_13.md"));
  console.log('[P1.3] Historical modules still mentioning living roadmap: ' + (references.join(', ') || 'none'));
  assert(references.length < 100, 'roadmap dependency inventory unexpectedly large');
});
