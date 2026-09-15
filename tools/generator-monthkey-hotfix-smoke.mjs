import assert from 'node:assert/strict';
import fs from 'node:fs';

const generator = fs.readFileSync('admin-rotation-generator.js', 'utf8');
const rotation = fs.readFileSync('admin-rotation.js', 'utf8');
const readiness = fs.readFileSync('module-readiness.js', 'utf8');
const wizard = fs.readFileSync('admin-rotation-generator-wizard.js', 'utf8');

assert(generator.includes('function adminRotationGeneratorBalanceSoloMill(month, model)'), 'expected current solo-mill generator signature changed; review monthKey hotfix');
assert(generator.includes('adminRotationGeneratorCanUseSoloMill(month, rowIdx, lowName, knownNames, monthKey)'), 'expected solo-mill monthKey use missing; review hotfix');
assert(rotation.includes('const soloMillBalance = adminRotationGeneratorBalanceSoloMill(month, model);'), 'first solo-mill balance call missing');
assert(rotation.includes('const soloMillRebalance = adminRotationGeneratorBalanceSoloMill(month, model);'), 'second solo-mill balance call missing');
assert(readiness.includes('setupRakGeneratorMonthKeyHotfix'), 'runtime generator monthKey hotfix missing');
assert(readiness.includes('__rakGeneratorMonthKeyHotfixWrapped'), 'runtime generator monthKey wrapper marker missing');
assert(wizard.includes("if (action === 'generator-run')"), 'generator-run wizard action missing');
assert(wizard.includes('adminGenerateRotationMonthDraft(state.monthKey, preparedMonth)'), 'wizard must pass selected month into generator');

console.log('[generator-monthkey-hotfix-smoke] OK generator monthKey guard + wizard handoff present');
