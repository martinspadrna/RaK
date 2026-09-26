// RaK – generátor administrace rozpisů oddělený z admin-rotation.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-generator.js', 'loading', { source: 'dynamic-loader' }); } catch (err) {}


const ADMIN_ROTATION_GENERATOR_SETTINGS_CATEGORY = 'rotation_generator_settings';

const ADMIN_ROTATION_GENERATOR_SETTINGS_KEY = 'ROTATION_GENERATOR_SETTINGS';

function adminIsRotationGeneratorSettingsRow(row) {
  const settings = adminRotationSettingsJson(row);
  return String(row && row.category || '').trim() === ADMIN_ROTATION_GENERATOR_SETTINGS_CATEGORY
    || String(row && row.machine_key || '').trim() === ADMIN_ROTATION_GENERATOR_SETTINGS_KEY
    || String(settings && settings.stored_category || '').trim() === ADMIN_ROTATION_GENERATOR_SETTINGS_CATEGORY
    || String(settings && settings.admin_settings_key || '').trim() === ADMIN_ROTATION_GENERATOR_SETTINGS_KEY;
}

function adminRotationGeneratorBooleanValue(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return !!fallback;
  if (['false', '0', 'ne', 'no', 'off', 'vypnuto'].includes(text)) return false;
  if (['true', '1', 'ano', 'yes', 'on', 'zapnuto'].includes(text)) return true;
  return !!fallback;
}

function getAdminRotationGeneratorSettings() {
  const rows = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  const row = rows.find(adminIsRotationGeneratorSettingsRow);
  return adminRotationNormalizeGeneratorSettings(row ? adminRotationSettingsJson(row) : null);
}

function getAdminRotationGeneratorRules() {
  const base = RAK_ROTATION_GENERATOR_RULES_V1107 || {};
  const settings = getAdminRotationGeneratorSettings();
  return Object.assign({}, base, {
    softPreferred: settings.softPreferred,
    hardPreferred: settings.hardPreferred,
    softHardCycle: settings.softHardCycle,
    softHardBlockLength: settings.softHardBlockLength,
    softCore: settings.softCore,
    softBaseLathe: settings.softBaseLathe,
    softCoreNoTnksBalance: settings.softCore,
    hardCycle: settings.hardCycle,
    avoidLatheWhenTwoLathesOneMillEnabled: settings.avoidLatheWhenTwoLathesOneMillEnabled,
    avoidLatheWhenTwoLathesOneMillNames: settings.avoidLatheWhenTwoLathesOneMillNames,
    soloMillBalanceEnabled: settings.soloMillBalanceEnabled,
    soloMillMaxSpread: settings.soloMillMaxSpread,
    softTotalBalanceEnabled: settings.softTotalBalanceEnabled,
    softTotalBalanceNames: settings.softTotalBalanceNames,
    softTotalMaxSpread: settings.softTotalMaxSpread,
    hardPeopleSoftKindBalanceEnabled: settings.hardPeopleSoftKindBalanceEnabled,
    hardPeopleSoftKindBalanceNames: settings.hardPeopleSoftKindBalanceNames,
    hardPeopleSoftKindMaxSpread: settings.hardPeopleSoftKindMaxSpread,
    softKindGlobalBalanceEnabled: settings.softKindGlobalBalanceEnabled,
    softKindMixedMinimumShifts: settings.softKindMixedMinimumShifts
  });
}

function makeAdminRotationGeneratorSettingsRow(settings) {
  const safe = adminRotationNormalizeGeneratorSettings(settings);
  return {
    machine_key: ADMIN_ROTATION_GENERATOR_SETTINGS_KEY,
    machine_code: 'ROTATION',
    machine_index: 'generator',
    label: 'Pravidla generátoru rozpisu',
    category: ADMIN_ROTATION_GENERATOR_SETTINGS_CATEGORY,
    cycle_time: '',
    speed: '',
    dress_time: '',
    dress_count: '',
    settings_json: Object.assign({ machine: 'ROTATION', index: 'generator' }, safe)
  };
}

function mergeAdminRotationGeneratorSettingsRows(settings) {
  const base = Array.isArray(app.machineSettingsRows) ? app.machineSettingsRows : [];
  const rows = base.filter((row) => !adminIsRotationGeneratorSettingsRow(row));
  rows.push(makeAdminRotationGeneratorSettingsRow(settings));
  return rows;
}

function adminRotationGeneratorListValue(list) {
  return adminRotationSplitGeneratorList(list).join('\n');
}

function adminRotationGeneratorRuleCardHtml(title, value, detail) {
  return [
    '<div class="adminGeneratorRuleCard">',
    '  <span>' + escapeHtml(title || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function adminRotationGeneratorStatusItemHtml(label, value, detail, modifier) {
  const className = 'adminGeneratorSettingsStatusItem' + (modifier ? ' ' + modifier : '');
  return [
    '<div class="' + className + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function adminRotationGeneratorImpactItemHtml(label, value, detail, modifier) {
  const className = 'adminGeneratorImpactItem' + (modifier ? ' ' + modifier : '');
  return [
    '<div class="' + className + '">',
    '  <span>' + escapeHtml(label || '') + '</span>',
    '  <b>' + escapeHtml(value || '') + '</b>',
    detail ? '  <small>' + escapeHtml(detail) + '</small>' : '',
    '</div>'
  ].join('');
}

function adminRotationGeneratorRawList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\n,;]/);
  return source.map((item) => String(item || '').trim()).filter(Boolean);
}

function adminRotationGeneratorDuplicateList(list) {
  const seen = new Set();
  const duplicates = new Set();
  adminRotationGeneratorRawList(list).forEach((item) => {
    const key = String(item || '').trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) duplicates.add(String(item || '').trim());
    seen.add(key);
  });
  return Array.from(duplicates);
}

function readAdminRotationGeneratorDraftFromDom(root) {
  const scope = root && root.querySelector ? root : document;
  const get = (id) => String((scope.querySelector ? scope.querySelector('#' + id) : document.getElementById(id))?.value || '');
  const softBaseLathe = {};
  const softBaseRows = [];
  scope.querySelectorAll('tr[data-generator-base-row]').forEach((tr) => {
    const person = String(tr.querySelector('[data-generator-base-field="person"]')?.value || '').trim();
    const machine = String(tr.querySelector('[data-generator-base-field="machine"]')?.value || '').trim().toUpperCase();
    if (person || machine) softBaseRows.push({ person, machine });
    if (person && machine) softBaseLathe[person] = machine;
  });
  return {
    softPreferred: adminRotationGeneratorRawList(get('adminGeneratorSoftPreferred')),
    hardPreferred: adminRotationGeneratorRawList(get('adminGeneratorHardPreferred')),
    softCore: adminRotationGeneratorRawList(get('adminGeneratorSoftCore')),
    softHardCycle: adminRotationGeneratorRawList(get('adminGeneratorSoftHardCycle')).map((item) => String(item || '').toUpperCase()),
    softHardBlockLength: Number(get('adminGeneratorSoftHardBlockLength') || 3),
    hardCycle: adminRotationGeneratorRawList(get('adminGeneratorHardCycle')).map((item) => String(item || '').toUpperCase()),
    avoidLatheWhenTwoLathesOneMillEnabled: !!((scope.querySelector ? scope.querySelector('#adminGeneratorAvoidLatheWhenTwoLathesOneMillEnabled') : document.getElementById('adminGeneratorAvoidLatheWhenTwoLathesOneMillEnabled'))?.checked),
    avoidLatheWhenTwoLathesOneMillNames: adminRotationGeneratorRawList(get('adminGeneratorAvoidLatheWhenTwoLathesOneMillNames')),
    soloMillBalanceEnabled: !!((scope.querySelector ? scope.querySelector('#adminGeneratorSoloMillBalanceEnabled') : document.getElementById('adminGeneratorSoloMillBalanceEnabled'))?.checked),
    soloMillMaxSpread: Number(get('adminGeneratorSoloMillMaxSpread') || 1),
    softTotalBalanceEnabled: !!((scope.querySelector ? scope.querySelector('#adminGeneratorSoftTotalBalanceEnabled') : document.getElementById('adminGeneratorSoftTotalBalanceEnabled'))?.checked),
    softTotalBalanceNames: adminRotationGeneratorRawList(get('adminGeneratorSoftTotalBalanceNames')),
    softTotalMaxSpread: Number(get('adminGeneratorSoftTotalMaxSpread') || 1),
    hardPeopleSoftKindBalanceEnabled: !!((scope.querySelector ? scope.querySelector('#adminGeneratorHardPeopleSoftKindBalanceEnabled') : document.getElementById('adminGeneratorHardPeopleSoftKindBalanceEnabled'))?.checked),
    hardPeopleSoftKindBalanceNames: adminRotationGeneratorRawList(get('adminGeneratorHardPeopleSoftKindBalanceNames')),
    hardPeopleSoftKindMaxSpread: Number(get('adminGeneratorHardPeopleSoftKindMaxSpread') || 1),
    softKindGlobalBalanceEnabled: !!((scope.querySelector ? scope.querySelector('#adminGeneratorSoftKindGlobalBalanceEnabled') : document.getElementById('adminGeneratorSoftKindGlobalBalanceEnabled'))?.checked),
    softKindMixedMinimumShifts: Number(get('adminGeneratorSoftKindMixedMinimumShifts') || 3),
    softBaseLathe,
    softBaseRows,
    hasStoredRow: adminRotationHasGeneratorSettingsRow()
  };
}

function buildAdminRotationGeneratorStatusHtml(source) {
  const settings = source && typeof source === 'object' ? source : getAdminRotationGeneratorSettings();
  const hardAllowed = new Set((Array.isArray(HARD_MACHINE_HEADERS) ? HARD_MACHINE_HEADERS : []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  const softAllowed = new Set((Array.isArray(SOFT_MACHINE_HEADERS) ? SOFT_MACHINE_HEADERS : []).map((item) => String(item || '').trim().toUpperCase()).filter(Boolean));
  const softPreferred = adminRotationGeneratorRawList(settings.softPreferred);
  const hardPreferred = adminRotationGeneratorRawList(settings.hardPreferred);
  const softCore = adminRotationGeneratorRawList(settings.softCore);
  const softHardCycle = adminRotationGeneratorRawList(settings.softHardCycle).map((item) => String(item || '').toUpperCase());
  const hardCycle = adminRotationGeneratorRawList(settings.hardCycle).map((item) => String(item || '').toUpperCase());
  const avoidLatheEnabled = adminRotationGeneratorBooleanValue(settings.avoidLatheWhenTwoLathesOneMillEnabled, true);
  const avoidLatheNames = adminRotationGeneratorRawList(settings.avoidLatheWhenTwoLathesOneMillNames);
  const soloMillEnabled = adminRotationGeneratorBooleanValue(settings.soloMillBalanceEnabled, true);
  const soloMillSpread = Math.max(0, Math.min(6, Number(settings.soloMillMaxSpread ?? 1) || 1));
  const softTotalEnabled = adminRotationGeneratorBooleanValue(settings.softTotalBalanceEnabled, true);
  const softTotalNames = adminRotationGeneratorRawList(settings.softTotalBalanceNames);
  const softTotalSpread = Math.max(0, Math.min(6, Number(settings.softTotalMaxSpread ?? 1) || 1));
  const hardKindEnabled = adminRotationGeneratorBooleanValue(settings.hardPeopleSoftKindBalanceEnabled, true);
  const hardKindNames = adminRotationGeneratorRawList(settings.hardPeopleSoftKindBalanceNames);
  const hardKindSpread = Math.max(0, Math.min(6, Number(settings.hardPeopleSoftKindMaxSpread ?? 1) || 1));
  const softKindGlobalEnabled = adminRotationGeneratorBooleanValue(settings.softKindGlobalBalanceEnabled, true);
  const softKindMixedMin = Math.max(1, Math.min(12, Number(settings.softKindMixedMinimumShifts ?? 3) || 3));
  const softBaseRows = Array.isArray(settings.softBaseRows)
    ? settings.softBaseRows
    : softCore.map((person) => ({ person, machine: String(settings.softBaseLathe && settings.softBaseLathe[person] || '').toUpperCase() }));
  const duplicatePeople = []
    .concat(adminRotationGeneratorDuplicateList(softPreferred))
    .concat(adminRotationGeneratorDuplicateList(hardPreferred))
    .concat(adminRotationGeneratorDuplicateList(softCore));
  const uniquePeople = new Set(softPreferred.concat(hardPreferred).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
  const missingLists = [
    softPreferred.length ? '' : 'mekota',
    hardPreferred.length ? '' : 'tvrdota',
    softCore.length ? '' : 'trojice',
    softHardCycle.length ? '' : 'cyklus trojice',
    hardCycle.length ? '' : 'tvrdotovy cyklus'
  ].filter(Boolean);
  const invalidHardMachines = softHardCycle.concat(hardCycle).filter((machine) => machine && !hardAllowed.has(machine));
  const invalidSoftBase = softBaseRows.filter((row) => row.person && row.machine && !softAllowed.has(row.machine));
  const missingSoftBase = softCore.filter((person) => !softBaseRows.some((row) => String(row.person || '').trim().toLowerCase() === String(person || '').trim().toLowerCase() && String(row.machine || '').trim()));
  const block = Math.max(1, Math.min(12, Number(settings.softHardBlockLength || 3) || 3));
  const machineIssues = invalidHardMachines.length + invalidSoftBase.length + missingSoftBase.length;
  const issueCount = duplicatePeople.length + missingLists.length + machineIssues;
  const hasStoredRow = Object.prototype.hasOwnProperty.call(settings, 'hasStoredRow') ? !!settings.hasStoredRow : adminRotationHasGeneratorSettingsRow();
  const sourceValue = hasStoredRow ? 'Ulozeno' : 'Vychozi';
  const sourceDetail = hasStoredRow ? 'Generator pouziva pravidla ulozena v administraci.' : 'Zatim se pouzivaji vychozi pravidla z aplikace.';
  const peopleDetail = duplicatePeople.length
    ? 'Duplicity: ' + Array.from(new Set(duplicatePeople)).join(', ')
    : 'Mekota, tvrdota a trojice maji ' + String(uniquePeople.size) + ' unikatnich jmen.';
  const machineDetail = machineIssues
    ? [
        invalidHardMachines.length ? 'neplatne tvrdotove stroje: ' + Array.from(new Set(invalidHardMachines)).join(', ') : '',
        invalidSoftBase.length ? 'neplatne soustruhy: ' + invalidSoftBase.map((row) => row.machine).join(', ') : '',
        missingSoftBase.length ? 'chybi soustruh: ' + missingSoftBase.join(', ') : ''
      ].filter(Boolean).join('; ')
    : 'Cykly a zakladni soustruhy odpovidaji znamym strojum.';
  const controlDetail = issueCount
    ? [
        missingLists.length ? 'prazdne: ' + missingLists.join(', ') : '',
        duplicatePeople.length ? 'duplicity jmen' : '',
        machineIssues ? 'stroje k oprave' : ''
      ].filter(Boolean).join('; ')
    : 'Pravidla jsou pripravena pro dalsi generovani.';
  return [
    '<div class="adminGeneratorSettingsStatus" id="adminGeneratorSettingsStatus" aria-live="polite">',
    '  <div class="appMenuSubTitle">Stav pravidel generatoru</div>',
    '  <div class="adminGeneratorSettingsStatusGrid">',
    adminRotationGeneratorStatusItemHtml('Zdroj pravidel', sourceValue, sourceDetail, hasStoredRow ? 'isOk' : 'isWarn'),
    adminRotationGeneratorStatusItemHtml('Lide', String(uniquePeople.size) + ' jmen', peopleDetail, duplicatePeople.length ? 'isWarn' : 'isOk'),
    adminRotationGeneratorStatusItemHtml('Stroje', String(block) + ' dny blok', machineDetail, machineIssues ? 'isWarn' : 'isOk'),
    adminRotationGeneratorStatusItemHtml('Jemna pravidla', [avoidLatheEnabled ? 'soustruhy' : '', soloMillEnabled ? 'frezky' : '', softTotalEnabled ? 'mekota' : '', hardKindEnabled ? 'typy' : ''].filter(Boolean).join(' + ') || 'vypnuto', 'Soustruhy: ' + (avoidLatheEnabled ? (avoidLatheNames.join(', ') || 'nezadano') : 'vypnuto') + '; samostatne frezky: ' + (soloMillEnabled ? 'rozdil max ' + String(soloMillSpread) : 'vypnuto') + '; mekota: ' + (softTotalEnabled ? (softTotalNames.join(', ') || 'nezadano') + ', rozdil max ' + String(softTotalSpread) : 'vypnuto') + '; typy: ' + (hardKindEnabled ? (softKindGlobalEnabled ? 'cela mekota' : (hardKindNames.join(', ') || 'nezadano')) + ', rozdil max ' + String(hardKindSpread) + ', mix od ' + String(softKindMixedMin) + ' smen' : 'vypnuto'), (!avoidLatheEnabled || !soloMillEnabled || !softTotalEnabled || !hardKindEnabled) ? 'isWarn' : 'isOk'),
    adminRotationGeneratorStatusItemHtml('Kontrola', issueCount ? String(issueCount) + ' k reseni' : 'OK', controlDetail, issueCount ? 'isWarn' : 'isOk'),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminRotationGeneratorImpactHtml() {
  return [
    '<div class="adminGeneratorImpact">',
    '  <div class="appMenuSubTitle">Dopad pravidel</div>',
    '  <div class="smallText uMb10">Pravidla generátoru jsou jen pro další návrh. Už uložený rozpis se nezmění, dokud správce nevygeneruje návrh, ručně ho nezkontroluje a neuloží rozpis.</div>',
    '  <div class="adminGeneratorImpactGrid">',
    adminRotationGeneratorImpactItemHtml('Hotové měsíce', 'beze změny', 'Změna pravidel sama nepřepíše už uloženou rotaci ani veřejný rozpis.', 'isInfo'),
    adminRotationGeneratorImpactItemHtml('Další návrh', 'použije pravidla', 'Nové pořadí lidí, cykly a stroje se projeví až při dalším generování návrhu.', 'isWarn'),
    adminRotationGeneratorImpactItemHtml('Kontrola', 'před uložením', 'Po vygenerování ověř výjimky, absence, TNKS01/TPKW01 a souhrn počtů.', 'isInfo'),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminRotationGeneratorRuleSummaryHtml() {
  const rules = getAdminRotationGeneratorRules();
  const latestRules = (typeof RAK_ROTATION_GENERATOR_RULES_V1135 !== 'undefined' && RAK_ROTATION_GENERATOR_RULES_V1135) ? RAK_ROTATION_GENERATOR_RULES_V1135 : {};
  const balanceRules = (typeof RAK_ROTATION_GENERATOR_RULES_V1116 !== 'undefined' && RAK_ROTATION_GENERATOR_RULES_V1116) ? RAK_ROTATION_GENERATOR_RULES_V1116 : {};
  const hardCycle = adminRotationGeneratorListValue(rules.hardCycle || []);
  const softCore = adminRotationGeneratorListValue(rules.softCore || []);
  const softHardCycle = adminRotationGeneratorListValue(rules.softHardCycle || []);
  const avoidLatheNames = adminRotationGeneratorListValue(rules.avoidLatheWhenTwoLathesOneMillNames || []);
  const softTotalNames = adminRotationGeneratorListValue(rules.softTotalBalanceNames || []);
  const hardKindNames = adminRotationGeneratorListValue(rules.hardPeopleSoftKindBalanceNames || []);
  return [
    '<div class="adminGeneratorRulesSummary">',
    '  <div class="appMenuSubTitle">Podmínky generování</div>',
    '  <div class="smallText uMb10">Rychlý souhrn toho, co generátor hlídá před uložením rozpisu. Návrh se do online rotace propíše až po ruční kontrole a tlačítku Uložit rozpis.</div>',
    '  <div class="adminGeneratorRulesGrid">',
    adminRotationGeneratorRuleCardHtml('Příprava měsíce', 'dny + absence první', 'Nejdřív vyber měsíc, zkontroluj pracovní dny, doplň svátky, odstávky a absence.'),
    adminRotationGeneratorRuleCardHtml('Uložení návrhu', 'jen po kontrole', 'Vygenerovaný návrh se nejdřív otevře v editoru. Online se uloží až tlačítkem Uložit rozpis.'),
    adminRotationGeneratorRuleCardHtml('Tvrdotový cyklus', hardCycle.replace(/\n/g, ' → '), 'Pořadí strojů pro návaznou tvrdotu lze upravit níže.'),
    adminRotationGeneratorRuleCardHtml('Trojice z měkoty', softCore, 'Chodí na ' + softHardCycle.replace(/\n/g, ' → ') + ' po blocích ' + String(rules.softHardBlockLength || 3) + ' pracovních dnů. Tento cyklus má přednost před ostatním dorovnáním.'),
    adminRotationGeneratorRuleCardHtml('2 soustruhy + 1 fréza', rules.avoidLatheWhenTwoLathesOneMillEnabled === false ? 'vypnuto' : (avoidLatheNames || 'zapnuto'), 'Vypsaná jména mají být při tomto režimu spíš mimo soustruhy, pokud existuje rozumná alternativa.'),
    adminRotationGeneratorRuleCardHtml('Samostatné frézky', rules.soloMillBalanceEnabled === false ? 'vypnuto' : 'rozdíl max ' + String(rules.soloMillMaxSpread ?? 1), 'Když je na frézkách jen MFKF10, generátor se snaží samostatné frézky rozdělit měsíčně rovnoměrně.'),
    adminRotationGeneratorRuleCardHtml('Měkota skupiny', rules.softTotalBalanceEnabled === false ? 'vypnuto' : (softTotalNames || 'zapnuto'), 'Vypsaná jména mají mít podobný počet směn na měkotě; výchozí rozdíl max ' + String(rules.softTotalMaxSpread ?? 1) + '.'),
    adminRotationGeneratorRuleCardHtml('Soustruhy / frézky', rules.hardPeopleSoftKindBalanceEnabled === false ? 'vypnuto' : (rules.softKindGlobalBalanceEnabled === false ? (hardKindNames || 'zapnuto') : 'celá měkota'), 'Na měkotě se dorovnává poměr soustruhů a frézek; rozdíl max ' + String(rules.hardPeopleSoftKindMaxSpread ?? 1) + ', mix od ' + String(rules.softKindMixedMinimumShifts ?? 3) + ' směn.'),
    adminRotationGeneratorRuleCardHtml('TNKS01 / TPKW01 po sobě', 'zakázáno', latestRules.consecutiveTnksRule || 'Stejný pracovník nemá být na nýtovačce dvě pracovní směny po sobě.'),
    adminRotationGeneratorRuleCardHtml('Vyrovnání nýtovačky', 'měsíc má přednost', latestRules.tnksMonthlyFirstRule || balanceRules.pressBalanceRule || 'TNKS01 a TPKW01 se vyrovnávají podle společných počtů.'),
    '  </div>',
    '</div>'
  ].join('');
}

function buildAdminRotationGeneratorSettingsHtml() {
  const settings = getAdminRotationGeneratorSettings();
  const baseRows = settings.softCore.map((name, idx) => [
    '<tr data-generator-base-row="' + String(idx) + '">',
    '  <td><input class="appMenuInlineInput" data-generator-base-field="person" data-generator-settings-field value="' + escapeHtml(name) + '" placeholder="Jmeno"></td>',
    '  <td><input class="appMenuInlineInput" data-generator-base-field="machine" data-generator-settings-field value="' + escapeHtml(settings.softBaseLathe[name] || '') + '" placeholder="MSKC01"></td>',
    '</tr>'
  ].join('')).join('');
  return [
    buildAdminRotationGeneratorStatusHtml(settings),
    buildAdminRotationGeneratorImpactHtml(),
    buildAdminRotationGeneratorRuleSummaryHtml(),
    '<div class="appMenuSettingsList adminGeneratorSettingsList">',
    '  <div class="appMenuSubTitle">Lidé a pořadí</div>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftPreferred">Základ měkoty</label>',
    '  <textarea id="adminGeneratorSoftPreferred" class="appMenuTextarea" data-generator-settings-field rows="5">' + escapeHtml(adminRotationGeneratorListValue(settings.softPreferred)) + '</textarea>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorHardPreferred">Základ tvrdoty</label>',
    '  <textarea id="adminGeneratorHardPreferred" class="appMenuTextarea" data-generator-settings-field rows="5">' + escapeHtml(adminRotationGeneratorListValue(settings.hardPreferred)) + '</textarea>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftCore">Trojice s vlastním TNKS/TPKW cyklem</label>',
    '  <textarea id="adminGeneratorSoftCore" class="appMenuTextarea" data-generator-settings-field rows="3">' + escapeHtml(adminRotationGeneratorListValue(settings.softCore)) + '</textarea>',
    '  <div class="appMenuSubTitle">Cykly strojů</div>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftHardCycle">Cyklus trojice na tvrdotě</label>',
    '  <textarea id="adminGeneratorSoftHardCycle" class="appMenuTextarea" data-generator-settings-field rows="3">' + escapeHtml(adminRotationGeneratorListValue(settings.softHardCycle)) + '</textarea>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftHardBlockLength">Kolik dní držet jeden stroj v cyklu</label>',
    '  <input id="adminGeneratorSoftHardBlockLength" class="appMenuInput" data-generator-settings-field type="number" min="1" max="12" step="1" value="' + escapeHtml(String(settings.softHardBlockLength || 3)) + '">',
    '  <label class="appMenuFieldLabel" for="adminGeneratorHardCycle">Tvrdotový cyklus strojů</label>',
    '  <textarea id="adminGeneratorHardCycle" class="appMenuTextarea" data-generator-settings-field rows="5">' + escapeHtml(adminRotationGeneratorListValue(settings.hardCycle)) + '</textarea>',
    '  <div class="appMenuSubTitle">Jemná pravidla</div>',
    '  <label class="adminRotationOvertimeSwitch"><input id="adminGeneratorAvoidLatheWhenTwoLathesOneMillEnabled" type="checkbox" data-generator-settings-field ' + (settings.avoidLatheWhenTwoLathesOneMillEnabled !== false ? 'checked' : '') + '><span>Vyhýbat se soustruhům při 2 soustruhy + 1 fréza</span></label>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorAvoidLatheWhenTwoLathesOneMillNames">Jména, která mají být spíš mimo soustruhy v režimu 2+1</label>',
    '  <textarea id="adminGeneratorAvoidLatheWhenTwoLathesOneMillNames" class="appMenuTextarea" data-generator-settings-field rows="2">' + escapeHtml(adminRotationGeneratorListValue(settings.avoidLatheWhenTwoLathesOneMillNames)) + '</textarea>',
    '  <label class="adminRotationOvertimeSwitch"><input id="adminGeneratorSoloMillBalanceEnabled" type="checkbox" data-generator-settings-field ' + (settings.soloMillBalanceEnabled !== false ? 'checked' : '') + '><span>Vyrovnávat samostatné frézky</span></label>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoloMillMaxSpread">Maximální rozdíl samostatných frézek v měsíci</label>',
    '  <input id="adminGeneratorSoloMillMaxSpread" class="appMenuInput" data-generator-settings-field type="number" min="0" max="6" step="1" value="' + escapeHtml(String(settings.soloMillMaxSpread ?? 1)) + '">',
    '  <label class="adminRotationOvertimeSwitch"><input id="adminGeneratorSoftTotalBalanceEnabled" type="checkbox" data-generator-settings-field ' + (settings.softTotalBalanceEnabled !== false ? 'checked' : '') + '><span>Vyrovnávat počet směn na měkotě u vybraných lidí</span></label>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftTotalBalanceNames">Jména pro vyrovnání měkoty</label>',
    '  <textarea id="adminGeneratorSoftTotalBalanceNames" class="appMenuTextarea" data-generator-settings-field rows="2">' + escapeHtml(adminRotationGeneratorListValue(settings.softTotalBalanceNames)) + '</textarea>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftTotalMaxSpread">Maximální rozdíl směn na měkotě v měsíci</label>',
    '  <input id="adminGeneratorSoftTotalMaxSpread" class="appMenuInput" data-generator-settings-field type="number" min="0" max="6" step="1" value="' + escapeHtml(String(settings.softTotalMaxSpread ?? 1)) + '">',
    '  <label class="adminRotationOvertimeSwitch"><input id="adminGeneratorHardPeopleSoftKindBalanceEnabled" type="checkbox" data-generator-settings-field ' + (settings.hardPeopleSoftKindBalanceEnabled !== false ? 'checked' : '') + '><span>Vyrovnávat soustruhy a frézky na měkotě</span></label>',
    '  <label class="adminRotationOvertimeSwitch"><input id="adminGeneratorSoftKindGlobalBalanceEnabled" type="checkbox" data-generator-settings-field ' + (settings.softKindGlobalBalanceEnabled !== false ? 'checked' : '') + '><span>Počítat do toho celou měkotu</span></label>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorHardPeopleSoftKindBalanceNames">Jména pro vyrovnání soustruhy / frézky, když není zapnutá celá měkota</label>',
    '  <textarea id="adminGeneratorHardPeopleSoftKindBalanceNames" class="appMenuTextarea" data-generator-settings-field rows="2">' + escapeHtml(adminRotationGeneratorListValue(settings.hardPeopleSoftKindBalanceNames)) + '</textarea>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorHardPeopleSoftKindMaxSpread">Maximální rozdíl soustruhy vs frézky v měsíci</label>',
    '  <input id="adminGeneratorHardPeopleSoftKindMaxSpread" class="appMenuInput" data-generator-settings-field type="number" min="0" max="6" step="1" value="' + escapeHtml(String(settings.hardPeopleSoftKindMaxSpread ?? 1)) + '">',
    '  <label class="appMenuFieldLabel" for="adminGeneratorSoftKindMixedMinimumShifts">Od kolika směn na měkotě musí mít člověk oba typy práce</label>',
    '  <input id="adminGeneratorSoftKindMixedMinimumShifts" class="appMenuInput" data-generator-settings-field type="number" min="1" max="12" step="1" value="' + escapeHtml(String(settings.softKindMixedMinimumShifts ?? 3)) + '">',
    '  <div class="appMenuSubTitle">Základní soustruhy měkoty</div>',
    '  <div class="smallText">Jména musí odpovídat seznamu výše. Stroj použij například MSKC01, MSKC03 nebo MSKC04.</div>',
    '  <div class="tableWrap appMenuTableWrap uMt12">',
    '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminGeneratorBaseTable">',
    '      <colgroup><col class="adminGeneratorBaseNameCol"><col class="adminGeneratorBaseMachineCol"></colgroup>',
    '      <thead><tr><th>Jméno</th><th>Stroj</th></tr></thead>',
    '      <tbody>' + baseRows + '</tbody>',
    '    </table>',
    '  </div>',
    '</div>'
  ].join('');
}

function readAdminRotationGeneratorSettingsFromDom() {
  const getText = (id) => String(document.getElementById(id)?.value || '');
  const softBaseLathe = {};
  document.querySelectorAll('#appMenuBody tr[data-generator-base-row]').forEach((tr) => {
    const person = String(tr.querySelector('[data-generator-base-field="person"]')?.value || '').trim();
    const machine = String(tr.querySelector('[data-generator-base-field="machine"]')?.value || '').trim().toUpperCase();
    if (person && machine) softBaseLathe[person] = machine;
  });
  return adminRotationNormalizeGeneratorSettings({
    softPreferred: adminRotationSplitGeneratorList(getText('adminGeneratorSoftPreferred')),
    hardPreferred: adminRotationSplitGeneratorList(getText('adminGeneratorHardPreferred')),
    softCore: adminRotationSplitGeneratorList(getText('adminGeneratorSoftCore')),
    softHardCycle: adminRotationSplitGeneratorList(getText('adminGeneratorSoftHardCycle')),
    softHardBlockLength: Number(document.getElementById('adminGeneratorSoftHardBlockLength')?.value || 3),
    hardCycle: adminRotationSplitGeneratorList(getText('adminGeneratorHardCycle')),
    avoidLatheWhenTwoLathesOneMillEnabled: !!document.getElementById('adminGeneratorAvoidLatheWhenTwoLathesOneMillEnabled')?.checked,
    avoidLatheWhenTwoLathesOneMillNames: adminRotationSplitGeneratorList(getText('adminGeneratorAvoidLatheWhenTwoLathesOneMillNames')),
    soloMillBalanceEnabled: !!document.getElementById('adminGeneratorSoloMillBalanceEnabled')?.checked,
    soloMillMaxSpread: Number(document.getElementById('adminGeneratorSoloMillMaxSpread')?.value || 1),
    softTotalBalanceEnabled: !!document.getElementById('adminGeneratorSoftTotalBalanceEnabled')?.checked,
    softTotalBalanceNames: adminRotationSplitGeneratorList(getText('adminGeneratorSoftTotalBalanceNames')),
    softTotalMaxSpread: Number(document.getElementById('adminGeneratorSoftTotalMaxSpread')?.value || 1),
    hardPeopleSoftKindBalanceEnabled: !!document.getElementById('adminGeneratorHardPeopleSoftKindBalanceEnabled')?.checked,
    hardPeopleSoftKindBalanceNames: adminRotationSplitGeneratorList(getText('adminGeneratorHardPeopleSoftKindBalanceNames')),
    hardPeopleSoftKindMaxSpread: Number(document.getElementById('adminGeneratorHardPeopleSoftKindMaxSpread')?.value || 1),
    softKindGlobalBalanceEnabled: !!document.getElementById('adminGeneratorSoftKindGlobalBalanceEnabled')?.checked,
    softKindMixedMinimumShifts: Number(document.getElementById('adminGeneratorSoftKindMixedMinimumShifts')?.value || 3),
    softBaseLathe
  });
}

function adminBuildRotationGenerationModel(targetMonthKey) {
  const knownNames = adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  const targetSort = adminRotationMonthSortValue(targetMonthKey);
  const targetParsed = typeof parseMonthKey === 'function' ? parseMonthKey(targetMonthKey) : null;
  const previousYearKey = targetParsed && Number.isFinite(targetParsed.month) && Number.isFinite(targetParsed.year)
    ? (String(targetParsed.month) + '/' + String((targetParsed.year - 1) % 100).padStart(2, '0'))
    : '';
  const machineStats = { hard: [], soft: [] };
  const yearHardMachineStats = Object.create(null);
  const globalStats = Object.create(null);
  const dayTemplates = [];
  const previousYearTemplates = [];
  const previousHardMachine = Object.create(null);
  const softCoreCycle = Array.isArray(generatorRules.softHardCycle) ? generatorRules.softHardCycle : [];
  const softCoreNames = Array.isArray(generatorRules.softCore) ? generatorRules.softCore.filter((name) => knownNames.includes(name)) : [];
  const softCoreCycleState = {
    machineCursor: 0,
    personCursor: 0,
    filledInMachine: 0,
    assignedInMachineBlock: []
  };
  knownNames.forEach((name) => { globalStats[name] = 0; });

  const months = getAdminRotationMonthKeys()
    .filter((monthKey) => adminRotationMonthSortValue(monthKey) < targetSort)
    .sort((a, b) => adminRotationMonthSortValue(a) - adminRotationMonthSortValue(b));

  const addMachineStat = (sectionKey, machineIdx, name, weight) => {
    if (!machineStats[sectionKey][machineIdx]) machineStats[sectionKey][machineIdx] = Object.create(null);
    machineStats[sectionKey][machineIdx][name] = (machineStats[sectionKey][machineIdx][name] || 0) + weight;
    globalStats[name] = (globalStats[name] || 0) + weight;
  };

  const addYearHardMachineStat = (machineName, name, weight) => {
    const machine = String(machineName || '').trim().toUpperCase();
    if (!machine || !name) return;
    if (!yearHardMachineStats[machine]) yearHardMachineStats[machine] = Object.create(null);
    yearHardMachineStats[machine][name] = (yearHardMachineStats[machine][name] || 0) + Number(weight || 0);
  };

  const replaySoftCoreHardAssignment = (machineName, name) => {
    if (!softCoreCycle.length || !softCoreNames.length) return;
    const machineIdx = softCoreCycle.findIndex((machine) => String(machine || '').toUpperCase() === String(machineName || '').toUpperCase());
    const personIdx = softCoreNames.findIndex((person) => person === name);
    if (machineIdx < 0 || personIdx < 0) return;
    const cycleLength = Math.max(1, softCoreCycle.length);
    const currentIdx = ((Number(softCoreCycleState.machineCursor) || 0) % cycleLength + cycleLength) % cycleLength;
    const previousIdx = (currentIdx - 1 + cycleLength) % cycleLength;
    const blockLength = Math.max(1, Number(generatorRules.softHardBlockLength) || 3);

    // RaK 1.2 (1.155): návaznost Synka/Třasáka/Střížka se nesmí odvozovat jen z posledního dne
    // ani resetovat zpět, když je v historii po dokončeném bloku ještě extra TNKS01.
    // Procházíme celý předchozí měsíc chronologicky a zpětný "spillover" předchozího stroje ignorujeme.
    if (machineIdx !== currentIdx) {
      const looksLikePreviousMachineSpillover = machineIdx === previousIdx;
      if (looksLikePreviousMachineSpillover) return;
      softCoreCycleState.machineCursor = machineIdx;
      softCoreCycleState.filledInMachine = 0;
      softCoreCycleState.assignedInMachineBlock = [];
    }

    if (!softCoreCycleState.assignedInMachineBlock.includes(name)) softCoreCycleState.assignedInMachineBlock.push(name);
    softCoreCycleState.filledInMachine = Math.max(softCoreCycleState.filledInMachine + 1, softCoreCycleState.assignedInMachineBlock.length);
    softCoreCycleState.personCursor = (personIdx + 1) % Math.max(1, softCoreNames.length);
    const activeMachineIdx = ((Number(softCoreCycleState.machineCursor) || 0) % cycleLength + cycleLength) % cycleLength;
    if (softCoreCycleState.filledInMachine >= blockLength || softCoreCycleState.assignedInMachineBlock.length >= Math.min(blockLength, softCoreNames.length)) {
      softCoreCycleState.machineCursor = (activeMachineIdx + 1) % cycleLength;
      softCoreCycleState.filledInMachine = 0;
      softCoreCycleState.assignedInMachineBlock = [];
    }
  };

  const replaySoftCoreSkippedAbsence = (absenceNames) => {
    if (!softCoreCycle.length || !softCoreNames.length || !softCoreCycleState.assignedInMachineBlock.length) return '';
    const absent = absenceNames instanceof Set ? absenceNames : new Set();
    const remaining = softCoreNames.filter((name) => !softCoreCycleState.assignedInMachineBlock.includes(name));
    if (!remaining.length || remaining.some((name) => !absent.has(name))) return '';
    const personCursor = ((Number(softCoreCycleState.personCursor) || 0) % softCoreNames.length + softCoreNames.length) % softCoreNames.length;
    const ordered = softCoreNames.slice(personCursor).concat(softCoreNames.slice(0, personCursor));
    const skipped = ordered.find((name) => remaining.includes(name)) || remaining[0];
    if (!skipped) return '';
    softCoreCycleState.assignedInMachineBlock.push(skipped);
    softCoreCycleState.filledInMachine = Math.max(softCoreCycleState.filledInMachine + 1, softCoreCycleState.assignedInMachineBlock.length);
    softCoreCycleState.personCursor = (softCoreNames.indexOf(skipped) + 1) % Math.max(1, softCoreNames.length);
    const blockLength = Math.max(1, Number(generatorRules.softHardBlockLength) || 3);
    if (softCoreCycleState.filledInMachine >= blockLength || softCoreCycleState.assignedInMachineBlock.length >= Math.min(blockLength, softCoreNames.length)) {
      softCoreCycleState.machineCursor = (Number(softCoreCycleState.machineCursor || 0) + 1) % Math.max(1, softCoreCycle.length);
      softCoreCycleState.filledInMachine = 0;
      softCoreCycleState.assignedInMachineBlock = [];
    }
    return skipped;
  };

  months.forEach((monthKey, monthIdx) => {
    const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    if (!month) return;
    const hardRows = Array.isArray(month.hard && month.hard.rows) ? month.hard.rows : [];
    const softRows = Array.isArray(month.soft && month.soft.rows) ? month.soft.rows : [];
    const maxRows = Math.max(hardRows.length, softRows.length);
    const recencyWeight = 1 + monthIdx * 0.035;
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
      const hardRow = hardRows[rowIdx] || null;
      const softRow = softRows[rowIdx] || null;
      const hardCells = Array.from({ length: HARD_MACHINE_HEADERS.length }, (_, idx) => adminRotationCanonicalName(hardRow && hardRow.cells ? hardRow.cells[idx] : '', knownNames));
      const softCells = Array.from({ length: SOFT_MACHINE_HEADERS.length }, (_, idx) => adminRotationCanonicalName(softRow && softRow.cells ? softRow.cells[idx] : '', knownNames));
      const dateLabel = String(hardRow && hardRow.date || softRow && softRow.date || '');
      const historyNotes = adminRotationGeneratorDateNotes(month, dateLabel);
      if (dateLabel && !adminRotationGeneratorIsDayBlocked(historyNotes)) {
        replaySoftCoreSkippedAbsence(adminRotationUnavailableNamesForDate(month, dateLabel, knownNames));
      }
      const hasAny = hardCells.concat(softCells).some((name) => adminRotationIsRealName(name, knownNames));
      if (!hasAny) continue;
      const template = {
        monthKey,
        rowIdx,
        shift: adminRotationShiftFromRow(hardRow || softRow || {}),
        hardCells,
        softCells
      };
      dayTemplates.push(template);
      if (monthKey === previousYearKey) previousYearTemplates.push(template);
      const parsedHistoryMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
      const isTargetYearBeforeMonth = parsedHistoryMonth && targetParsed && Number(parsedHistoryMonth.year) === Number(targetParsed.year) && Number(parsedHistoryMonth.month) < Number(targetParsed.month);
      const splitPressForYear = isTargetYearBeforeMonth && typeof adminRotationGeneratorShouldSplitPressMachines === 'function'
        ? adminRotationGeneratorShouldSplitPressMachines(hardRow && hardRow.date, monthKey, month)
        : false;
      hardCells.forEach((name, idx) => {
        if (adminRotationIsRealName(name, knownNames)) {
          const machineName = HARD_MACHINE_HEADERS[idx] || '';
          addMachineStat('hard', idx, name, recencyWeight);
          previousHardMachine[name] = machineName || previousHardMachine[name] || '';
          replaySoftCoreHardAssignment(machineName, name);
          if (isTargetYearBeforeMonth) {
            if (splitPressForYear && /^(?:TNKS01|TPKW01)$/i.test(machineName)) {
              addYearHardMachineStat('TNKS01', name, 0.5);
              addYearHardMachineStat('TPKW01', name, 0.5);
            } else {
              addYearHardMachineStat(machineName, name, 1);
            }
          }
        }
      });
      softCells.forEach((name, idx) => { if (adminRotationIsRealName(name, knownNames)) addMachineStat('soft', idx, name, recencyWeight); });
    }
  });

  return { knownNames, machineStats, yearHardMachineStats, globalStats, dayTemplates, previousYearTemplates, previousYearKey, previousHardMachine, softCoreCycleState };
}

function adminPickRotationGeneratorName(model, sectionKey, machineIdx, rowIdx, usedNames, monthCounts, previousRowNames, suggestedName, shift) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const available = knownNames.filter((name) => !usedNames.has(name));
  if (!available.length) return '';
  const stats = model && model.machineStats && model.machineStats[sectionKey] && model.machineStats[sectionKey][machineIdx]
    ? model.machineStats[sectionKey][machineIdx]
    : Object.create(null);
  const globalStats = model && model.globalStats ? model.globalStats : Object.create(null);
  let best = '';
  let bestScore = -Infinity;
  available.forEach((name) => {
    const skill = Number(stats[name] || 0);
    const global = Number(globalStats[name] || 0);
    const monthly = Number(monthCounts[name] || 0);
    const suggested = suggestedName && name === suggestedName ? 760 : 0;
    const previousPenalty = previousRowNames && previousRowNames.has(name) ? 46 : 0;
    const shiftHash = adminRotationHashString([sectionKey, machineIdx, rowIdx, shift || '', name].join('|')) % 23;
    const score = suggested + Math.log1p(skill) * 130 + skill * 4.5 + Math.log1p(global) * 12 - monthly * 62 - previousPenalty + shiftHash / 10;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  });
  return best;
}

function adminRotationGeneratorMachineIndex(headers, machineName) {
  const wanted = String(machineName || '').trim().toUpperCase();
  return (Array.isArray(headers) ? headers : []).findIndex((item) => String(item || '').trim().toUpperCase() === wanted);
}

function adminRotationGeneratorDateNotes(month, dateLabel) {
  const wanted = adminRotationDateBaseKey(dateLabel);
  return (Array.isArray(month && month.notes) ? month.notes : []).filter((note) => adminRotationDateBaseKey(note && note.date) === wanted);
}

function adminRotationGeneratorIsDayBlocked(notes) {
  return (Array.isArray(notes) ? notes : []).some((note) => {
    const text = [note && note.person, note && note.code, note && note.text].map((part) => String(part || '').toLocaleLowerCase('cs-CZ')).join(' ');
    return /\b(?:svátek|svatek|odstávka|odstavka|odstaveno|shutdown|bez\s+směny|bez\s+smeny|nejet|nejede)\b/i.test(text);
  });
}

function adminRotationGeneratorCreateCounters(model) {
  const generatorRules = getAdminRotationGeneratorRules();
  const softCoreState = model && model.softCoreCycleState ? model.softCoreCycleState : {};
  const counters = {
    total: Object.create(null),
    hard: Object.create(null),
    soft: Object.create(null),
    hardMachine: Object.create(null),
    softMachine: Object.create(null),
    softKind: Object.create(null),
    hardCycleCursor: Object.create(null),
    softCoreMachineCursor: Number(softCoreState.machineCursor || 0) || 0,
    softCorePersonCursor: Number(softCoreState.personCursor || 0) || 0,
    // Novy mesic drzi navazny stroj i rozdelany blok z historie.
    // Kdyz minuly mesic na TPKW02 byli Strizek a Synek, dalsi dostupny ma jit Trasak, ne znovu stejni dva.
    softCoreFilledInMachine: Number(softCoreState.filledInMachine || 0) || 0,
    softCoreAssignedInMachineBlock: new Set(Array.isArray(softCoreState.assignedInMachineBlock) ? softCoreState.assignedInMachineBlock : []),
    softCoreGapPending: false,
    softCoreSkippedSlots: [],
    softCoreHardCount: Object.create(null)
  };
  const known = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const hardCycle = Array.isArray(generatorRules.hardCycle) ? generatorRules.hardCycle : [];
  known.forEach((name) => {
    counters.total[name] = 0;
    counters.hard[name] = 0;
    counters.soft[name] = 0;
    counters.softKind[name] = { lathe: 0, mill: 0 };
    counters.hardMachine[name] = Object.create(null);
    counters.softMachine[name] = Object.create(null);
    const previousMachine = model && model.previousHardMachine ? String(model.previousHardMachine[name] || '').trim().toUpperCase() : '';
    const previousIdx = hardCycle.findIndex((machine) => String(machine || '').toUpperCase() === previousMachine);
    counters.hardCycleCursor[name] = previousIdx >= 0 ? (previousIdx + 1) % Math.max(1, hardCycle.length) : 0;
    counters.softCoreHardCount[name] = 0;
  });
  return counters;
}

function adminRotationGeneratorHistoricalMachineScore(model, sectionKey, machineIdx, name) {
  const stats = model && model.machineStats && model.machineStats[sectionKey] && model.machineStats[sectionKey][machineIdx]
    ? model.machineStats[sectionKey][machineIdx]
    : null;
  return Number(stats && stats[name] || 0);
}

function adminRotationGeneratorPickName(candidates, usedNames, counters, options) {
  const opts = options || {};
  const list = (Array.isArray(candidates) ? candidates : []).filter((name) => name && !usedNames.has(name));
  if (!list.length) return '';
  let best = '';
  let bestScore = Infinity;
  list.forEach((name) => {
    const total = Number(counters.total[name] || 0);
    const section = Number((opts.sectionKey === 'soft' ? counters.soft[name] : counters.hard[name]) || 0);
    const machineMap = opts.sectionKey === 'soft' ? counters.softMachine[name] : counters.hardMachine[name];
    const machineKey = String(opts.machineName || '');
    const machine = Number(machineMap && machineMap[machineKey] || 0);
    const historical = Number(opts.historical || 0);
    const preferred = Array.isArray(opts.preferred) && opts.preferred.includes(name) ? -120 : 0;
    const required = Array.isArray(opts.required) && opts.required.includes(name) ? -300 : 0;
    const avoid = Array.isArray(opts.avoid) && opts.avoid.includes(name) ? 220 : 0;
    const hardBalance = opts.machineName === 'TNKS01' || opts.machineName === 'TPKW02'
      ? Math.abs(Number((counters.hardMachine[name] && counters.hardMachine[name].TNKS01) || 0) - Number((counters.hardMachine[name] && counters.hardMachine[name].TPKW02) || 0)) * 34
      : 0;
    const kindBalanceNames = Array.isArray(opts.softKindBalanceNames) ? opts.softKindBalanceNames : [];
    const useKindBalance = opts.softKindBalanceEnabled !== false && (!kindBalanceNames.length || kindBalanceNames.includes(name));
    const currentSoftKindMill = Number((counters.softKind[name] && counters.softKind[name].mill) || 0);
    const currentSoftKindLathe = Number((counters.softKind[name] && counters.softKind[name].lathe) || 0);
    const projectedSoftKindMill = currentSoftKindMill + (opts.softKind === 'mill' ? 1 : 0);
    const projectedSoftKindLathe = currentSoftKindLathe + (opts.softKind === 'lathe' ? 1 : 0);
    const projectedSoftKindTotal = projectedSoftKindMill + projectedSoftKindLathe;
    const mixedMinimum = Math.max(1, Math.min(12, Number(opts.softKindMixedMinimumShifts ?? 3) || 3));
    const oneSidedKindPenalty = projectedSoftKindTotal >= mixedMinimum && (!projectedSoftKindMill || !projectedSoftKindLathe) ? 900 : 0;
    const missingKindReward = (opts.softKind === 'mill' && currentSoftKindLathe > 0 && !currentSoftKindMill)
      || (opts.softKind === 'lathe' && currentSoftKindMill > 0 && !currentSoftKindLathe)
      ? -180
      : 0;
    const kindBalance = !useKindBalance ? 0 : (opts.softKind === 'mill'
      ? Math.max(0, currentSoftKindMill - currentSoftKindLathe) * 120 + oneSidedKindPenalty + missingKindReward
      : (opts.softKind === 'lathe'
        ? Math.max(0, currentSoftKindLathe - currentSoftKindMill) * 120 + oneSidedKindPenalty + missingKindReward
        : 0));
    const jitter = (adminRotationHashString([opts.sectionKey || '', opts.machineName || '', opts.rowIdx || 0, name].join('|')) % 19) / 100;
    const score = total * 44 + section * 18 + machine * 95 - Math.log1p(Math.max(0, historical)) * 9 + preferred + required + avoid + hardBalance + kindBalance + jitter;
    if (score < bestScore) {
      bestScore = score;
      best = name;
    }
  });
  return best;
}

function adminRotationGeneratorMarkAssignment(counters, sectionKey, machineName, name, softKind) {
  if (!name) return;
  counters.total[name] = Number(counters.total[name] || 0) + 1;
  if (sectionKey === 'soft') counters.soft[name] = Number(counters.soft[name] || 0) + 1;
  else counters.hard[name] = Number(counters.hard[name] || 0) + 1;
  const machineMap = sectionKey === 'soft' ? counters.softMachine : counters.hardMachine;
  if (!machineMap[name]) machineMap[name] = Object.create(null);
  machineMap[name][machineName] = Number(machineMap[name][machineName] || 0) + 1;
  if (sectionKey === 'soft' && softKind) {
    if (!counters.softKind[name]) counters.softKind[name] = { lathe: 0, mill: 0 };
    counters.softKind[name][softKind] = Number(counters.softKind[name][softKind] || 0) + 1;
  }
}

function adminRotationGeneratorUnmarkAssignment(counters, sectionKey, machineName, name, softKind) {
  if (!name) return;
  counters.total[name] = Math.max(0, Number(counters.total[name] || 0) - 1);
  if (sectionKey === 'soft') counters.soft[name] = Math.max(0, Number(counters.soft[name] || 0) - 1);
  else counters.hard[name] = Math.max(0, Number(counters.hard[name] || 0) - 1);
  const machineMap = sectionKey === 'soft' ? counters.softMachine : counters.hardMachine;
  if (machineMap[name]) machineMap[name][machineName] = Math.max(0, Number(machineMap[name][machineName] || 0) - 1);
  if (sectionKey === 'soft' && softKind && counters.softKind[name]) counters.softKind[name][softKind] = Math.max(0, Number(counters.softKind[name][softKind] || 0) - 1);
}

function adminRotationGeneratorNextHardCycleMachine(counters, name) {
  const generatorRules = getAdminRotationGeneratorRules();
  const cycle = Array.isArray(generatorRules.hardCycle) ? generatorRules.hardCycle : [];
  if (!name || !cycle.length) return '';
  const cursor = Number(counters && counters.hardCycleCursor ? counters.hardCycleCursor[name] : 0) || 0;
  return cycle[((cursor % cycle.length) + cycle.length) % cycle.length] || '';
}

function adminRotationGeneratorAdvanceHardCycle(counters, name) {
  const generatorRules = getAdminRotationGeneratorRules();
  const cycle = Array.isArray(generatorRules.hardCycle) ? generatorRules.hardCycle : [];
  if (!name || !cycle.length) return;
  const cursor = Number(counters && counters.hardCycleCursor ? counters.hardCycleCursor[name] : 0) || 0;
  counters.hardCycleCursor[name] = (cursor + 1) % cycle.length;
}

function adminRotationGeneratorSoftSlotPlan(softCount) {
  const idx = {
    MSKC01: adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC01'),
    MSKC03: adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC03'),
    MSKC04: adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC04'),
    MFKF06: adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06'),
    MFKF10: adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10')
  };
  if (softCount >= 5) return [idx.MSKC01, idx.MSKC03, idx.MSKC04, idx.MFKF06, idx.MFKF10].filter((n) => n >= 0);
  if (softCount === 4) return [idx.MSKC01, idx.MSKC03, idx.MSKC04, idx.MFKF10].filter((n) => n >= 0);
  if (softCount === 3) return [idx.MSKC03, idx.MSKC04, idx.MFKF10].filter((n) => n >= 0);
  if (softCount === 2) return [idx.MSKC03, idx.MFKF10].filter((n) => n >= 0);
  if (softCount === 1) return [idx.MFKF10].filter((n) => n >= 0);
  return [];
}

function adminRotationGeneratorSoftKind(machineName) {
  return /^MFKF/i.test(String(machineName || '')) ? 'mill' : 'lathe';
}

function adminRotationGeneratorIsTwoLatheOneMillPlan(softSlots) {
  const slots = Array.isArray(softSlots) ? softSlots : [];
  let lathe = 0;
  let mill = 0;
  slots.forEach((idx) => {
    const kind = adminRotationGeneratorSoftKind(SOFT_MACHINE_HEADERS[idx] || '');
    if (kind === 'mill') mill += 1;
    else lathe += 1;
  });
  return lathe === 2 && mill === 1;
}

function adminRotationGeneratorAvoidLatheNamesForPlan(generatorRules, softSlots, knownNames) {
  if (!generatorRules || generatorRules.avoidLatheWhenTwoLathesOneMillEnabled === false) return [];
  if (!adminRotationGeneratorIsTwoLatheOneMillPlan(softSlots)) return [];
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  return adminRotationSplitGeneratorList(generatorRules.avoidLatheWhenTwoLathesOneMillNames || [])
    .map((name) => adminRotationCanonicalName(name, names))
    .filter((name) => name && names.includes(name));
}

function adminRotationGeneratorParseDayMeta(dateLabel, monthKey) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(dateLabel) : null;
  const monthParsed = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const day = Number(parsed && parsed.day);
  const month = Number((parsed && parsed.month) || (monthParsed && monthParsed.month));
  const year = Number(monthParsed && monthParsed.year) || new Date().getFullYear();
  const shift = String((parsed && parsed.shift) || (String(dateLabel || '').match(/\b(R8|N8|R|N)\b/i) || [])[1] || '').toUpperCase();
  const isSunday = Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)
    ? new Date(year, month - 1, day).getDay() === 0
    : /(?:ne|neděle|nedele)/i.test(String(dateLabel || ''));
  return { day, month, year, shift, isSunday };
}

function adminRotationGeneratorIsOvertimeSunday(dateLabel, monthKey, month) {
  const meta = adminRotationGeneratorParseDayMeta(dateLabel, monthKey);
  if (!meta.isSunday) return false;
  const baseKey = adminRotationDateBaseKey(dateLabel);
  const noteText = (Array.isArray(month && month.notes) ? month.notes : [])
    .filter((note) => adminRotationDateBaseKey(note && note.date) === baseKey)
    .map((note) => [note.person, note.code, note.text].map((part) => String(part || '')).join(' '))
    .join(' ');
  const date = Number.isFinite(meta.day) && Number.isFinite(meta.month) && Number.isFinite(meta.year)
    ? new Date(meta.year, meta.month - 1, meta.day)
    : null;
  if (date && typeof isSpecialOvertimeSundayNight === 'function' && isSpecialOvertimeSundayNight(date)) return true;
  return /přesčas|prescas|22\s*[-–]\s*6|22\s*h/i.test(String(dateLabel || '') + ' ' + noteText);
}

function adminRotationGeneratorIsMoOnlyOvertimeSunday(dateLabel, monthKey, month) {
  const meta = adminRotationGeneratorParseDayMeta(dateLabel, monthKey);
  if (!meta.isSunday) return false;
  const date = Number.isFinite(meta.day) && Number.isFinite(meta.month) && Number.isFinite(meta.year)
    ? new Date(meta.year, meta.month - 1, meta.day)
    : null;
  if (date && typeof isSpecialOvertimeSundayMoOnly === 'function' && isSpecialOvertimeSundayMoOnly(date)) return true;
  const baseKey = adminRotationDateBaseKey(dateLabel);
  const noteText = (Array.isArray(month && month.notes) ? month.notes : [])
    .filter((note) => adminRotationDateBaseKey(note && note.date) === baseKey)
    .map((note) => [note.person, note.code, note.text].map((part) => String(part || '')).join(' '))
    .join(' ');
  return /(?:jen|pouze)\s*MO|měkk(?:é|e)\s*obrábění|mekk(?:e|é)\s*obr/i.test(String(dateLabel || '') + ' ' + noteText);
}

function adminRotationGeneratorShouldSplitPressMachines(dateLabel, monthKey, month) {
  const manual = adminRotationGetPressRotationOverride(month, dateLabel);
  if (manual === 'split') return true;
  if (manual === 'nosplit') return false;
  const meta = adminRotationGeneratorParseDayMeta(dateLabel, monthKey);
  if (!meta.isSunday) return true;
  if (adminRotationGeneratorIsMoOnlyOvertimeSunday(dateLabel, monthKey, month)) return false;
  return adminRotationGeneratorIsOvertimeSunday(dateLabel, monthKey, month);
}

function adminRotationGeneratorAddMachineCount(machineMap, machineName, person, value) {
  const name = String(person || '').trim();
  const machine = String(machineName || '').trim();
  if (!name || !machine) return;
  if (!machineMap.has(machine)) machineMap.set(machine, new Map());
  const rowMap = machineMap.get(machine);
  rowMap.set(name, Number(rowMap.get(name) || 0) + Number(value || 0));
}

function adminRotationGeneratorFormatCount(value) {
  const n = Math.round((Number(value) || 0) * 10) / 10;
  if (!n) return '';
  return String(n).replace('.', ',');
}

function adminRotationGeneratorGetSoftCoreNames(knownNames) {
  const known = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  return generatorRules.softCore.filter((name) => known.includes(name));
}

function adminRotationGeneratorIsSoftCoreName(name, knownNames) {
  const known = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const canonical = adminRotationCanonicalName(name, known);
  return !!canonical && adminRotationGeneratorGetSoftCoreNames(known).includes(canonical);
}

function adminRotationGeneratorSoftCoreStateInfo(counters, knownNames) {
  const generatorRules = getAdminRotationGeneratorRules();
  const cycle = Array.isArray(generatorRules.softHardCycle) ? generatorRules.softHardCycle : [];
  const core = adminRotationGeneratorGetSoftCoreNames(knownNames);
  const blockLength = Math.max(1, Number(generatorRules.softHardBlockLength) || 3);
  const machineCursor = ((Number(counters && counters.softCoreMachineCursor || 0) % Math.max(1, cycle.length)) + Math.max(1, cycle.length)) % Math.max(1, cycle.length);
  const personCursor = ((Number(counters && counters.softCorePersonCursor || 0) % Math.max(1, core.length)) + Math.max(1, core.length)) % Math.max(1, core.length);
  const assigned = counters && counters.softCoreAssignedInMachineBlock instanceof Set
    ? counters.softCoreAssignedInMachineBlock
    : new Set();
  return {
    cycle,
    core,
    blockLength,
    machineCursor,
    personCursor,
    machine: cycle[machineCursor] || cycle[0] || 'TNKS01',
    assigned
  };
}

function adminRotationGeneratorSoftCoreFutureAvailability(month, knownNames, rowIdx, candidate, blockInfo) {
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  let score = 0;
  const scanEnd = Math.min(Math.max(hardRows.length, softRows.length) - 1, Number(rowIdx || 0) + Math.max(1, Number(blockInfo && blockInfo.blockLength) || 3));
  for (let i = rowIdx + 1; i <= scanEnd; i += 1) {
    const row = hardRows[i] || softRows[i] || null;
    const dateLabel = row && row.date ? row.date : '';
    if (!dateLabel) continue;
    const dayNotes = adminRotationGeneratorDateNotes(month, dateLabel);
    if (adminRotationGeneratorIsDayBlocked(dayNotes)) continue;
    const absenceNames = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
    if (!absenceNames.has(candidate)) score += 1;
  }
  return score;
}

function adminRotationGeneratorRemainingSoftCoreWorkDays(month, knownNames, rowIdx) {
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  const core = adminRotationGeneratorGetSoftCoreNames(knownNames);
  let count = 0;
  for (let idx = Number(rowIdx || 0) + 1; idx < maxRows; idx += 1) {
    const row = hardRows[idx] || softRows[idx] || null;
    const dateLabel = row && row.date ? row.date : '';
    if (!dateLabel) continue;
    const dayNotes = adminRotationGeneratorDateNotes(month, dateLabel);
    if (adminRotationGeneratorIsDayBlocked(dayNotes)) continue;
    const absenceNames = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
    if (core.some((name) => !absenceNames.has(name))) count += 1;
  }
  return count;
}

function adminRotationGeneratorShouldGapSoftCore(counters, knownNames, month, rowIdx) {
  const info = adminRotationGeneratorSoftCoreStateInfo(counters, knownNames);
  if (!info.core.length || info.blockLength <= 1) return false;
  const remaining = adminRotationGeneratorRemainingSoftCoreWorkDays(month, knownNames, rowIdx);
  const remainder = remaining % info.blockLength;
  // Mezera je jen zarovnani konce mesice: po dokoncenem bloku ji vloz, pokud by zbytek mesice
  // jinak rozjel necelou trojici na dalsim stroji. Uprostred mesice kvuli prubeznym poctum nestoji.
  return remaining >= info.blockLength && remainder > 0;
}

function adminRotationGeneratorAdvanceSoftCoreCycle(counters, knownNames, name, machineName, month, rowIdx) {
  if (!counters) return;
  const info = adminRotationGeneratorSoftCoreStateInfo(counters, knownNames);
  if (!info.core.includes(name)) return;
  const machineIdx = info.cycle.findIndex((machine) => String(machine || '').toUpperCase() === String(machineName || '').toUpperCase());
  if (machineIdx >= 0) counters.softCoreMachineCursor = machineIdx;
  counters.softCoreAssignedInMachineBlock.add(name);
  counters.softCoreFilledInMachine = Math.max(Number(counters.softCoreFilledInMachine || 0) + 1, counters.softCoreAssignedInMachineBlock.size);
  counters.softCoreHardCount[name] = Number(counters.softCoreHardCount[name] || 0) + 1;
  const personIdx = info.core.findIndex((person) => person === name);
  if (personIdx >= 0) counters.softCorePersonCursor = (personIdx + 1) % Math.max(1, info.core.length);
  if (counters.softCoreFilledInMachine >= info.blockLength || counters.softCoreAssignedInMachineBlock.size >= Math.min(info.blockLength, info.core.length)) {
    counters.softCoreMachineCursor = (Number(counters.softCoreMachineCursor || 0) + 1) % Math.max(1, info.cycle.length);
    counters.softCoreFilledInMachine = 0;
    counters.softCoreAssignedInMachineBlock = new Set();
    counters.softCoreGapPending = adminRotationGeneratorShouldGapSoftCore(counters, knownNames, month, rowIdx);
  }
}

function adminRotationGeneratorPickSoftCoreForHard(month, knownNames, rowIdx, machineIdx, available, usedNames, counters, monthKey) {
  const info = adminRotationGeneratorSoftCoreStateInfo(counters, knownNames);
  const core = info.core;
  const machineName = HARD_MACHINE_HEADERS[machineIdx] || '';
  if (!core.length || String(machineName || '').toUpperCase() !== String(info.machine || '').toUpperCase()) return '';
  const orderedCore = core.slice(info.personCursor).concat(core.slice(0, info.personCursor));
  const candidates = orderedCore.filter((name) => available.includes(name) && !usedNames.has(name) && !info.assigned.has(name)
    && adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, name, knownNames, monthKey, true));
  if (!candidates.length) return '';
  const minMonthly = Math.min(...core.map((name) => Number(counters.softCoreHardCount[name] || 0)));
  const safeCandidates = candidates.filter((name) => Number(counters.softCoreHardCount[name] || 0) <= minMonthly + 1);
  const list = safeCandidates.length ? safeCandidates : candidates;
  const ordered = list.slice().sort((a, b) => {
    const countDiff = Number(counters.softCoreHardCount[a] || 0) - Number(counters.softCoreHardCount[b] || 0);
    if (countDiff) return countDiff;
    const cursorDiff = orderedCore.indexOf(a) - orderedCore.indexOf(b);
    if (cursorDiff) return cursorDiff;
    const futureDiff = adminRotationGeneratorSoftCoreFutureAvailability(month, knownNames, rowIdx, a, info) - adminRotationGeneratorSoftCoreFutureAvailability(month, knownNames, rowIdx, b, info);
    if (futureDiff) return futureDiff;
    return a.localeCompare(b, 'cs');
  });
  return ordered[0] || '';
}

function adminRotationGeneratorSkipUnavailableSoftCoreRemainder(month, knownNames, rowIdx, available, usedNames, counters, monthKey) {
  const info = adminRotationGeneratorSoftCoreStateInfo(counters, knownNames);
  const machineName = String(info.machine || '').toUpperCase();
  const machineIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machineName);
  if (!info.core.length || machineIdx < 0 || !(info.assigned instanceof Set) || !info.assigned.size) return false;
  const remaining = info.core.filter((name) => !info.assigned.has(name));
  if (!remaining.length) return false;
  const canUseRemainderToday = remaining.some((name) => available.includes(name) && !usedNames.has(name)
    && adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, name, knownNames, monthKey, true));
  if (canUseRemainderToday) return false;
  const orderedCore = info.core.slice(info.personCursor).concat(info.core.slice(0, info.personCursor));
  const absentRemaining = orderedCore.filter((name) => remaining.includes(name) && !available.includes(name));
  const skipped = absentRemaining[0] || orderedCore.find((name) => remaining.includes(name)) || remaining[0];
  if (!skipped) return false;
  counters.softCoreAssignedInMachineBlock.add(skipped);
  counters.softCoreFilledInMachine = Math.max(Number(counters.softCoreFilledInMachine || 0) + 1, counters.softCoreAssignedInMachineBlock.size);
  const skippedIdx = info.core.indexOf(skipped);
  if (skippedIdx >= 0) counters.softCorePersonCursor = (skippedIdx + 1) % Math.max(1, info.core.length);
  if (!Array.isArray(counters.softCoreSkippedSlots)) counters.softCoreSkippedSlots = [];
  counters.softCoreSkippedSlots.push({ rowIdx, name: skipped, machine: machineName });
  if (counters.softCoreFilledInMachine >= info.blockLength || counters.softCoreAssignedInMachineBlock.size >= Math.min(info.blockLength, info.core.length)) {
    counters.softCoreMachineCursor = (Number(counters.softCoreMachineCursor || 0) + 1) % Math.max(1, info.cycle.length);
    counters.softCoreFilledInMachine = 0;
    counters.softCoreAssignedInMachineBlock = new Set();
  }
  counters.softCoreGapPending = false;
  return skipped;
}

function adminRotationGeneratorBaseLathePerson(machineName, knownNames, available, usedNames) {
  const generatorRules = getAdminRotationGeneratorRules();
  const map = generatorRules.softBaseLathe || {};
  const wantedEntry = Object.entries(map).find((entry) => String(entry[1] || '').toUpperCase() === String(machineName || '').toUpperCase());
  const person = wantedEntry ? adminRotationCanonicalName(wantedEntry[0], knownNames) : '';
  return person && knownNames.includes(person) && available.includes(person) && !usedNames.has(person) ? person : '';
}

function adminRotationGeneratorMachineGroupForName(machineName) {
  const m = String(machineName || '').trim().toUpperCase();
  if (/^TPKW01/.test(m)) return 'TPKW01';
  if (/^TPKW02/.test(m)) return 'TPKW02';
  if (/^MSK/.test(m)) return 'MSK';
  if (/^MFK/.test(m)) return 'MFK';
  if (/^TNK/.test(m)) return 'TNK';
  if (/^TBK/.test(m)) return 'TBK';
  return '';
}

function adminRotationGeneratorPersonKnowsMachine(name, machineName) {
  const skills = typeof getWorkerMachineSkills === 'function' ? getWorkerMachineSkills(name) : [];
  if (!Array.isArray(skills) || !skills.length) return true;
  const group = adminRotationGeneratorMachineGroupForName(machineName);
  if (!group) return true;
  return skills.includes(group);
}

// RAK_GENERATOR_SOLO_MILL_STREAK_17007
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
}
function adminRotationGeneratorHardTarget(knownNames, available) {
  return adminRotationGeneratorThreeAbsences(knownNames, available) ? 4 : Math.min(HARD_MACHINE_HEADERS.length, available.length);
}

function adminRotationGeneratorBuildDay(month, model, counters, rowIdx, dateLabel, blockedNames, monthKey) {
  const knownNames = model.knownNames;
  const generatorRules = getAdminRotationGeneratorRules();
  const softPreferred = generatorRules.softPreferred.filter((name) => knownNames.includes(name));
  const hardPreferred = generatorRules.hardPreferred.filter((name) => knownNames.includes(name));
  const available = knownNames.filter((name) => !blockedNames.has(name));
  const usedNames = new Set();
  const forcedSoft = new Set();
  const hardCells = Array(HARD_MACHINE_HEADERS.length).fill('');
  const softCells = Array(SOFT_MACHINE_HEADERS.length).fill('');
  const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);
  const softTargetCount = Math.max(0, Math.min(SOFT_MACHINE_HEADERS.length, available.length - hardTargetCount));

  if (!available.length) return { hardCells, softCells, filledCells: 0, emptyProtected: 0 };

  const assignHardCell = (machineIdx, name, reason) => {
    const machineName = HARD_MACHINE_HEADERS[machineIdx] || '';
    if (adminRotationGeneratorThreeAbsences(knownNames, available) && machineName === 'TPKW02') return false;
    if (machineIdx < 0 || !machineName || !name || usedNames.has(name) || !available.includes(name) || hardCells[machineIdx]) return false;
    if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, name, knownNames, monthKey, reason === 'soft-core-hard-block')) return false;
    if (!adminRotationGeneratorPersonKnowsMachine(name, machineName)) return false;
    hardCells[machineIdx] = name;
    usedNames.add(name);
    adminRotationGeneratorMarkAssignment(counters, 'hard', machineName, name);
    if (reason === 'hard-cycle') adminRotationGeneratorAdvanceHardCycle(counters, name);
    if (reason === 'soft-core-hard-block') adminRotationGeneratorAdvanceSoftCoreCycle(counters, knownNames, name, machineName, month, rowIdx);
    return true;
  };

  const assignSoftCell = (machineIdx, name, reason) => {
    const machineName = SOFT_MACHINE_HEADERS[machineIdx] || '';
    if (machineIdx < 0 || !machineName || !name || usedNames.has(name) || !available.includes(name) || softCells[machineIdx]) return false;
    if (!adminRotationGeneratorPersonKnowsMachine(name, machineName)) return false;
    if (machineName === 'MFKF10' && softTargetCount < 5 && !adminRotationGeneratorCanUseSoloMill(month, rowIdx, name, knownNames, monthKey)) return false;
    const kind = adminRotationGeneratorSoftKind(machineName);
    softCells[machineIdx] = name;
    usedNames.add(name);
    adminRotationGeneratorMarkAssignment(counters, 'soft', machineName, name, kind);
    return true;
  };

  // 1) Nejdřív rozepiš základ Tvrdoty podle návazné rotace z minulého měsíce:
  // TBKR01 → TNKS01 → TBKR07 → TPKW01 → TPKW02.
  hardPreferred.filter((name) => available.includes(name)).forEach((name) => {
    if (usedNames.size >= hardTargetCount) return;
    const wantedMachine = adminRotationGeneratorNextHardCycleMachine(counters, name);
    const wantedIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, wantedMachine);
    if (assignHardCell(wantedIdx, name, 'hard-cycle')) return;
    const cycle = Array.isArray(generatorRules.hardCycle) ? generatorRules.hardCycle : [];
    for (const machine of cycle) {
      const idx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machine);
      if (assignHardCell(idx, name, 'hard-cycle')) return;
    }
  });

  // 2) Pak přesuň jednoho ze základu Měkoty na tvrdotní stroj v 3denním bloku.
  // Když někdo z nich později chybí, pořadí se smí prohodit, aby se tomu nevyhnul.
  let softCoreBlock = adminRotationGeneratorSoftCoreStateInfo(counters, knownNames);
  let cycleMachine = softCoreBlock.machine;
  let cycleIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, cycleMachine);
  let exchangeSoft = '';
  if (counters.softCoreGapPending) {
    counters.softCoreGapPending = false;
  } else {
    exchangeSoft = cycleIdx >= 0 && hardTargetCount > 0 && !(adminRotationGeneratorThreeAbsences(knownNames, available) && cycleMachine === 'TPKW02')
      ? adminRotationGeneratorPickSoftCoreForHard(month, knownNames, rowIdx, cycleIdx, available, usedNames, counters, monthKey)
      : '';
    if (!exchangeSoft && !(adminRotationGeneratorThreeAbsences(knownNames, available) && cycleMachine === 'TPKW02')) adminRotationGeneratorSkipUnavailableSoftCoreRemainder(month, knownNames, rowIdx, available, usedNames, counters, monthKey);
  }
  const displacedToSoft = [];
  if (exchangeSoft && cycleIdx >= 0 && available.includes(exchangeSoft) && !usedNames.has(exchangeSoft)) {
    const displaced = adminRotationCanonicalName(hardCells[cycleIdx], knownNames);
    if (displaced) {
      adminRotationGeneratorUnmarkAssignment(counters, 'hard', HARD_MACHINE_HEADERS[cycleIdx] || '', displaced);
      usedNames.delete(displaced);
      forcedSoft.add(displaced);
      displacedToSoft.push(displaced);
    }
    hardCells[cycleIdx] = '';
    assignHardCell(cycleIdx, exchangeSoft, 'soft-core-hard-block');
  }

  const filterHardCandidates = (machineName, candidates) => Array.from(new Set(Array.isArray(candidates) ? candidates : []))
    .filter((name) => adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, name, knownNames, monthKey));

  // 3) Doplnění zbytku Tvrdoty až po základním rozepsání a výměně.
  HARD_MACHINE_HEADERS.forEach((machineName, machineIdx) => {
    if (hardCells[machineIdx] || hardCells.filter((cell) => String(cell || '').trim()).length >= hardTargetCount) return;
    const historicalCandidates = (model.dayTemplates[rowIdx % model.dayTemplates.length] && model.dayTemplates[rowIdx % model.dayTemplates.length].hardCells) || [];
    const suggested = adminRotationCanonicalName(historicalCandidates[machineIdx] || '', knownNames);
    const preferred = hardPreferred.filter((name) => available.includes(name) && !forcedSoft.has(name));
    const balancing = ['Špadrna', 'Novotný'].map((name) => adminRotationCanonicalName(name, knownNames)).filter((name) => available.includes(name) && !forcedSoft.has(name));
    const fallback = available.filter((name) => !softPreferred.includes(name) && !forcedSoft.has(name))
      .concat(balancing, available.filter((name) => softPreferred.includes(name) && !forcedSoft.has(name)));
    const ordered = filterHardCandidates(machineName, (suggested ? [suggested] : []).concat(preferred, fallback)).filter((name) => available.includes(name));
    const name = adminRotationGeneratorPickName(ordered, usedNames, counters, {
      sectionKey: 'hard',
      machineName,
      rowIdx,
      preferred: hardPreferred,
      avoid: softPreferred,
      historical: adminRotationGeneratorHistoricalMachineScore(model, 'hard', machineIdx, suggested || '')
    });
    if (name) assignHardCell(machineIdx, name, hardPreferred.includes(name) ? 'hard-cycle' : 'hard-fill');
  });

  const softSlots = adminRotationGeneratorSoftSlotPlan(Math.min(softTargetCount, available.filter((name) => !usedNames.has(name)).length));
  const hasSoftSlot = (machineName) => softSlots.includes(adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, machineName));
  const latheAvoidNames = adminRotationGeneratorAvoidLatheNamesForPlan(generatorRules, softSlots, knownNames);
  const softKindBalanceNames = generatorRules.softKindGlobalBalanceEnabled === false
    ? adminRotationGeneratorRawList(generatorRules.hardPeopleSoftKindBalanceNames)
      .map((name) => adminRotationCanonicalName(name, knownNames))
      .filter((name) => name && knownNames.includes(name))
    : [];

  // 4) Základ Měkoty: Třasák/MSKC01, Střížek/MSKC03, Synek/MSKC04, pokud jsou dostupní a nejsou zrovna na Tvrdotě.
  ['MSKC01', 'MSKC03', 'MSKC04'].forEach((machineName) => {
    const idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, machineName);
    if (!hasSoftSlot(machineName) || softCells[idx]) return;
    const base = adminRotationGeneratorBaseLathePerson(machineName, knownNames, available, usedNames);
    if (base) assignSoftCell(idx, base, 'soft-base-lathe');
  });

  // 5) Člověk vytlačený z Tvrdoty člověkem z Měkoty jde přednostně na frézky.
  ['MFKF10', 'MFKF06'].forEach((machineName) => {
    const idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, machineName);
    if (!hasSoftSlot(machineName) || softCells[idx]) return;
    const displacedCandidates = displacedToSoft.filter((person) => available.includes(person) && !usedNames.has(person));
    const safeDisplacedCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates(month, rowIdx, machineName, displacedCandidates, knownNames);
    const name = safeDisplacedCandidates[0] || '';
    if (name) assignSoftCell(idx, name, 'hard-displaced-to-mill');
  });

  // 6) Špadrna a Novotný pomáhají vyrovnat Tvrdotu; zbytek dnů jdou hlavně na frézky/Měkotu.
  softSlots.forEach((machineIdx) => {
    if (softCells[machineIdx]) return;
    const machineName = SOFT_MACHINE_HEADERS[machineIdx] || '';
    const kind = adminRotationGeneratorSoftKind(machineName);
    const remainingNow = available.filter((name) => !usedNames.has(name));
    const baseLathe = kind === 'lathe' ? adminRotationGeneratorBaseLathePerson(machineName, knownNames, available, usedNames) : '';
    const flexSoft = ['Špadrna', 'Novotný'].map((name) => adminRotationCanonicalName(name, knownNames)).filter((name) => remainingNow.includes(name));
    const avoidLathe = kind === 'lathe' ? latheAvoidNames.filter((name) => remainingNow.includes(name)) : [];
    const nonAvoid = (name) => !avoidLathe.includes(name);
    const latheBase = baseLathe && nonAvoid(baseLathe) ? [baseLathe] : [];
    const preferred = kind === 'mill'
      ? displacedToSoft.concat(flexSoft, remainingNow.filter((name) => !softPreferred.includes(name)), remainingNow.filter((name) => softPreferred.includes(name)))
      : latheBase.concat(
        remainingNow.filter((name) => softPreferred.includes(name) && nonAvoid(name)),
        flexSoft.filter(nonAvoid),
        remainingNow.filter((name) => !softPreferred.includes(name) && nonAvoid(name)),
        avoidLathe
      );
    const pickCandidates = adminRotationGeneratorAvoidRepeatedSoloMillCandidates(month, rowIdx, machineName, Array.from(new Set(preferred)), knownNames);
    const name = adminRotationGeneratorPickName(pickCandidates, usedNames, counters, {
      sectionKey: 'soft',
      machineName,
      rowIdx,
      softKind: kind,
      softKindBalanceEnabled: generatorRules.hardPeopleSoftKindBalanceEnabled !== false,
      softKindBalanceNames,
      softKindMixedMinimumShifts: generatorRules.softKindMixedMinimumShifts,
      preferred: kind === 'lathe' ? softPreferred : hardPreferred,
      avoid: avoidLathe,
      historical: adminRotationGeneratorHistoricalMachineScore(model, 'soft', machineIdx, preferred[0] || '')
    });
    if (name) assignSoftCell(machineIdx, name, 'soft-fill');
  });

  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const mskc01Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC01');
  const millPeopleCount = [mfkf06Idx, mfkf10Idx].filter((idx) => idx >= 0 && String(softCells[idx] || '').trim()).length;
  const lathePeopleCount = [mskc01Idx, adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC03'), adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MSKC04')].filter((idx) => idx >= 0 && String(softCells[idx] || '').trim()).length;
  let emptyProtected = 0;
  if (millPeopleCount === 1 && mfkf06Idx >= 0) {
    const removed = adminRotationCanonicalName(softCells[mfkf06Idx], knownNames);
    if (removed) adminRotationGeneratorUnmarkAssignment(counters, 'soft', 'MFKF06', removed, 'mill');
    softCells[mfkf06Idx] = '';
    emptyProtected += 1;
  }
  if (softTargetCount === 3 && lathePeopleCount === 2 && mskc01Idx >= 0) {
    const removed = adminRotationCanonicalName(softCells[mskc01Idx], knownNames);
    if (removed) adminRotationGeneratorUnmarkAssignment(counters, 'soft', 'MSKC01', removed, 'lathe');
    softCells[mskc01Idx] = '';
    emptyProtected += 1;
  }

  return {
    hardCells,
    softCells,
    filledCells: hardCells.concat(softCells).filter((cell) => String(cell || '').trim()).length,
    emptyProtected
  };
}

function adminRotationGeneratorCollectWorkingNames(month, knownNames) {
  const working = new Set();
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const addRows = (sectionKey) => {
    const section = month && month[sectionKey] ? month[sectionKey] : null;
    const rows = Array.isArray(section && section.rows) ? section.rows : [];
    rows.forEach((row) => {
      (Array.isArray(row && row.cells) ? row.cells : []).forEach((cell) => {
        const name = adminRotationCanonicalName(cell, names);
        if (name && names.includes(name)) working.add(name);
      });
    });
  };
  addRows('hard');
  addRows('soft');
  return Array.from(working);
}

function adminRotationGeneratorCountHardMachine(month, machineName, names, monthKey) {
  const result = Object.create(null);
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  list.forEach((name) => { result[name] = 0; });
  const wanted = String(machineName || '').toUpperCase();
  const tnksIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TNKS01');
  const tpkw01Idx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TPKW01');
  const machineIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machineName);
  const rows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  if (machineIdx < 0) return result;
  rows.forEach((row) => {
    const splitPress = adminRotationGeneratorShouldSplitPressMachines(row && row.date, monthKey, month);
    if ((wanted === 'TNKS01' || wanted === 'TPKW01') && splitPress && tnksIdx >= 0 && tpkw01Idx >= 0) {
      [tnksIdx, tpkw01Idx].forEach((idx) => {
        const name = adminRotationCanonicalName(row && row.cells ? row.cells[idx] : '', list);
        if (name && Object.prototype.hasOwnProperty.call(result, name)) result[name] += 0.5;
      });
      return;
    }
    const name = adminRotationCanonicalName(row && row.cells ? row.cells[machineIdx] : '', list);
    if (name && Object.prototype.hasOwnProperty.call(result, name)) result[name] += 1;
  });
  return result;
}

function adminRotationGeneratorPressYearBalanceExcludedNames(knownNames) {
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  return ['Střížek', 'Synek', 'Třasák']
    .map((name) => adminRotationCanonicalName(name, names))
    .filter(Boolean);
}

function adminRotationGeneratorIsPressYearBalanceExcluded(name, knownNames) {
  const canonical = adminRotationCanonicalName(name, Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
  if (!canonical) return false;
  return adminRotationGeneratorPressYearBalanceExcludedNames(knownNames).includes(canonical);
}

function adminRotationGeneratorHardMachinePersonAt(month, rowIdx, machineName, knownNames) {
  const rows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const row = rows[rowIdx] || null;
  const idx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machineName);
  if (!row || idx < 0) return '';
  return adminRotationCanonicalName(row && row.cells ? row.cells[idx] : '', Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
}

function adminRotationGeneratorIsPressMachine(machineName) {
  return /^(?:TNKS01|TPKW01)$/i.test(String(machineName || '').trim());
}

function adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey) {
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const row = hardRows[rowIdx] || softRows[rowIdx] || null;
  const dateLabel = String(row && row.date || '').trim();
  if (!dateLabel) return false;
  return !!adminRotationGeneratorShouldSplitPressMachines(dateLabel, monthKey, month);
}

function adminRotationGeneratorIsWorkingRow(month, rowIdx) {
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const row = hardRows[rowIdx] || softRows[rowIdx] || null;
  const dateLabel = String(row && row.date || '').trim();
  return !!dateLabel && !adminRotationGeneratorIsDayBlocked(adminRotationGeneratorDateNotes(month, dateLabel));
}

function adminRotationGeneratorIsFirstWorkingRow(month, rowIdx) {
  if (!adminRotationGeneratorIsWorkingRow(month, rowIdx)) return false;
  for (let idx = 0; idx < Number(rowIdx); idx += 1) {
    if (adminRotationGeneratorIsWorkingRow(month, idx)) return false;
  }
  return true;
}

function adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames) {
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const targetSort = adminRotationMonthSortValue(monthKey);
  const previousKeys = getAdminRotationMonthKeys()
    .filter((key) => adminRotationMonthSortValue(key) < targetSort)
    .sort((a, b) => adminRotationMonthSortValue(b) - adminRotationMonthSortValue(a));
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');

  for (const previousMonthKey of previousKeys) {
    const previousMonth = app.rotation && app.rotation.months ? app.rotation.months[previousMonthKey] : null;
    if (!previousMonth) continue;
    const hardRows = Array.isArray(previousMonth.hard && previousMonth.hard.rows) ? previousMonth.hard.rows : [];
    const softRows = Array.isArray(previousMonth.soft && previousMonth.soft.rows) ? previousMonth.soft.rows : [];
    for (let rowIdx = Math.max(hardRows.length, softRows.length) - 1; rowIdx >= 0; rowIdx -= 1) {
      if (!adminRotationGeneratorIsWorkingRow(previousMonth, rowIdx)) continue;
      const hardRow = hardRows[rowIdx] || null;
      const softRow = softRows[rowIdx] || null;
      const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
      const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
      const hasAssignment = hardCells.concat(softCells).some((cell) => !!adminRotationCanonicalName(cell, names));
      if (!hasAssignment) continue;
      const pressNames = adminRotationGeneratorPressCellsForRow(previousMonth, rowIdx, names, previousMonthKey)
        .map((cell) => cell.name);
      const mfkf06 = adminRotationCanonicalName(softCells[mfkf06Idx], names);
      const mfkf10 = adminRotationCanonicalName(softCells[mfkf10Idx], names);
      return {
        monthKey: previousMonthKey,
        rowIdx,
        dateLabel: String(hardRow && hardRow.date || softRow && softRow.date || ''),
        pressNames,
        soloMillName: !mfkf06 && mfkf10 ? mfkf10 : ''
      };
    }
  }
  return { monthKey: '', rowIdx: -1, dateLabel: '', pressNames: [], soloMillName: '' };
}

function adminRotationGeneratorPersonHasTnksWorkOnRow(month, rowIdx, person, knownNames, monthKey) {
  const name = adminRotationCanonicalName(person, Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
  if (!name) return false;
  if (adminRotationGeneratorHardMachinePersonAt(month, rowIdx, 'TNKS01', knownNames) === name) return true;
  if (!adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey)) return false;
  return adminRotationGeneratorHardMachinePersonAt(month, rowIdx, 'TPKW01', knownNames) === name;
}

function adminRotationGeneratorWouldBreakConsecutiveTnks(month, rowIdx, person, knownNames, monthKey) {
  const name = adminRotationCanonicalName(person, Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
  if (!name) return false;
  if (adminRotationGeneratorIsFirstWorkingRow(month, rowIdx)) {
    const boundary = adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames);
    if ((boundary.pressNames || []).includes(name)) return true;
  }
  return adminRotationGeneratorPersonHasTnksWorkOnRow(month, Number(rowIdx) - 1, name, knownNames, monthKey)
    || adminRotationGeneratorPersonHasTnksWorkOnRow(month, Number(rowIdx) + 1, name, knownNames, monthKey);
}

function adminRotationGeneratorCanUseSoloMill(month, rowIdx, person, knownNames, monthKey) {
  const name = adminRotationCanonicalName(person, Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
  if (!name || !adminRotationGeneratorIsFirstWorkingRow(month, rowIdx)) return true;
  const boundary = adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames);
  return boundary.soloMillName !== name;
}

function adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, person, knownNames, monthKey, allowSoftCoreBlock) {
  const machine = String(machineName || '').trim().toUpperCase();
  const name = adminRotationCanonicalName(person, Array.isArray(knownNames) ? knownNames : adminGetKnownNames());
  const generatorRules = getAdminRotationGeneratorRules();
  const softCore = (Array.isArray(generatorRules.softCore) ? generatorRules.softCore : [])
    .map((coreName) => adminRotationCanonicalName(coreName, Array.isArray(knownNames) ? knownNames : adminGetKnownNames()))
    .filter(Boolean);
  const softHardCycle = (Array.isArray(generatorRules.softHardCycle) ? generatorRules.softHardCycle : [])
    .map((cycleMachine) => String(cycleMachine || '').trim().toUpperCase())
    .filter(Boolean);
  if (name && softCore.includes(name)) {
    if (softHardCycle.length && !softHardCycle.includes(machine)) return false;
    if (allowSoftCoreBlock !== true) return false;
  }
  const countsAsTnks = machine === 'TNKS01' || (machine === 'TPKW01' && adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey));
  if (!countsAsTnks) return true;
  return !adminRotationGeneratorWouldBreakConsecutiveTnks(month, rowIdx, name, knownNames, monthKey);
}

function adminRotationGeneratorPressCellsForRow(month, rowIdx, knownNames, monthKey) {
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const hardRow = month && month.hard && Array.isArray(month.hard.rows) ? month.hard.rows[rowIdx] : null;
  const cells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
  const out = [];
  HARD_MACHINE_HEADERS.forEach((machineName, idx) => {
    const machine = String(machineName || '').trim().toUpperCase();
    const countsAsTnks = machine === 'TNKS01' || (machine === 'TPKW01' && adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey));
    if (!countsAsTnks) return;
    const name = adminRotationCanonicalName(cells[idx], names);
    if (name && names.includes(name)) out.push({ rowIdx, row: hardRow, cells, idx, machine, name });
  });
  return out;
}

function adminRotationGeneratorFindConsecutiveTnksIssues(month, monthKey, knownNames) {
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const issues = [];
  let previous = null;
  for (let rowIdx = 0; rowIdx < hardRows.length; rowIdx += 1) {
    const current = adminRotationGeneratorPressCellsForRow(month, rowIdx, names, monthKey);
    if (!current.length) continue;
    if (previous && previous.cells && previous.cells.length) {
      current.forEach((cell) => {
        const prev = previous.cells.find((item) => item.name === cell.name);
        if (prev) issues.push({ rowIdx, previousRowIdx: previous.rowIdx, previous: prev, current: cell });
      });
    }
    previous = { rowIdx, cells: current };
  }
  return issues;
}

function adminRotationGeneratorFindSwapCellsOnDay(month, rowIdx, person, knownNames) {
  const wanted = adminRotationCanonicalName(person, knownNames);
  const out = [];
  const scan = (sectionKey, headers) => {
    const row = month && month[sectionKey] && Array.isArray(month[sectionKey].rows) ? month[sectionKey].rows[rowIdx] : null;
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    cells.forEach((cell, idx) => {
      const name = adminRotationCanonicalName(cell, knownNames);
      if (!name || name === wanted || !knownNames.includes(name)) return;
      const machine = headers[idx] || '';
      const isPress = sectionKey === 'hard' && (machine === 'TNKS01' || machine === 'TPKW01');
      if (isPress) return;
      out.push({ sectionKey, row, cells, idx, machine, name });
    });
  };
  scan('soft', SOFT_MACHINE_HEADERS);
  scan('hard', HARD_MACHINE_HEADERS);
  return out;
}

function adminRotationGeneratorRepairConsecutiveTnks(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  if (!month || !knownNames.length) return { repairs: 0, remaining: 0 };
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  let repairs = 0;
  const maxPasses = Math.max(1, (Array.isArray(month.hard && month.hard.rows) ? month.hard.rows.length : 0) * 3);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const issues = adminRotationGeneratorFindConsecutiveTnksIssues(month, monthKey, knownNames);
    if (!issues.length) return { repairs, remaining: 0 };
    const issue = issues[0];
    const current = issue.current;
    if (!current || !current.cells) break;
    if (softCore.has(current.name)) break;
    const counts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', knownNames, monthKey);
    const candidates = adminRotationGeneratorFindSwapCellsOnDay(month, current.rowIdx, current.name, knownNames)
      .filter((cell) => !softCore.has(cell.name))
      .filter((cell) => adminRotationGeneratorPersonKnowsMachine(cell.name, current.machine))
      .filter((cell) => adminRotationGeneratorPersonKnowsMachine(current.name, cell.machine))
      .filter((cell) => adminRotationGeneratorCanUseHardMachine(month, current.rowIdx, current.machine, cell.name, knownNames, monthKey))
      .sort((a, b) => Number(counts[a.name] || 0) - Number(counts[b.name] || 0) || a.name.localeCompare(b.name, 'cs'));
    const swap = candidates[0];
    if (!swap || !swap.cells) break;
    swap.cells[swap.idx] = current.name;
    current.cells[current.idx] = swap.name;
    repairs += 1;
  }
  return { repairs, remaining: adminRotationGeneratorFindConsecutiveTnksIssues(month, monthKey, knownNames).length };
}

function adminRotationGeneratorFindSoftCoreSequenceIssues(month, monthKey, knownNames) {
  const names = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  const core = adminRotationGeneratorGetSoftCoreNames(names);
  const cycle = (Array.isArray(generatorRules.softHardCycle) ? generatorRules.softHardCycle : [])
    .map((machine) => String(machine || '').trim().toUpperCase())
    .filter(Boolean);
  if (!month || !core.length || !cycle.length) return [];

  const historyModel = adminBuildRotationGenerationModel(monthKey);
  const historyState = historyModel && historyModel.softCoreCycleState ? historyModel.softCoreCycleState : {};
  const blockLength = Math.max(1, Number(generatorRules.softHardBlockLength) || core.length || 3);
  let machineCursor = ((Number(historyState.machineCursor || 0) % cycle.length) + cycle.length) % cycle.length;
  let personCursor = ((Number(historyState.personCursor || 0) % core.length) + core.length) % core.length;
  let filled = Math.max(0, Number(historyState.filledInMachine || 0));
  let assigned = new Set((Array.isArray(historyState.assignedInMachineBlock) ? historyState.assignedInMachineBlock : [])
    .map((name) => adminRotationCanonicalName(name, names))
    .filter((name) => core.includes(name)));
  const issues = [];
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];

  hardRows.forEach((row, rowIdx) => {
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    let completedBySkippedAbsence = false;
    if (assigned.size) {
      const dateLabel = String(row && row.date || '');
      const absences = adminRotationUnavailableNamesForDate(month, dateLabel, names);
      const remaining = core.filter((name) => !assigned.has(name));
      if (remaining.length && remaining.every((name) => absences.has(name))) {
        const ordered = core.slice(personCursor).concat(core.slice(0, personCursor));
        const skipped = ordered.find((name) => remaining.includes(name)) || remaining[0];
        assigned.add(skipped);
        filled = Math.max(filled + 1, assigned.size);
        personCursor = (core.indexOf(skipped) + 1) % Math.max(1, core.length);
        if (filled >= blockLength || assigned.size >= Math.min(blockLength, core.length)) {
          machineCursor = (machineCursor + 1) % cycle.length;
          filled = 0;
          assigned = new Set();
          completedBySkippedAbsence = true;
        }
      }
    }
    cells.forEach((cell, machineIdx) => {
      const name = adminRotationCanonicalName(cell, names);
      if (!core.includes(name)) return;
      const machine = String(HARD_MACHINE_HEADERS[machineIdx] || '').trim().toUpperCase();
      if (!cycle.includes(machine)) return;
      if (completedBySkippedAbsence) {
        issues.push({ rowIdx, date: String(row && row.date || ''), name, machine, expectedMachine: cycle[machineCursor] || cycle[0], type: 'new-block-on-skipped-day' });
        return;
      }
      const expectedMachine = cycle[machineCursor] || cycle[0];
      if (machine !== expectedMachine) {
        issues.push({
          rowIdx,
          date: String(row && row.date || ''),
          name,
          machine,
          expectedMachine,
          type: 'machine-before-block-complete'
        });
        return;
      }
      if (assigned.has(name)) {
        issues.push({
          rowIdx,
          date: String(row && row.date || ''),
          name,
          machine,
          expectedMachine,
          type: 'duplicate-in-block'
        });
        return;
      }
      assigned.add(name);
      filled = Math.max(filled + 1, assigned.size);
      personCursor = (core.indexOf(name) + 1) % Math.max(1, core.length);
      if (filled >= blockLength || assigned.size >= Math.min(blockLength, core.length)) {
        machineCursor = (machineCursor + 1) % cycle.length;
        filled = 0;
        assigned = new Set();
      }
    });
  });
  return issues;
}

function adminRotationGeneratorFindPersonCellOnDay(month, rowIdx, person, preferredSection) {
  const wanted = String(person || '').trim();
  if (!wanted) return null;
  const scan = (sectionKey, machines) => {
    const section = month && month[sectionKey] ? month[sectionKey] : null;
    const row = section && Array.isArray(section.rows) ? section.rows[rowIdx] : null;
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    for (let idx = 0; idx < cells.length; idx += 1) {
      const cellName = String(cells[idx] || '').trim();
      if (cellName === wanted) return { sectionKey, row, cells, idx, machine: machines[idx] || '' };
    }
    return null;
  };
  if (preferredSection === 'soft') {
    return scan('soft', SOFT_MACHINE_HEADERS) || scan('hard', HARD_MACHINE_HEADERS);
  }
  if (preferredSection === 'hard') {
    return scan('hard', HARD_MACHINE_HEADERS) || scan('soft', SOFT_MACHINE_HEADERS);
  }
  return scan('soft', SOFT_MACHINE_HEADERS) || scan('hard', HARD_MACHINE_HEADERS);
}

function adminRotationGeneratorCountSoloMill(month, names) {
  const result = Object.create(null);
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  list.forEach((name) => { result[name] = 0; });
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (mfkf06Idx < 0 || mfkf10Idx < 0) return result;
  rows.forEach((row) => {
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    const mfkf06 = adminRotationCanonicalName(cells[mfkf06Idx], list);
    const mfkf10 = adminRotationCanonicalName(cells[mfkf10Idx], list);
    if (!mfkf06 && mfkf10 && Object.prototype.hasOwnProperty.call(result, mfkf10)) result[mfkf10] += 1;
  });
  return result;
}

function adminRotationGeneratorFindSoloMillSwapCell(month, rowIdx, lowName) {
  const wanted = String(lowName || '').trim();
  if (!wanted) return null;
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const hardRow = month && month.hard && Array.isArray(month.hard.rows) ? month.hard.rows[rowIdx] : null;
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
  const scanSoft = () => {
    for (let idx = 0; idx < softCells.length; idx += 1) {
      if (idx === mfkf06Idx || idx === mfkf10Idx) continue;
      if (String(softCells[idx] || '').trim() === wanted) return { sectionKey: 'soft', row: softRow, cells: softCells, idx, machine: SOFT_MACHINE_HEADERS[idx] || '' };
    }
    return null;
  };
  const scanHard = (avoidPress) => {
    for (let idx = 0; idx < hardCells.length; idx += 1) {
      const machine = HARD_MACHINE_HEADERS[idx] || '';
      if (avoidPress && /^(?:TNKS01|TPKW01)$/i.test(machine)) continue;
      if (String(hardCells[idx] || '').trim() === wanted) return { sectionKey: 'hard', row: hardRow, cells: hardCells, idx, machine };
    }
    return null;
  };
  return scanSoft() || scanHard(true) || scanHard(false);
}

function adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, person, knownNames) {
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const mill06 = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mill10 = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  for (const direction of [-1, 1]) {
    let idx = rowIdx + direction;
    while (idx >= 0 && idx < rows.length && !adminRotationGeneratorIsWorkingRow(month, idx)) idx += direction;
    if (idx < 0 || idx >= rows.length) continue;
    const cells = Array.isArray(rows[idx] && rows[idx].cells) ? rows[idx].cells : [];
    const solo = !adminRotationGeneratorCanonicalSoloCell(cells[mill06], knownNames) && adminRotationGeneratorCanonicalSoloCell(cells[mill10], knownNames);
    if (solo === person) return true;
  }
  return false;
}
function adminRotationGeneratorCanonicalSoloCell(cell, knownNames) {
  return adminRotationCanonicalName(cell, knownNames);
}

function adminRotationGeneratorBalanceSoloMill(month, model) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  if (generatorRules.soloMillBalanceEnabled === false) return { swaps: 0, counts: Object.create(null), disabled: true };
  const allowedSpread = Math.max(0, Math.min(6, Number(generatorRules.soloMillMaxSpread ?? 1) || 1));
  const workingNames = adminRotationGeneratorCollectWorkingNames(month, knownNames).filter((name) => knownNames.includes(name));
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (mfkf06Idx < 0 || mfkf10Idx < 0 || !workingNames.length || !softRows.length) return { swaps: 0, counts: Object.create(null) };
  let counts = adminRotationGeneratorCountSoloMill(month, workingNames);
  let swaps = 0;
  const maxPasses = softRows.length * 2;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const highNames = workingNames.slice().sort((a, b) => Number(counts[b] || 0) - Number(counts[a] || 0));
    const lowNames = workingNames.slice().sort((a, b) => Number(counts[a] || 0) - Number(counts[b] || 0));
    const highName = highNames[0];
    if (!highName || Number(counts[highName] || 0) <= allowedSpread) break;
    let didSwap = false;
    for (const lowName of lowNames) {
      if (!lowName || lowName === highName) continue;
      if (Number(counts[highName] || 0) - Number(counts[lowName] || 0) <= allowedSpread) break;
      for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
        const softRow = softRows[rowIdx];
        const cells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
        const mfkf06 = adminRotationCanonicalName(cells[mfkf06Idx], knownNames);
        const mfkf10 = adminRotationCanonicalName(cells[mfkf10Idx], knownNames);
        if (mfkf06 || mfkf10 !== highName) continue;
        if (!adminRotationGeneratorCanUseSoloMill(month, rowIdx, lowName, knownNames, monthKey)) continue;
        const lowCell = adminRotationGeneratorFindSoloMillSwapCell(month, rowIdx, lowName);
        if (!lowCell || !lowCell.cells) continue;
        if (!adminRotationGeneratorPersonKnowsMachine(lowName, 'MFKF10') || !adminRotationGeneratorPersonKnowsMachine(highName, lowCell.machine)) continue;
        if (adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, lowName, knownNames)) continue;
        if (lowCell.sectionKey === 'hard' && /^(?:TNKS01|TPKW01|TPKW02)$/.test(lowCell.machine)) continue;
        if (lowCell.sectionKey === 'hard' && (adminRotationGeneratorIsSoftCoreName(highName, knownNames) || adminRotationGeneratorIsSoftCoreName(lowName, knownNames))) continue;
        lowCell.cells[lowCell.idx] = highName;
        cells[mfkf10Idx] = lowName;
        counts[highName] = Number(counts[highName] || 0) - 1;
        counts[lowName] = Number(counts[lowName] || 0) + 1;
        swaps += 1;
        didSwap = true;
        break;
      }
      if (didSwap) break;
    }
    if (!didSwap) break;
  }
  return { swaps, counts };
}

// RAK_GENERATOR_FINAL_SOLO_MILL_REPAIR_17008
function adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) {
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  const row = rows[Number(rowIdx)] || null;
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  if (mfkf06Idx < 0 || mfkf10Idx < 0 || !cells.length) return '';
  const on06 = adminRotationCanonicalName(cells[mfkf06Idx], knownNames);
  const on10 = adminRotationCanonicalName(cells[mfkf10Idx], knownNames);
  return !on06 && on10 ? on10 : '';
}

function adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, repeatedName, knownNames, monthKey, soloCounts, candidateMaxCount) {
  const repeated = adminRotationCanonicalName(repeatedName, knownNames);
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  const mfkf06Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF06');
  const mfkf10Idx = adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, 'MFKF10');
  if (!repeated || mfkf06Idx < 0 || mfkf10Idx < 0 || !softCells.length) return null;
  if (adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) !== repeated) return null;

  const counts = soloCounts || adminRotationGeneratorCountSoloMill(month, knownNames);
  const candidates = knownNames
    .filter((name) => name && name !== repeated)
    .filter((name) => candidateMaxCount == null || Number(counts[name] || 0) <= Number(candidateMaxCount))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'))
    .filter((name) => !adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, name, knownNames))
    .filter((name) => adminRotationGeneratorCanUseSoloMill(month, rowIdx, name, knownNames, monthKey))
    .sort((a, b) => Number(counts[a] || 0) - Number(counts[b] || 0) || a.localeCompare(b, 'cs'));

  for (const candidate of candidates) {
    const candidateCell = adminRotationGeneratorFindSoloMillSwapCell(month, rowIdx, candidate);
    if (!candidateCell || !candidateCell.cells || !candidateCell.machine) continue;

    const candidateOnHard = candidateCell.sectionKey === 'hard';
    const protectedHard = candidateOnHard && /^(?:TNKS01|TPKW01|TPKW02)$/i.test(String(candidateCell.machine || ''));
    if (!protectedHard
        && adminRotationGeneratorPersonKnowsMachine(repeated, candidateCell.machine)
        && (!candidateOnHard || adminRotationGeneratorCanUseHardMachine(month, rowIdx, candidateCell.machine, repeated, knownNames, monthKey))
        && (!candidateOnHard || (!adminRotationGeneratorIsSoftCoreName(repeated, knownNames) && !adminRotationGeneratorIsSoftCoreName(candidate, knownNames)))) {
      candidateCell.cells[candidateCell.idx] = repeated;
      softCells[mfkf10Idx] = candidate;
      return { mode: 'direct', rowIdx, from: repeated, to: candidate, machine: candidateCell.machine };
    }

    // Když přímá výměna nejde (typicky každý z trojice má svůj základní soustruh),
    // zkus bezpečnou třícestnou výměnu pouze uvnitř měkoty:
    // kandidát -> MFKF10, původní solo člověk -> jiný soustruh, třetí člověk -> soustruh kandidáta.
    if (candidateCell.sectionKey !== 'soft') continue;
    const candidateMachine = String(candidateCell.machine || '').toUpperCase();
    if (!/^MSKCd+$/i.test(candidateMachine)) continue;
    for (let destIdx = 0; destIdx < softCells.length; destIdx += 1) {
      if (destIdx === candidateCell.idx || destIdx === mfkf06Idx || destIdx === mfkf10Idx) continue;
      const destMachine = String(SOFT_MACHINE_HEADERS[destIdx] || '').toUpperCase();
      if (!/^MSKCd+$/i.test(destMachine)) continue;
      const third = adminRotationCanonicalName(softCells[destIdx], knownNames);
      if (!third || third === repeated || third === candidate) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(repeated, destMachine)) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(third, candidateMachine)) continue;
      candidateCell.cells[candidateCell.idx] = third;
      softCells[destIdx] = repeated;
      softCells[mfkf10Idx] = candidate;
      return { mode: 'three-way-soft', rowIdx, from: repeated, to: candidate, third, machine: candidateMachine, destination: destMachine };
    }
  }
  return null;
}

function adminRotationGeneratorRepairConsecutiveSoloMill17008(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (!softRows.length || !knownNames.length) return { repairs: 0, direct: 0, threeWay: 0, unresolved: [] };

  let repairs = 0;
  let direct = 0;
  let threeWay = 0;
  const unresolved = [];
  const boundary = adminRotationGeneratorGetPreviousMonthBoundary(monthKey, knownNames);
  let previousSolo = String(boundary && boundary.soloMillName || '');
  let previousSoloRowIdx = -1;
  let counts = adminRotationGeneratorCountSoloMill(month, knownNames);

  for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
    if (!adminRotationGeneratorIsWorkingRow(month, rowIdx)) continue;
    let currentSolo = adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames);
    if (currentSolo && previousSolo && currentSolo === previousSolo) {
      let result = adminRotationGeneratorTryRepairSoloMillRow17008(month, rowIdx, currentSolo, knownNames, monthKey, counts);
      if (!result && previousSoloRowIdx >= 0) {
        result = adminRotationGeneratorTryRepairSoloMillRow17008(month, previousSoloRowIdx, currentSolo, knownNames, monthKey, counts);
      }
      if (result) {
        repairs += 1;
        if (result.mode === 'three-way-soft') threeWay += 1;
        else direct += 1;
        counts = adminRotationGeneratorCountSoloMill(month, knownNames);
      } else {
        unresolved.push({
          previousRowIdx: previousSoloRowIdx,
          rowIdx,
          name: currentSolo,
          date: String(softRows[rowIdx] && softRows[rowIdx].date || '')
        });
      }
      currentSolo = adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames);
    }
    previousSolo = currentSolo || '';
    previousSoloRowIdx = currentSolo ? rowIdx : -1;
  }

  return { repairs, direct, threeWay, unresolved, counts };
}

// RAK_GENERATOR_SOLO_MILL_SPREAD_17009
function adminRotationGeneratorRepairSoloMillSpread17009(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const rules = getAdminRotationGeneratorRules();
  if (rules.soloMillBalanceEnabled === false) return { repairs: 0, spread: 0, counts: Object.create(null), disabled: true };
  const allowedSpread = Math.max(0, Math.min(6, Number(rules.soloMillMaxSpread ?? 1) || 1));
  const workingNames = adminRotationGeneratorCollectWorkingNames(month, knownNames)
    .filter((name) => knownNames.includes(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MFKF10'));
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (workingNames.length < 2 || !softRows.length) return { repairs: 0, spread: 0, counts: adminRotationGeneratorCountSoloMill(month, workingNames) };

  let repairs = 0;
  let counts = adminRotationGeneratorCountSoloMill(month, workingNames);
  const maxPasses = Math.max(1, softRows.length * workingNames.length);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const values = workingNames.map((name) => Number(counts[name] || 0));
    const high = Math.max(...values);
    const low = Math.min(...values);
    if (high - low <= allowedSpread) break;

    const highNames = workingNames
      .filter((name) => Number(counts[name] || 0) === high)
      .sort((a, b) => a.localeCompare(b, 'cs'));
    let repaired = false;
    for (const highName of highNames) {
      for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
        if (!adminRotationGeneratorIsWorkingRow(month, rowIdx)) continue;
        if (adminRotationGeneratorSoloMillNameAtRow17008(month, rowIdx, knownNames) !== highName) continue;
        const allCounts = adminRotationGeneratorCountSoloMill(month, knownNames);
        const result = adminRotationGeneratorTryRepairSoloMillRow17008(
          month,
          rowIdx,
          highName,
          knownNames,
          monthKey,
          allCounts,
          high - allowedSpread - 1
        );
        if (!result) continue;
        repairs += 1;
        counts = adminRotationGeneratorCountSoloMill(month, workingNames);
        repaired = true;
        break;
      }
      if (repaired) break;
    }
    if (!repaired) break;
  }

  counts = adminRotationGeneratorCountSoloMill(month, workingNames);
  const finalValues = workingNames.map((name) => Number(counts[name] || 0));
  const spread = finalValues.length ? Math.max(...finalValues) - Math.min(...finalValues) : 0;
  return { repairs, spread, allowedSpread, counts, workingNames: workingNames.slice() };
}

// RAK_GENERATOR_SUNDAY_TBK_FAIRNESS_17011
function adminRotationGeneratorSundayCleanupGroup17011(machineName) {
  const machine = String(machineName || '').trim().toUpperCase();
  if (/^TBKR/.test(machine)) return 'TBK';
  if (/^MSKC/.test(machine)) return 'MSK';
  return '';
}

function adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey) {
  const meta = adminRotationGeneratorParseDayMeta(dateLabel, monthKey);
  return !!(meta && meta.isSunday && /^R/.test(String(meta.shift || '').toUpperCase()));
}

function adminRotationGeneratorCreateCleanupCounts17011(names) {
  const result = Object.create(null);
  (Array.isArray(names) ? names : []).forEach((name) => {
    result[name] = { TBK: 0, MSK: 0 };
  });
  return result;
}

function adminRotationGeneratorAddSundayCleanupMonth17011(counts, month, monthKey, names) {
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
    const hardRow = hardRows[rowIdx] || null;
    const softRow = softRows[rowIdx] || null;
    const dateLabel = String((hardRow && hardRow.date) || (softRow && softRow.date) || '').trim();
    if (!dateLabel || !adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey)) continue;
    const scan = (row, machines) => {
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      machines.forEach((machineName, idx) => {
        const group = adminRotationGeneratorSundayCleanupGroup17011(machineName);
        if (!group) return;
        const name = adminRotationCanonicalName(cells[idx], list);
        if (!name || !Object.prototype.hasOwnProperty.call(counts, name)) return;
        counts[name][group] = Number(counts[name][group] || 0) + 1;
      });
    };
    scan(hardRow, HARD_MACHINE_HEADERS);
    scan(softRow, SOFT_MACHINE_HEADERS);
  }
  return counts;
}

function adminRotationGeneratorYearCleanupCounts17011(month, monthKey, names) {
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  const counts = adminRotationGeneratorCreateCleanupCounts17011(list);
  const target = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  const targetYear = Number(target && target.year);
  const targetMonth = Number(target && target.month);
  if (Number.isFinite(targetYear) && Number.isFinite(targetMonth)) {
    getAdminRotationMonthKeys().forEach((historyKey) => {
      const parsed = typeof parseMonthKey === 'function' ? parseMonthKey(historyKey) : null;
      if (!parsed || Number(parsed.year) !== targetYear || Number(parsed.month) >= targetMonth) return;
      const historyMonth = app && app.rotation && app.rotation.months ? app.rotation.months[historyKey] : null;
      if (historyMonth) adminRotationGeneratorAddSundayCleanupMonth17011(counts, historyMonth, historyKey, list);
    });
  }
  adminRotationGeneratorAddSundayCleanupMonth17011(counts, month, monthKey, list);
  return counts;
}

function adminRotationGeneratorCleanupScore17011(counts, names) {
  const list = Array.isArray(names) ? names : [];
  if (!list.length) return 0;
  const totals = { TBK: 0, MSK: 0 };
  list.forEach((name) => {
    totals.TBK += Number(counts[name] && counts[name].TBK || 0);
    totals.MSK += Number(counts[name] && counts[name].MSK || 0);
  });
  const avg = { TBK: totals.TBK / list.length, MSK: totals.MSK / list.length };
  let score = 0;
  list.forEach((name) => {
    ['TBK', 'MSK'].forEach((group) => {
      const diff = Number(counts[name] && counts[name][group] || 0) - avg[group];
      score += (diff * diff) / Math.max(1, avg[group]);
    });
  });
  return score;
}

function adminRotationGeneratorSundayFairCells17011(month, rowIdx, monthKey, knownNames, fairNames) {
  const fair = new Set(Array.isArray(fairNames) ? fairNames : []);
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const hardRow = month && month.hard && Array.isArray(month.hard.rows) ? month.hard.rows[rowIdx] : null;
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const dateLabel = String((hardRow && hardRow.date) || (softRow && softRow.date) || '').trim();
  if (!dateLabel || !adminRotationGeneratorIsSundayMorning17011(dateLabel, monthKey)) return [];
  const out = [];
  const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
  HARD_MACHINE_HEADERS.forEach((machineName, idx) => {
    if (!/^TBKR/i.test(String(machineName || ''))) return;
    const name = adminRotationCanonicalName(hardCells[idx], knownNames);
    if (!name || !fair.has(name) || softCore.has(name)) return;
    out.push({ sectionKey: 'hard', row: hardRow, cells: hardCells, idx, machine: machineName, group: 'TBK', name });
  });
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  SOFT_MACHINE_HEADERS.forEach((machineName, idx) => {
    if (!/^MSKC/i.test(String(machineName || ''))) return;
    const name = adminRotationCanonicalName(softCells[idx], knownNames);
    if (!name || !fair.has(name) || softCore.has(name)) return;
    out.push({ sectionKey: 'soft', row: softRow, cells: softCells, idx, machine: machineName, group: 'MSK', name });
  });
  return out;
}

function adminRotationGeneratorCanSwapSundayCleanup17011(month, rowIdx, first, second, knownNames, monthKey) {
  if (!first || !second || first.group === second.group || first.name === second.name) return false;
  if (!adminRotationGeneratorPersonKnowsMachine(first.name, second.machine)) return false;
  if (!adminRotationGeneratorPersonKnowsMachine(second.name, first.machine)) return false;
  if (second.sectionKey === 'hard' && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, second.machine, first.name, knownNames, monthKey)) return false;
  if (first.sectionKey === 'hard' && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, first.machine, second.name, knownNames, monthKey)) return false;
  return true;
}

function adminRotationGeneratorBalanceSundayTbkrCleanup17011(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const fairNames = knownNames.filter((name) => !softCore.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TBKR01'))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'MSKC03'));
  if (fairNames.length < 2) return { swaps: 0, counts: adminRotationGeneratorYearCleanupCounts17011(month, monthKey, fairNames), fairNames, disabled: true };

  let counts = adminRotationGeneratorYearCleanupCounts17011(month, monthKey, fairNames);
  let swaps = 0;
  const rows = Math.max(
    Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows.length : 0,
    Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows.length : 0
  );
  const maxPasses = Math.max(1, rows * 8);

  const cloneCounts = (source) => {
    const next = adminRotationGeneratorCreateCleanupCounts17011(fairNames);
    fairNames.forEach((name) => {
      next[name].TBK = Number(source[name] && source[name].TBK || 0);
      next[name].MSK = Number(source[name] && source[name].MSK || 0);
    });
    return next;
  };

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const beforeScore = adminRotationGeneratorCleanupScore17011(counts, fairNames);
    let best = null;
    for (let rowIdx = 0; rowIdx < rows; rowIdx += 1) {
      const cells = adminRotationGeneratorSundayFairCells17011(month, rowIdx, monthKey, knownNames, fairNames);
      const tbkCells = cells.filter((cell) => cell.group === 'TBK');
      const mskCells = cells.filter((cell) => cell.group === 'MSK');
      for (const tbkCell of tbkCells) {
        for (const mskCell of mskCells) {
          if (!adminRotationGeneratorCanSwapSundayCleanup17011(month, rowIdx, tbkCell, mskCell, knownNames, monthKey)) continue;
          const next = cloneCounts(counts);
          next[tbkCell.name].TBK -= 1;
          next[tbkCell.name].MSK += 1;
          next[mskCell.name].MSK -= 1;
          next[mskCell.name].TBK += 1;
          const afterScore = adminRotationGeneratorCleanupScore17011(next, fairNames);
          const improvement = beforeScore - afterScore;
          const zeroTbkrBonus = Number(counts[mskCell.name] && counts[mskCell.name].TBK || 0) === 0
            && Number(counts[tbkCell.name] && counts[tbkCell.name].TBK || 0) >= 2 ? 0.15 : 0;
          const effectiveImprovement = improvement + zeroTbkrBonus;
          if (improvement <= 0.0001) continue;
          if (!best || effectiveImprovement > best.effectiveImprovement + 0.0001) {
            best = { rowIdx, tbkCell, mskCell, next, improvement, effectiveImprovement };
          }
        }
      }
    }
    if (!best) break;
    best.tbkCell.cells[best.tbkCell.idx] = best.mskCell.name;
    best.mskCell.cells[best.mskCell.idx] = best.tbkCell.name;
    counts = best.next;
    swaps += 1;
  }

  const tbkValues = fairNames.map((name) => Number(counts[name] && counts[name].TBK || 0));
  const tbkSpread = tbkValues.length ? Math.max(...tbkValues) - Math.min(...tbkValues) : 0;
  return { swaps, counts, fairNames: fairNames.slice(), tbkSpread, score: adminRotationGeneratorCleanupScore17011(counts, fairNames) };
}

// RAK_GENERATOR_PRESS_HALF_STEP_17012
function adminRotationGeneratorPressFairnessScore17012(counts, names, yearCounts) {
  const list = Array.isArray(names) ? names : [];
  if (!list.length) return { spread: 0, variance: 0, yearVariance: 0 };
  const values = list.map((name) => Number(counts[name] || 0));
  const avg = values.reduce((sum, value) => sum + value, 0) / list.length;
  const annual = list.map((name) => Number(yearCounts[name] || 0) + Number(counts[name] || 0));
  const yearAvg = annual.reduce((sum, value) => sum + value, 0) / list.length;
  return {
    spread: Math.max(...values) - Math.min(...values),
    variance: values.reduce((sum, value) => sum + (value - avg) ** 2, 0),
    yearVariance: annual.reduce((sum, value) => sum + (value - yearAvg) ** 2, 0)
  };
}

function adminRotationGeneratorBalancePressHalfSteps17012(month, model, monthKey) {
  const names = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const core = new Set(adminRotationGeneratorGetSoftCoreNames(names));
  const eligible = adminRotationGeneratorCollectWorkingNames(month, names)
    .filter((name) => names.includes(name) && !core.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TNKS01'));
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  if (eligible.length < 2 || !hardRows.length) return { swaps: 0, spread: 0, disabled: true };
  const yearCounts = model && model.yearHardMachineStats && model.yearHardMachineStats.TNKS01 || Object.create(null);
  const pressIndexes = ['TNKS01', 'TPKW01'].map((machine) => adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machine)).filter((idx) => idx >= 0);
  if (pressIndexes.length !== 2) return { swaps: 0, spread: 0, disabled: true };
  const fairSet = new Set(eligible);
  let swaps = 0;
  let counts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', eligible, monthKey);
  const initial = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);

  // Swap only two occupied TO cells on a split shift. This keeps MO/TO totals, solo mills,
  // Sunday cleanup, staffed-machine counts and the soft-core three-person cycle untouched.
  for (let pass = 0; pass < hardRows.length * 4; pass += 1) {
    const before = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);
    let best = null;
    hardRows.forEach((row, rowIdx) => {
      if (!row || !adminRotationGeneratorRowShouldSplitPress(month, rowIdx, monthKey)) return;
      const cells = Array.isArray(row.cells) ? row.cells : [];
      pressIndexes.forEach((pressIdx) => {
        const highName = adminRotationCanonicalName(cells[pressIdx], names);
        if (!fairSet.has(highName)) return;
        const pressMachine = HARD_MACHINE_HEADERS[pressIdx];
        HARD_MACHINE_HEADERS.forEach((otherMachine, otherIdx) => {
          if (pressIndexes.includes(otherIdx)) return;
          const lowName = adminRotationCanonicalName(cells[otherIdx], names);
          if (!fairSet.has(lowName) || lowName === highName) return;
          if (Number(counts[highName] || 0) - Number(counts[lowName] || 0) < 0.999) return;
          if (!adminRotationGeneratorPersonKnowsMachine(lowName, pressMachine)
            || !adminRotationGeneratorPersonKnowsMachine(highName, otherMachine)) return;
          if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, pressMachine, lowName, names, monthKey)) return;
          if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, otherMachine, highName, names, monthKey)) return;
          const projected = Object.assign(Object.create(null), counts);
          projected[highName] = Number(projected[highName] || 0) - 0.5;
          projected[lowName] = Number(projected[lowName] || 0) + 0.5;
          const after = adminRotationGeneratorPressFairnessScore17012(projected, eligible, yearCounts);
          const improves = after.spread < before.spread - 0.0001
            || (Math.abs(after.spread - before.spread) < 0.0001 && after.variance < before.variance - 0.0001);
          if (!improves) return;
          if (!best || after.spread < best.after.spread - 0.0001
            || (Math.abs(after.spread - best.after.spread) < 0.0001 && after.variance < best.after.variance - 0.0001)
            || (Math.abs(after.spread - best.after.spread) < 0.0001
              && Math.abs(after.variance - best.after.variance) < 0.0001
              && after.yearVariance < best.after.yearVariance - 0.0001)) {
            best = { cells, pressIdx, otherIdx, highName, lowName, after };
          }
        });
      });
    });
    if (!best) break;
    best.cells[best.pressIdx] = best.lowName;
    best.cells[best.otherIdx] = best.highName;
    counts = adminRotationGeneratorCountHardMachine(month, 'TNKS01', eligible, monthKey);
    swaps += 1;
  }
  const after = adminRotationGeneratorPressFairnessScore17012(counts, eligible, yearCounts);
  return { swaps, initialSpread: initial.spread, spread: after.spread, counts, eligible: eligible.slice() };
}

// RAK_TPKW02_FINAL_FAIRNESS_17013
function adminRotationGeneratorTpkw02Score17013(counts, names) {
  const values = names.map((name) => Number(counts[name] || 0));
  if (!values.length) return { spread: 0, variance: 0 };
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { spread: Math.max(...values) - Math.min(...values), variance: values.reduce((sum, value) => sum + (value - avg) ** 2, 0) };
}
function adminRotationGeneratorBalanceTpkw02Final17013(month, model, monthKey) {
  const names = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const core = new Set(adminRotationGeneratorGetSoftCoreNames(names));
  const eligible = adminRotationGeneratorCollectWorkingNames(month, names)
    .filter((name) => names.includes(name) && !core.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, 'TPKW02'));
  const rows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const targetIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TPKW02');
  if (eligible.length < 2 || targetIdx < 0) return { swaps: 0, spread: 0, eligible, disabled: true };
  let counts = adminRotationGeneratorCountHardMachine(month, 'TPKW02', eligible, monthKey);
  const year = model && model.yearHardMachineStats && model.yearHardMachineStats.TPKW02 || Object.create(null);
  let swaps = 0;
  const near = (a,b) => Math.abs(a-b) < .0001;
  for (let pass = 0; pass < rows.length * 3; pass += 1) {
    const before = adminRotationGeneratorTpkw02Score17013(counts, eligible);
    if (before.spread <= 1) break;
    let best = null;
    rows.forEach((row, rowIdx) => {
      if (!row || !adminRotationGeneratorIsWorkingRow(month, rowIdx)) return;
      if (adminRotationGeneratorIsSundayMorning17011(row.date, monthKey)) return;
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const high = adminRotationCanonicalName(cells[targetIdx], names);
      if (!eligible.includes(high)) return;
      HARD_MACHINE_HEADERS.forEach((otherMachine, otherIdx) => {
        if (!/^TBKR/i.test(String(otherMachine || ''))) return;
        const low = adminRotationCanonicalName(cells[otherIdx], names);
        if (!eligible.includes(low) || low === high) return;
        if (Number(counts[high] || 0) - Number(counts[low] || 0) < 2) return;
        if (!adminRotationGeneratorPersonKnowsMachine(high, otherMachine)
          || !adminRotationGeneratorPersonKnowsMachine(low, 'TPKW02')) return;
        if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, otherMachine, high, names, monthKey)
          || !adminRotationGeneratorCanUseHardMachine(month, rowIdx, 'TPKW02', low, names, monthKey)) return;
        const projected = Object.assign(Object.create(null), counts);
        projected[high] -= 1; projected[low] += 1;
        const after = adminRotationGeneratorTpkw02Score17013(projected, eligible);
        if (!(after.spread < before.spread - .0001 || (near(after.spread,before.spread) && after.variance < before.variance - .0001))) return;
        const grinderCounts = adminRotationGeneratorCountHardMachine(month, otherMachine, eligible, monthKey);
        const grinderBefore = adminRotationGeneratorTpkw02Score17013(grinderCounts,eligible);
        grinderCounts[high] += 1; grinderCounts[low] -= 1;
        const grinderAfter = adminRotationGeneratorTpkw02Score17013(grinderCounts,eligible);
        const candidate = { cells, otherIdx, high, low, after,
          grinderGain: grinderBefore.variance - grinderAfter.variance,
          yearDelta: Number(year[low] || 0) - Number(year[high] || 0) };
        if (!best || candidate.after.spread < best.after.spread - .0001
          || (near(candidate.after.spread,best.after.spread) && candidate.after.variance < best.after.variance - .0001)
          || (near(candidate.after.spread,best.after.spread) && near(candidate.after.variance,best.after.variance) && candidate.grinderGain > best.grinderGain + .0001)
          || (near(candidate.after.spread,best.after.spread) && near(candidate.after.variance,best.after.variance)
            && near(candidate.grinderGain,best.grinderGain) && candidate.yearDelta < best.yearDelta - .0001)) best = candidate;
      });
    });
    if (!best) break;
    best.cells[targetIdx] = best.low;
    best.cells[best.otherIdx] = best.high;
    counts = adminRotationGeneratorCountHardMachine(month,'TPKW02',eligible,monthKey);
    swaps += 1;
  }
  return { swaps, spread: adminRotationGeneratorTpkw02Score17013(counts,eligible).spread, counts, eligible: eligible.slice() };
}

function adminRotationGeneratorCountSoftKinds(month, names) {
  const result = Object.create(null);
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  list.forEach((name) => { result[name] = { mill: 0, lathe: 0 }; });
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  rows.forEach((row) => {
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    SOFT_MACHINE_HEADERS.forEach((machineName, idx) => {
      const name = adminRotationCanonicalName(cells[idx], list);
      if (!name || !Object.prototype.hasOwnProperty.call(result, name)) return;
      const kind = adminRotationGeneratorSoftKind(machineName);
      if (kind === 'mill') result[name].mill += 1;
      else result[name].lathe += 1;
    });
  });
  return result;
}

function adminRotationGeneratorFindSoftKindCellOnDay(month, rowIdx, person, wantedKind) {
  const knownNames = adminGetKnownNames();
  const wanted = adminRotationCanonicalName(person, knownNames);
  const kind = String(wantedKind || '').trim();
  if (!wanted || !kind) return null;
  const row = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  for (let idx = 0; idx < cells.length; idx += 1) {
    const name = adminRotationCanonicalName(cells[idx], knownNames);
    if (name === wanted && adminRotationGeneratorSoftKind(SOFT_MACHINE_HEADERS[idx] || '') === kind) {
      return { sectionKey: 'soft', row, cells, idx, machine: SOFT_MACHINE_HEADERS[idx] || '' };
    }
  }
  return null;
}

function adminRotationGeneratorCountSoftKindOnRow(row, wantedKind) {
  const kind = String(wantedKind || '').trim();
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  let total = 0;
  for (let idx = 0; idx < cells.length; idx += 1) {
    if (!String(cells[idx] || '').trim()) continue;
    if (adminRotationGeneratorSoftKind(SOFT_MACHINE_HEADERS[idx] || '') === kind) total += 1;
  }
  return total;
}

function adminRotationGeneratorFindSoftKindReliefCellOnDay(month, rowIdx, targetName, sourceMachine, wantedKind, targetNames, knownNames, requireFullLatheDay) {
  const row = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  const target = adminRotationCanonicalName(targetName, knownNames);
  const source = String(sourceMachine || '').trim();
  const kind = String(wantedKind || '').trim();
  const targets = new Set(Array.isArray(targetNames) ? targetNames : []);
  if (!row || !target || !source || !kind) return null;
  if (kind === 'lathe' && requireFullLatheDay && adminRotationGeneratorCountSoftKindOnRow(row, 'lathe') < 3) return null;
  const matches = [];
  for (let idx = 0; idx < cells.length; idx += 1) {
    const candidate = adminRotationCanonicalName(cells[idx], knownNames);
    const machine = SOFT_MACHINE_HEADERS[idx] || '';
    if (!candidate || candidate === target) continue;
    if (adminRotationGeneratorSoftKind(machine) !== kind) continue;
    if (!adminRotationGeneratorPersonKnowsMachine(target, machine)) continue;
    if (!adminRotationGeneratorPersonKnowsMachine(candidate, source)) continue;
    matches.push({ sectionKey: 'soft', row, cells, idx, machine, name: candidate });
  }
  return matches.sort((a, b) => {
    const targetDiff = (targets.has(a.name) ? 1 : 0) - (targets.has(b.name) ? 1 : 0);
    if (targetDiff) return targetDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'cs');
  })[0] || null;
}

function adminRotationGeneratorBalanceSoftKind(month, model) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  if (generatorRules.hardPeopleSoftKindBalanceEnabled === false) return { swaps: 0, counts: Object.create(null), disabled: true };
  const configuredNames = adminRotationGeneratorRawList(generatorRules.hardPeopleSoftKindBalanceNames)
    .map((name) => adminRotationCanonicalName(name, knownNames))
    .filter((name) => name && knownNames.includes(name));
  const targetNames = configuredNames.length
    ? configuredNames
    : adminRotationGeneratorRawList(generatorRules.hardPreferred).map((name) => adminRotationCanonicalName(name, knownNames)).filter((name) => name && knownNames.includes(name));
  const allowedSpread = Math.max(0, Math.min(6, Number(generatorRules.hardPeopleSoftKindMaxSpread ?? 1) || 1));
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const softWorking = new Set();
  softRows.forEach((row) => {
    (Array.isArray(row && row.cells) ? row.cells : []).forEach((cell) => {
      const name = adminRotationCanonicalName(cell, knownNames);
      if (name && knownNames.includes(name)) softWorking.add(name);
    });
  });
  const workingNames = Array.from(softWorking)
    .filter((name) => generatorRules.softKindGlobalBalanceEnabled !== false || targetNames.includes(name));
  if (!workingNames.length || !softRows.length) return { swaps: 0, counts: Object.create(null) };
  let counts = adminRotationGeneratorCountSoftKinds(month, workingNames);
  let swaps = 0;
  const maxPasses = softRows.length * 4;
  const mixedMinimum = Math.max(1, Math.min(12, Number(generatorRules.softKindMixedMinimumShifts ?? 3) || 3));
  const kindCount = (name, kind) => Number((counts[name] && counts[name][kind]) || 0);
  const otherKind = (kind) => kind === 'mill' ? 'lathe' : 'mill';
  const kindTotal = (name) => kindCount(name, 'mill') + kindCount(name, 'lathe');
  const scoreKindHeavy = (name, kind) => kindCount(name, kind) - kindCount(name, otherKind(kind));
  const isSingleKindProblem = (name, kind) => kindCount(name, kind) > 0 && kindCount(name, otherKind(kind)) === 0 && kindTotal(name) >= mixedMinimum;
  const sortedKindHeavy = (kind) => workingNames.slice().sort((a, b) => {
    const singleDiff = (isSingleKindProblem(b, kind) ? 1 : 0) - (isSingleKindProblem(a, kind) ? 1 : 0);
    if (singleDiff) return singleDiff;
    const scoreDiff = scoreKindHeavy(b, kind) - scoreKindHeavy(a, kind);
    if (scoreDiff) return scoreDiff;
    const totalDiff = kindTotal(b) - kindTotal(a);
    if (totalDiff) return totalDiff;
    return a.localeCompare(b, 'cs');
  });
  const swapSoftCells = (firstCell, secondCell, firstName, secondName) => {
    firstCell.cells[firstCell.idx] = secondName;
    secondCell.cells[secondCell.idx] = firstName;
    swaps += 1;
    counts = adminRotationGeneratorCountSoftKinds(month, workingNames);
  };
  const relieveKindHeavyWithAnyOpposite = (name, sourceKind, requireFullLatheDay) => {
    const wantedKind = otherKind(sourceKind);
    for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
      const sourceCell = adminRotationGeneratorFindSoftKindCellOnDay(month, rowIdx, name, sourceKind);
      if (!sourceCell || !sourceCell.cells) continue;
      const reliefCell = adminRotationGeneratorFindSoftKindReliefCellOnDay(month, rowIdx, name, sourceCell.machine, wantedKind, workingNames, knownNames, requireFullLatheDay);
      if (!reliefCell || !reliefCell.cells) continue;
      swapSoftCells(sourceCell, reliefCell, name, reliefCell.name);
      return true;
    }
    return false;
  };
  const directSwapKindHeavy = (name, sourceKind, oppositeName) => {
    const wantedKind = otherKind(sourceKind);
    if (!oppositeName || oppositeName === name) return false;
    for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
      const sourceCell = adminRotationGeneratorFindSoftKindCellOnDay(month, rowIdx, name, sourceKind);
      const reliefCell = adminRotationGeneratorFindSoftKindCellOnDay(month, rowIdx, oppositeName, wantedKind);
      if (!sourceCell || !reliefCell || !sourceCell.cells || !reliefCell.cells) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(name, reliefCell.machine)) continue;
      if (!adminRotationGeneratorPersonKnowsMachine(oppositeName, sourceCell.machine)) continue;
      swapSoftCells(sourceCell, reliefCell, name, oppositeName);
      return true;
    }
    return false;
  };

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const millHeavy = sortedKindHeavy('mill')[0];
    const latheHeavy = sortedKindHeavy('lathe')[0];
    const heavyOptions = [
      { name: millHeavy, kind: 'mill', score: millHeavy ? scoreKindHeavy(millHeavy, 'mill') : 0, single: millHeavy ? isSingleKindProblem(millHeavy, 'mill') : false },
      { name: latheHeavy, kind: 'lathe', score: latheHeavy ? scoreKindHeavy(latheHeavy, 'lathe') : 0, single: latheHeavy ? isSingleKindProblem(latheHeavy, 'lathe') : false }
    ].filter((item) => item.name && (item.single || item.score > allowedSpread))
      .sort((a, b) => (b.single ? 1 : 0) - (a.single ? 1 : 0) || b.score - a.score || kindTotal(b.name) - kindTotal(a.name));
    const current = heavyOptions[0];
    if (!current) break;
    const oppositeHeavy = sortedKindHeavy(otherKind(current.kind))[0];
    let didSwap = false;
    if (oppositeHeavy && oppositeHeavy !== current.name && (isSingleKindProblem(oppositeHeavy, otherKind(current.kind)) || scoreKindHeavy(oppositeHeavy, otherKind(current.kind)) > allowedSpread)) {
      didSwap = directSwapKindHeavy(current.name, current.kind, oppositeHeavy);
    }
    if (!didSwap) didSwap = relieveKindHeavyWithAnyOpposite(current.name, current.kind, true);
    if (!didSwap) didSwap = relieveKindHeavyWithAnyOpposite(current.name, current.kind, false);
    if (!didSwap) break;
  }
  return { swaps, counts };
}

function adminRotationGeneratorCountSoftTotals(month, names) {
  const result = Object.create(null);
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  list.forEach((name) => { result[name] = 0; });
  const rows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  rows.forEach((row) => {
    (Array.isArray(row && row.cells) ? row.cells : []).forEach((cell) => {
      const name = adminRotationCanonicalName(cell, list);
      if (name && Object.prototype.hasOwnProperty.call(result, name)) result[name] += 1;
    });
  });
  return result;
}

function adminRotationGeneratorBalanceSoftTotals(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  if (generatorRules.softTotalBalanceEnabled === false) return { swaps: 0, counts: Object.create(null), disabled: true };
  const workingNames = adminRotationGeneratorRawList(generatorRules.softTotalBalanceNames)
    .map((name) => adminRotationCanonicalName(name, knownNames))
    .filter((name) => name && knownNames.includes(name))
    .filter((name) => !adminRotationGeneratorIsSoftCoreName(name, knownNames));
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  if (!workingNames.length || !softRows.length) return { swaps: 0, counts: Object.create(null) };
  const allowedSpread = Math.max(0, Math.min(6, Number(generatorRules.softTotalMaxSpread ?? 1) || 1));
  let counts = adminRotationGeneratorCountSoftTotals(month, workingNames);
  let swaps = 0;
  const maxPasses = softRows.length * 4;
  const currentCount = (name) => Number(counts[name] || 0);
  const sortedHigh = () => workingNames.slice().sort((a, b) => currentCount(b) - currentCount(a) || a.localeCompare(b, 'cs'));
  const sortedLow = () => workingNames.slice().sort((a, b) => currentCount(a) - currentCount(b) || a.localeCompare(b, 'cs'));

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const highName = sortedHigh()[0];
    const lowNames = sortedLow();
    const lowName = lowNames[0];
    if (!highName || !lowName || highName === lowName) break;
    if (currentCount(highName) - currentCount(lowName) <= allowedSpread) break;
    let didSwap = false;
    for (const targetLowName of lowNames) {
      if (!targetLowName || targetLowName === highName) continue;
      if (currentCount(highName) - currentCount(targetLowName) <= allowedSpread) break;
      for (let rowIdx = 0; rowIdx < softRows.length; rowIdx += 1) {
        const highCell = adminRotationGeneratorFindPersonCellOnDay(month, rowIdx, highName, 'soft');
        const lowCell = adminRotationGeneratorFindPersonCellOnDay(month, rowIdx, targetLowName, 'hard');
        if (!highCell || !lowCell || !highCell.cells || !lowCell.cells) continue;
        if (highCell.sectionKey !== 'soft' || lowCell.sectionKey !== 'hard') continue;
        if (!adminRotationGeneratorPersonKnowsMachine(highName, lowCell.machine)) continue;
        if (!adminRotationGeneratorPersonKnowsMachine(targetLowName, highCell.machine)) continue;
        if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, lowCell.machine, highName, knownNames, monthKey)) continue;
        highCell.cells[highCell.idx] = targetLowName;
        lowCell.cells[lowCell.idx] = highName;
        swaps += 1;
        counts = adminRotationGeneratorCountSoftTotals(month, workingNames);
        didSwap = true;
        break;
      }
      if (didSwap) break;
    }
    if (!didSwap) break;
  }
  return { swaps, counts };
}

function adminRotationGeneratorBalanceHardMachine(month, machineName, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const generatorRules = getAdminRotationGeneratorRules();
  const hardPreferred = generatorRules.hardPreferred.filter((name) => knownNames.includes(name));
  const isPressBalance = /^(?:TNKS01|TPKW01)$/i.test(String(machineName || ''));
  const isTpkw02Balance = String(machineName || '').toUpperCase() === 'TPKW02';
  const softCorePressNames = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const workingNames = adminRotationGeneratorCollectWorkingNames(month, knownNames)
    .filter((name) => knownNames.includes(name))
    .filter((name) => !(isPressBalance || isTpkw02Balance) || !softCorePressNames.has(name))
    .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, machineName));
  const machineIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, machineName);
  const tnksIdx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TNKS01');
  const tpkw01Idx = adminRotationGeneratorMachineIndex(HARD_MACHINE_HEADERS, 'TPKW01');
  const machineYearKey = String(machineName || '').trim().toUpperCase();
  const yearCounts = model && model.yearHardMachineStats && model.yearHardMachineStats[machineYearKey] ? model.yearHardMachineStats[machineYearKey] : Object.create(null);
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  if (machineIdx < 0 || !workingNames.length || !hardRows.length) return { swaps: 0, counts: Object.create(null) };

  let counts = adminRotationGeneratorCountHardMachine(month, machineName, workingNames, monthKey);
  let swaps = 0;
  const maxPasses = hardRows.length * 4;
  const allowedDiff = 1;

  const currentCount = (name) => Number(counts[name] || 0);
  const yearCount = (name) => Number(yearCounts[name] || 0);
  const combinedCount = (name) => currentCount(name) + (isTpkw02Balance ? 0 : yearCount(name));
  const pressYearEligibleNames = () => workingNames.filter((name) => !adminRotationGeneratorIsPressYearBalanceExcluded(name, knownNames));
  const averageYearCount = (names) => {
    const list = Array.isArray(names) && names.length ? names : workingNames;
    if (!list.length) return 0;
    return list.reduce((sum, name) => sum + yearCount(name), 0) / list.length;
  };
  const sortByMonthHigh = () => workingNames.slice().sort((a, b) => {
    const monthDiff = currentCount(b) - currentCount(a);
    if (monthDiff) return monthDiff;
    const yearDiff = yearCount(b) - yearCount(a);
    if (yearDiff) return yearDiff;
    return a.localeCompare(b, 'cs');
  });
  const sortByMonthLow = () => workingNames.slice().sort((a, b) => {
    const monthDiff = currentCount(a) - currentCount(b);
    if (monthDiff) return monthDiff;
    const yearDiff = yearCount(a) - yearCount(b);
    if (yearDiff) return yearDiff;
    const pref = (hardPreferred.includes(b) ? 1 : 0) - (hardPreferred.includes(a) ? 1 : 0);
    if (pref) return pref;
    return a.localeCompare(b, 'cs');
  });
  const getSortedHigh = () => workingNames.slice().sort((a, b) => {
    if (isPressBalance) {
      const monthDiff = currentCount(b) - currentCount(a);
      if (monthDiff) return monthDiff;
      const yearDiff = yearCount(b) - yearCount(a);
      if (yearDiff) return yearDiff;
      return a.localeCompare(b, 'cs');
    }
    const diff = combinedCount(b) - combinedCount(a);
    if (diff) return diff;
    const monthDiff = currentCount(b) - currentCount(a);
    if (monthDiff) return monthDiff;
    return a.localeCompare(b, 'cs');
  });
  const getSortedLow = () => workingNames.slice().sort((a, b) => {
    if (isPressBalance) {
      const monthDiff = currentCount(a) - currentCount(b);
      if (monthDiff) return monthDiff;
      const yearDiff = yearCount(a) - yearCount(b);
      if (yearDiff) return yearDiff;
      const pref = (hardPreferred.includes(b) ? 1 : 0) - (hardPreferred.includes(a) ? 1 : 0);
      if (pref) return pref;
      return a.localeCompare(b, 'cs');
    }
    const diff = combinedCount(a) - combinedCount(b);
    if (diff) return diff;
    const yearDiff = yearCount(a) - yearCount(b);
    if (yearDiff) return yearDiff;
    const monthDiff = currentCount(a) - currentCount(b);
    if (monthDiff) return monthDiff;
    const pref = (hardPreferred.includes(b) ? 1 : 0) - (hardPreferred.includes(a) ? 1 : 0);
    if (pref) return pref;
    return a.localeCompare(b, 'cs');
  });

  const findPressOrMachineCell = (row, rowIdx, highName) => {
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    const splitPress = isPressBalance && adminRotationGeneratorShouldSplitPressMachines(row && row.date, monthKey, month);
    const candidateIdxs = isPressBalance && splitPress && tnksIdx >= 0 && tpkw01Idx >= 0 ? [tnksIdx, tpkw01Idx] : [machineIdx];
    for (const idx of candidateIdxs) {
      if (idx < 0) continue;
      const name = adminRotationCanonicalName(cells[idx], knownNames);
      if (name === highName) return { sectionKey: 'hard', row, cells, idx, machine: HARD_MACHINE_HEADERS[idx] || '', splitPress };
    }
    return null;
  };

  const trySwapPressOrMachine = (highName, lowNames, allowYearTieBreak) => {
    for (const targetLowName of lowNames) {
      if (!targetLowName || targetLowName === highName) continue;
      if (isPressBalance) {
        const monthDiff = currentCount(highName) - currentCount(targetLowName);
        if (!allowYearTieBreak && monthDiff <= allowedDiff) continue;
        if (allowYearTieBreak && Math.abs(monthDiff - allowedDiff) > 0.001) continue;
      } else if (combinedCount(highName) - combinedCount(targetLowName) <= 1) {
        break;
      }
      for (let rowIdx = 0; rowIdx < hardRows.length; rowIdx += 1) {
        const hardRow = hardRows[rowIdx];
        const highCell = findPressOrMachineCell(hardRow, rowIdx, highName);
        if (!highCell || !highCell.cells) continue;
        const lowCell = adminRotationGeneratorFindPersonCellOnDay(month, rowIdx, targetLowName, 'soft');
        if (!lowCell || !lowCell.cells) continue;
        if (lowCell.sectionKey === highCell.sectionKey && lowCell.idx === highCell.idx) continue;
        if (isPressBalance && highCell.splitPress && lowCell.sectionKey === 'hard' && (lowCell.idx === tnksIdx || lowCell.idx === tpkw01Idx)) continue;
        if (isTpkw02Balance) {
          if (lowCell.sectionKey !== 'soft') continue;
          if (!adminRotationGeneratorPersonKnowsMachine(targetLowName, highCell.machine) || !adminRotationGeneratorPersonKnowsMachine(highName, lowCell.machine)) continue;
          if (lowCell.machine === 'MFKF10' && (!adminRotationGeneratorCanUseSoloMill(month, rowIdx, highName, knownNames, monthKey) || adminRotationGeneratorWouldRepeatSoloMill(month, rowIdx, highName, knownNames))) continue;
        }
        if (isPressBalance && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, highCell.machine, targetLowName, knownNames, monthKey)) continue;
        if (isPressBalance && lowCell.sectionKey === 'hard' && !adminRotationGeneratorCanUseHardMachine(month, rowIdx, lowCell.machine, highName, knownNames, monthKey)) continue;
        lowCell.cells[lowCell.idx] = highName;
        highCell.cells[highCell.idx] = targetLowName;
        swaps += 1;
        counts = adminRotationGeneratorCountHardMachine(month, machineName, workingNames, monthKey);
        return true;
      }
    }
    return false;
  };

  if (isPressBalance) {
    let yearTieBreakUsed = false;
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const highNames = sortByMonthHigh();
      const lowNames = sortByMonthLow();
      const highName = highNames[0];
      const lowName = lowNames[0];
      if (!highName || !lowName || highName === lowName) break;
      const monthSpread = currentCount(highName) - currentCount(lowName);
      if (monthSpread > allowedDiff) {
        const targetLows = lowNames.filter((name) => currentCount(highName) - currentCount(name) > allowedDiff)
          .sort((a, b) => {
            const monthDiff = currentCount(a) - currentCount(b);
            if (monthDiff) return monthDiff;
            const yearDiff = yearCount(a) - yearCount(b);
            if (yearDiff) return yearDiff;
            return a.localeCompare(b, 'cs');
          });
        if (!trySwapPressOrMachine(highName, targetLows, false)) break;
        continue;
      }
      if (yearTieBreakUsed) break;
      // Roční dorovnání je jen jemný tie-break: když je měsíc prakticky vyrovnaný
      // a jen 1 člověk má o 0,5 více, smí se max jednou přesunout na člověka s nejnižším rokem.
      if (Math.abs(monthSpread - allowedDiff) > 0.001) break;
      const maxMonth = currentCount(highName);
      const minMonth = currentCount(lowName);
      const eligibleYearNames = pressYearEligibleNames();
      const highExtra = eligibleYearNames.filter((name) => Math.abs(currentCount(name) - maxMonth) < 0.001)
        .sort((a, b) => yearCount(b) - yearCount(a) || a.localeCompare(b, 'cs'))[0];
      const lowYearCandidates = eligibleYearNames.filter((name) => Math.abs(currentCount(name) - minMonth) < 0.001)
        .sort((a, b) => yearCount(a) - yearCount(b) || a.localeCompare(b, 'cs'));
      const yearAvg = averageYearCount(eligibleYearNames);
      const targetLow = lowYearCandidates[0];
      if (!highExtra || !targetLow || highExtra === targetLow) break;
      if (yearCount(highExtra) <= yearAvg) break;
      if (yearCount(targetLow) >= yearCount(highExtra)) break;
      if (!trySwapPressOrMachine(highExtra, [targetLow], true)) break;
      yearTieBreakUsed = true;
    }
    return { swaps, counts, yearTieBreakUsed };
  }

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const highNames = getSortedHigh();
    const lowNames = getSortedLow();
    const highName = highNames[0];
    const lowName = lowNames[0];
    if (!highName || !lowName || highName === lowName) break;
    if (combinedCount(highName) - combinedCount(lowName) <= 1) break;
    if (!trySwapPressOrMachine(highName, lowNames, false)) break;
  }

  return { swaps, counts };
}

function adminRotationGeneratorCountSectionTotals(month, names) {
  const result = Object.create(null);
  const list = Array.isArray(names) ? names : adminGetKnownNames();
  list.forEach((name) => { result[name] = { hard: 0, soft: 0 }; });
  const add = (sectionKey, row) => {
    const cells = Array.isArray(row && row.cells) ? row.cells : [];
    cells.forEach((cell) => {
      const name = adminRotationCanonicalName(cell, list);
      if (!name || !Object.prototype.hasOwnProperty.call(result, name)) return;
      if (sectionKey === 'soft') result[name].soft += 1;
      else result[name].hard += 1;
    });
  };
  (Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : []).forEach((row) => add('hard', row));
  (Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : []).forEach((row) => add('soft', row));
  return result;
}

function adminRotationGeneratorMoToPairScore(totals, firstName, secondName) {
  const first = totals && totals[firstName] ? totals[firstName] : { hard: 0, soft: 0 };
  const second = totals && totals[secondName] ? totals[secondName] : { hard: 0, soft: 0 };
  return Math.abs(Number(first.hard || 0) - Number(second.hard || 0)) + Math.abs(Number(first.soft || 0) - Number(second.soft || 0));
}

function adminRotationGeneratorFindPairCellOnDay(month, rowIdx, person, sectionKey) {
  const knownNames = adminGetKnownNames();
  const wanted = adminRotationCanonicalName(person, knownNames);
  const section = sectionKey === 'soft' ? month && month.soft : month && month.hard;
  const machines = sectionKey === 'soft' ? SOFT_MACHINE_HEADERS : HARD_MACHINE_HEADERS;
  const row = section && Array.isArray(section.rows) ? section.rows[rowIdx] : null;
  const cells = Array.isArray(row && row.cells) ? row.cells : [];
  for (let idx = 0; idx < cells.length; idx += 1) {
    const name = adminRotationCanonicalName(cells[idx], knownNames);
    if (name === wanted) return { sectionKey, row, cells, idx, machine: machines[idx] || '' };
  }
  return null;
}

function adminRotationGeneratorBalanceKminekNovotnyMoTo(month, model) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const kminek = adminRotationCanonicalName('Kmínek', knownNames);
  const novotny = adminRotationCanonicalName('Novotný', knownNames);
  if (!kminek || !novotny || !knownNames.includes(kminek) || !knownNames.includes(novotny)) return { swaps: 0, totals: Object.create(null) };
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  let totals = adminRotationGeneratorCountSectionTotals(month, [kminek, novotny]);
  let swaps = 0;
  const maxPasses = Math.max(1, maxRows * 2);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const currentScore = adminRotationGeneratorMoToPairScore(totals, kminek, novotny);
    if (currentScore <= 1) break;
    let best = null;
    let bestScore = currentScore;
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
      const options = [
        [adminRotationGeneratorFindPairCellOnDay(month, rowIdx, kminek, 'hard'), adminRotationGeneratorFindPairCellOnDay(month, rowIdx, novotny, 'soft')],
        [adminRotationGeneratorFindPairCellOnDay(month, rowIdx, novotny, 'hard'), adminRotationGeneratorFindPairCellOnDay(month, rowIdx, kminek, 'soft')]
      ];
      for (const pair of options) {
        const hardCell = pair[0];
        const softCell = pair[1];
        if (!hardCell || !softCell || !hardCell.cells || !softCell.cells) continue;
        const hardName = adminRotationCanonicalName(hardCell.cells[hardCell.idx], knownNames);
        const softName = adminRotationCanonicalName(softCell.cells[softCell.idx], knownNames);
        const nextTotals = JSON.parse(JSON.stringify(totals));
        if (nextTotals[hardName]) {
          nextTotals[hardName].hard -= 1;
          nextTotals[hardName].soft += 1;
        }
        if (nextTotals[softName]) {
          nextTotals[softName].soft -= 1;
          nextTotals[softName].hard += 1;
        }
        const score = adminRotationGeneratorMoToPairScore(nextTotals, kminek, novotny);
        if (score < bestScore) {
          bestScore = score;
          best = { hardCell, softCell, hardName, softName };
        }
      }
    }
    if (!best) break;
    best.hardCell.cells[best.hardCell.idx] = best.softName;
    best.softCell.cells[best.softCell.idx] = best.hardName;
    swaps += 1;
    totals = adminRotationGeneratorCountSectionTotals(month, [kminek, novotny]);
  }
  return { swaps, totals };
}

function adminRotationGeneratorFindBridgeSoftSwapForEmptyHard(month, rowIdx, hardMachineName, unusedNames, knownNames, monthKey, hardTotals, hardPreferred, softPreferred) {
  const hardMachine = String(hardMachineName || '').trim();
  const softRow = month && month.soft && Array.isArray(month.soft.rows) ? month.soft.rows[rowIdx] : null;
  const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
  if (!hardMachine || !softCells.length || !Array.isArray(unusedNames) || !unusedNames.length) return null;
  const generatorRules = getAdminRotationGeneratorRules();
  const softBaseLathe = generatorRules && generatorRules.softBaseLathe ? generatorRules.softBaseLathe : {};
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const options = [];
  softCells.forEach((cell, softIdx) => {
    const softName = adminRotationCanonicalName(cell, knownNames);
    const softMachine = SOFT_MACHINE_HEADERS[softIdx] || '';
    if (!softName || !softMachine) return;
    if (softCore.has(softName)) return;
    if (!adminRotationGeneratorPersonKnowsMachine(softName, hardMachine)) return;
    if (!adminRotationGeneratorCanUseHardMachine(month, rowIdx, hardMachine, softName, knownNames, monthKey)) return;
    unusedNames.forEach((unusedName) => {
      const baseMachine = String(softBaseLathe && softBaseLathe[unusedName] || '').toUpperCase();
      const baseIdx = baseMachine ? adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, baseMachine) : -1;
      if (baseIdx >= 0 && !String(softCells[baseIdx] || '').trim() && adminRotationGeneratorPersonKnowsMachine(unusedName, SOFT_MACHINE_HEADERS[baseIdx] || '')) {
        const hardPrefReward = Array.isArray(hardPreferred) && hardPreferred.includes(softName) ? -90 : 0;
        const softPrefReward = Array.isArray(softPreferred) && softPreferred.includes(unusedName) ? -70 : 0;
        const hardLoad = Number(hardTotals && hardTotals[softName] || 0) * 10;
        const score = hardLoad - 420 + hardPrefReward + softPrefReward
          + (adminRotationHashString([rowIdx, hardMachine, softMachine, softName, unusedName, baseMachine].join('|')) % 17) / 100;
        options.push({ softIdx, clearSoftIdx: softIdx, insertSoftIdx: baseIdx, softMachine: SOFT_MACHINE_HEADERS[baseIdx] || '', softName, unusedName, score });
        return;
      }
      if (!adminRotationGeneratorPersonKnowsMachine(unusedName, softMachine)) return;
      const baseReward = baseMachine && baseMachine === String(softMachine || '').toUpperCase() ? -120 : 0;
      const hardPrefReward = Array.isArray(hardPreferred) && hardPreferred.includes(softName) ? -90 : 0;
      const softPrefReward = Array.isArray(softPreferred) && softPreferred.includes(unusedName) ? -70 : 0;
      const hardLoad = Number(hardTotals && hardTotals[softName] || 0) * 10;
      const kindReward = adminRotationGeneratorSoftKind(softMachine) === 'mill' ? -12 : 0;
      const score = hardLoad + baseReward + hardPrefReward + softPrefReward + kindReward
        + (adminRotationHashString([rowIdx, hardMachine, softMachine, softName, unusedName].join('|')) % 17) / 100;
      options.push({ softIdx, clearSoftIdx: -1, insertSoftIdx: softIdx, softMachine, softName, unusedName, score });
    });
  });
  return options.sort((a, b) => a.score - b.score || a.softName.localeCompare(b.softName, 'cs') || a.unusedName.localeCompare(b.unusedName, 'cs'))[0] || null;
}

function adminRotationGeneratorRepairEmptyHardCells(month, model, monthKey) {
  const knownNames = model && Array.isArray(model.knownNames) ? model.knownNames : adminGetKnownNames();
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const generatorRules = getAdminRotationGeneratorRules();
  const hardPreferred = generatorRules.hardPreferred.filter((name) => knownNames.includes(name));
  const softPreferred = generatorRules.softPreferred.filter((name) => knownNames.includes(name));
  const softCore = new Set(adminRotationGeneratorGetSoftCoreNames(knownNames));
  const hardTotals = Object.create(null);
  knownNames.forEach((name) => { hardTotals[name] = 0; });
  hardRows.forEach((row) => {
    (Array.isArray(row && row.cells) ? row.cells : []).forEach((cell) => {
      const name = adminRotationCanonicalName(cell, knownNames);
      if (Object.prototype.hasOwnProperty.call(hardTotals, name)) hardTotals[name] += 1;
    });
  });

  let repairs = 0;
  hardRows.forEach((hardRow, rowIdx) => {
    const softRow = softRows[rowIdx] || null;
    const dateLabel = (hardRow && hardRow.date) || (softRow && softRow.date) || '';
    if (!dateLabel || adminRotationGeneratorIsDayBlocked(adminRotationGeneratorDateNotes(month, dateLabel))) return;
    const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
    if (!hardCells.length) return;
    const absenceNames = adminRotationUnavailableNamesForDate(month, dateLabel, knownNames);
    const available = knownNames.filter((name) => !absenceNames.has(name));
    const hardTargetCount = adminRotationGeneratorHardTarget(knownNames, available);
    let hardFilled = hardCells.filter((cell) => adminRotationCanonicalName(cell, knownNames)).length;
    if (hardFilled >= hardTargetCount) return;

    const usedNames = new Set();
    hardCells.forEach((cell) => {
      const name = adminRotationCanonicalName(cell, knownNames);
      if (name) usedNames.add(name);
    });
    (Array.isArray(softRow && softRow.cells) ? softRow.cells : []).forEach((cell) => {
      const name = adminRotationCanonicalName(cell, knownNames);
      if (name) usedNames.add(name);
    });

    HARD_MACHINE_HEADERS.forEach((machineName, machineIdx) => {
      if (adminRotationGeneratorThreeAbsences(knownNames, available) && machineName === 'TPKW02') return;
      if (hardFilled >= hardTargetCount || String(hardCells[machineIdx] || '').trim()) return;
      const machineCounts = adminRotationGeneratorCountHardMachine(month, machineName, knownNames, monthKey);
      const unusedNames = available.filter((name) => !usedNames.has(name));
      const candidates = unusedNames
        .filter((name) => !softCore.has(name))
        .filter((name) => adminRotationGeneratorPersonKnowsMachine(name, machineName))
        .filter((name) => adminRotationGeneratorCanUseHardMachine(month, rowIdx, machineName, name, knownNames, monthKey))
        .sort((a, b) => {
          const machineDiff = Number(machineCounts[a] || 0) - Number(machineCounts[b] || 0);
          if (machineDiff) return machineDiff;
          const hardDiff = Number(hardTotals[a] || 0) - Number(hardTotals[b] || 0);
          if (hardDiff) return hardDiff;
          const hardPrefDiff = (hardPreferred.includes(b) ? 1 : 0) - (hardPreferred.includes(a) ? 1 : 0);
          if (hardPrefDiff) return hardPrefDiff;
          const softPenalty = (softPreferred.includes(a) ? 1 : 0) - (softPreferred.includes(b) ? 1 : 0);
          if (softPenalty) return softPenalty;
          return a.localeCompare(b, 'cs');
        });
      const name = candidates[0] || '';
      if (name) {
        hardCells[machineIdx] = name;
        usedNames.add(name);
        hardTotals[name] = Number(hardTotals[name] || 0) + 1;
        hardFilled += 1;
        repairs += 1;
        return;
      }
      const bridge = adminRotationGeneratorFindBridgeSoftSwapForEmptyHard(month, rowIdx, machineName, unusedNames, knownNames, monthKey, hardTotals, hardPreferred, softPreferred);
      if (!bridge) return;
      const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
      hardCells[machineIdx] = bridge.softName;
      if (bridge.clearSoftIdx >= 0 && bridge.clearSoftIdx !== bridge.insertSoftIdx) softCells[bridge.clearSoftIdx] = '';
      softCells[bridge.insertSoftIdx] = bridge.unusedName;
      usedNames.add(bridge.unusedName);
      hardTotals[bridge.softName] = Number(hardTotals[bridge.softName] || 0) + 1;
      hardFilled += 1;
      repairs += 1;
    });
  });
  return { repairs };
}

// v1.5.54 – doplněné funkce přesunuté z admin-rotation.js.
function adminRotationSplitGeneratorList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\n,;]/);
  const seen = new Set();
  return source
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}


function adminRotationNormalizeGeneratorSettings(settings) {
  const base = RAK_ROTATION_GENERATOR_RULES_V1107 || {};
  const raw = settings && typeof settings === 'object' ? settings : {};
  const softPreferred = adminRotationSplitGeneratorList(raw.softPreferred).length
    ? adminRotationSplitGeneratorList(raw.softPreferred)
    : Array.from(base.softPreferred || []);
  const hardPreferred = adminRotationSplitGeneratorList(raw.hardPreferred).length
    ? adminRotationSplitGeneratorList(raw.hardPreferred)
    : Array.from(base.hardPreferred || []);
  const softCore = adminRotationSplitGeneratorList(raw.softCore).length
    ? adminRotationSplitGeneratorList(raw.softCore)
    : Array.from(base.softCore || []);
  const softHardCycle = adminRotationFilterMachineList(raw.softHardCycle, HARD_MACHINE_HEADERS).length
    ? adminRotationFilterMachineList(raw.softHardCycle, HARD_MACHINE_HEADERS)
    : Array.from(base.softHardCycle || []);
  const hardCycle = adminRotationFilterMachineList(raw.hardCycle, HARD_MACHINE_HEADERS).length
    ? adminRotationFilterMachineList(raw.hardCycle, HARD_MACHINE_HEADERS)
    : Array.from(base.hardCycle || []);
  const softHardBlockLength = Math.max(1, Math.min(12, Number(raw.softHardBlockLength || base.softHardBlockLength || 3) || 3));
  const softBaseLathe = Object.assign({}, base.softBaseLathe || {}, adminRotationNormalizeSoftBaseLathe(raw.softBaseLathe || {}, softCore));
  const avoidLatheWhenTwoLathesOneMillEnabled = adminRotationGeneratorBooleanValue(raw.avoidLatheWhenTwoLathesOneMillEnabled, base.avoidLatheWhenTwoLathesOneMillEnabled !== false);
  const avoidLatheWhenTwoLathesOneMillNames = adminRotationSplitGeneratorList(raw.avoidLatheWhenTwoLathesOneMillNames).length
    ? adminRotationSplitGeneratorList(raw.avoidLatheWhenTwoLathesOneMillNames)
    : Array.from(base.avoidLatheWhenTwoLathesOneMillNames || ['Starý']);
  const soloMillBalanceEnabled = adminRotationGeneratorBooleanValue(raw.soloMillBalanceEnabled, base.soloMillBalanceEnabled !== false);
  const soloMillMaxSpread = Math.max(0, Math.min(6, Number(raw.soloMillMaxSpread ?? base.soloMillMaxSpread ?? 1) || 1));
  const softTotalBalanceEnabled = adminRotationGeneratorBooleanValue(raw.softTotalBalanceEnabled, base.softTotalBalanceEnabled !== false);
  const softTotalBalanceNames = adminRotationSplitGeneratorList(raw.softTotalBalanceNames).length
    ? adminRotationSplitGeneratorList(raw.softTotalBalanceNames)
    : Array.from(base.softTotalBalanceNames || ['Blažek', 'Starý', 'Kříž', 'Pech']);
  const softTotalMaxSpread = Math.max(0, Math.min(6, Number(raw.softTotalMaxSpread ?? base.softTotalMaxSpread ?? 1) || 1));
  const hardPeopleSoftKindBalanceEnabled = adminRotationGeneratorBooleanValue(raw.hardPeopleSoftKindBalanceEnabled, base.hardPeopleSoftKindBalanceEnabled !== false);
  const hardPeopleSoftKindBalanceNames = adminRotationSplitGeneratorList(raw.hardPeopleSoftKindBalanceNames).length
    ? adminRotationSplitGeneratorList(raw.hardPeopleSoftKindBalanceNames)
    : Array.from(base.hardPeopleSoftKindBalanceNames || base.hardPreferred || []);
  const hardPeopleSoftKindMaxSpread = Math.max(0, Math.min(6, Number(raw.hardPeopleSoftKindMaxSpread ?? base.hardPeopleSoftKindMaxSpread ?? 1) || 1));
  const softKindGlobalBalanceEnabled = adminRotationGeneratorBooleanValue(raw.softKindGlobalBalanceEnabled, base.softKindGlobalBalanceEnabled !== false);
  const softKindMixedMinimumShifts = Math.max(1, Math.min(12, Number(raw.softKindMixedMinimumShifts ?? base.softKindMixedMinimumShifts ?? 3) || 3));
  return {
    type: ADMIN_ROTATION_GENERATOR_SETTINGS_CATEGORY,
    softPreferred,
    hardPreferred,
    softCore,
    softHardCycle,
    softHardBlockLength,
    softBaseLathe,
    hardCycle,
    avoidLatheWhenTwoLathesOneMillEnabled,
    avoidLatheWhenTwoLathesOneMillNames,
    soloMillBalanceEnabled,
    soloMillMaxSpread,
    softTotalBalanceEnabled,
    softTotalBalanceNames,
    softTotalMaxSpread,
    hardPeopleSoftKindBalanceEnabled,
    hardPeopleSoftKindBalanceNames,
    hardPeopleSoftKindMaxSpread,
    softKindGlobalBalanceEnabled,
    softKindMixedMinimumShifts
  };
}


function adminRotationHasGeneratorSettingsRow() {
  const rows = Array.isArray(app && app.machineSettingsRows) ? app.machineSettingsRows : [];
  return rows.some(adminIsRotationGeneratorSettingsRow);
}


function adminRotationRefreshGeneratorSettingsStatus(root) {
  const scope = root && root.querySelector ? root : document;
  const statusEl = scope.querySelector ? scope.querySelector('#adminGeneratorSettingsStatus') : document.getElementById('adminGeneratorSettingsStatus');
  if (!statusEl) return false;
  const html = buildAdminRotationGeneratorStatusHtml(readAdminRotationGeneratorDraftFromDom(scope));
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const fresh = wrapper.firstElementChild;
  if (!fresh) return false;
  statusEl.replaceWith(fresh);
  return true;
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-generator.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
