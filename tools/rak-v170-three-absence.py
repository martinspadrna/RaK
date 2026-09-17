#!/usr/bin/env python3
"""Persist three-absence validation and accurate generated shift count in RaK 1.7."""
from pathlib import Path

path = Path('admin-rotation.js')
source = path.read_text(encoding='utf-8')

def replace_once(before, after, label):
    global source
    if source.count(before) != 1:
        raise RuntimeError(f'[three-absence] {label}: expected one anchor, found {source.count(before)}')
    source = source.replace(before, after, 1)

helper = '''// Pro tri absence je rezervovana jedna pozice na frezkach. Validujeme cely den,
// ne jen celkovy pocet lidi: prazdne TPKW02, MSKC01 a MFKF06 jsou zamerne.
function adminRotationThreeAbsenceStaffingIssues(hardRow, softRow, knownNames, absent) {
  if (!Array.isArray(knownNames) || knownNames.length !== 10 || !absent || absent.size !== 3) return [];
  const issues = [];
  const inspect = (headers, row, required) => {
    (Array.isArray(headers) ? headers : []).forEach((machine, idx) => {
      const shouldBeOccupied = required.includes(machine);
      const cell = row && Array.isArray(row.cells) ? row.cells[idx] : '';
      const occupied = shouldBeOccupied
        ? adminRotationIsRealName(cell, knownNames)
        : !!String(cell || '').trim();
      if (occupied !== shouldBeOccupied) issues.push({ machine, shouldBeOccupied });
    });
  };
  inspect(HARD_MACHINE_HEADERS, hardRow, ['TNKS01', 'TBKR07', 'TPKW01', 'TBKR01']);
  inspect(SOFT_MACHINE_HEADERS, softRow, ['MSKC03', 'MSKC04', 'MFKF10']);
  return issues;
}

'''
replace_once('// Obsazení poslední skutečné pracovní směny před cílovým měsícem.', helper + '// Obsazení poslední skutečné pracovní směny před cílovým měsícem.', 'validator helper')
anchor = "      const unused = knownNames.filter((name) => !absent.has(name) && !assigned.has(name));"
insert = """      adminRotationThreeAbsenceStaffingIssues(hardRow, softRow, knownNames, absent).forEach((issue) => {
        addIssue('error', 'three-absence-staffing', String(dateLabel) + ': ' + issue.machine
          + (issue.shouldBeOccupied ? ' musí být obsazená.' : ' musí zůstat neobsazená.'),
          'Při třech absencích: 4 TO (bez TPKW02), 3 MO (MSKC03, MSKC04, MFKF10).');
      });
""" + anchor
replace_once(anchor, insert, 'validator per-day enforcement')
replace_once('  const normalized = normalizeMonthForImport(month, fallback);', '''  // Po opravach a prohozech vrat skutecny pocet obsazenych bunek, ne puvodni odhad.
  const finalFilledCells = hardRows.concat(softRows).reduce((count, row) => count +
    (Array.isArray(row && row.cells) ? row.cells : []).filter((name) => adminRotationIsRealName(name, model.knownNames)).length, 0);
  const normalized = normalizeMonthForImport(month, fallback);''', 'final count')
replace_once('    filledCells,\n    historyTemplates: model.dayTemplates.length,', '    filledCells: finalFilledCells,\n    historyTemplates: model.dayTemplates.length,', 'final count in stats')
path.write_text(source, encoding='utf-8')
runner = Path('tools/shift-report-mo-hotfix-170-smoke.mjs')
text = runner.read_text(encoding='utf-8')
anchor = "await import('./generator-staffing-170-smoke.mjs');"
if text.count(anchor) != 1 or 'rak-v170-three-absence-regression.mjs' in text:
    raise RuntimeError('[three-absence] final smoke runner unexpected structure')
runner.write_text(text.replace(anchor, anchor + "\nawait import('./rak-v170-three-absence-regression.mjs');", 1), encoding='utf-8')
print('[three-absence] OK explicit validator, final stats, permanent regression runner; version unchanged')
finalizer = Path('tools/generator-finalize-170.mjs')
final_source = finalizer.read_text(encoding='utf-8')
if final_source.count("const BUILD = '1.7.0-release8';") != 1:
    raise RuntimeError('[three-absence] unexpected finalizer build marker')
finalizer.write_text(final_source.replace("const BUILD = '1.7.0-release8';", "const BUILD = '1.7.0-release9';", 1), encoding='utf-8')
smoke = Path('tools/generator-staffing-170-smoke.mjs')
smoke_source = smoke.read_text(encoding='utf-8')
if smoke_source.count('1.7.0-release8') != 2:
    raise RuntimeError('[three-absence] unexpected smoke build markers')
smoke.write_text(smoke_source.replace('1.7.0-release8', '1.7.0-release9'), encoding='utf-8')
print('[three-absence] OK internal release9 build marker; public version unchanged')
