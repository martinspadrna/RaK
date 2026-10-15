import assert from 'node:assert/strict';
import fs from 'node:fs';

const generator = fs.readFileSync('admin-rotation-generator.js', 'utf8');
const rotation = fs.readFileSync('admin-rotation.js', 'utf8');
const readiness = fs.readFileSync('module-readiness.js', 'utf8');
const wizard = fs.readFileSync('admin-rotation-generator-wizard.js', 'utf8');

assert(generator.includes('function adminRotationGeneratorBalanceSoloMill(month, model, monthKey)'), 'expected current solo-mill generator signature changed; review monthKey hotfix');
assert(generator.includes('adminRotationGeneratorCanUseSoloMill(month, rowIdx, lowName, knownNames, monthKey)'), 'expected solo-mill monthKey use missing; review hotfix');
assert(rotation.includes("const soloMillBalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model, monthKey);"), 'first solo-mill balance call missing or no longer guarded for scoped reflow');
assert(rotation.includes("const soloMillRebalance = scopedGeneration ? scopedNoop() : adminRotationGeneratorBalanceSoloMill(month, model, monthKey);"), 'second solo-mill balance call missing or no longer guarded for scoped reflow');
assert((rotation.match(/adminRotationGeneratorBalanceSoloMill\(month, model, monthKey\)/g)||[]).length >= 3, 'normal month generator lost solo-mill balancing calls');
assert(readiness.includes('setupRakGeneratorMonthKeyHotfix'), 'runtime generator monthKey hotfix missing');
assert(readiness.includes('__rakGeneratorMonthKeyHotfixWrapped'), 'runtime generator monthKey wrapper marker missing');
assert(readiness.includes('adminGenerateRotationMonthDraftWithMonthKeyContext(monthKey, preparedMonth, generationOptions)'), 'generator wrapper must accept the third generation options argument');
assert(readiness.includes('return original(monthKey, preparedMonth, generationOptions);'), 'generator wrapper must forward scoped generation options unchanged');
assert(wizard.includes("if (action === 'generator-run')"), 'generator-run wizard action missing');
assert(wizard.includes('adminGenerateRotationMonthDraft(state.monthKey, preparedMonth, amend'), 'wizard must pass selected month into generator');

console.log('[generator-monthkey-hotfix-smoke] OK generator monthKey guard + wizard handoff present');
