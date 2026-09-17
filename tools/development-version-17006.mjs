#!/usr/bin/env node
// RaK 1.7.06: smart normalization of manual admin rotation/absence input.
// Accepts human-friendly dates/names/reasons and stores them in the existing canonical format.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.06';
const BUILD = 'v1.7.06-smartadmin1';
const CACHE = 'v1.7.06';
const MARKER = '// RAK_ADMIN_SMART_MANUAL_INPUT_17006';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17006] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}

const SMART_HELPERS = `${MARKER}
function adminRotationManualFold(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/\\s+/g, ' ');
}

function adminRotationManualNameDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  const prev = Array.from({ length: right.length + 1 }, (_, idx) => idx);
  const curr = new Array(right.length + 1);
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) prev[j] = curr[j];
  }
  return prev[right.length];
}

function adminRotationSmartManualName(value, knownNames) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const known = Array.isArray(knownNames) ? knownNames.filter(Boolean) : adminGetKnownNames();
  const canonical = typeof adminRotationCanonicalName === 'function' ? adminRotationCanonicalName(raw, known) : raw;
  if (known.includes(canonical)) return canonical;
  const key = adminRotationManualFold(raw).replace(/[^a-z0-9]/g, '');
  if (key.length < 5 || !known.length) return raw;
  const ranked = known.map((name) => ({
    name,
    distance: adminRotationManualNameDistance(key, adminRotationManualFold(name).replace(/[^a-z0-9]/g, ''))
  })).sort((a, b) => a.distance - b.distance || String(a.name).localeCompare(String(b.name), 'cs'));
  const best = ranked[0];
  const second = ranked[1];
  const maxDistance = key.length >= 8 ? 2 : 1;
  if (best && best.distance <= maxDistance && (!second || second.distance > best.distance)) return best.name;
  return raw;
}

function adminRotationSmartManualPeopleText(value, knownNames) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const names = adminSplitPeopleList(raw);
  if (!names.length) return adminRotationSmartManualName(raw, knownNames);
  return names.map((name) => adminRotationSmartManualName(name, knownNames)).filter(Boolean).join(', ');
}

function adminRotationSmartManualShift(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const direct = raw.match(/\\b(R8|N8|R|N)\\b/i);
  if (direct) return direct[1].toUpperCase();
  const folded = adminRotationManualFold(raw);
  if (/\\b(?:nocni|noc)\\s*8\\b/.test(folded)) return 'N8';
  if (/\\b(?:ranni|rano)\\s*8\\b/.test(folded)) return 'R8';
  if (/\\b(?:nocni|noc)\\b/.test(folded)) return 'N';
  if (/\\b(?:ranni|rano)\\b/.test(folded)) return 'R';
  return '';
}

function adminRotationSmartManualDate(value, month, fallbackDate) {
  const raw = String(value || '').trim().replace(/,+$/g, '').trim();
  if (!raw) return '';
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(raw) : null;
  let day = parsed && Number.isFinite(Number(parsed.day)) ? Number(parsed.day) : NaN;
  let monthNo = parsed && Number.isFinite(Number(parsed.month)) ? Number(parsed.month) : NaN;
  if (!Number.isFinite(day) || !Number.isFinite(monthNo)) {
    const match = raw.match(/(?:^|\\s)(\\d{1,2})\\s*[.\\/-]\\s*(\\d{1,2})(?:\\s*[.]|\\b)/);
    if (match) {
      day = Number(match[1]);
      monthNo = Number(match[2]);
    }
  }
  if (!Number.isFinite(day) || !Number.isFinite(monthNo) || day < 1 || day > 31 || monthNo < 1 || monthNo > 12) return raw;

  let shift = String((parsed && parsed.shift) || adminRotationSmartManualShift(raw) || '').trim().toUpperCase();
  const fallbackParsed = typeof parseDateToken === 'function' ? parseDateToken(String(fallbackDate || '')) : null;
  if (!shift && fallbackParsed && Number(fallbackParsed.day) === day && Number(fallbackParsed.month) === monthNo) {
    shift = String(fallbackParsed.shift || adminRotationSmartManualShift(fallbackDate) || '').trim().toUpperCase();
  }
  if (!shift && month && typeof adminRotationFindShiftForAbsenceDate === 'function') {
    shift = String(adminRotationFindShiftForAbsenceDate(month, String(day) + '.' + String(monthNo) + '.') || '').trim().toUpperCase();
  }
  if (!/^(?:R8|N8|R|N)$/.test(shift)) shift = '';
  return String(day) + '.' + String(monthNo) + '.' + (shift ? ' ' + shift : '');
}

function adminRotationSmartAbsenceCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const folded = adminRotationManualFold(raw);
  const compact = folded.replace(/[.\\s_-]+/g, '');
  if (compact === 'nv' || folded === 'nahradni volno') return 'NV';
  if (compact === 'd' || compact === 'dov' || folded === 'dovolena') return 'D';
  if (compact === 'n' || compact === 'pn' || folded === 'nemoc' || folded === 'neschopenka') return 'N';
  if (compact === '§' || folded === 'paragraf') return '§';
  if (compact === 'l' || folded === 'lazne') return 'Lázně';
  if (folded === 'skoleni') return 'Š';

  const token = raw.match(/^\\s*(n\\s*\\.?\\s*v\\.?|nv|d|n|§|l)\\s+(.+)$/i);
  if (token) {
    const headKey = adminRotationManualFold(token[1]).replace(/[.\\s]+/g, '');
    const suffix = String(token[2] || '').trim();
    const head = headKey === 'nv' ? 'NV' : (headKey === 'd' ? 'D' : (headKey === 'n' ? 'N' : (headKey === 'l' ? 'Lázně' : '§')));
    return head + (suffix ? ' ' + suffix : '');
  }
  return raw;
}
`;

function patchEditor(source) {
  if (!source.includes(MARKER)) {
    source = replaceOnce(
      source,
      'function adminRotationFindShiftForAbsenceDate(month, rawDate) {',
      SMART_HELPERS + '\nfunction adminRotationFindShiftForAbsenceDate(month, rawDate) {',
      'smart helper insertion'
    );

    source = replaceOnce(
      source,
`  const readSection = (section, machineCount) => {
    const rows = [];
    const seen = new Set();
    const knownNames = adminGetKnownNames();
    root.querySelectorAll('tr[data-rotation-section="' + section + '"]').forEach((tr) => {
      const date = String(tr.querySelector('[data-rot-field="date"]')?.value || '').trim();
      const cells = Array.from({ length: machineCount }, (_, i) => adminRotationCanonicalName(tr.querySelector('[data-rot-field="cell-' + i + '"]')?.value || '', knownNames));`,
`  const readSection = (section, machineCount) => {
    const rows = [];
    const seen = new Set();
    const knownNames = adminGetKnownNames();
    const fallbackRows = Array.isArray(fallback && fallback[section] && fallback[section].rows) ? fallback[section].rows : [];
    root.querySelectorAll('tr[data-rotation-section="' + section + '"]').forEach((tr, domIndex) => {
      const rawDate = String(tr.querySelector('[data-rot-field="date"]')?.value || '').trim();
      const sourceIndex = Number(tr.getAttribute('data-rotation-row-index'));
      const fallbackRow = fallbackRows[Number.isFinite(sourceIndex) ? sourceIndex : domIndex] || fallbackRows[domIndex] || null;
      const date = adminRotationSmartManualDate(rawDate, month, fallbackRow && fallbackRow.date ? fallbackRow.date : '');
      const cells = Array.from({ length: machineCount }, (_, i) => adminRotationSmartManualName(tr.querySelector('[data-rot-field="cell-' + i + '"]')?.value || '', knownNames));`,
      'smart rotation row normalization'
    );

    source = replaceOnce(
      source,
`    const date = get('date');
    const person = adminRotationCanonicalPeopleText(get('person'), knownNames);
    const code = get('code');
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(date) : null;`,
`    const rawDate = get('date');
    const sourceIndex = Number(tr.getAttribute('data-note-row-index'));
    const fallbackNotes = Array.isArray(fallback && fallback.notes) ? fallback.notes : [];
    const fallbackNote = fallbackNotes[Number.isFinite(sourceIndex) ? sourceIndex : -1] || null;
    const date = adminRotationSmartManualDate(rawDate, month, fallbackNote && fallbackNote.date ? fallbackNote.date : '');
    const person = adminRotationSmartManualPeopleText(get('person'), knownNames);
    const code = adminRotationSmartAbsenceCode(get('code'));
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(date) : null;`,
      'smart absence normalization'
    );
  }

  assert(source.includes(MARKER), 'smart admin marker missing');
  assert(source.includes('adminRotationSmartManualDate(rawDate, month'), 'smart date normalization missing');
  assert(source.includes('adminRotationSmartManualName(tr.querySelector'), 'smart rotation name normalization missing');
  assert(source.includes('adminRotationSmartManualPeopleText(get(\'person\')'), 'smart absence person normalization missing');
  assert(source.includes('adminRotationSmartAbsenceCode(get(\'code\'))'), 'smart absence code normalization missing');
  return source;
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
config = setLine(config, /^window\\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'display version');
config = setLine(config, /^window\\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'test version');
config = setLine(config, /^window\\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
write('supabase-config.js', config);

let app = read('app.js');
app = setLine(app, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
app = setLine(app, /^  window\\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app display');
write('app.js', app);

let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'user-confirmed update flow missing');
write('sw.js', sw);

let index = read('index.html');
assert(index.includes('RAK_DEV_17001_UPDATE_PROMPT_RESET'), 'iOS update unblock missing');
index = replaceOnce(index, "var build='v1.7.05-png5';", `var build='${BUILD}';`, 'first-boot update marker');
write('index.html', index);

write('admin-rotation-editor.js', patchEditor(read('admin-rotation-editor.js')));

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
assert(read('sw.js').includes(`const CACHE_VERSION = '${CACHE}';`), 'SW cache changed after release');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'update notice did not reset for new build');
for (const path of ['app.js', 'sw.js', 'supabase-config.js', 'app-pwa-connectivity.js', 'admin-rotation-editor.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/manual-entry-normalization-17006-smoke.mjs'], { stdio: 'pipe' });
execFileSync(process.execPath, ['tools/shift-report-image-170-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17006] OK 1.7.06: smart manual dates, shift inference, typo-safe names and absence code normalization; 1.7.05 PNG layout preserved');
