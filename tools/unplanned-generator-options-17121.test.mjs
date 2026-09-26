import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const readiness=read('module-readiness.js');
const wizard=read('admin-rotation-generator-wizard.js');
const rotation=read('admin-rotation.js');

test('legacy monthKey wrapper forwards scoped generator options instead of dropping argument three',()=>{
  assert(readiness.includes('adminGenerateRotationMonthDraftWithMonthKeyContext(monthKey, preparedMonth, generationOptions)'));
  assert(readiness.includes('return original(monthKey, preparedMonth, generationOptions);'));
  assert(!readiness.includes('return original(monthKey, preparedMonth);'));
});

test('both unplanned paths pass scoped options all the way to the generator',()=>{
  assert.equal((wizard.match(/scopedDateLabels: allowedDateLabels/g)||[]).length,2);
  assert.equal((wizard.match(/allowScopedRuleErrors: true/g)||[]).length,2);
  assert(rotation.includes('const scopedGeneration = scopedDateLabels.length > 0;'));
  assert(rotation.includes('const scopedDateLabels = Array.isArray(generationOptions.scopedDateLabels)'));
});

test('scoped generation still skips month-wide repair passes after the wrapper',()=>{
  assert(rotation.includes("const soloMillBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model);"));
  assert(rotation.includes('const finalSoloMillStreakRepair = scopedGeneration ? scopedNoop()'));
  assert(rotation.includes('const finalTpkw02Balance = scopedGeneration ? scopedNoop()'));
});
