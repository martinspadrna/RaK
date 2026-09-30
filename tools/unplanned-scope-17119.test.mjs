import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const rotation = read('admin-rotation.js');
const wizard = read('admin-rotation-generator-wizard.js');

test('1.7.119 keeps exactly the five owner-approved unplanned reasons', () => {
  const start = wizard.indexOf('const ADMIN_UNPLANNED_REASON_OPTIONS');
  const end = wizard.indexOf('\nfunction adminRotationUnplannedReasonOption', start);
  assert(start >= 0 && end > start);
  const block = wizard.slice(start, end);
  const values = [...block.matchAll(/value: '([^']+)'/g)].map((m) => m[1]);
  const labels = [...block.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(values, ['D','NV','§','LEK','kalirnaOut']);
  assert.deepEqual(labels, ['Dovolená','Náhradní volno','Paragraf','Lékař','Odešel na kalírnu']);
});

test('unplanned absence and Kalírna allow intermediate full-month errors only before selected-day splice', () => {
  assert.equal((wizard.match(/allowScopedRuleErrors: true/g)||[]).length,2);
  assert(wizard.includes('scopedDateLabels: allowedDateLabels'));
  assert(wizard.includes('scopedDateLabels: fallbackDateLabels'));
  assert(wizard.includes('adminRotationUnplannedSpliceGeneratedDays(withAbsence, generated.normalized, allowedDateLabels)'));
  assert(wizard.includes('adminRotationUnplannedSpliceGeneratedDays(regenerated, generated.normalized, fallbackDateLabels)'));
  assert(wizard.includes('adminRotationUnplannedAssertIsolation(original, candidate, allowedDateLabels)'));
  assert(wizard.includes('adminRotationUnplannedAssertIsolation(sourceMonth, regenerated, allowedDateLabels)'));
  assert(wizard.includes("throw new Error('Částečný přepočet sáhl na jiný den: ' + date + '.')"));
  assert(rotation.includes('const allowScopedRuleErrors = generationOptions.allowScopedRuleErrors === true;'));
  assert(rotation.includes('if (criticalIssues.length && !allowScopedRuleErrors)'));
});

test('final candidate compares before and after with the same strict rules and rejects only newly introduced errors', () => {
  const absenceStart=wizard.indexOf('function adminRotationBuildUnplannedChangeCandidate(');
  const absenceEnd=wizard.indexOf('\nfunction adminRotationUnplannedFindAssignment(',absenceStart);
  const absence=wizard.slice(absenceStart,absenceEnd);
  const kalStart=wizard.indexOf('function adminRotationBuildUnplannedDayModCandidate(');
  const kalEnd=wizard.indexOf('\nfunction adminRotationUnplannedOperationId(',kalStart);
  const kal=wizard.slice(kalStart,kalEnd);
  for(const block of [absence,kal]){
    assert(block.includes("adminRotationValidateMonthRules("));
    assert.equal((block.match(/source: 'generator'/g)||[]).length,2);
    assert(!block.includes("source: 'manual-save'"));
    assert(block.includes('previousErrors'));
    assert(block.includes('newErrors'));
    assert(block.includes('adminRotationUnplannedIssueTouchesSelectedDate(issue, allowedDateLabels)'));
  }
});

test('validator treats historical kalirnaOut as unavailable, not as a missing available worker', () => {
  assert(rotation.includes('const absent = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);'));
  assert(!rotation.includes('const absent = new Set(noteNamesForDate(dateLabel)'));
});

test('iPhone unplanned popup is compact, safe-area bounded and scrolls only its body', () => {
  assert(wizard.includes('.adminUnplannedChangeOverlay{align-items:center!important'));
  assert(wizard.includes('height:auto!important'));
  assert(wizard.includes('max-height:calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'));
  assert(!wizard.includes('height:100%!important;max-height:none!important'));
  assert(wizard.includes('.adminUnplannedChangeBody{min-height:0!important;overflow:auto!important'));
  assert(wizard.includes('Přepočítá se jen vybraný den nebo rozsah. Ostatní dny zůstanou beze změny.'));
});
