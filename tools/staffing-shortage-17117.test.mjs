import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const generator = fs.readFileSync(new URL('../admin-rotation-generator.js', import.meta.url), 'utf8');
const rotation = fs.readFileSync(new URL('../admin-rotation.js', import.meta.url), 'utf8');

test('TPKW02 closes only for three absences in a ten-person roster', () => {
  const helper = generator.match(/function adminRotationGeneratorThreeAbsences\([\s\S]*?(?=function adminRotationGeneratorBuildDay\()/);
  assert(helper, 'generator staffing helpers missing');
  const result = vm.runInNewContext(helper[0] + `
    [
      adminRotationGeneratorThreeAbsences(Array(10).fill('p'), Array(7).fill('p')),
      adminRotationGeneratorThreeAbsences(Array(10).fill('p'), Array(6).fill('p')),
      adminRotationGeneratorThreeAbsences(Array(10).fill('p'), Array(8).fill('p')),
      adminRotationGeneratorHardTarget(Array(10).fill('p'), Array(7).fill('p')),
      adminRotationGeneratorHardTarget(Array(10).fill('p'), Array(8).fill('p'))
    ]
  `, { HARD_MACHINE_HEADERS: ['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'] });
  assert.deepEqual(Array.from(result), [true, false, false, 4, 5]);
});

test('generation and repair protect TPKW02 only under the three-absence rule', () => {
  const marker = "adminRotationGeneratorThreeAbsences(knownNames, available) && machineName === 'TPKW02'";
  assert.equal(generator.split(marker).length - 1, 2, 'day generation and repair must both protect TPKW02 for exactly three absences');
  assert(generator.includes("adminRotationGeneratorThreeAbsences(knownNames, available) && cycleMachine === 'TPKW02'"));
  assert(!generator.includes('adminRotationGeneratorTpkw02ClosedForStaffing'));
  assert(!generator.includes('missing === 4'));
});

test('validator keeps only the established three-absence layout', () => {
  assert(rotation.includes('absent.size !== 3'));
  assert(!rotation.includes('absent.size !== 4'));
  assert(rotation.includes("inspect(SOFT_MACHINE_HEADERS, softRow, ['MSKC03', 'MSKC04', 'MFKF10']);"));
  assert(rotation.includes('Při třech absencích: 4 TO (bez TPKW02), 3 MO (MSKC03, MSKC04, MFKF10).'));
  assert(!rotation.includes('Při čtyřech absencích'));
});
