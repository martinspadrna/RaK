import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const core = fs.readFileSync(new URL('../core.js', import.meta.url), 'utf8');
const rotation = fs.readFileSync(new URL('../rotace.js', import.meta.url), 'utf8');
const metadata = fs.readFileSync(new URL('../rak-release-metadata.js', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert(from >= 0 && to > from, 'runtime function block is missing');
  return source.slice(from, to);
}

function fixture() {
  let explicitSpecialDay = null;
  const workDate = new Date(2026, 9, 24, 12, 0, 0, 0);
  const context = vm.createContext({
    Date,
    console,
    app: { rotation: { months: {} } },
    getRakSpecialDayInfo: () => explicitSpecialDay,
    getMovableHolidayInfo: () => null,
    getVacationPeriodForDate: () => null,
    dateKeyMD: (date) => String(date.getMonth() + 1) + '-' + String(date.getDate()),
    parseDateToken: (value) => {
      const match = String(value || '').match(/^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/);
      return match ? { day: Number(match[1]), month: Number(match[2]), shift: match[3] } : null;
    },
    normalizeShiftText: (value) => String(value || '').trim(),
    getPragueNow: () => new Date(2026, 9, 15, 6, 0, 0, 0),
    getSpecialSundayNightStartHour: () => 22,
    getSoftMachineDisplayLabel: (entry) => String(entry && entry.machine || ''),
    buildNameIndex: () => ({
      Pech: [{
        sortDate: workDate.toISOString(),
        dateLabel: '24.10. R',
        date: '24.10. R',
        shift: 'R',
        section: 'hard',
        machine: 'TPKW02',
        monthKey: '10/26'
      }]
    })
  });
  vm.runInContext(
    between(core, 'function getSpecialWorkInfo(now)', 'const DEFAULT_VACATION_COUNTDOWN_PERIODS')
      + '\n'
      + between(rotation, 'function getPersonScheduleEntryWindow(entry)', 'function buildPersonScheduleModalNodes'),
    context
  );
  return {
    context,
    setExplicitSpecialDay(value) { explicitSpecialDay = value; }
  };
}

test('24 and 25 October are not recurring CZD days', () => {
  const { context } = fixture();
  assert.equal(context.getSpecialWorkInfo(new Date(2026, 9, 24, 12)), null);
  assert.equal(context.getSpecialWorkInfo(new Date(2026, 9, 25, 12)), null);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getSpecialWorkInfo(new Date(2026, 9, 28, 12)))),
    { type: 'holiday', label: 'Vznik ČSR' }
  );
});

test('2.0.22 identity and regression gate are wired into the full check', () => {
  assert.equal(packageJson.version, '2.0.22');
  assert(metadata.includes("displayVersion: '2.0.22'"));
  assert(packageJson.scripts.check.includes('tools/person-schedule-inventory-219.test.mjs'));
});

test('a saved 24 October assignment remains visible after tapping a name', () => {
  const { context } = fixture();
  const model = context.getPersonScheduleEntries('Pech');
  assert.equal(model.entries.length, 1);
  assert.equal(model.entries[0].dateLabel, '24.10. R');
  assert.equal(model.entries[0].target, 'TPKW02');
});

test('an explicitly configured shutdown can still hide the day', () => {
  const { context, setExplicitSpecialDay } = fixture();
  setExplicitSpecialDay({ type: 'shutdown', label: 'Odstávka' });
  assert.equal(context.getPersonScheduleEntries('Pech').entries.length, 0);
});
