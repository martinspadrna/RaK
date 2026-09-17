#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[rotation-roster-report-17007-smoke] ' + message); };

const core = read('core.js');
const brusy = read('brusy.js');
const stats = read('stats.js');
const generator = read('admin-rotation-generator.js');
const rotace = read('rotace.js');
const config = read('supabase-config.js');
const index = read('index.html');

assert(core.includes('// RAK_ACTIVE_ROSTER_SOURCE_17007'), 'active roster source marker missing');
assert(core.includes('active: rakWorkerRosterActiveValue17007(entry)'), 'worker active flag is not persisted');
assert(core.includes('.filter((worker) => worker && worker.active !== false)'), 'active roster filtering missing');
assert(brusy.includes('// RAK_ROTATION_NAMES_ACTIVE_ROSTER_17007'), 'rotation active roster marker missing');
assert(brusy.includes('knownNames.forEach((name) => { if (name) map.set(name, []); });'), 'new active workers are not visible in rotation name index');
assert(stats.includes('// RAK_STATS_ACTIVE_ROSTER_17007'), 'stats active roster marker missing');
assert(stats.includes('knownStatNames.forEach((name) => { if (name) ensurePerson(name); });'), 'new active workers do not receive zero-count stats rows');

assert(generator.includes('// RAK_GENERATOR_SOLO_MILL_STREAK_17007'), 'solo mill streak marker missing');
assert(generator.includes('function adminRotationGeneratorPreviousSoloMillName'), 'previous solo mill helper missing');
assert(generator.includes('return alternatives.length ? list.filter((name) => name !== previousSolo) : list;'), 'generator does not prefer a different solo mill worker');
assert(generator.includes('const pickCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates'), 'main soft assignment does not use solo-mill streak guard');
assert(generator.includes('const safeDisplacedCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates'), 'displaced worker path does not use solo-mill streak guard');

const avoidRepeat = (previousSolo, candidates, qualified) => {
  const list = Array.from(new Set(candidates));
  const alternatives = list.filter((name) => name !== previousSolo && qualified.has(name));
  return alternatives.length ? list.filter((name) => name !== previousSolo) : list;
};
const allQualified = new Set(['Synek', 'Třasák', 'Střížek']);
const next = avoidRepeat('Synek', ['Synek', 'Třasák', 'Střížek'], allQualified);
assert(!next.includes('Synek') && next.includes('Třasák') && next.includes('Střížek'), 'Synek repeat should be removed when alternatives exist');
const onlySynek = avoidRepeat('Synek', ['Synek'], new Set(['Synek']));
assert(onlySynek.length === 1 && onlySynek[0] === 'Synek', 'coverage fallback must remain when no alternative exists');

assert(rotace.includes('// RAK_ROTATION_EXPORT_GLASS_17007'), 'rotation export glass marker missing');
assert(rotace.includes("ROTATION_EXPORT_WATERMARK_SRC_17007 = './assets/rak-login-crab.png'"), 'original crab watermark missing from rotation export');
assert(rotace.includes('ctx.globalAlpha = 0.17;'), 'rotation watermark is not stronger');
assert(rotace.includes("panelBgTop: 'rgba(255,255,255,.50)'"), 'rotation report panels not transparent enough');
assert(rotace.includes("titleBg: '#0675ff'"), 'rotation report title color not strengthened');
assert(rotace.includes('rawWorker && activeNames && !activeNames.has(rawWorker)'), 'inactive roster member is still visible in hard/soft report table');
assert(rotace.includes('rawItems.filter((item) =>'), 'absence export is not roster filtered');
assert(rotace.includes('if (!people.length) return;'), 'inactive absence still affects report summary');
assert(rotace.includes('const watermarkImage = await loadRotationExportWatermark17007();'), 'PNG export does not wait for watermark');

assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co'), 'test Supabase changed');
assert(!config.includes('bkqamcbkiwumsvelahxr'), 'production Supabase leaked');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.7.07";'), 'display version is not 1.7.07');
assert(config.includes('window.RAK_PWA_BUILD = "v1.7.07-rosterreport1";'), 'PWA build is not 1.7.07 roster report build');
assert(index.includes("var build='v1.7.07-rosterreport1';"), 'index update marker is not 1.7.07');

console.log('[rotation-roster-report-17007-smoke] OK active/inactive worker linkage, new active worker visibility, solo-mill streak guard, transparent vivid rotation PNG and stronger crab watermark');
