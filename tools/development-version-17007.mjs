#!/usr/bin/env node
// RaK 1.7.07: connected active-worker roster + fair solo-mill generation + stronger glass rotation export.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISPLAY = '1.7.07';
const BUILD = 'v1.7.07-rosterreport1';
const CACHE = 'v1.7.07';
const CORE_MARKER = '// RAK_ACTIVE_ROSTER_SOURCE_17007';
const STATS_MARKER = '// RAK_STATS_ACTIVE_ROSTER_17007';
const GENERATOR_MARKER = '// RAK_GENERATOR_SOLO_MILL_STREAK_17007';
const EXPORT_MARKER = '// RAK_ROTATION_EXPORT_GLASS_17007';
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[development-version-17007] ' + message); };

function setLine(source, expression, target, label) {
  assert(expression.test(source), 'missing ' + label);
  return source.replace(expression, target);
}
function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  assert(source.includes(before), 'missing ' + label);
  return source.replace(before, after);
}
function replaceRegion(source, begin, end, replacement, label) {
  const start = source.indexOf(begin);
  const stop = source.indexOf(end, start + begin.length);
  assert(start !== -1 && stop > start, 'missing ' + label);
  assert(source.indexOf(begin, start + 1) === -1, 'duplicate ' + label);
  return source.slice(0, start) + replacement.trimEnd() + '\n\n' + source.slice(stop);
}

function patchCore(source) {
  if (!source.includes(CORE_MARKER)) {
    source = replaceOnce(source,
`function normalizeRakWorkerEntry(entry) {
  if (entry && typeof entry === 'string') {
    const name = entry.trim();
    return name ? { name, loginNumber: '', machines: [] } : null;
  }
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name) return null;
  const loginNumber = normalizeRakWorkerLoginNumber(entry.loginNumber || entry.login_number || '');
  const machinesRaw = Array.isArray(entry.machines) ? entry.machines.map((m) => String(m || '').trim().toUpperCase()) : [];
  const machines = RAK_WORKER_MACHINE_GROUPS.filter((group) => machinesRaw.includes(group));
  return { name, loginNumber, machines };
}`,
`${CORE_MARKER}
function rakWorkerRosterActiveValue17007(entry) {
  if (!entry || typeof entry !== 'object') return true;
  const hasActive = Object.prototype.hasOwnProperty.call(entry, 'active');
  const hasEnabled = Object.prototype.hasOwnProperty.call(entry, 'enabled');
  const hasIsActive = Object.prototype.hasOwnProperty.call(entry, 'isActive');
  if (!hasActive && !hasEnabled && !hasIsActive) return true;
  const raw = hasActive ? entry.active : (hasEnabled ? entry.enabled : entry.isActive);
  if (raw === false || raw === 0 || raw === '0') return false;
  return !/^(?:false|ne|no|off|inactive)$/i.test(String(raw || '').trim());
}

function normalizeRakWorkerEntry(entry) {
  if (entry && typeof entry === 'string') {
    const name = entry.trim();
    return name ? { name, loginNumber: '', machines: [], active: true } : null;
  }
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name) return null;
  const loginNumber = normalizeRakWorkerLoginNumber(entry.loginNumber || entry.login_number || '');
  const machinesRaw = Array.isArray(entry.machines) ? entry.machines.map((m) => String(m || '').trim().toUpperCase()) : [];
  const machines = RAK_WORKER_MACHINE_GROUPS.filter((group) => machinesRaw.includes(group));
  return { name, loginNumber, machines, active: rakWorkerRosterActiveValue17007(entry) };
}`,
      'active worker normalization');

    source = replaceOnce(source,
`function getRakWorkerRosterSettings() {
  const row = getRakWorkerRosterSettingsRow();
  if (!row) return { type: RAK_WORKER_ROSTER_SETTINGS_CATEGORY, custom: false, workers: Array.from(KNOWN_STAT_NAMES).map((name) => ({ name, loginNumber: '', machines: [] })) };
  return normalizeRakWorkerRosterSettings(rakWorkerRosterSettingsJson(row));
}`,
`function getRakWorkerRosterSettings() {
  const row = getRakWorkerRosterSettingsRow();
  if (!row) return { type: RAK_WORKER_ROSTER_SETTINGS_CATEGORY, custom: false, workers: Array.from(KNOWN_STAT_NAMES).map((name) => ({ name, loginNumber: '', machines: [], active: true })) };
  return normalizeRakWorkerRosterSettings(rakWorkerRosterSettingsJson(row));
}`,
      'active fallback roster');

    source = replaceOnce(source,
`function getActiveWorkerNames() {
  const settings = getRakWorkerRosterSettings();
  const names = Array.isArray(settings.workers) ? settings.workers.map((w) => w.name) : [];
  return new Set(names.length ? names : Array.from(KNOWN_STAT_NAMES));
}`,
`function getActiveWorkerNames() {
  const settings = getRakWorkerRosterSettings();
  const workers = Array.isArray(settings.workers) ? settings.workers : [];
  const names = workers.filter((worker) => worker && worker.active !== false).map((worker) => String(worker.name || '').trim()).filter(Boolean);
  if (settings && settings.custom) return new Set(names);
  return new Set(names.length ? names : Array.from(KNOWN_STAT_NAMES));
}`,
      'active worker names');
  }
  assert(source.includes(CORE_MARKER), 'core active-roster marker missing');
  assert(source.includes('worker.active !== false'), 'core active filter missing');
  assert(source.includes('active: rakWorkerRosterActiveValue17007(entry)'), 'active flag is not persisted by normalization');
  return source;
}

function patchBrusy(source) {
  if (!source.includes('// RAK_ROTATION_NAMES_ACTIVE_ROSTER_17007')) {
    source = replaceOnce(source,
`function buildNameIndex(rotation) {
  const map = new Map();
  const knownNames = getKnownStatNames();
  Object.entries(rotation.months || {}).forEach(([monthKey, month]) => {`,
`// RAK_ROTATION_NAMES_ACTIVE_ROSTER_17007
function buildNameIndex(rotation) {
  const map = new Map();
  const knownNames = getKnownStatNames();
  knownNames.forEach((name) => { if (name) map.set(name, []); });
  Object.entries(rotation.months || {}).forEach(([monthKey, month]) => {`,
      'active roster seed in rotation name index');
  }
  assert(source.includes('knownNames.forEach((name) => { if (name) map.set(name, []); });'), 'active names not seeded into rotation index');
  return source;
}

function patchStats(source) {
  if (!source.includes(STATS_MARKER)) {
    source = replaceOnce(source,
`  const nameIndex = buildNameIndex(app.rotation);
  const knownStatNames = getKnownStatNames();
  const annualWorkAbsenceTarget = getAnnualWorkAbsenceTarget(year);`,
`  const nameIndex = buildNameIndex(app.rotation);
  const knownStatNames = getKnownStatNames();
  ${STATS_MARKER}
  knownStatNames.forEach((name) => { if (name) ensurePerson(name); });
  const annualWorkAbsenceTarget = getAnnualWorkAbsenceTarget(year);`,
      'active roster stats seed');
  }
  assert(source.includes(STATS_MARKER), 'stats active-roster marker missing');
  assert(source.includes('knownStatNames.forEach((name) => { if (name) ensurePerson(name); });'), 'zero-count active workers missing from stats');
  return source;
}

function patchGenerator(source) {
  if (!source.includes(GENERATOR_MARKER)) {
    source = replaceOnce(source,
`function adminRotationGeneratorThreeAbsences(knownNames, available) {
  return Array.isArray(knownNames) && knownNames.length === 10 && Array.isArray(available) && available.length === 7;
}`,
`${GENERATOR_MARKER}
function adminRotationGeneratorPreviousSoloMillName(month, rowIdx, knownNames) {
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  if (mfkf06Idx < 0 || mfkf10Idx < 0) return '';
  for (let idx = Number(rowIdx || 0) - 1; idx >= 0; idx -= 1) {
    if (!adminRotationGeneratorIsWorkingRow(month, idx)) continue;
    const cells = Array.isArray(rows[idx] && rows[idx].cells) ? rows[idx].cells : [];
    const on06 = adminRotationCanonicalName(cells[mfkf06Idx], knownNames);
    const on10 = adminRotationCanonicalName(cells[mfkf10Idx], knownNames);
    return !on06 && on10 ? on10 : '';
  }
  return '';
}

function adminRotationGeneratorAvoidRepeatedSoloMillCandidates(month, rowIdx, machineName, candidates, knownNames) {
  const list = Array.from(new Set(Array.isArray(candidates) ? candidates : [])).filter(Boolean);
  if (String(machineName || '').toUpperCase() !== 'MFKF10') return list;
  const previousSolo = adminRotationGeneratorPreviousSoloMillName(month, rowIdx, knownNames);
  if (!previousSolo) return list;
  const alternatives = list.filter((name) => name !== previousSolo && adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'));
  return alternatives.length ? list.filter((name) => name !== previousSolo) : list;
}

function adminRotationGeneratorThreeAbsences(knownNames, available) {
  return Array.isArray(knownNames) && knownNames.length === 10 && Array.isArray(available) && available.length === 7;
}`,
      'solo mill streak helpers');

    source = replaceOnce(source,
`    const name = displacedToSoft.find((person) => available.includes(person) && !usedNames.has(person));
    if (name) assignSoftCell(idx, name, 'hard-displaced-to-mill');`,
`    const displacedCandidates = displacedToSoft.filter((person) => available.includes(person) && !usedNames.has(person));
    const safeDisplacedCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates(month, rowIdx, machineName, displacedCandidates, knownNames);
    const name = safeDisplacedCandidates[0] || '';
    if (name) assignSoftCell(idx, name, 'hard-displaced-to-mill');`,
      'displaced solo mill streak avoidance');

    source = replaceOnce(source,
`    const name = adminRotationGeneratorPickName(Array.from(new Set(preferred)), usedNames, counters, {
      sectionKey: 'soft',`,
`    const pickCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates(month, rowIdx, machineName, Array.from(new Set(preferred)), knownNames);
    const name = adminRotationGeneratorPickName(pickCandidates, usedNames, counters, {
      sectionKey: 'soft',`,
      'soft fill solo mill streak avoidance');
  }
  assert(source.includes(GENERATOR_MARKER), 'generator solo-mill marker missing');
  assert(source.includes('adminRotationGeneratorPreviousSoloMillName'), 'previous solo mill helper missing');
  assert(source.includes('const pickCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates'), 'soft assignment does not avoid repeated solo mill');
  assert(source.includes('const safeDisplacedCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates'), 'displaced worker path does not avoid repeated solo mill');
  return source;
}

function patchRotationExport(source) {
  if (!source.includes(EXPORT_MARKER)) {
    source = replaceOnce(source,
`const ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187 = Object.freeze(['Směn celkem', 'Ranní směny', 'Noční směny', 'Obsazenost']);
const ROTATION_EXPORT_GLASS_THEME_V193 = Object.freeze({`,
`const ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187 = Object.freeze(['Směn celkem', 'Ranní směny', 'Noční směny', 'Obsazenost']);
${EXPORT_MARKER}
const ROTATION_EXPORT_GLASS_THEME_V193 = Object.freeze({`,
      'rotation export marker');

    const replacements = [
      ["  titleBg: '#0b5bd3',", "  titleBg: '#0675ff',"],
      ["  titleBgAlt: '#172554',", "  titleBgAlt: '#102b72',"],
      ["  panelBgTop: 'rgba(255,255,255,.82)',", "  panelBgTop: 'rgba(255,255,255,.50)',"],
      ["  panelBgBottom: 'rgba(244,249,255,.58)',", "  panelBgBottom: 'rgba(238,247,255,.28)',"],
      ["  border: 'rgba(148,163,184,.34)',", "  border: 'rgba(67,121,196,.44)',"],
      ["  innerBorder: 'rgba(255,255,255,.74)',", "  innerBorder: 'rgba(255,255,255,.42)',"],
      ["  headerBgTop: 'rgba(255,255,255,.52)',", "  headerBgTop: 'rgba(255,255,255,.34)',"],
      ["  headerBgBottom: 'rgba(224,236,255,.72)',", "  headerBgBottom: 'rgba(184,216,255,.48)',"],
      ["  rowEvenTop: 'rgba(255,255,255,.62)',", "  rowEvenTop: 'rgba(255,255,255,.38)',"],
      ["  rowEvenBottom: 'rgba(247,250,255,.44)',", "  rowEvenBottom: 'rgba(241,248,255,.22)',"],
      ["  rowOddTop: 'rgba(239,246,255,.70)',", "  rowOddTop: 'rgba(210,230,255,.44)',"],
      ["  rowOddBottom: 'rgba(228,238,255,.52)',", "  rowOddBottom: 'rgba(194,220,255,.28)',"],
      ["  shadow: 'rgba(37, 99, 235, .15)',", "  shadow: 'rgba(18, 92, 220, .22)',"],
      ["  glossTop: 'rgba(255,255,255,.40)',", "  glossTop: 'rgba(255,255,255,.28)',"],
      ["  titleGlossTop: 'rgba(255,255,255,.28)',", "  titleGlossTop: 'rgba(255,255,255,.22)',"]
    ];
    replacements.forEach(([before, after]) => { source = replaceOnce(source, before, after, 'rotation glass theme ' + before); });

    source = replaceRegion(source,
      'function getRotationMonthExportAbsences(month) {',
      'function buildRotationExportAbsenceTable(absences, dateWeight, personWeight) {',
`function getRotationMonthExportAbsences(month) {
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  return getRotationMonthShiftAbsenceGroups(month)
    .flatMap((group) => {
      const rawItems = group.items && group.items.length ? group.items : [];
      const items = rawItems.filter((item) => {
        const person = String(item && item.person || '').trim();
        return !person || !activeNames || activeNames.has(person);
      });
      if (!items.length) return [];
      return items.map((item) => ({
        date: group.date,
        shift: group.shift,
        day: group.day,
        month: group.month,
        shiftOrder: group.shiftOrder,
        reason: String(item.reason || '').trim(),
        index: Number.isFinite(Number(item.index)) ? Number(item.index) : group.index,
        people: String(item.person || '').trim(),
        personIndex: Number.isFinite(Number(item.personIndex)) ? Number(item.personIndex) : 0,
        slotIndex: Number.isFinite(Number(item.slotIndex)) ? Number(item.slotIndex) : 0,
        isEmptyAbsenceDay: !!item.empty
      }));
    })
    .sort((a, b) => (a.month - b.month) || (a.day - b.day) || (a.shiftOrder - b.shiftOrder) || (a.slotIndex - b.slotIndex) || (a.index - b.index) || (a.personIndex - b.personIndex));
}`,
      'active absence export filter');

    source = replaceOnce(source,
`  const cellMeta = [];
  const rows = (Array.isArray(sec.rows) ? sec.rows : []).map(row => {`,
`  const cellMeta = [];
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  const rows = (Array.isArray(sec.rows) ? sec.rows : []).map(row => {`,
      'active export rows set');
    source = replaceOnce(source,
`      cells.push(String((row && row.cells ? row.cells[idx] : '') || ''));`,
`      const rawWorker = String((row && row.cells ? row.cells[idx] : '') || '').trim();
      cells.push(rawWorker && activeNames && !activeNames.has(rawWorker) ? '' : rawWorker);`,
      'inactive name hiding in report');

    source = replaceOnce(source,
`  const sections = ['hard', 'soft'];
  sections.forEach((sectionKey) => {`,
`  const sections = ['hard', 'soft'];
  const activeNames = typeof getKnownStatNames === 'function' ? getKnownStatNames() : null;
  sections.forEach((sectionKey) => {`,
      'active occupancy set');
    source = replaceOnce(source,
`        const worker = String(row && row.cells ? row.cells[idx] || '' : '').trim();
        if (worker) summary.occupiedSlots += 1;`,
`        const worker = String(row && row.cells ? row.cells[idx] || '' : '').trim();
        if (worker && (!activeNames || activeNames.has(worker))) summary.occupiedSlots += 1;`,
      'inactive occupancy filter');
    source = replaceOnce(source,
`    const weight = typeof estimateAbsenceWeight === 'function' ? estimateAbsenceWeight(normalized) : 1;
    const people = Array.isArray(normalized.people) ? normalized.people.filter(Boolean) : [];
    summary.absenceWeight += weight * Math.max(1, people.length || (normalized.person ? 1 : 0));
    summary.absencePeople += Math.max(1, people.length || (normalized.person ? 1 : 0));`,
`    const weight = typeof estimateAbsenceWeight === 'function' ? estimateAbsenceWeight(normalized) : 1;
    const people = (Array.isArray(normalized.people) ? normalized.people : [normalized.person])
      .map((name) => String(name || '').trim())
      .filter((name) => name && (!activeNames || activeNames.has(name)));
    if (!people.length) return;
    summary.absenceWeight += weight * people.length;
    summary.absencePeople += people.length;`,
      'inactive absence occupancy filter');

    const localThemeReplacements = [
      ["    titleBg: '#0b60db',", "    titleBg: '#0679ff',"],
      ["    titleBgAlt: '#1e3a8a',", "    titleBgAlt: '#113a93',"],
      ["    panelBgTop: 'rgba(255,255,255,.86)',", "    panelBgTop: 'rgba(255,255,255,.48)',"],
      ["    panelBgBottom: 'rgba(238,246,255,.70)',", "    panelBgBottom: 'rgba(224,240,255,.26)',"],
      ["    border: 'rgba(59,130,246,.34)',", "    border: 'rgba(26,108,232,.50)',"],
      ["    headerBgTop: 'rgba(230,240,255,.76)',", "    headerBgTop: 'rgba(210,232,255,.40)',"],
      ["    headerBgBottom: 'rgba(206,225,255,.84)',", "    headerBgBottom: 'rgba(171,211,255,.52)',"],
      ["    rowEvenTop: 'rgba(255,255,255,.74)',", "    rowEvenTop: 'rgba(255,255,255,.38)',"],
      ["    rowEvenBottom: 'rgba(236,244,255,.62)',", "    rowEvenBottom: 'rgba(226,240,255,.22)',"],
      ["    rowOddTop: 'rgba(229,239,255,.86)',", "    rowOddTop: 'rgba(196,224,255,.46)',"],
      ["    rowOddBottom: 'rgba(211,227,255,.74)',", "    rowOddBottom: 'rgba(177,211,255,.30)',"],
      ["    shadow: 'rgba(59,130,246,.20)',", "    shadow: 'rgba(24,104,230,.26)',"]
    ];
    localThemeReplacements.forEach(([before, after]) => { source = replaceOnce(source, before, after, 'local export theme ' + before); });

    const watermarkHelpers = `const ROTATION_EXPORT_WATERMARK_SRC_17007 = './assets/rak-login-crab.png';
let rotationExportWatermarkPromise17007 = null;

function loadRotationExportWatermark17007() {
  if (rotationExportWatermarkPromise17007) return rotationExportWatermarkPromise17007;
  rotationExportWatermarkPromise17007 = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = ROTATION_EXPORT_WATERMARK_SRC_17007;
  });
  return rotationExportWatermarkPromise17007;
}

function drawRotationExportWatermark17007(ctx, image, width, height) {
  if (!ctx || !image || !image.naturalWidth || !image.naturalHeight) return;
  const maxW = width * 0.48;
  const maxH = height * 0.76;
  const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  ctx.restore();
}

`;
    source = replaceOnce(source,
      'function createRotationMonthExportCanvas(monthKey) {',
      watermarkHelpers + 'function createRotationMonthExportCanvas(monthKey, watermarkImage) {',
      'rotation watermark loader');
    source = replaceOnce(source,
`  ctx.fillStyle = glowBottomLeft;
  ctx.fillRect(0, 0, width, height);

  const top = margin + topGap;`,
`  ctx.fillStyle = glowBottomLeft;
  ctx.fillRect(0, 0, width, height);

  drawRotationExportWatermark17007(ctx, watermarkImage, width, height);

  const top = margin + topGap;`,
      'rotation watermark draw');
    source = replaceOnce(source,
`function downloadSelectedRotationMonthImage() {`,
`async function downloadSelectedRotationMonthImage() {`,
      'async rotation report download');
    source = replaceOnce(source,
`    const canvas = createRotationMonthExportCanvas(monthKey);`,
`    const watermarkImage = await loadRotationExportWatermark17007();
    const canvas = createRotationMonthExportCanvas(monthKey, watermarkImage);`,
      'await rotation watermark');
  }

  assert(source.includes(EXPORT_MARKER), 'rotation export marker missing');
  assert(source.includes("ROTATION_EXPORT_WATERMARK_SRC_17007 = './assets/rak-login-crab.png'"), 'rotation crab watermark missing');
  assert(source.includes('ctx.globalAlpha = 0.17;'), 'rotation watermark opacity mismatch');
  assert(source.includes("panelBgTop: 'rgba(255,255,255,.50)'"), 'rotation glass not transparent enough');
  assert(source.includes('rawWorker && activeNames && !activeNames.has(rawWorker)'), 'inactive workers are not hidden from rotation export');
  assert(source.includes('if (!people.length) return;'), 'inactive absences are not excluded from summary');
  return source;
}

let config = read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
config = setLine(config, /^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'display version');
config = setLine(config, /^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`, 'test version');
config = setLine(config, /^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
write('supabase-config.js', config);

let appSource = read('app.js');
appSource = setLine(appSource, /^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m, `  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'app build');
appSource = setLine(appSource, /^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `  window.RAK_RELEASE_VERSION = "${DISPLAY}";`, 'app display');
write('app.js', appSource);

let sw = read('sw.js');
sw = setLine(sw, /^const CACHE_VERSION = '[^']+';$/m, `const CACHE_VERSION = '${CACHE}';`, 'SW cache');
sw = setLine(sw, /^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY}';`, 'SW display');
sw = setLine(sw, /^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'SW build');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"), 'technical SW version changed');
assert(sw.includes("data.type === 'SKIP_WAITING'"), 'user-confirmed update flow missing');
write('sw.js', sw);

let index = read('index.html');
if (!index.includes(`var build='${BUILD}';`)) {
  assert(index.includes("var build='v1.7.06-smartadmin1';"), 'previous 1.7.06 build marker missing');
  index = index.replace("var build='v1.7.06-smartadmin1';", `var build='${BUILD}';`);
}
write('index.html', index);

write('core.js', patchCore(read('core.js')));
write('brusy.js', patchBrusy(read('brusy.js')));
write('stats.js', patchStats(read('stats.js')));
write('admin-rotation-generator.js', patchGenerator(read('admin-rotation-generator.js')));
write('rotace.js', patchRotationExport(read('rotace.js')));

assert(JSON.parse(read('package.json')).version === '1.7.0', 'technical package version changed');
assert(read('supabase-config.js').includes(`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY}";`), 'release label changed');
assert(read('index.html').includes(`var build='${BUILD}';`), 'PWA build marker changed');
for (const path of ['core.js', 'brusy.js', 'stats.js', 'admin-rotation-generator.js', 'rotace.js', 'app.js', 'sw.js', 'supabase-config.js']) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}
execFileSync(process.execPath, ['tools/rotation-roster-report-17007-smoke.mjs'], { stdio: 'pipe' });
console.log('[development-version-17007] OK 1.7.07: active roster linked across rotation/stats/generator/report; consecutive solo mill avoided when alternative exists; stronger transparent rotation PNG + crab watermark');
