// RaK – průvodce generátoru, návrh, kalendář absencí a export oddělené od engine.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-generator-wizard.js', 'loading', { source: 'dynamic-loader' }); } catch (err) {}

const ADMIN_ROTATION_GENERATOR_ABSENCE_ICS_URL = String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url || '').replace(/\/$/, '') + '/functions/v1/rak-absence-calendar';

function adminRotationGeneratorCanReadEditorDraftFromDom() {
  const body = document.getElementById('appMenuBody');
  return !!(body && body.querySelector('#adminRotationEditor tr[data-rotation-section]'));
}

function adminRotationGeneratorEnsurePendingDrafts() {
  const root = typeof window !== 'undefined' ? window : globalThis;
  if (!root.__rakRotationGeneratorPendingDrafts || typeof root.__rakRotationGeneratorPendingDrafts !== 'object') {
    root.__rakRotationGeneratorPendingDrafts = {};
  }
  return root.__rakRotationGeneratorPendingDrafts;
}

function adminRotationGeneratorSetPendingDraft(monthKey, month) {
  const key = String(monthKey || '').trim();
  if (!key || !month) return null;
  const drafts = adminRotationGeneratorEnsurePendingDrafts();
  drafts[key] = JSON.parse(JSON.stringify(month));
  if (app && typeof app === 'object') {
    if (!app.adminRotationPendingDrafts || typeof app.adminRotationPendingDrafts !== 'object') app.adminRotationPendingDrafts = {};
    app.adminRotationPendingDrafts[key] = JSON.parse(JSON.stringify(month));
  }
  return drafts[key];
}

function adminRotationGeneratorGetPendingDraft(monthKey) {
  const key = String(monthKey || '').trim();
  if (!key) return null;
  const drafts = adminRotationGeneratorEnsurePendingDrafts();
  const appDrafts = app && app.adminRotationPendingDrafts && typeof app.adminRotationPendingDrafts === 'object'
    ? app.adminRotationPendingDrafts
    : {};
  const draft = drafts[key] || appDrafts[key];
  if (!draft) return null;
  if (!drafts[key]) drafts[key] = JSON.parse(JSON.stringify(draft));
  return JSON.parse(JSON.stringify(draft));
}

function adminRotationGeneratorClearPendingDraft(monthKey) {
  const key = String(monthKey || '').trim();
  if (!key) return;
  const drafts = adminRotationGeneratorEnsurePendingDrafts();
  delete drafts[key];
  if (app && app.adminRotationPendingDrafts && typeof app.adminRotationPendingDrafts === 'object') {
    delete app.adminRotationPendingDrafts[key];
  }
}

function adminRotationGeneratorApplyPendingDraft(monthKey) {
  const key = String(monthKey || '').trim();
  const draft = adminRotationGeneratorGetPendingDraft(key);
  if (!key || !draft || !app || !app.rotation) return false;
  if (!app.rotation.months) app.rotation.months = {};
  app.rotation.months[key] = typeof normalizeMonthForImport === 'function'
    ? normalizeMonthForImport(draft, app.rotation.months[key] || null)
    : draft;
  app.selectedMonth = key;
  return true;
}

function adminRotationGeneratorOpenDraftInEditor(state, body) {
  const wizardState = state && typeof state === 'object' ? state : adminRotationGeneratorGetWizardState();
  const monthKey = String(wizardState.monthKey || app.selectedMonth || '').trim();
  const resultDraft = wizardState.result && wizardState.result.normalized ? wizardState.result.normalized : null;
  if (monthKey && resultDraft) adminRotationGeneratorSetPendingDraft(monthKey, resultDraft);
  const applied = adminRotationGeneratorApplyPendingDraft(monthKey);
  app.selectedMonth = monthKey;
  if (body && typeof renderAdminMenuBody === 'function') renderAdminMenuBody(body, 'rotation');
  return applied;
}

function adminRotationGeneratorResolveSelectableMonthKey(monthKey) {
  const allowed = adminRotationGetAllowedGeneratorMonthKeys();
  if (!allowed.length) return '';
  if (monthKey && allowed.includes(monthKey)) return monthKey;
  return allowed[0];
}

function adminRotationGeneratorBuildYearOptions(selected) {
  const keys = adminRotationGetAllowedGeneratorMonthKeys();
  const rawSelected = selected || (keys[0] || '');
  const parsedYear = rawSelected ? adminRotationMonthYearLabel(rawSelected) : '';
  const selectedYear = parsedYear && parsedYear !== 'Bez roku' ? parsedYear : String(new Date().getFullYear());
  const years = keys.length
    ? Array.from(new Set(keys.map((key) => adminRotationMonthYearLabel(key)))).filter(Boolean)
    : [String(new Date().getFullYear())];
  return years.map((year) => '<option value="' + escapeHtml(year) + '"' + (String(year) === String(selectedYear) ? ' selected' : '') + '>' + escapeHtml(year) + '</option>').join('');
}

function adminRotationGeneratorBuildMonthOptions(selected, selectedYear) {
  const keys = adminRotationGetAllowedGeneratorMonthKeys();
  if (!keys.length) return '';
  const active = adminRotationGeneratorResolveSelectableMonthKey(selected);
  const year = selectedYear || adminRotationMonthYearLabel(active);
  return keys
    .filter((key) => !year || adminRotationMonthYearLabel(key) === String(year))
    .map((key) => '<option value="' + escapeHtml(key) + '"' + (key === active ? ' selected' : '') + '>' + escapeHtml(adminRotationMonthFullLabel(key)) + '</option>')
    .join('');
}

function adminRotationGeneratorAlignAbsencesToDays(days, absencesByDay) {
  const workingDays = Array.isArray(days) ? days.map((date) => String(date || '').trim()).filter(Boolean) : [];
  const source = Array.isArray(absencesByDay) ? absencesByDay : [];
  const exactMap = new Map();
  const baseMap = new Map();
  source.forEach((day, idx) => {
    const date = String(day && day.date || '').trim();
    if (!date) return;
    const exact = adminRotationDateLabel(date);
    const base = adminRotationDateBaseKey(date);
    if (exact && !exactMap.has(exact)) exactMap.set(exact, idx);
    if (base && !baseMap.has(base)) baseMap.set(base, idx);
  });
  return workingDays.map((date) => {
    const exact = adminRotationDateLabel(date);
    const base = adminRotationDateBaseKey(date);
    let sourceIdx = exactMap.has(exact) ? exactMap.get(exact) : -1;
    if ((!Number.isFinite(sourceIdx) || sourceIdx < 0) && baseMap.has(base)) sourceIdx = baseMap.get(base);
    const rows = Number.isFinite(sourceIdx) && source[sourceIdx] && Array.isArray(source[sourceIdx].rows)
      ? source[sourceIdx].rows.map((row) => ({ person: String(row && row.person || '').trim(), code: String(row && row.code || '').trim() }))
      : [];
    return { date, rows };
  });
}

function adminRotationGeneratorBuildPrefillState(monthKey) {
  const days = adminRotationGetMonthWorkDates(monthKey);
  const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  return {
    days: days.slice(),
    absencesByDay: adminRotationCollectMonthAbsencesFromMonth(month, days)
  };
}

function adminRotationGeneratorResolveWizardDays(state) {
  const liveState = state || adminRotationGeneratorGetWizardState();
  const fromState = Array.isArray(liveState.days) ? liveState.days.map((d) => String(d || '').trim()).filter(Boolean) : [];
  if (fromState.length) return fromState;
  const monthKey = String(liveState.monthKey || '').trim();
  const fallbackDays = adminRotationGetMonthWorkDates(monthKey);
  if (fallbackDays.length) {
    liveState.days = fallbackDays.slice();
    return fallbackDays;
  }
  return [];
}

function adminRotationGeneratorGetWizardState() {
  if (!window.__rakRotationGeneratorWizard || typeof window.__rakRotationGeneratorWizard !== 'object') {
    window.__rakRotationGeneratorWizard = { step: 'month', monthKey: '', days: [], absencesByDay: [] };
  }
  return window.__rakRotationGeneratorWizard;
}

function adminRotationGeneratorSetWizardState(next) {
  window.__rakRotationGeneratorWizard = Object.assign(adminRotationGeneratorGetWizardState(), next || {});
  return window.__rakRotationGeneratorWizard;
}

function adminRotationGeneratorCollectDaysFromDom() {
  const body = document.getElementById('appMenuBody');
  if (!body) return [];
  return Array.from(body.querySelectorAll('[data-generator-day-input]'))
    .map((input) => String(input.value || '').trim())
    .filter(Boolean);
}

function adminRotationGeneratorGetWizardDaysForCollection() {
  const domDays = adminRotationGeneratorCollectDaysFromDom();
  if (domDays.length) return domDays;
  const state = adminRotationGeneratorGetWizardState();
  return Array.isArray(state.days) ? state.days.map((date) => String(date || '').trim()).filter(Boolean) : [];
}

function adminRotationGeneratorCollectAbsencesFromDom() {
  const body = document.getElementById('appMenuBody');
  const days = adminRotationGeneratorGetWizardDaysForCollection();
  const absencesByDay = days.map((date) => ({ date, rows: [] }));
  if (!body) return absencesByDay;
  body.querySelectorAll('[data-generator-absence-day]').forEach((box) => {
    const dayIndex = Number(box.getAttribute('data-generator-absence-day') || -1);
    if (!Number.isFinite(dayIndex) || dayIndex < 0 || !absencesByDay[dayIndex]) return;
    const rows = [];
    box.querySelectorAll('[data-generator-absence-row]').forEach((row) => {
      const person = String(row.querySelector('[data-generator-absence-person]')?.value || '').trim();
      const code = String(row.querySelector('[data-generator-absence-code]')?.value || '').trim();
      rows.push({ person, code });
    });
    absencesByDay[dayIndex].rows = rows;
  });
  return absencesByDay;
}

function adminRotationGeneratorIcsUnfold(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '');
}

function adminRotationGeneratorIcsProp(block, name) {
  const wanted = String(name || '').toUpperCase();
  const lines = String(block || '').split(/\r?\n/);
  for (const line of lines) {
    const split = String(line || '').indexOf(':');
    if (split < 0) continue;
    const key = line.slice(0, split).split(';')[0].toUpperCase();
    if (key === wanted) return { rawKey: line.slice(0, split), value: line.slice(split + 1) };
  }
  return { rawKey: '', value: '' };
}

function adminRotationGeneratorIcsDecodeText(value) {
  return String(value || '')
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

function adminRotationGeneratorIcsDatePart(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return '';
  return match[1] + '-' + match[2] + '-' + match[3];
}

function adminRotationGeneratorIsoToUtcDate(iso) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function adminRotationGeneratorUtcDateToIso(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function adminRotationGeneratorIcsDateRange(startProp, endProp) {
  const startIso = adminRotationGeneratorIcsDatePart(startProp && startProp.value);
  if (!startIso) return [];
  const endIso = adminRotationGeneratorIcsDatePart(endProp && endProp.value);
  const isAllDay = /VALUE=DATE/i.test(String(startProp && startProp.rawKey || '')) || /^\d{8}$/.test(String(startProp && startProp.value || '').trim());
  const startDate = adminRotationGeneratorIsoToUtcDate(startIso);
  if (!startDate) return [];
  const endDate = endIso ? adminRotationGeneratorIsoToUtcDate(endIso) : null;
  if (!endDate || endDate <= startDate) return [startIso];
  const limit = new Date(endDate.getTime());
  if (isAllDay) limit.setUTCDate(limit.getUTCDate() - 1);
  if (limit < startDate) return [startIso];
  const result = [];
  const cursor = new Date(startDate.getTime());
  while (cursor <= limit && result.length < 370) {
    result.push(adminRotationGeneratorUtcDateToIso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function adminRotationGeneratorDateLabelToIso(dateLabel, monthKey) {
  const parsedDate = typeof parseDateToken === 'function' ? parseDateToken(String(dateLabel || '').trim()) : null;
  const parsedMonth = typeof parseMonthKey === 'function' ? parseMonthKey(monthKey) : null;
  if (!parsedDate || !parsedMonth) return '';
  const year = Number(parsedMonth.year);
  const month = Number(parsedDate.month || parsedMonth.month);
  const day = Number(parsedDate.day);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  return adminRotationGeneratorUtcDateToIso(new Date(Date.UTC(year, month - 1, day)));
}

function adminRotationGeneratorParseCalendarAbsenceSummary(summary, knownNames) {
  const raw = adminRotationGeneratorIcsDecodeText(summary);
  if (!raw) return null;
  const match = raw.match(/^([^\s,;:]+)\s+(.+)$/);
  if (!match) return null;
  const known = Array.isArray(knownNames) ? knownNames : adminGetKnownNames();
  const person = adminRotationCanonicalName(match[1], known);
  if (!known.includes(person)) return null;
  const code = String(match[2] || '').trim();
  const foldedCode = adminRotationNameLookupKey(code);
  const upperCode = code.toLocaleUpperCase('cs-CZ');
  const hasAbsenceCode = /\b(?:D|NV|L|N|S)\b/i.test(code)
    || upperCode.indexOf('§') >= 0
    || upperCode.indexOf('Š') >= 0
    || /(?:dovol|nahrad|nemoc|neschop|lazn|lazne|lazen|paragraf|skolen|senior)/i.test(foldedCode);
  if (!hasAbsenceCode) return null;
  return { person, code };
}

function adminRotationGeneratorParseIcsAbsences(text, monthKey, days) {
  const knownNames = adminGetKnownNames();
  const dayIsoToIndex = new Map();
  (Array.isArray(days) ? days : []).forEach((dateLabel, idx) => {
    const iso = adminRotationGeneratorDateLabelToIso(dateLabel, monthKey);
    if (iso && !dayIsoToIndex.has(iso)) dayIsoToIndex.set(iso, idx);
  });
  const result = (Array.isArray(days) ? days : []).map((date) => ({ date, rows: [] }));
  const seen = new Set();
  const source = adminRotationGeneratorIcsUnfold(text);
  const events = source.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  events.forEach((eventBlock) => {
    const parsed = adminRotationGeneratorParseCalendarAbsenceSummary(adminRotationGeneratorIcsProp(eventBlock, 'SUMMARY').value, knownNames);
    if (!parsed) return;
    const dates = adminRotationGeneratorIcsDateRange(adminRotationGeneratorIcsProp(eventBlock, 'DTSTART'), adminRotationGeneratorIcsProp(eventBlock, 'DTEND'));
    dates.forEach((iso) => {
      const dayIdx = dayIsoToIndex.get(iso);
      if (!Number.isFinite(dayIdx) || !result[dayIdx]) return;
      const key = String(dayIdx) + '|' + adminRotationNameLookupKey(parsed.person) + '|' + adminRotationNameLookupKey(parsed.code);
      if (seen.has(key)) return;
      seen.add(key);
      result[dayIdx].rows.push({ person: parsed.person, code: parsed.code });
    });
  });
  return result;
}

function adminRotationGeneratorMergeAbsences(existing, imported) {
  const days = adminRotationGeneratorGetWizardDaysForCollection();
  const base = adminRotationGeneratorAlignAbsencesToDays(days, existing);
  const source = adminRotationGeneratorAlignAbsencesToDays(days, imported);
  return base.map((day, dayIdx) => {
    const rows = [];
    const seen = new Set();
    const addRow = (row) => {
      const person = adminRotationCanonicalName(row && row.person || '', adminGetKnownNames());
      const code = String(row && row.code || '').trim();
      if (!person && !code) {
        rows.push({ person: '', code: '' });
        return;
      }
      if (!person || !code) {
        rows.push({ person, code });
        return;
      }
      const key = adminRotationNameLookupKey(person) + '|' + adminRotationNameLookupKey(code);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ person, code });
    };
    (Array.isArray(day.rows) ? day.rows : []).forEach(addRow);
    (Array.isArray(source[dayIdx] && source[dayIdx].rows) ? source[dayIdx].rows : []).forEach(addRow);
    return { date: day.date, rows };
  });
}

async function adminRotationGeneratorLoadCalendarAbsences() {
  const state = adminRotationGeneratorGetWizardState();
  state.days = adminRotationGeneratorResolveWizardDays(state);
  state.absencesByDay = adminRotationGeneratorCollectAbsencesFromDom();
  const status = document.getElementById('adminOnlineSaveStatus');
  if (status) status.textContent = 'Načítám dovolené z Google kalendáře...';
  try {
    const bridge = window.RotationSupabaseBridge;
    const accessToken = bridge && typeof bridge.getAdminAccessToken === 'function'
      ? await bridge.getAdminAccessToken()
      : '';
    if (!accessToken) throw new Error('admin-auth-required');
    const response = await fetch(ADMIN_ROTATION_GENERATOR_ABSENCE_ICS_URL, {
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        apikey: String(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.publishableKey || '')
      }
    });
    if (!response || !response.ok) throw new Error('HTTP ' + String(response && response.status || ''));
    const text = await response.text();
    const imported = adminRotationGeneratorParseIcsAbsences(text, state.monthKey, state.days);
    const importedCount = imported.reduce((sum, day) => sum + (Array.isArray(day.rows) ? day.rows.length : 0), 0);
    state.absencesByDay = adminRotationGeneratorMergeAbsences(state.absencesByDay, imported);
    adminRotationGeneratorRenderWizard('absences');
    const nextStatus = document.getElementById('adminOnlineSaveStatus');
    if (nextStatus) nextStatus.textContent = importedCount
      ? ('Načteno z kalendáře: ' + String(importedCount) + ' absencí. Ručně zadané řádky zůstaly zachované.')
      : 'V kalendáři jsem pro vybraný měsíc nenašel žádné známé absence.';
    return { ok: true, importedCount };
  } catch (err) {
    const failStatus = document.getElementById('adminOnlineSaveStatus');
    if (failStatus) failStatus.textContent = 'Kalendář se nepodařilo načíst. Zkontroluj přihlášení nebo dostupnost Google kalendáře.';
    return { ok: false, error: err && err.message ? err.message : String(err || 'neznámá chyba') };
  }
}

function adminRotationGeneratorRenderWizard(step) {
  const body = document.getElementById('appMenuBody');
  if (!body) return;
  const state = adminRotationGeneratorGetWizardState();
  const selected = adminRotationGeneratorResolveSelectableMonthKey(state.monthKey || adminRotationGetNextMonthKeyFrom(getAdminSelectedMonthKey()));
  const selectedYear = adminRotationMonthYearLabel(selected);
  const yearOptions = adminRotationGeneratorBuildYearOptions(selected);
  const monthOptions = adminRotationGeneratorBuildMonthOptions(selected, selectedYear);
  body.dataset.adminView = 'rotation';
  body.innerHTML = [
    '<div class="appMenuCard appMenuAdminCard adminRotationGeneratorWizard">',
    '  <div class="appMenuCardTitle">Generátor rozpisu</div>',
    '  <div class="appMenuText">Průvodce nejdřív zkontroluje měsíc a pracovní dny, potom absence a až nakonec vytvoří návrh. Online se nic neukládá bez tlačítka Uložit rozpis.</div>',
    '  <div class="adminRotationGeneratorSteps">',
    '    <span class="' + (step === 'month' ? 'isActive' : '') + '">1. Měsíc</span>',
    '    <span class="' + (step === 'days' ? 'isActive' : '') + '">2. Dny</span>',
    '    <span class="' + (step === 'absences' ? 'isActive' : '') + '">3. Absence</span>',
    '    <span class="' + (step === 'result' ? 'isActive' : '') + '">4. Návrh</span>',
    '  </div>',
    step === 'month' ? adminRotationGeneratorRenderMonthStep(yearOptions, monthOptions, selected) : '',
    step === 'days' ? adminRotationGeneratorRenderDaysStep(state) : '',
    step === 'absences' ? adminRotationGeneratorRenderAbsencesStep(state) : '',
    step === 'result' ? adminRotationGeneratorRenderResultStep(state) : '',
    '  <div id="adminOnlineSaveStatus" class="appMenuStatusLine"></div>',
    '</div>'
  ].join('');
  try {
    const status = document.getElementById('adminOnlineSaveStatus');
    if (status) status.textContent = step === 'month'
      ? (selected ? 'Nabízím aktuální měsíc pro případné přegenerování a další navazující měsíc po hotových rozpisech.' : 'V seznamu rozpisů teď není dostupný žádný měsíc pro generátor.')
      : (step === 'days' ? 'Zkontroluj pracovní dny. Křížkem den smažeš, tlačítkem + přidáš další.' : '');
  } catch (err) {}
}

function adminRotationGeneratorRenderMonthStep(yearOptions, monthOptions, selected) {
  const disabled = monthOptions ? '' : ' disabled';
  return [
    '<div class="adminRotationGeneratorPanel">',
    '  <label class="appMenuFieldLabel" for="adminGeneratorYearSelect">Rok</label>',
    '  <select id="adminGeneratorYearSelect" class="appMenuSelect">' + yearOptions + '</select>',
    '  <label class="appMenuFieldLabel" for="adminGeneratorMonthSelect">Měsíc pro návrh</label>',
    '  <select id="adminGeneratorMonthSelect" class="appMenuSelect"' + disabled + '>' + monthOptions + '</select>',
    '  <div class="smallText">' + (selected ? 'Dostupný měsíc: ' + escapeHtml(adminRotationMonthFullLabel(selected)) + '.' : 'Nejdřív musí existovat měsíc v seznamu rozpisů.') + '</div>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="back-admin">Zpět</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="generator-month-next"' + disabled + '>Pokračovat na dny</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function adminRotationGeneratorHandleYearSelectChange(target) {
  const yearSelect = target && typeof target.closest === 'function' ? target.closest('#adminGeneratorYearSelect') : null;
  if (!yearSelect) return false;
  const body = document.getElementById('appMenuBody');
  if (!body || !body.querySelector('.adminRotationGeneratorWizard')) return false;
  const monthSelect = body.querySelector('#adminGeneratorMonthSelect');
  if (!monthSelect) return true;
  const options = adminRotationGeneratorBuildMonthOptions(monthSelect.value, String(yearSelect.value || '').trim());
  monthSelect.innerHTML = options;
  monthSelect.disabled = !options;
  if (options && !monthSelect.value) {
    const first = monthSelect.querySelector('option[value]');
    if (first) monthSelect.value = first.value || '';
  }
  return true;
}

function adminRotationGeneratorRenderDaysStep(state) {
  const days = Array.isArray(state.days) && state.days.length ? state.days : adminRotationGetMonthWorkDates(state.monthKey);
  state.days = days.slice();
  const rows = days.map((date, idx) => [
    '<div class="adminRotationGeneratorDayRow" data-generator-day-row="' + String(idx) + '">',
    '  <input class="appMenuInlineInput" data-generator-day-input value="' + escapeHtml(date) + '" placeholder="např. 1.6. R">',
    '  <button type="button" class="adminRotationGeneratorIconBtn" data-admin-action="generator-day-remove" data-day-index="' + String(idx) + '" title="Odebrat den">×</button>',
    '</div>'
  ].join('')).join('');
  return [
    '<div class="adminRotationGeneratorPanel">',
    '  <div class="appMenuSubTitle">Pracovní dny</div>',
    '  <div class="smallText">Zkontroluj dny před generováním. Svátek nebo odstávku prostě smaž křížkem; chybějící den přidej přes +.</div>',
    '  <div class="adminRotationGeneratorDayList">' + (rows || '<div class="smallText">Tenhle měsíc zatím nemá dny. Přidej je ručně.</div>') + '</div>',
    '  <button type="button" class="appMenuAction adminRotationGeneratorSmallAdd" data-admin-action="generator-day-add">+ Přidat den</button>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-back-month">Zpět</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="generator-days-next">Dny jsou OK</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function adminRotationGeneratorRenderAbsencesStep(state) {
  const days = adminRotationGeneratorResolveWizardDays(state);
  let absencesByDay = Array.isArray(state.absencesByDay) ? state.absencesByDay : [];
  absencesByDay = days.map((date, idx) => {
    const existing = absencesByDay[idx] || {};
    return { date, rows: Array.isArray(existing.rows) ? existing.rows : [] };
  });
  state.absencesByDay = absencesByDay;
  const blocks = absencesByDay.map((day, dayIdx) => {
    const rows = (day.rows.length ? day.rows : [{ person: '', code: '' }]).map((row, rowIdx) => [
      '<div class="adminRotationGeneratorAbsenceRow" data-generator-absence-row="' + String(rowIdx) + '">',
      '  <input class="appMenuInlineInput" data-generator-absence-person value="' + escapeHtml(row.person || '') + '" placeholder="jméno">',
      '  <input class="appMenuInlineInput appMenuInlineInputTiny" data-generator-absence-code value="' + escapeHtml(row.code || '') + '" placeholder="kód" list="adminAbsenceCodeOptions">',
      '  <button type="button" class="adminRotationGeneratorIconBtn" data-admin-action="generator-absence-remove" data-day-index="' + String(dayIdx) + '" data-row-index="' + String(rowIdx) + '" title="Odebrat absenci">×</button>',
      '</div>'
    ].join('')).join('');
    return [
      '<div class="adminRotationGeneratorAbsenceDay" data-generator-absence-day="' + String(dayIdx) + '">',
      '  <div class="adminRotationGeneratorAbsenceTitle">' + escapeHtml(day.date || 'Den') + '</div>',
      '  <div class="adminRotationGeneratorAbsenceRows">' + rows + '</div>',
      '  <button type="button" class="appMenuAction adminRotationGeneratorSmallAdd" data-admin-action="generator-absence-add" data-day-index="' + String(dayIdx) + '">+ Přidat jméno</button>',
      '</div>'
    ].join('');
  }).join('');
  return [
    '<div class="adminRotationGeneratorPanel">',
    buildAdminAbsenceCodeDatalistHtml(),
    '  <div class="appMenuSubTitle">Absence před generováním</div>',
    '  <div class="smallText">U každého dne můžeš přes + přidat víc lidí. Nevyplněné řádky se ignorují.</div>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-load-calendar-absences">Načíst dovolené z kalendáře</button>',
    '  </div>',
    '  <div class="adminRotationGeneratorAbsenceList">' + (blocks || '<div class="smallText">Nejsou vybrané žádné pracovní dny.</div>') + '</div>',
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-back-days">Zpět na dny</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="generator-run">Vygenerovat rozpis</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function adminRotationGeneratorExcelText(value) {
  return String(value == null ? '' : value).trim();
}

function adminRotationGeneratorExcelBlankRow(width) {
  return Array(Math.max(1, Number(width) || 1)).fill('');
}

function adminRotationGeneratorExcelSheetName(monthKey) {
  const raw = String(monthKey || '').trim();
  const match = raw.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (match) {
    const month = String(match[1]).padStart(2, '0');
    const yearRaw = Number(match[2]);
    const year = String(yearRaw < 100 ? 2000 + yearRaw : yearRaw);
    return month + '.' + year;
  }
  return raw.replace(/[\\/?*\[\]:]/g, '_').slice(0, 31) || 'Navrh';
}

function adminRotationGeneratorExcelFileName(monthKey) {
  return 'RaK_navrh_rozpisu_' + adminRotationGeneratorExcelSheetName(monthKey).replace(/[^0-9A-Za-z._-]+/g, '_') + '.xlsx';
}

function adminRotationGeneratorBuildAbsenceExcelMaps(month) {
  const exact = new Map();
  const base = new Map();
  const add = (map, key, item) => {
    const safeKey = String(key || '').trim();
    if (!safeKey) return;
    if (!map.has(safeKey)) map.set(safeKey, []);
    map.get(safeKey).push(item);
  };
  (Array.isArray(month && month.notes) ? month.notes : []).forEach((note) => {
    const normalized = typeof normalizeNoteEntry === 'function' ? normalizeNoteEntry(note) : null;
    if (!normalized || !normalized.isAbsence) return;
    const people = Array.isArray(normalized.people) && normalized.people.length
      ? normalized.people
      : [normalized.person].filter(Boolean);
    const code = adminRotationGeneratorExcelText(normalized.code || (note && note.code) || '');
    people.forEach((person) => {
      const item = { person: adminRotationGeneratorExcelText(person), code };
      if (!item.person && !item.code) return;
      add(exact, typeof adminRotationDateLabel === 'function' ? adminRotationDateLabel(normalized.date || (note && note.date) || '') : adminRotationGeneratorExcelText(normalized.date || (note && note.date) || ''), item);
      add(base, typeof adminRotationDateBaseKey === 'function' ? adminRotationDateBaseKey(normalized.date || (note && note.date) || '') : adminRotationGeneratorExcelText(normalized.date || (note && note.date) || ''), item);
    });
  });
  return { exact, base };
}

function adminRotationGeneratorGetExcelAbsencesForDate(absenceMaps, dateLabel) {
  const exactKey = typeof adminRotationDateLabel === 'function' ? adminRotationDateLabel(dateLabel) : adminRotationGeneratorExcelText(dateLabel);
  const baseKey = typeof adminRotationDateBaseKey === 'function' ? adminRotationDateBaseKey(dateLabel) : adminRotationGeneratorExcelText(dateLabel);
  if (absenceMaps && absenceMaps.exact && absenceMaps.exact.has(exactKey)) return absenceMaps.exact.get(exactKey) || [];
  if (absenceMaps && absenceMaps.base && absenceMaps.base.has(baseKey)) return absenceMaps.base.get(baseKey) || [];
  return [];
}

function adminRotationGeneratorBuildExcelAbsenceSlots(absenceMaps, dayLabels) {
  let maxAbsences = 0;
  (Array.isArray(dayLabels) ? dayLabels : []).forEach((dateLabel) => {
    const count = adminRotationGeneratorGetExcelAbsencesForDate(absenceMaps, dateLabel).length;
    if (count > maxAbsences) maxAbsences = count;
  });
  return Math.max(4, Math.min(8, maxAbsences || 0));
}

function adminRotationGeneratorBuildExcelCols(aoa) {
  const width = Math.max(8, ...(Array.isArray(aoa) ? aoa.map((row) => Array.isArray(row) ? row.length : 0) : [0]));
  const cols = [];
  for (let idx = 0; idx < width; idx += 1) {
    if (idx === 0 || idx === 7) cols.push({ wch: 12 });
    else if (idx >= 1 && idx <= 5) cols.push({ wch: 14 });
    else if (idx === 6) cols.push({ wch: 3 });
    else cols.push({ wch: idx % 2 === 0 ? 15 : 8 });
  }
  return cols;
}

function adminRotationGeneratorBuildExcelAoa(month) {
  const hard = month && month.hard ? month.hard : {};
  const soft = month && month.soft ? month.soft : {};
  const hardMachines = Array.isArray(hard.machines) && hard.machines.length ? hard.machines : HARD_MACHINE_HEADERS.slice();
  const softMachines = Array.isArray(soft.machines) && soft.machines.length ? soft.machines : SOFT_MACHINE_HEADERS.slice();
  const hardRows = Array.isArray(hard.rows) ? hard.rows : [];
  const softRows = Array.isArray(soft.rows) ? soft.rows : [];
  const dayCount = Math.max(hardRows.length, softRows.length);
  const absenceMaps = adminRotationGeneratorBuildAbsenceExcelMaps(month);
  const dayLabels = [];
  for (let i = 0; i < dayCount; i += 1) {
    const hardRow = hardRows[i] || {};
    const softRow = softRows[i] || {};
    dayLabels.push(adminRotationGeneratorExcelText(hardRow.date || softRow.date || ''));
  }
  const absenceSlots = adminRotationGeneratorBuildExcelAbsenceSlots(absenceMaps, dayLabels);
  const width = 8 + absenceSlots * 2;
  const rows = [];
  const hardHeader = adminRotationGeneratorExcelBlankRow(width);
  hardHeader[0] = 'Rotace  tvrdota';
  hardMachines.slice(0, 5).forEach((machine, idx) => { hardHeader[1 + idx] = adminRotationGeneratorExcelText(machine); });
  hardHeader[7] = 'Dovolená, neschopenka atd.:';
  for (let idx = 0; idx < absenceSlots; idx += 1) {
    hardHeader[8 + idx * 2] = idx === 0 ? 'Jméno' : ('Jméno ' + String(idx + 1));
    hardHeader[9 + idx * 2] = idx === 0 ? 'Kód' : ('Kód ' + String(idx + 1));
  }
  rows.push(hardHeader);
  for (let i = 0; i < dayCount; i += 1) {
    const hardRow = hardRows[i] || {};
    const softRow = softRows[i] || {};
    const date = dayLabels[i] || adminRotationGeneratorExcelText(hardRow.date || softRow.date || '');
    const row = adminRotationGeneratorExcelBlankRow(width);
    row[0] = date;
    const hardCells = Array.isArray(hardRow.cells) ? hardRow.cells : [];
    hardMachines.slice(0, 5).forEach((_, idx) => { row[1 + idx] = adminRotationGeneratorExcelText(hardCells[idx] || ''); });
    row[7] = date;
    const absences = adminRotationGeneratorGetExcelAbsencesForDate(absenceMaps, date).slice(0, absenceSlots);
    absences.forEach((absence, idx) => {
      row[8 + idx * 2] = adminRotationGeneratorExcelText(absence.person || '');
      row[9 + idx * 2] = adminRotationGeneratorExcelText(absence.code || '');
    });
    rows.push(row);
  }
  rows.push(adminRotationGeneratorExcelBlankRow(width));
  const softHeader = adminRotationGeneratorExcelBlankRow(width);
  softHeader[0] = 'Rotace  měkota';
  softMachines.slice(0, 5).forEach((machine, idx) => { softHeader[1 + idx] = adminRotationGeneratorExcelText(machine); });
  rows.push(softHeader);
  for (let i = 0; i < dayCount; i += 1) {
    const hardRow = hardRows[i] || {};
    const softRow = softRows[i] || {};
    const date = adminRotationGeneratorExcelText(softRow.date || hardRow.date || '');
    const row = adminRotationGeneratorExcelBlankRow(width);
    row[0] = date;
    const softCells = Array.isArray(softRow.cells) ? softRow.cells : [];
    softMachines.slice(0, 5).forEach((_, idx) => { row[1 + idx] = adminRotationGeneratorExcelText(softCells[idx] || ''); });
    rows.push(row);
  }
  return rows;
}

function adminRotationGeneratorDownloadExcel(monthKey) {
  try {
    if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils || typeof XLSX.writeFile !== 'function') {
      throw new Error('Knihovna XLSX není dostupná. Zkus to online nebo po načtení stránky znovu.');
    }
    const key = String(monthKey || (app && app.selectedMonth) || '').trim();
    const month = adminRotationGeneratorGetPendingDraft(key) || (app && app.rotation && app.rotation.months ? app.rotation.months[key] : null);
    if (!month) throw new Error('Není dostupný vygenerovaný měsíc pro export.');
    const aoa = adminRotationGeneratorBuildExcelAoa(month);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = adminRotationGeneratorBuildExcelCols(aoa);
    XLSX.utils.book_append_sheet(wb, ws, adminRotationGeneratorExcelSheetName(key));
    XLSX.writeFile(wb, adminRotationGeneratorExcelFileName(key));
    return true;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err || 'Excel export se nepovedl.');
    try {
      const status = document.getElementById('adminOnlineSaveStatus');
      if (status) {
        status.textContent = 'Excel export se nepovedl: ' + msg;
        status.classList.add('isError');
      }
    } catch (inner) {}
    alert('Excel export se nepovedl: ' + msg);
    return false;
  }
}

function adminRotationGeneratorRenderResultStep(state) {
  const month = (state && state.result && state.result.normalized)
    || (state && state.result ? adminRotationGeneratorGetPendingDraft(state.monthKey) : null);
  const summary = adminBuildRotationMachineCountSummaryHtml(month, state.monthKey);
  const preview = adminBuildRotationGeneratorPreviewHtml(month, state.monthKey);
  return [
    '<div class="adminRotationGeneratorPanel">',
    '  <div class="appMenuSubTitle">Návrh je hotový</div>',
    '  <div class="appMenuText">' + escapeHtml(state.resultText || 'Návrh se vytvořil lokálně. Teď ho zkontroluj, pak se vrať do editoru a ručně ulož.') + '</div>',
    preview,
    summary,
    '  <div class="appMenuActionRow">',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-back-month">Zpět na měsíc</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-back-days">Zpět na dny</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-back-absences">Zpět na absence</button>',
    '    <button type="button" class="appMenuAction" data-admin-action="generator-download-excel">Stáhnout Excel</button>',
    '    <button type="button" class="appMenuAction isActive" data-admin-action="generator-open-editor">Otevřít rozpis</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function adminRotationGeneratorEnsurePreparedMonthFromWizard() {
  const state = adminRotationGeneratorGetWizardState();
  const monthKey = state.monthKey;
  if (!monthKey) throw new Error('Chybí měsíc.');
  const fallback = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  if (!fallback) throw new Error('Pro vybraný měsíc nejsou připravená data.');
  const days = adminRotationGeneratorResolveWizardDays(state);
  if (!days.length) throw new Error('Nejsou vybrané žádné pracovní dny. Vrať se na krok Dny a přidej aspoň jeden den.');
  const month = JSON.parse(JSON.stringify(fallback));
  month.hard = month.hard || { title: 'Rotace tvrdota', machines: HARD_MACHINE_HEADERS.slice(), rows: [] };
  month.soft = month.soft || { title: 'Rotace měkota', machines: SOFT_MACHINE_HEADERS.slice(), rows: [] };
  month.hard.machines = HARD_MACHINE_HEADERS.slice();
  month.soft.machines = SOFT_MACHINE_HEADERS.slice();
  month.hard.rows = days.map((date) => ({ date, cells: Array(HARD_MACHINE_HEADERS.length).fill('') }));
  month.soft.rows = days.map((date) => ({ date, cells: Array(SOFT_MACHINE_HEADERS.length).fill('') }));
  const notes = [];
  const absencesByDay = Array.isArray(state.absencesByDay) ? state.absencesByDay : [];
  days.forEach((date, dayIdx) => {
    const day = absencesByDay[dayIdx] || {};
    const rows = Array.isArray(day.rows) ? day.rows : [];
    rows.forEach((row) => {
      const person = adminRotationCanonicalPeopleText(row.person || '', adminGetKnownNames());
      const code = String(row.code || '').trim();
      if (!person && !code) return;
      const parsed = typeof parseDateToken === 'function' ? parseDateToken(date) : null;
      const shift = parsed && parsed.shift ? parsed.shift : '';
      notes.push({ date, person, code, shift, text: [person, code].filter(Boolean).join(' ') });
    });
  });
  month.notes = notes;
  return normalizeMonthForImport(month, fallback);
}

function adminBuildRotationGeneratorPreviewHtml(month, monthKey) {
  if (!month) return '<div class="smallText">Náhled zatím není dostupný.</div>';
  const renderSection = (title, section, fallbackMachines) => {
    const machines = Array.isArray(section && section.machines) ? section.machines : fallbackMachines;
    const rows = Array.isArray(section && section.rows) ? section.rows : [];
    const head = '<tr><th>Den</th>' + machines.map((machine) => '<th>' + escapeHtml(machine) + '</th>').join('') + '</tr>';
    const body = rows.map((row) => '<tr><td>' + escapeHtml(row && row.date || '') + '</td>' + machines.map((_, idx) => { const value = String(row && row.cells ? row.cells[idx] || '' : '').trim(); return '<td class="' + (value ? '' : 'adminRotationPreviewEmptyCell') + '">' + escapeHtml(value || '—') + '</td>'; }).join('') + '</tr>').join('');
    return [
      '<details class="adminRotationGeneratorPreviewSection" open>',
      '  <summary>' + escapeHtml(title) + '</summary>',
      '  <div class="adminRotationGeneratorMachineSummaryScroll">',
      '    <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense adminRotationGeneratorPreviewTable"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>',
      '  </div>',
      '</details>'
    ].join('');
  };
  return [
    '<div class="adminRotationGeneratorPreview">',
    '  <div class="appMenuSubTitle">Náhled celého rozpisu ' + escapeHtml(monthKey || '') + '</div>',
    '  <div class="smallText">Tady si rozpis projdi ještě před otevřením editoru. Když najdeš špatný den nebo absenci, vrať se na příslušný krok a nic nemusíš klikat od začátku.</div>',
    renderSection('Tvrdota', month.hard, HARD_MACHINE_HEADERS),
    renderSection('Měkota', month.soft, SOFT_MACHINE_HEADERS),
    '</div>'
  ].join('');
}


function adminRotationUnplannedDateLabels(month) {
  const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
  const maxRows = Math.max(hardRows.length, softRows.length);
  const labels = [];
  const seen = new Set();
  for (let idx = 0; idx < maxRows; idx += 1) {
    const label = String((hardRows[idx] && hardRows[idx].date) || (softRows[idx] && softRows[idx].date) || '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

function adminRotationUnplannedDateIndex(labels, value) {
  const wanted = String(value || '').trim();
  let idx = labels.indexOf(wanted);
  if (idx >= 0) return idx;
  const base = typeof adminRotationDateBaseKey === 'function' ? adminRotationDateBaseKey(wanted) : wanted;
  return labels.findIndex((label) => {
    const candidate = typeof adminRotationDateBaseKey === 'function' ? adminRotationDateBaseKey(label) : label;
    return candidate === base;
  });
}

const ADMIN_UNPLANNED_REASON_OPTIONS = Object.freeze([
  Object.freeze({ value: 'D', label: 'Dovolená', kind: 'absence' }),
  Object.freeze({ value: 'NV', label: 'Náhradní volno', kind: 'absence' }),
  Object.freeze({ value: '§', label: 'Paragraf', kind: 'absence' }),
  Object.freeze({ value: 'LEK', label: 'Lékař', kind: 'absence' }),
  Object.freeze({ value: 'kalirnaOut', label: 'Odešel na kalírnu', kind: 'daymod' })
]);

function adminRotationUnplannedReasonOption(value) {
  const wanted = String(value || '').trim();
  return ADMIN_UNPLANNED_REASON_OPTIONS.find((item) => item.value === wanted) || null;
}

function adminRotationUnplannedApplyAbsenceNotes(month, allowedDateLabels, person, reason) {
  const clone = JSON.parse(JSON.stringify(month || {}));
  const allowed = new Set((Array.isArray(allowedDateLabels) ? allowedDateLabels : []).map((value) => String(value || '').trim()).filter(Boolean));
  const knownNames = adminGetKnownNames();
  const canonicalPerson = adminRotationCanonicalName(person, knownNames);
  if (!canonicalPerson || !knownNames.includes(canonicalPerson)) throw new Error('Vyber platného pracovníka.');
  const safeReason = String(reason || '').trim();
  if (!safeReason) throw new Error('Vyplň důvod absence.');

  const existing = Array.isArray(clone.notes) ? clone.notes : [];
  clone.notes = existing.filter((note) => {
    const date = String(note && note.date || '').trim();
    const notePerson = adminRotationCanonicalName(note && note.person || '', knownNames);
    return !(allowed.has(date) && notePerson === canonicalPerson);
  });
  for (const date of allowed) {
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(date) : null;
    const shift = parsed && parsed.shift ? String(parsed.shift) : '';
    clone.notes.push({
      date,
      person: canonicalPerson,
      code: safeReason,
      shift,
      text: canonicalPerson + ' ' + safeReason
    });
  }
  return clone;
}

function adminRotationUnplannedGenerationSeed(month) {
  const clone = JSON.parse(JSON.stringify(month || {}));
  for (const sectionKey of ['hard','soft']) {
    const section = clone[sectionKey];
    const rows = Array.isArray(section && section.rows) ? section.rows : [];
    const machineCount = sectionKey === 'hard' ? HARD_MACHINE_HEADERS.length : SOFT_MACHINE_HEADERS.length;
    rows.forEach((row) => { row.cells = Array(machineCount).fill(''); });
  }
  return clone;
}

function adminRotationUnplannedSpliceGeneratedDays(sourceMonth, generatedMonth, allowedDateLabels) {
  const result = JSON.parse(JSON.stringify(sourceMonth || {}));
  const allowed = new Set((Array.isArray(allowedDateLabels) ? allowedDateLabels : []).map((value) => String(value || '').trim()).filter(Boolean));
  for (const sectionKey of ['hard','soft']) {
    const sourceRows = Array.isArray(result && result[sectionKey] && result[sectionKey].rows) ? result[sectionKey].rows : [];
    const generatedRows = Array.isArray(generatedMonth && generatedMonth[sectionKey] && generatedMonth[sectionKey].rows)
      ? generatedMonth[sectionKey].rows : [];
    const generatedByDate = new Map(generatedRows.map((row) => [String(row && row.date || '').trim(), row]));
    sourceRows.forEach((row) => {
      const date = String(row && row.date || '').trim();
      if (!allowed.has(date)) return;
      const generated = generatedByDate.get(date);
      if (!generated || !Array.isArray(generated.cells)) throw new Error('Generátor nevrátil vybraný den ' + date + '.');
      row.cells = generated.cells.slice();
    });
  }
  return result;
}

function adminRotationUnplannedAssertIsolation(beforeMonth, afterMonth, allowedDateLabels) {
  const allowed = new Set((Array.isArray(allowedDateLabels) ? allowedDateLabels : []).map((value) => String(value || '').trim()).filter(Boolean));
  for (const sectionKey of ['hard','soft']) {
    const beforeRows = Array.isArray(beforeMonth && beforeMonth[sectionKey] && beforeMonth[sectionKey].rows) ? beforeMonth[sectionKey].rows : [];
    const afterRows = Array.isArray(afterMonth && afterMonth[sectionKey] && afterMonth[sectionKey].rows) ? afterMonth[sectionKey].rows : [];
    if (beforeRows.length !== afterRows.length) throw new Error('Částečný přepočet změnil počet řádků.');
    beforeRows.forEach((beforeRow, idx) => {
      const date = String(beforeRow && beforeRow.date || '').trim();
      if (!allowed.has(date) && JSON.stringify(beforeRow) !== JSON.stringify(afterRows[idx])) {
        throw new Error('Částečný přepočet sáhl na jiný den: ' + date + '.');
      }
    });
  }
  return true;
}

function adminRotationUnplannedIssueKey(issue) {
  return [String(issue && issue.severity || ''), String(issue && issue.type || issue && issue.code || ''), String(issue && issue.message || '')].join('|');
}

// RaK 1.7.120: finální gate scoped změny smí řešit jen vybraný den/rozsah.
function adminRotationUnplannedIssueTouchesSelectedDate(issue, allowedDateLabels) {
  const haystack = [issue && issue.message, issue && issue.detail]
    .map((value) => String(value || '').replace(/\s+/g, '').toLocaleLowerCase('cs-CZ'))
    .join(' ');
  return (Array.isArray(allowedDateLabels) ? allowedDateLabels : []).some((label) => {
    const raw = String(label || '').replace(/\s+/g, '').toLocaleLowerCase('cs-CZ');
    const base = (typeof adminRotationDateBaseKey === 'function' ? adminRotationDateBaseKey(label) : String(label || ''))
      .replace(/\s+/g, '').toLocaleLowerCase('cs-CZ');
    return !!((raw && haystack.includes(raw)) || (base && haystack.includes(base)));
  });
}

function adminRotationUnplannedPreserveHardCellsByDate(originalMonth, preparedMonth, allowedDateLabels, person, knownNames) {
  const result = Object.create(null);
  const labels = Array.isArray(allowedDateLabels) ? allowedDateLabels : [];
  labels.forEach((date) => {
    let assignment = null;
    try {
      assignment = adminRotationUnplannedFindAssignment(originalMonth, date, person, knownNames);
    } catch (_) {
      return;
    }
    if (!assignment || assignment.section !== 'soft') return;

    const hardRows = Array.isArray(originalMonth && originalMonth.hard && originalMonth.hard.rows) ? originalMonth.hard.rows : [];
    const hardRow = hardRows.find((row) => String(row && row.date || '').trim() === String(date || '').trim()) || null;
    const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells.slice(0, HARD_MACHINE_HEADERS.length) : [];
    if (hardCells.length !== HARD_MACHINE_HEADERS.length) return;

    const blocked = adminRotationUnavailableNamesForDate(preparedMonth, date, knownNames);
    const available = knownNames.filter((name) => !blocked.has(name));
    const hardTarget = adminRotationGeneratorHardTarget(knownNames, available);
    const seen = new Set();
    let count = 0;
    for (let idx = 0; idx < hardCells.length; idx += 1) {
      const name = adminRotationCanonicalName(hardCells[idx], knownNames);
      if (!name) continue;
      if (blocked.has(name) || seen.has(name) || !adminRotationGeneratorPersonKnowsMachine(name, HARD_MACHINE_HEADERS[idx] || '')) return;
      seen.add(name);
      count += 1;
    }
    if (count !== hardTarget) return;
    result[date] = hardCells;
  });
  return result;
}

function adminRotationUnplannedAssertHardPreserved(beforeMonth, afterMonth, preserveHardCellsByDate) {
  const wanted = preserveHardCellsByDate && typeof preserveHardCellsByDate === 'object' ? preserveHardCellsByDate : {};
  Object.keys(wanted).forEach((date) => {
    const beforeRows = Array.isArray(beforeMonth && beforeMonth.hard && beforeMonth.hard.rows) ? beforeMonth.hard.rows : [];
    const afterRows = Array.isArray(afterMonth && afterMonth.hard && afterMonth.hard.rows) ? afterMonth.hard.rows : [];
    const beforeRow = beforeRows.find((row) => String(row && row.date || '').trim() === String(date || '').trim()) || null;
    const afterRow = afterRows.find((row) => String(row && row.date || '').trim() === String(date || '').trim()) || null;
    if (JSON.stringify(beforeRow && beforeRow.cells || []) !== JSON.stringify(afterRow && afterRow.cells || [])) {
      throw new Error(String(date || '') + ': neplánovanou absenci šlo vyřešit jen na MO, ale TO se změnilo.');
    }
  });
  return true;
}

function adminRotationUnplannedAssertSelectedDayStaffing(month, allowedDateLabels) {
  const knownNames = adminGetKnownNames();
  const labels = Array.isArray(allowedDateLabels) ? allowedDateLabels : [];
  labels.forEach((date) => {
    const blocked = adminRotationUnavailableNamesForDate(month, date, knownNames);
    const available = knownNames.filter((name) => !blocked.has(name));
    const hardRows = Array.isArray(month && month.hard && month.hard.rows) ? month.hard.rows : [];
    const softRows = Array.isArray(month && month.soft && month.soft.rows) ? month.soft.rows : [];
    const hardRow = hardRows.find((row) => String(row && row.date || '').trim() === String(date || '').trim()) || null;
    const softRow = softRows.find((row) => String(row && row.date || '').trim() === String(date || '').trim()) || null;
    const hardCells = Array.isArray(hardRow && hardRow.cells) ? hardRow.cells : [];
    const softCells = Array.isArray(softRow && softRow.cells) ? softRow.cells : [];
    const hardAssigned = hardCells.map((value) => adminRotationCanonicalName(value, knownNames)).filter(Boolean);
    const softAssigned = softCells.map((value) => adminRotationCanonicalName(value, knownNames)).filter(Boolean);
    const assigned = hardAssigned.concat(softAssigned);
    const duplicate = assigned.find((name, idx) => assigned.indexOf(name) !== idx);
    if (duplicate) throw new Error(String(date || '') + ': ' + duplicate + ' je po přepočtu přiřazen dvakrát.');
    const blockedAssigned = assigned.find((name) => blocked.has(name));
    if (blockedAssigned) throw new Error(String(date || '') + ': ' + blockedAssigned + ' je nedostupný, ale po přepočtu zůstal ve stroji.');

    const hardTarget = adminRotationGeneratorHardTarget(knownNames, available);
    const softTarget = Math.max(0, Math.min(SOFT_MACHINE_HEADERS.length, available.length - hardTarget));
    if (hardAssigned.length !== hardTarget || softAssigned.length !== softTarget || assigned.length !== available.length) {
      throw new Error(String(date || '') + ': přepočet nemá správný počet lidí na TO/MO.');
    }

    if (softTarget === 4) {
      const latheIndexes = ['MSKC01','MSKC03','MSKC04'].map((machine) => adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, machine));
      const millIndexes = ['MFKF06','MFKF10'].map((machine) => adminRotationGeneratorMachineIndex(SOFT_MACHINE_HEADERS, machine));
      const latheCount = latheIndexes.filter((idx) => idx >= 0 && adminRotationCanonicalName(softCells[idx], knownNames)).length;
      const millCount = millIndexes.filter((idx) => idx >= 0 && adminRotationCanonicalName(softCells[idx], knownNames)).length;
      if (latheCount !== 3 || millCount !== 1) {
        throw new Error(String(date || '') + ': při čtyřech lidech na MO musí být 3 soustruhy a 1 fréza.');
      }
    }
  });
  return true;
}

function adminRotationBuildUnplannedChangeCandidate(monthKey, sourceMonth, input) {
  const data = input && typeof input === 'object' ? input : {};
  const labels = adminRotationUnplannedDateLabels(sourceMonth);
  const fromIndex = adminRotationUnplannedDateIndex(labels, data.fromDate);
  const toIndex = adminRotationUnplannedDateIndex(labels, data.toDate);
  if (fromIndex < 0 || toIndex < 0) throw new Error('Vybraný den není v rozpisu.');
  if (toIndex < fromIndex) throw new Error('Datum Do musí být stejné nebo pozdější než Datum Od.');
  const allowedDateLabels = labels.slice(fromIndex, toIndex + 1);
  if (!allowedDateLabels.length) throw new Error('Není vybraný žádný den.');

  const knownNames = adminGetKnownNames();
  const person = adminRotationCanonicalName(data.person, knownNames);
  if (!person || !knownNames.includes(person)) throw new Error('Vyber platného pracovníka.');
  const reason = String(data.reason || '').trim();
  const reasonOption = adminRotationUnplannedReasonOption(reason);
  if (!reasonOption || reasonOption.kind !== 'absence') throw new Error('Vyber platný důvod absence.');

  const original = JSON.parse(JSON.stringify(sourceMonth || {}));
  const withAbsence = adminRotationUnplannedApplyAbsenceNotes(original, allowedDateLabels, person, reason);
  const preserveHardCellsByDate = adminRotationUnplannedPreserveHardCellsByDate(original, withAbsence, allowedDateLabels, person, knownNames);
  const seed = adminRotationUnplannedGenerationSeed(withAbsence);
  const generated = adminGenerateRotationMonthDraft(monthKey, seed, {
    ignoreDom: true,
    persistPending: false,
    allowScopedRuleErrors: true,
    scopedDateLabels: allowedDateLabels,
    preserveHardCellsByDate
  });
  if (!generated || !generated.normalized) throw new Error('Částečný návrh se nepodařilo vygenerovat.');
  const candidate = adminRotationUnplannedSpliceGeneratedDays(withAbsence, generated.normalized, allowedDateLabels);
  adminRotationUnplannedAssertIsolation(original, candidate, allowedDateLabels);
  adminRotationUnplannedAssertHardPreserved(original, candidate, preserveHardCellsByDate);
  adminRotationUnplannedAssertSelectedDayStaffing(candidate, allowedDateLabels);

  const beforeCheck = adminRotationValidateMonthRules(original, monthKey, { source: 'generator' });
  const afterCheck = adminRotationValidateMonthRules(candidate, monthKey, { source: 'generator' });
  const previousErrors = new Set((beforeCheck.issues || []).filter((issue) => issue && issue.severity === 'error').map(adminRotationUnplannedIssueKey));
  const newErrors = (afterCheck.issues || []).filter((issue) => issue
    && issue.severity === 'error'
    && adminRotationUnplannedIssueTouchesSelectedDate(issue, allowedDateLabels)
    && !previousErrors.has(adminRotationUnplannedIssueKey(issue)));
  if (newErrors.length) {
    throw new Error('Změnu nejde bezpečně přepočítat bez zásahu do jiných dnů: ' + newErrors.slice(0, 2).map((issue) => issue.message).join(' · '));
  }
  return {
    month: candidate,
    allowedDateLabels,
    person,
    reason,
    reasonLabel: reasonOption.label,
    changeKind: 'absence',
    warnings: (afterCheck.issues || []).filter((issue) => issue && issue.severity === 'warn')
  };
}

function adminRotationUnplannedFindAssignment(month, dateLabel, person, knownNames) {
  const matches = [];
  for (const sectionKey of ['hard','soft']) {
    const rows = Array.isArray(month && month[sectionKey] && month[sectionKey].rows) ? month[sectionKey].rows : [];
    rows.forEach((row) => {
      if (String(row && row.date || '').trim() !== String(dateLabel || '').trim()) return;
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      cells.forEach((value, cellIndex) => {
        const canonical = adminRotationCanonicalName(value, knownNames);
        if (canonical === person) matches.push({ section: sectionKey, cellIndex });
      });
    });
  }
  if (matches.length !== 1) {
    throw new Error(matches.length
      ? 'Pracovník je ve vybraném dni přiřazen vícekrát: ' + String(dateLabel || '') + '.'
      : 'Pracovník není ve vybraném dni v rozpisu: ' + String(dateLabel || '') + '.');
  }
  return matches[0];
}

function adminRotationBuildUnplannedDayModCandidate(monthKey, sourceMonth, input) {
  const data = input && typeof input === 'object' ? input : {};
  const labels = adminRotationUnplannedDateLabels(sourceMonth);
  const fromIndex = adminRotationUnplannedDateIndex(labels, data.fromDate);
  const toIndex = adminRotationUnplannedDateIndex(labels, data.toDate);
  if (fromIndex < 0 || toIndex < 0) throw new Error('Vybraný den není v rozpisu.');
  if (toIndex < fromIndex) throw new Error('Datum Do musí být stejné nebo pozdější než Datum Od.');
  const allowedDateLabels = labels.slice(fromIndex, toIndex + 1);
  if (!allowedDateLabels.length) throw new Error('Není vybraný žádný den.');

  const knownNames = adminGetKnownNames();
  const person = adminRotationCanonicalName(data.person, knownNames);
  if (!person || !knownNames.includes(person)) throw new Error('Vyber platného pracovníka.');
  const reasonOption = adminRotationUnplannedReasonOption(data.reason);
  if (!reasonOption || reasonOption.kind !== 'daymod' || reasonOption.value !== 'kalirnaOut') {
    throw new Error('Vyber platnou výjimku dne.');
  }

  const candidate = JSON.parse(JSON.stringify(sourceMonth || {}));
  const allowed = new Set(allowedDateLabels);
  const existing = Array.isArray(candidate.dayMods) ? candidate.dayMods : [];
  candidate.dayMods = existing.filter((mod) => {
    const modDate = String(mod && mod.date || '').trim();
    const modPerson = adminRotationCanonicalName(mod && mod.person || '', knownNames);
    return !(allowed.has(modDate) && modPerson === person);
  });

  allowedDateLabels.forEach((date) => {
    const assignment = adminRotationUnplannedFindAssignment(sourceMonth, date, person, knownNames);
    candidate.dayMods.push({
      section: assignment.section,
      date,
      cellIndex: Number(assignment.cellIndex),
      person,
      type: 'kalirnaOut',
      time: '',
      restReason: '',
      workedHours: null,
      restHours: null,
      overtime: null,
      toSection: '',
      toCellIndex: null,
      note: ''
    });
  });

  // Kalírna není absence do statistik, ale pro personální plán dne je člověk
  // stejně nedostupný. Generátor proto dostane dayMod už v seedu a použije
  // beze změny stávající pravidla 4/3 lidí na MO i doplnění TO z MO.
  const seed = adminRotationUnplannedGenerationSeed(candidate);
  const generated = adminGenerateRotationMonthDraft(monthKey, seed, { ignoreDom: true, persistPending: false, allowScopedRuleErrors: true, scopedDateLabels: allowedDateLabels });
  if (!generated || !generated.normalized) throw new Error('Přepočet dne s Kalírnou se nepodařilo vygenerovat.');
  const regenerated = adminRotationUnplannedSpliceGeneratedDays(candidate, generated.normalized, allowedDateLabels);
  adminRotationUnplannedAssertIsolation(sourceMonth, regenerated, allowedDateLabels);
  adminRotationUnplannedAssertSelectedDayStaffing(regenerated, allowedDateLabels);

  for (const date of allowedDateLabels) {
    for (const sectionKey of ['hard','soft']) {
      const rows = Array.isArray(regenerated && regenerated[sectionKey] && regenerated[sectionKey].rows) ? regenerated[sectionKey].rows : [];
      const row = rows.find((item) => String(item && item.date || '').trim() === String(date || '').trim());
      const stillAssigned = Array.isArray(row && row.cells)
        ? row.cells.some((value) => adminRotationCanonicalName(value, knownNames) === person)
        : false;
      if (stillAssigned) throw new Error('Pracovník označený jako Kalírna zůstal ve stroji: ' + date + '.');
    }
  }

  const beforeCheck = adminRotationValidateMonthRules(sourceMonth, monthKey, { source: 'generator' });
  const afterCheck = adminRotationValidateMonthRules(regenerated, monthKey, { source: 'generator' });
  const previousErrors = new Set((beforeCheck.issues || []).filter((issue) => issue && issue.severity === 'error').map(adminRotationUnplannedIssueKey));
  const newErrors = (afterCheck.issues || []).filter((issue) => issue
    && issue.severity === 'error'
    && adminRotationUnplannedIssueTouchesSelectedDate(issue, allowedDateLabels)
    && !previousErrors.has(adminRotationUnplannedIssueKey(issue)));
  if (newErrors.length) {
    throw new Error('Kalírnu nejde bezpečně přepočítat bez zásahu do jiných dnů: ' + newErrors.slice(0, 2).map((issue) => issue.message).join(' · '));
  }

  return {
    month: regenerated,
    allowedDateLabels,
    person,
    reason: 'kalirnaOut',
    reasonLabel: reasonOption.label,
    changeKind: 'daymod',
    warnings: (afterCheck.issues || []).filter((issue) => issue && issue.severity === 'warn')
  };
}

function adminRotationUnplannedOperationId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  if (!(window.crypto && typeof window.crypto.getRandomValues === 'function')) throw new Error('Bezpečný identifikátor operace není dostupný.');
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}


function adminEnsureUnplannedChangePopupPageStyles() {
  if (document.getElementById('rakUnplannedChangePopupPageStyles')) return;
  const style = document.createElement('style');
  style.id = 'rakUnplannedChangePopupPageStyles';
  style.textContent = [
    '.adminUnplannedChangeOverlay{align-items:center!important;justify-items:center!important;padding:max(14px,env(safe-area-inset-top)) 10px max(14px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important;overflow:hidden!important}',
    '.adminUnplannedChangeDialog.adminUnplannedChangePage{width:min(520px,100%)!important;height:auto!important;max-height:calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;padding:0!important;overflow:hidden!important;grid-template-rows:auto minmax(0,1fr) auto!important;gap:0!important;border-radius:24px!important;box-sizing:border-box!important}',
    '.adminUnplannedChangeHeader{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:13px 15px 10px!important;border-bottom:1px solid rgba(255,255,255,.10)!important}',
    '.adminUnplannedClose{width:40px!important;min-width:40px!important;height:40px!important;display:grid!important;place-items:center!important;padding:0!important;border-radius:50%!important;font-size:26px!important;line-height:1!important}',
    '.adminUnplannedChangeBody{min-height:0!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;display:grid!important;align-content:start!important;gap:11px!important;padding:12px 15px 14px!important}',
    '.adminUnplannedChangeBody .appMenuFieldLabel{gap:6px!important}',
    '.adminUnplannedChangeFooter{display:grid!important;grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr)!important;gap:8px!important;padding:10px 15px max(10px,env(safe-area-inset-bottom))!important;border-top:1px solid rgba(255,255,255,.10)!important;background:inherit!important}',
    '.adminUnplannedChangeFooter .appMenuAction{min-width:0!important;min-height:48px!important;white-space:normal!important}'
  ].join('');
  document.head.appendChild(style);
}

function adminCloseUnplannedChangeDialog() {
  const overlay = document.getElementById('adminUnplannedChangeOverlay');
  if (overlay) overlay.remove();
}

function adminOpenUnplannedChangeDialog(input) {
  adminEnsureUnplannedChangePopupPageStyles();
  const body = document.getElementById('appMenuBody');
  if (!body || body.dataset.adminView !== 'rotation') return;
  if (app && app.adminRotationDirty === true) {
    const status = document.getElementById('adminRotationDraftStatus') || document.getElementById('adminOnlineSaveStatus');
    if (status) status.textContent = 'Nejdřív ulož nebo zahoď rozepsané ruční změny. Neplánovaná změna vyžaduje ověřený online základ.';
    return;
  }
  const monthKey = String((body.querySelector('#adminMonthSelect') && body.querySelector('#adminMonthSelect').value) || getAdminSelectedMonthKey() || '').trim();
  const sourceMonth = typeof readAdminRotationFromDom === 'function' && body.querySelector('#adminRotationEditor')
    ? readAdminRotationFromDom(monthKey)
    : (app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null);
  if (!monthKey || !sourceMonth) throw new Error('Nejdřív načti měsíc rozpisu.');

  const row = input && input.closest ? input.closest('tr[data-rotation-section]') : null;
  const prefillDate = String(row && row.querySelector('[data-rot-field="date"]')?.value || adminRotationUnplannedDateLabels(sourceMonth)[0] || '').trim();
  const prefillPerson = String(input && input.value || '').trim();
  const labels = adminRotationUnplannedDateLabels(sourceMonth);
  const knownNames = adminGetKnownNames();
  const optionHtml = (values, selected) => values.map((value) => '<option value="' + escapeHtml(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + escapeHtml(value) + '</option>').join('');
  const reasonOptionHtml = ADMIN_UNPLANNED_REASON_OPTIONS.map((item) => '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>').join('');

  adminCloseUnplannedChangeDialog();
  const overlay = document.createElement('div');
  overlay.id = 'adminUnplannedChangeOverlay';
  overlay.className = 'adminUnplannedChangeOverlay';
  overlay.dataset.operationId = '';
  overlay.innerHTML = [
    '<div class="adminUnplannedChangeDialog adminUnplannedChangePage" role="dialog" aria-modal="true" aria-labelledby="adminUnplannedChangeTitle">',
    '  <div class="adminUnplannedChangeHeader"><div><div class="appMenuCardTitle" id="adminUnplannedChangeTitle">Neplánovaná změna</div><div class="smallText">Generátor rozpisu</div></div><button type="button" class="adminUnplannedClose" data-unplanned-action="cancel" aria-label="Zavřít">×</button></div>',
    '  <div class="adminUnplannedChangeBody">',
    '  <div class="smallText">Přepočítá se jen vybraný den nebo rozsah. Ostatní dny zůstanou beze změny.</div>',
    '  <label class="appMenuFieldLabel">Pracovník<select id="adminUnplannedPerson" class="appMenuSelect">' + optionHtml(knownNames, prefillPerson) + '</select></label>',
    '  <label class="appMenuFieldLabel">Důvod<select id="adminUnplannedReason" class="appMenuSelect">' + reasonOptionHtml + '</select></label>',
    '  <div class="adminUnplannedRange">',
    '    <label class="appMenuFieldLabel">Od<select id="adminUnplannedFrom" class="appMenuSelect">' + optionHtml(labels, prefillDate) + '</select></label>',
    '    <label class="appMenuFieldLabel">Do<select id="adminUnplannedTo" class="appMenuSelect">' + optionHtml(labels, prefillDate) + '</select></label>',
    '  </div>',
    '  <div class="smallText" id="adminUnplannedStatus" role="status" aria-live="polite">Změna se uloží přímo online až po potvrzení.</div>',
    '  </div>',
    '  <div class="adminUnplannedChangeFooter"><button type="button" class="appMenuAction" data-unplanned-action="manual">Ručně upravit</button><button type="button" class="appMenuAction isActive" data-unplanned-action="save">Uložit a přepočítat</button></div>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);

  overlay.addEventListener('click', async (event) => {
    const actionButton = event.target && event.target.closest ? event.target.closest('[data-unplanned-action]') : null;
    if (!actionButton) {
      if (event.target === overlay) adminCloseUnplannedChangeDialog();
      return;
    }
    const action = actionButton.getAttribute('data-unplanned-action');
    if (action === 'cancel') {
      adminCloseUnplannedChangeDialog();
      return;
    }
    if (action === 'manual') {
      adminCloseUnplannedChangeDialog();
      window.setTimeout(() => {
        try { if (input && input.isConnected) input.focus({ preventScroll: true }); } catch (_) { try { if (input && input.isConnected) input.focus(); } catch (_) {} }
      }, 0);
      return;
    }
    if (action !== 'save' || overlay.dataset.saving === '1') return;
    const status = overlay.querySelector('#adminUnplannedStatus');
    overlay.dataset.saving = '1';
    actionButton.disabled = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Neplánovanou změnu lze uložit jen online.');
      const fromDate = String(overlay.querySelector('#adminUnplannedFrom')?.value || '');
      const toDate = String(overlay.querySelector('#adminUnplannedTo')?.value || '');
      const person = String(overlay.querySelector('#adminUnplannedPerson')?.value || '');
      const reason = String(overlay.querySelector('#adminUnplannedReason')?.value || '').trim();
      const reasonOption = adminRotationUnplannedReasonOption(reason);
      if (!reasonOption) throw new Error('Vyber důvod změny.');
      if (status) status.textContent = reasonOption.kind === 'daymod'
        ? 'Připravuji výjimku Kalírna…'
        : 'Přepočítávám jen vybraný rozsah…';
      const candidate = reasonOption.kind === 'daymod'
        ? adminRotationBuildUnplannedDayModCandidate(monthKey, sourceMonth, { fromDate, toDate, person, reason })
        : adminRotationBuildUnplannedChangeCandidate(monthKey, sourceMonth, { fromDate, toDate, person, reason });
      const payload = JSON.parse(JSON.stringify(app.rotation || {}));
      if (!payload.months || typeof payload.months !== 'object') throw new Error('Aktuální rozpis nemá měsíce.');
      payload.months[monthKey] = candidate.month;

      if (!overlay.dataset.operationId) overlay.dataset.operationId = adminRotationUnplannedOperationId();
      const bridge = window.RotationSupabaseBridge;
      if (!bridge || typeof bridge.applyUnplannedChange !== 'function') throw new Error('Bezpečné online uložení neplánované změny není připravené.');
      if (status) status.textContent = 'Ověřuji serverový rozsah změny a ukládám…';
      const result = await bridge.applyUnplannedChange(payload, {
        operationId: overlay.dataset.operationId,
        monthKey,
        person: candidate.person,
        changeKind: candidate.changeKind,
        reason: candidate.reason,
        allowedDateLabels: candidate.allowedDateLabels
      });
      if (!result || result.ok === false) {
        const reasonLabel = result && result.diagnostic && result.diagnostic.reason ? result.diagnostic.reason : 'operation-rejected';
        throw new Error('Server změnu odmítl (' + reasonLabel + ').');
      }
      if (result.payload && typeof applyRakRotationState === 'function') applyRakRotationState(result.payload, { force: true });
      if (typeof adminRotationGeneratorClearPendingDraft === 'function') adminRotationGeneratorClearPendingDraft(monthKey);
      adminCloseUnplannedChangeDialog();
      renderAdminMenuBody(body, 'rotation');
      const nextStatus = document.getElementById('adminOnlineSaveStatus') || document.getElementById('adminRotationDraftStatus');
      if (nextStatus) nextStatus.textContent = 'Neplánovaná změna uložená online ✓ · ' + candidate.reasonLabel + ' · dnů: ' + String(candidate.allowedDateLabels.length) + '.';
    } catch (err) {
      if (status) status.textContent = err && err.message ? err.message : 'Neplánovaná změna se nepodařila.';
    } finally {
      overlay.dataset.saving = '0';
      if (actionButton.isConnected) actionButton.disabled = false;
    }
  });
}

function adminOpenRotationGeneratorWizard(monthKey) {
  const suggested = adminRotationGetNextMonthKeyFrom(monthKey || getAdminSelectedMonthKey());
  const prefill = adminRotationGeneratorBuildPrefillState(suggested);
  adminRotationGeneratorSetWizardState({
    step: 'month',
    monthKey: suggested,
    days: prefill.days,
    absencesByDay: prefill.absencesByDay
  });
  adminRotationGeneratorRenderWizard('month');
}

function adminHandleRotationGeneratorWizardAction(action, target) {
  const state = adminRotationGeneratorGetWizardState();
  const body = document.getElementById('appMenuBody');
  if (action === 'generator-back-month') {
    adminRotationGeneratorRenderWizard('month');
    return true;
  }
  if (action === 'generator-back-days') {
    state.days = adminRotationGeneratorCollectDaysFromDom();
    adminRotationGeneratorRenderWizard('days');
    return true;
  }
  if (action === 'generator-back-absences') {
    adminRotationGeneratorRenderWizard('absences');
    return true;
  }
  if (action === 'generator-load-calendar-absences') {
    adminRotationGeneratorLoadCalendarAbsences();
    return true;
  }
  if (action === 'generator-download-excel') {
    adminRotationGeneratorDownloadExcel(state.monthKey || app.selectedMonth);
    return true;
  }
  if (action === 'generator-open-editor') {
    const applied = adminRotationGeneratorOpenDraftInEditor(state, body);
    const status = document.getElementById('adminOnlineSaveStatus') || document.getElementById('adminRotationDraftStatus');
    if (status && applied) status.textContent = 'Návrh je otevřený v editoru. Online se uloží až tlačítkem Uložit rozpis.';
    return true;
  }
  if (action === 'generator-month-next') {
    const select = body ? body.querySelector('#adminGeneratorMonthSelect') : null;
    const monthKey = adminRotationGeneratorResolveSelectableMonthKey(select ? String(select.value || '').trim() : state.monthKey);
    if (!monthKey) {
      const status = document.getElementById('adminOnlineSaveStatus');
      if (status) status.textContent = 'Nejdřív musí existovat další navazující měsíc v seznamu rozpisů.';
      return true;
    }
    const prefill = adminRotationGeneratorBuildPrefillState(monthKey);
    adminRotationGeneratorSetWizardState({
      step: 'days',
      monthKey,
      days: prefill.days,
      absencesByDay: prefill.absencesByDay
    });
    adminRotationGeneratorRenderWizard('days');
    return true;
  }
  if (action === 'generator-day-remove') {
    state.days = adminRotationGeneratorCollectDaysFromDom();
    const idx = Number(target && target.getAttribute('data-day-index'));
    if (Number.isFinite(idx) && idx >= 0) state.days.splice(idx, 1);
    adminRotationGeneratorRenderWizard('days');
    return true;
  }
  if (action === 'generator-day-add') {
    state.days = adminRotationGeneratorCollectDaysFromDom();
    state.days.push('');
    adminRotationGeneratorRenderWizard('days');
    return true;
  }
  if (action === 'generator-days-next') {
    const days = adminRotationGeneratorCollectDaysFromDom();
    const preservedAbsences = adminRotationGeneratorAlignAbsencesToDays(days, state.absencesByDay);
    adminRotationGeneratorSetWizardState({
      step: 'absences',
      days,
      absencesByDay: preservedAbsences
    });
    adminRotationGeneratorRenderWizard('absences');
    return true;
  }
  if (action === 'generator-absence-add') {
    state.absencesByDay = adminRotationGeneratorCollectAbsencesFromDom();
    const dayIdx = Number(target && target.getAttribute('data-day-index'));
    if (Number.isFinite(dayIdx) && state.absencesByDay[dayIdx]) {
      state.absencesByDay[dayIdx].rows.push({ person: '', code: '' });
    }
    adminRotationGeneratorRenderWizard('absences');
    return true;
  }
  if (action === 'generator-absence-remove') {
    state.absencesByDay = adminRotationGeneratorCollectAbsencesFromDom();
    const dayIdx = Number(target && target.getAttribute('data-day-index'));
    const rowIdx = Number(target && target.getAttribute('data-row-index'));
    if (Number.isFinite(dayIdx) && Number.isFinite(rowIdx) && state.absencesByDay[dayIdx] && Array.isArray(state.absencesByDay[dayIdx].rows)) {
      state.absencesByDay[dayIdx].rows.splice(rowIdx, 1);
    }
    adminRotationGeneratorRenderWizard('absences');
    return true;
  }
  if (action === 'generator-run') {
    state.days = adminRotationGeneratorResolveWizardDays(state);
    state.absencesByDay = adminRotationGeneratorCollectAbsencesFromDom();
    try {
      if (!state.days.length) throw new Error('Nejsou vybrané žádné pracovní dny. Vrať se na krok Dny a přidej aspoň jeden den.');
      const hasFilledCells = typeof adminRotationMonthHasFilledCells === 'function' ? adminRotationMonthHasFilledCells(state.monthKey) : false;
      if (hasFilledCells && !confirm('Tenhle měsíc už má v rozpisu jména. Přepsat ho novým návrhem podle průvodce?')) return true;
      adminRotationGeneratorClearPendingDraft(state.monthKey);
      const preparedMonth = adminRotationGeneratorEnsurePreparedMonthFromWizard();
      const result = adminGenerateRotationMonthDraft(state.monthKey, preparedMonth);
      state.result = result;
      const warnings = Array.isArray(result && result.ruleWarnings) ? result.ruleWarnings : [];
      const warningText = warnings.length ? (' · upozornění: ' + String(warnings.length) + (warnings[0] && warnings[0].message ? ' (' + warnings[0].message + ')' : '')) : '';
      state.resultText = result && result.filledCells > 0
        ? ('Návrh vygenerovaný lokálně ✓ · dnů: ' + String(result.days || 0) + ' · políček: ' + String(result.filledCells || 0) + ' · absence: ' + String(result.blockedByAbsence || 0) + warningText + '.')
        : 'Návrh se nepodařilo vygenerovat. Vrať se na krok Dny a zkontroluj, že jsou vybrané pracovní dny.';
    } catch (err) {
      adminRotationGeneratorClearPendingDraft(state.monthKey);
      state.result = null;
      state.resultText = 'Návrh se nepodařilo vygenerovat: ' + (err && err.message ? err.message : String(err || 'neznámá chyba'));
    }
    adminRotationGeneratorRenderWizard('result');
    return true;
  }
  return false;
}

function adminRotationAddGeneratorAllowedRange(result, fromKey, toKey) {
  const keys = adminRotationGetOrderedMonthKeys();
  const fromSort = adminRotationMonthSortValue(fromKey);
  const toSort = adminRotationMonthSortValue(toKey);
  if (!fromSort || !toSort) return;
  keys.forEach((key) => {
    const sort = adminRotationMonthSortValue(key);
    if (sort >= fromSort && sort <= toSort && !result.includes(key)) result.push(key);
  });
}


function adminRotationGetAllowedGeneratorMonthKeys() {
  const keys = adminRotationGetOrderedMonthKeys();
  if (!keys.length) return [];
  const result = [];
  const currentMonth = adminRotationGetCurrentExistingMonthKey();
  const latestGenerated = adminRotationGetLatestGeneratedMonthKey();
  const currentSort = adminRotationMonthSortValue(currentMonth);
  const latestSort = adminRotationMonthSortValue(latestGenerated);
  const baseForNext = currentSort && (!latestSort || currentSort > latestSort)
    ? currentMonth
    : latestGenerated;
  const next = baseForNext ? adminRotationGetNextExistingMonthKeyAfter(baseForNext) : '';

  if (currentMonth && next) {
    adminRotationAddGeneratorAllowedRange(result, currentMonth, next);
  } else if (currentMonth) {
    result.push(currentMonth);
  } else if (next) {
    result.push(next);
  }

  if (!result.length) {
    const fallback = adminRotationGetDefaultFutureMonthKey() || keys[0];
    if (fallback) result.push(fallback);
  }

  return result.sort((a, b) => adminRotationMonthSortValue(a) - adminRotationMonthSortValue(b));
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-generator-wizard.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
