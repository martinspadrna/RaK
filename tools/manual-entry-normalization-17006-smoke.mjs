#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('admin-rotation-editor.js', 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[manual-entry-normalization-17006-smoke] ' + message); };
assert(source.includes('// RAK_ADMIN_SMART_MANUAL_INPUT_17006'), 'smart manual input marker missing');

function fold(value) {
  return String(value || '').trim().toLocaleLowerCase('cs-CZ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
function parseDateToken(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{1,2})\s*[.\/-]\s*(\d{1,2})/);
  if (!match) return null;
  const shiftMatch = raw.match(/\b(R8|N8|R|N)\b/i);
  return { day: Number(match[1]), month: Number(match[2]), shift: shiftMatch ? shiftMatch[1].toUpperCase() : '' };
}

const context = {
  window: {},
  console,
  parseDateToken,
  adminRotationCanonicalName(value, knownNames) {
    const key = fold(value);
    const matches = (knownNames || []).filter((name) => fold(name) === key);
    return matches.length === 1 ? matches[0] : String(value || '').trim();
  },
  setTimeout,
  clearTimeout
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'admin-rotation-editor.js' });

const known = ['Špadrna', 'Novotný', 'Střížek', 'Synek', 'Třasák', 'Blažek', 'Kříž', 'Kmínek', 'Pech', 'Starý'];
assert(context.adminRotationSmartManualName('spadna', known) === 'Špadrna', 'spadna must normalize to Špadrna');
assert(context.adminRotationSmartManualName('novotny', known) === 'Novotný', 'missing diacritics must normalize');
assert(context.adminRotationSmartManualName('Pavel', known) === 'Pavel', 'unknown name must stay untouched');
assert(context.adminRotationSmartManualPeopleText('spadna, novotny', known) === 'Špadrna, Novotný', 'multiple people normalization failed');
assert(context.adminRotationSmartAbsenceCode('nv') === 'NV', 'nv must normalize to NV');
assert(context.adminRotationSmartAbsenceCode('n.v.') === 'NV', 'n.v. must normalize to NV');
assert(context.adminRotationSmartAbsenceCode('náhradní volno') === 'NV', 'náhradní volno must normalize to NV');
assert(context.adminRotationSmartAbsenceCode('dovolená') === 'D', 'dovolená must normalize to D');
assert(context.adminRotationSmartAbsenceCode('vlastní') === 'vlastní', 'unknown reason must stay untouched');
assert(context.adminRotationSmartManualDate('30.9.', null, '30.9. N') === '30.9. N', 'fallback shift inference failed');
assert(context.adminRotationSmartManualDate('30/9 r', null, '') === '30.9. R', 'explicit R shift normalization failed');
context.adminRotationFindShiftForAbsenceDate = () => 'N';
assert(context.adminRotationSmartManualDate('30.9.', { hard: { rows: [] }, soft: { rows: [] } }, '') === '30.9. N', 'month shift inference failed');

console.log('[manual-entry-normalization-17006-smoke] OK 30.9. + spadna + nv => 30.9. N + Špadrna + NV; unknown values preserved');
