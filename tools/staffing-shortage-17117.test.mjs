import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const generator = fs.readFileSync(new URL('../admin-rotation-generator.js', import.meta.url), 'utf8');
const rotation = fs.readFileSync(new URL('../admin-rotation.js', import.meta.url), 'utf8');

test('TPKW02 closes for both three and four absences in a ten-person roster', () => {
  const helper = generator.match(/function adminRotationGeneratorThreeAbsences\([\s\S]*?(?=function adminRotationGeneratorBuildDay\()/);
  assert(helper, 'generator staffing helpers missing');
  const result = vm.runInNewContext(helper[0] + `
    [
      adminRotationGeneratorTpkw02ClosedForStaffing(Array(10).fill('p'), Array(7).fill('p')),
      adminRotationGeneratorTpkw02ClosedForStaffing(Array(10).fill('p'), Array(6).fill('p')),
      adminRotationGeneratorTpkw02ClosedForStaffing(Array(10).fill('p'), Array(8).fill('p')),
      adminRotationGeneratorHardTarget(Array(10).fill('p'), Array(7).fill('p')),
      adminRotationGeneratorHardTarget(Array(10).fill('p'), Array(6).fill('p')),
      adminRotationGeneratorHardTarget(Array(10).fill('p'), Array(8).fill('p'))
    ]
  `, { HARD_MACHINE_HEADERS: ['TNKS01','TBKR07','TPKW01','TPKW02','TBKR01'] });
  assert.deepEqual(Array.from(result), [true, true, false, 4, 4, 5]);
});

test('generation and repair both protect TPKW02 under the shortage rule', () => {
  const marker = "adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && machineName === 'TPKW02'";
  assert.equal(generator.split(marker).length - 1, 2, 'day generation and repair must both protect TPKW02');
  assert(generator.includes("adminRotationGeneratorTpkw02ClosedForStaffing(knownNames, available) && cycleMachine === 'TPKW02'"));
});

test('validator keeps the known 3-absence layout and adds the 4-absence layout', () => {
  assert(rotation.includes('(absent.size !== 3 && absent.size !== 4)'));
  assert(rotation.includes("absent.size === 3 ? ['MSKC03', 'MSKC04', 'MFKF10'] : ['MSKC03', 'MFKF10']"));
  assert(rotation.includes('Při třech absencích: 4 TO (bez TPKW02), 3 MO (MSKC03, MSKC04, MFKF10).'));
  assert(rotation.includes('Při čtyřech absencích: 4 TO (bez TPKW02), 2 MO (MSKC03, MFKF10).'));
});
