// RaK – editor rozpisu a absence oddělené z admin-rotation.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-editor.js', 'loading', { source: 'dynamic-loader' }); } catch (err) {}

function renderAdminInlineFieldHtml(fieldAttr, fieldName, value, placeholder, tiny) {
  const safeValue = String(value || '');
  const classes = ['appMenuInlineFieldWrap'];
  if (tiny) classes.push('appMenuInlineFieldWrapTiny');
  const fieldKey = String(fieldName || '');
  const attrKey = String(fieldAttr || '');
  const isDateField = fieldKey === 'date';
  const isAbsenceCodeField = attrKey === 'data-note-field' && fieldKey === 'code';
  const canRemove = !isDateField && (
    (attrKey === 'data-rot-field' && fieldKey.indexOf('cell-') === 0) ||
    (attrKey === 'data-note-field' && fieldKey === 'person')
  );
  if (canRemove) classes.push('appMenuInlineFieldWrapCanRemove');
  const inputAttrs = [
    'class="appMenuInlineInput' + (tiny ? ' appMenuInlineInputTiny' : '') + '"',
    fieldAttr ? fieldAttr + '="' + escapeHtml(fieldName) + '"' : '',
    'value="' + escapeHtml(safeValue) + '"',
    'placeholder="' + escapeHtml(placeholder || '') + '"',
    'title="' + escapeHtml(isDateField ? 'Datum upravíš ručně.' : (isAbsenceCodeField ? 'Klikni a vyber zkratku absence, nebo napiš vlastní.' : 'Uprav text ručně. Po kliknutí na obsazené jméno se ukáže Odebrat přímo u pole.')) + '"',
    isAbsenceCodeField ? 'list="adminAbsenceCodeOptions"' : '',
    'autocomplete="off"',
    'autocorrect="off"',
    'autocapitalize="off"',
    'spellcheck="false"',
    'inputmode="text"'
  ].filter(Boolean).join(' ');
  return [
    '<div class="' + classes.join(' ') + '">',
    '  <input ' + inputAttrs + '>',
    '</div>'
  ].join('');
}


// RAK_17064_CONFLICT_DRAFT_GUARD: snapshot ONLY the edited month, not Auth/tokens.
// Preserve drafts before a network attempt and retain on every failed/uncertain response.
function rakPreserveAdminMonthDraft(monthKey, month) {
  const result={stored:false,key:'',content:'',reason:'unavailable'};
  try {
    const content=JSON.stringify({format:'rak-admin-month-draft-v1',monthKey:String(monthKey),
      capturedAt:new Date().toISOString(),month:JSON.parse(JSON.stringify(month))});
    if(!content || new Blob([content]).size>2000000){result.reason='oversize';return result;}
    result.content=content;
    const key='rak_admin_unsynced_month_v1_'+String(monthKey).replace(/[^0-9A-Za-z_-]/g,'_')+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    localStorage.setItem(key,content);
    if(localStorage.getItem(key)!==content){result.reason='verification-failed';return result;}
    result.stored=true;result.key=key;result.reason='';
  }catch(_){result.reason='storage-denied';}
  return result;
}

function rakShowAdminDraftExport(draft,statusEl){
  if(!statusEl||!draft||!draft.content)return;
  const parent=statusEl.parentNode;
  if(!parent||typeof document==='undefined')return;
  const button=document.createElement('button');
  button.type='button';button.className='appMenuBtn';
  button.setAttribute('data-rak-unsynced-draft','manual-export');
  button.textContent='Stáhnout místní návrh JSON';
  button.addEventListener('click',()=>{
    if(typeof window.confirm==='function'&&!window.confirm('Soubor obsahuje jména a rozpis. Ulož jej pouze soukromě. Pokračovat?'))return;
    let url='';
    try {
      const file=new Blob([draft.content],{type:'application/json;charset=utf-8'});
      url=URL.createObjectURL(file);
      const link=document.createElement('a');link.href=url;
      link.download='RaK_neulozeny_rozpis_'+String(Date.now())+'.json';
      parent.appendChild(link);link.click();link.remove();
    }catch(_){if(typeof window.alert==='function')window.alert('Export se nezdařil. Neobnovuj stránku.');}
    finally{if(url) setTimeout(()=>URL.revokeObjectURL(url),30000);}
  });
  parent.appendChild(button);
}

// RAK_17065_RECOVER_DRAFTS_GUARD: read-only enumeration; no automatic server replay,
// no personal names, payload, account IDs or token in HTML. Exports need a user tap.
function rakListPreservedAdminMonthDrafts(monthKey) {
  const prefix='rak_admin_unsynced_month_v1_';
  const found=[];
  try {
    for(let i=0;i<localStorage.length;i++) {
      const key=localStorage.key(i);
      if(typeof key!=='string'||!key.startsWith(prefix)||key.length>180)continue;
      const raw=localStorage.getItem(key);
      if(typeof raw!=='string'||raw.length>2000000)continue;
      let obj;
      try {obj=JSON.parse(raw);}catch(_){continue;}
      if(!obj||obj.format!=='rak-admin-month-draft-v1'||typeof obj.monthKey!=='string'
        ||!obj.month||typeof obj.month!=='object'||Array.isArray(obj.month))continue;
      if(monthKey&&obj.monthKey!==monthKey)continue;
      const date=Date.parse(String(obj.capturedAt||''));
      found.push({key,monthKey:obj.monthKey,at:Number.isFinite(date)?date:0});
    }
  }catch(_){return [];}
  return found.sort((a,b)=>b.at-a.at).slice(0,20);
}

function rakAdminMonthDraftRecoveryHtml(monthKey) {
  const entries=rakListPreservedAdminMonthDrafts(monthKey);
  if(!entries.length)return '';
  return '<div class="appMenuCard" id="rakAdminPreservedDrafts" role="status">'
    +'<b>Neuložené místní návrhy: '+String(entries.length)+'</b>'
    +'<div class="smallText">Mohou pocházet z dřívějšího neúspěšného uložení. Nepřepisuj je naslepo. Stáhni soukromou kopii a porovnej ručně.</div>'
    +entries.map(item=>'<button type="button" class="appMenuAction" data-admin-action="download-unsynced-draft" data-draft-key="'
      +escapeHtml(item.key)+'">Stáhnout návrh '+escapeHtml(item.monthKey)+' · '
      +escapeHtml(item.at?new Date(item.at).toLocaleString('cs-CZ'):'bez data')+'</button>').join('')
    +'</div>';
}

function rakDownloadPreservedAdminMonthDraft(key) {
  if(!app||app.adminUnlocked!==true||typeof key!=='string'
     ||!/^rak_admin_unsynced_month_v1_[A-Za-z0-9_-]{1,80}$/.test(key))return false;
  const valid=rakListPreservedAdminMonthDrafts().some(entry=>entry.key===key);
  if(!valid)return false;
  let raw,obj;
  try{raw=localStorage.getItem(key);obj=JSON.parse(raw);}catch(_){return false;}
  if(!obj||obj.format!=='rak-admin-month-draft-v1'||typeof raw!=='string'||raw.length>2000000)return false;
  if(typeof window.confirm!=='function'||!window.confirm('JSON obsahuje jména a rozpis. Ulož soubor pouze soukromě. Stáhnout?'))return false;
  let url='';
  try {
    const file=new Blob([raw],{type:'application/json;charset=utf-8'});
    url=URL.createObjectURL(file);
    const link=document.createElement('a');link.href=url;
    link.download='RaK_mistni_navrh_'+String(Date.now())+'.json';
    document.body.appendChild(link);link.click();link.remove();
    return true;
  }catch(_){return false;}
  finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

// RAK_17069_DRAFT_CLEANUP_CARD: counts only, deletion always requires explicit confirmation.
function rakAdminLocalDraftCleanupHtml(){
  const info=typeof window.rakLocalRotationDraftCleanupPreview==='function'
    ?window.rakLocalRotationDraftCleanupPreview():null;
  const valid=!!(info&&info.ok);
  const drafts=valid?Number(info.drafts||0):0;
  const pending=valid?Number(info.rotationQueued||0):0;
  const other=valid?Number(info.otherConflicts||0):0;
  return '<div class="appMenuCard" id="rakAdminLocalDraftCleanup">'
    +'<b>Místní neuložené návrhy rozpisů</b>'
    +'<div class="smallText">V tomto zařízení: '+(valid?(drafts+' záloh návrhů · '+pending+' čekajících zápisů rozpisů'):'stav místního úložiště nelze bezpečně ověřit')
    +(other?' · '+other+' jiných konfliktů zůstane zachováno':'')+'.</div>'
    +'<div class="smallText">Smazání je nevratné. Nezasáhne online rozpis, ostatní místní frontu ani jiná nastavení. Předem si můžeš stáhnout návrhy výše.</div>'
    +'<button type="button" class="appMenuAction" data-admin-action="discard-local-rotation-drafts"'
    +(valid?'':' disabled')+'>Smazat neuložené místní návrhy</button>'
    +'<div id="rakAdminLocalDraftCleanupStatus" class="smallText" role="status" aria-live="polite"></div>'
    +'</div>';
}

async function saveAdminRotationToSupabase(monthKey, rawText) {
  if (!monthKey) throw new Error('Chybí měsíc.');
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('JSON v poli není platný.');
  }
  const fallback = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const normalized = normalizeMonthForImport(parsed, fallback);
  const ruleCheck = adminRotationValidateMonthRules(normalized, monthKey, { source: 'save' });
  if (!ruleCheck.ok) {
    throw new Error('Rozpis nejde uložit: ' + adminRotationFormatRuleIssues(ruleCheck.issues.filter((issue) => issue.severity === 'error')));
  }
  if (!app.rotation.months) app.rotation.months = {};
  app.rotation.months[monthKey] = normalized;
  app.rotation = normalizeRotationData(app.rotation);
  app.selectedMonth = monthKey;
  saveRotationData();
  renderRotace();
  if (typeof renderMonth === 'function') renderMonth(monthKey);
  if (app.selectedName && typeof renderPerson === 'function') renderPerson(app.selectedName);
  let saveResult = { ok: false, reason: 'admin-required', months: 0, entries: 0 };
  if (app.adminUnlocked) {
    // Save before network: stale revision, timeout or refresh must never erase this draft.
    const draft = rakPreserveAdminMonthDraft(monthKey, normalized);
    saveResult = await saveRotationToSupabase(app.rotation, { source: 'admin-menu', monthKey })
      || { ok: false, reason: 'no-result' };
    const statusEl = document.getElementById('adminOnlineSaveStatus');
    if (saveResult && saveResult.ok === true) {
      if (draft.stored) {
        try { if (localStorage.getItem(draft.key) === draft.content) localStorage.removeItem(draft.key); } catch (_) {}
      }
      if (statusEl) statusEl.textContent = 'Uloženo online ✓ · měsíců: ' + String(saveResult.months || 0) + ' · řádků: ' + String(saveResult.entries || 0);
    } else {
      // Fail closed. No auto-reload, new server revision, blind retry or silent success.
      if (statusEl) {
        statusEl.textContent = (draft.stored
          ? 'Online neuloženo. Místní návrh je zachován; neobnovuj rozpis bez zálohy.'
          : 'Online neuloženo a místní zálohu nebylo možné potvrdit! Neobnovuj stránku; exportuj návrh.')
          + ' Serverová data nebyla přepsána potvrzeným uložením.';
        rakShowAdminDraftExport(draft,statusEl);
      }
      if (typeof app !== 'undefined') app.adminRotationDirty = true;
    }
  }
  return { normalized, saveResult, ruleCheck };
}


// RAK_ADMIN_SMART_MANUAL_INPUT_17006
function adminRotationManualFold(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
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
  const direct = raw.match(/\b(R8|N8|R|N)\b/i);
  if (direct) return direct[1].toUpperCase();
  const folded = adminRotationManualFold(raw);
  if (/\b(?:nocni|noc)\s*8\b/.test(folded)) return 'N8';
  if (/\b(?:ranni|rano)\s*8\b/.test(folded)) return 'R8';
  if (/\b(?:nocni|noc)\b/.test(folded)) return 'N';
  if (/\b(?:ranni|rano)\b/.test(folded)) return 'R';
  return '';
}

function adminRotationSmartManualDate(value, month, fallbackDate) {
  const raw = String(value || '').trim().replace(/,+$/g, '').trim();
  if (!raw) return '';
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(raw) : null;
  let day = parsed && Number.isFinite(Number(parsed.day)) ? Number(parsed.day) : NaN;
  let monthNo = parsed && Number.isFinite(Number(parsed.month)) ? Number(parsed.month) : NaN;
  if (!Number.isFinite(day) || !Number.isFinite(monthNo)) {
    const match = raw.match(/(?:^|\s)(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?:\s*[.]|\b)/);
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
  const compact = folded.replace(/[.\s_-]+/g, '');
  if (compact === 'nv' || folded === 'nahradni volno') return 'NV';
  if (compact === 'd' || compact === 'dov' || folded === 'dovolena') return 'D';
  if (compact === 'n' || compact === 'pn' || folded === 'nemoc' || folded === 'neschopenka') return 'N';
  if (compact === '§' || folded === 'paragraf') return '§';
  if (compact === 'l' || folded === 'lazne') return 'Lázně';
  if (folded === 'skoleni') return 'Š';

  const token = raw.match(/^\s*(n\s*\.?\s*v\.?|nv|d|n|§|l)\s+(.+)$/i);
  if (token) {
    const headKey = adminRotationManualFold(token[1]).replace(/[.\s]+/g, '');
    const suffix = String(token[2] || '').trim();
    const head = headKey === 'nv' ? 'NV' : (headKey === 'd' ? 'D' : (headKey === 'n' ? 'N' : (headKey === 'l' ? 'Lázně' : '§')));
    return head + (suffix ? ' ' + suffix : '');
  }
  return raw;
}

// RAK_17066_DIRTY_NAVIGATION_GUARD: verified local draft before rerender or online reload.
// No server replay, no logging of personal content. Cancellation keeps editor intact.
function rakGuardAdminRotationDiscard() {
  if (typeof app==='undefined' || !app || app.adminRotationDirty!==true ||
      typeof document==='undefined' || !document.getElementById('adminRotationEditor')) return true;
  if (app.adminUnlocked!==true || typeof rakPreserveAdminMonthDraft!=='function' ||
      typeof readAdminRotationFromDom!=='function') return false;
  const key=String(app.selectedMonth || (typeof getAdminSelectedMonthKey==='function' ? getAdminSelectedMonthKey() : '') || '').trim();
  if(!key) return false;
  let draft;
  try {draft=rakPreserveAdminMonthDraft(key,readAdminRotationFromDom(key));}
  catch (_) {return false;}
  if(!draft || !draft.stored) {
    const status=document.getElementById('adminRotationDraftStatus');
    if(status) status.textContent='Přepnutí zastaveno: místní zálohu nelze ověřit. Zůstaň v editoru a stáhni návrh.';
    if(draft && draft.content && typeof rakShowAdminDraftExport==='function') rakShowAdminDraftExport(draft,status);
    return false;
  }
  if(typeof window==='undefined' || typeof window.confirm!=='function' ||
     !window.confirm('Rozpis není uložený online. Soukromý místní návrh byl zálohován. Přepnout a ponechat tento návrh k ruční obnově?')) return false;
  app.adminRotationDirty=false;
  return true;
}

function adminRotationFindShiftForAbsenceDate(month, rawDate) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(rawDate) : null;
  const explicitShift = String((parsed && parsed.shift) || '').trim();
  if (explicitShift) return explicitShift;
  const wanted = adminRotationDateBaseKey(rawDate);
  if (!wanted) return '';
  const shifts = [];
  ['hard', 'soft'].forEach((section) => {
    const rows = Array.isArray(month && month[section] && month[section].rows) ? month[section].rows : [];
    rows.forEach((row) => {
      if (adminRotationDateBaseKey(row && row.date) !== wanted) return;
      const shift = String(adminRotationShiftFromRow(row) || '').trim();
      if (shift && !shifts.includes(shift)) shifts.push(shift);
    });
  });
  if (!shifts.length) return '';
  shifts.sort((a, b) => {
    const order = (value) => String(value || '').toUpperCase().startsWith('R') ? 1 : (String(value || '').toUpperCase().startsWith('N') ? 2 : 9);
    return order(a) - order(b) || String(a).localeCompare(String(b), 'cs');
  });
  return shifts[0] || '';
}


function adminRotationSortNotes(notesRows, month) {
  const rows = Array.isArray(notesRows) ? notesRows.slice() : [];
  const dateMeta = (note) => {
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(note && note.date) : null;
    const day = parsed && Number.isFinite(Number(parsed.day)) ? Number(parsed.day) : 999;
    const monthNo = parsed && Number.isFinite(Number(parsed.month)) ? Number(parsed.month) : 999;
    const shift = String((note && note.shift) || (parsed && parsed.shift) || adminRotationFindShiftForAbsenceDate(month, note && note.date) || '').trim();
    const shiftOrder = shift.toUpperCase().startsWith('R') ? 1 : (shift.toUpperCase().startsWith('N') ? 2 : 9);
    return { day, month: monthNo, shiftOrder, shift };
  };
  return rows.sort((a, b) => {
    const am = dateMeta(a);
    const bm = dateMeta(b);
    return (am.month - bm.month)
      || (am.day - bm.day)
      || (am.shiftOrder - bm.shiftOrder)
      || String(a && a.person || '').localeCompare(String(b && b.person || ''), 'cs')
      || String(a && a.code || '').localeCompare(String(b && b.code || ''), 'cs');
  });
}


function adminRotationCopyAbsenceReasonLabel(code, label) {
  const rawCode = String(code || '').trim();
  const rawLabel = String(label || '').trim();
  const upper = rawCode.toLocaleUpperCase('cs-CZ');
  const suffix = rawCode.replace(/^(?:D|NV|L|N|S|Š|§)\b\s*/i, '').trim();
  if (/^D\b/i.test(rawCode) || rawLabel.toLocaleLowerCase('cs-CZ') === 'dovolená') return 'dovolená' + (suffix ? ' ' + suffix : '');
  if (/^NV\b/i.test(rawCode)) return 'náhradní volno' + (suffix ? ' ' + suffix : '');
  if (/^L\b/i.test(rawCode) || rawLabel.toLocaleLowerCase('cs-CZ') === 'lázně') return 'lázně' + (suffix ? ' ' + suffix : '');
  if (/^N\b/i.test(rawCode)) return 'nemoc' + (suffix ? ' ' + suffix : '');
  if (upper.indexOf('§') === 0 || rawLabel.toLocaleLowerCase('cs-CZ') === 'paragraf') return 'paragraf' + (suffix ? ' ' + suffix : '');
  if (upper.indexOf('Š') === 0 || rawLabel.toLocaleLowerCase('cs-CZ') === 'školení') return 'školení' + (suffix ? ' ' + suffix : '');
  return (rawLabel || rawCode || 'absence').toLocaleLowerCase('cs-CZ');
}


function adminRotationCopyAbsenceDateLabel(date) {
  const parsed = typeof parseDateToken === 'function' ? parseDateToken(String(date || '')) : null;
  if (parsed && Number.isFinite(Number(parsed.day)) && Number.isFinite(Number(parsed.month))) {
    return String(Number(parsed.day)) + '.' + String(Number(parsed.month)) + '.';
  }
  const base = adminRotationDateBaseKey(date);
  return base || String(date || '').trim();
}


function buildAdminRotationVacationCopyText(monthKey, monthSource) {
  const month = monthSource || (app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null);
  const notes = Array.isArray(month && month.notes) ? adminRotationSortNotes(month.notes, month) : [];
  const knownNames = adminGetKnownNames();
  const knownOrder = new Map(knownNames.map((name, idx) => [name, idx]));
  const groups = new Map();
  notes.forEach((note) => {
    const normalized = typeof normalizeNoteEntry === 'function' ? normalizeNoteEntry(note) : null;
    if (!normalized || !normalized.isAbsence) return;
    const people = Array.isArray(normalized.people) && normalized.people.length ? normalized.people : [normalized.person];
    const dateLabel = adminRotationCopyAbsenceDateLabel(normalized.date || (note && note.date) || '');
    if (!dateLabel) return;
    const reason = adminRotationCopyAbsenceReasonLabel(normalized.code || (note && note.code) || '', normalized.label || '');
    people.forEach((rawPerson) => {
      const person = adminRotationCanonicalName(rawPerson, knownNames);
      if (!person || !reason) return;
      const key = person + '\u0001' + reason;
      if (!groups.has(key)) groups.set(key, { person, reason, dates: [], seen: new Set() });
      const group = groups.get(key);
      const dateKey = adminRotationDateBaseKey(dateLabel) || dateLabel;
      if (group.seen.has(dateKey)) return;
      group.seen.add(dateKey);
      group.dates.push(dateLabel);
    });
  });
  const title = 'Dovolená ' + String(monthKey || '').trim();
  const rows = Array.from(groups.values()).sort((a, b) => {
    const ai = knownOrder.has(a.person) ? knownOrder.get(a.person) : 9999;
    const bi = knownOrder.has(b.person) ? knownOrder.get(b.person) : 9999;
    return (ai - bi)
      || String(a.person).localeCompare(String(b.person), 'cs')
      || String(a.reason).localeCompare(String(b.reason), 'cs');
  }).map((group) => {
    group.dates.sort((a, b) => {
      const ap = typeof parseDateToken === 'function' ? parseDateToken(a) : null;
      const bp = typeof parseDateToken === 'function' ? parseDateToken(b) : null;
      const av = ap ? Number(ap.month) * 100 + Number(ap.day) : 99999;
      const bv = bp ? Number(bp.month) * 100 + Number(bp.day) : 99999;
      return av - bv || String(a).localeCompare(String(b), 'cs');
    });
    return group.person + ' (' + group.reason + ') - ' + group.dates.join(', ');
  });
  return [title].concat(rows.length ? rows : ['Žádné dovolené.']).join('\n');
}


async function adminRotationCopyTextToClipboard(text) {
  const value = String(text || '');
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand && document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}


async function copyAdminRotationVacationsToClipboard(monthKey) {
  const key = String(monthKey || getAdminSelectedMonthKey() || '').trim();
  if (!key) throw new Error('Nejdřív vyber měsíc.');
  const body = document.getElementById('appMenuBody');
  const month = body && body.querySelector('#adminRotationEditor') && typeof readAdminRotationFromDom === 'function'
    ? readAdminRotationFromDom(key)
    : (app.rotation && app.rotation.months ? app.rotation.months[key] : null);
  if (!month) throw new Error('Pro vybraný měsíc nejsou dostupná data.');
  const text = buildAdminRotationVacationCopyText(key, month);
  await adminRotationCopyTextToClipboard(text);
  return { ok: true, text, lineCount: text.split(/\r?\n/).length };
}


function adminGetKnownNames() {
  if (typeof getKnownStatNames === 'function') {
    return Array.from(getKnownStatNames()).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'cs'));
  }
  if (typeof KNOWN_STAT_NAMES !== 'undefined' && KNOWN_STAT_NAMES && typeof KNOWN_STAT_NAMES.forEach === 'function') {
    return Array.from(KNOWN_STAT_NAMES).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'cs'));
  }
  return [];
}


function adminRotationNameLookupKey(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}


function adminRotationCanonicalPeopleText(value, knownNames) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const names = adminSplitPeopleList(raw);
  if (!names.length) return adminRotationCanonicalName(raw, knownNames);
  return names.map((name) => adminRotationCanonicalName(name, knownNames)).filter(Boolean).join(', ');
}


function adminSplitPeopleList(text) {
  if (typeof splitAbsencePeople === 'function') {
    return splitAbsencePeople(text).map(sanitizeAbsencePersonName).filter(Boolean);
  }
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw.split(/\s*(?:,|;|\/|\||&|\ba\b|\bi\b)\s*/gi).map(part => part.trim()).filter(Boolean);
}


function adminBuildUsedNamesByDate(root) {
  const usedByDate = new Map();

  const add = (dateLabel, name) => {
    const key = String(dateLabel || '').trim().replace(/\s+/g, ' ');
    const person = String(name || '').trim();
    if (!key || !person) return;
    if (!usedByDate.has(key)) usedByDate.set(key, new Set());
    usedByDate.get(key).add(person);
  };

  root.querySelectorAll('tr[data-rotation-section]').forEach((tr) => {
    const date = adminRotationDateLabel(tr.querySelector('[data-rot-field="date"], [data-note-field="date"]')?.value || '');
    tr.querySelectorAll('[data-rot-field^="cell-"]').forEach((input) => {
      const name = String(input && input.value ? input.value : '').trim();
      if (name && !['dát pryč','odebrat','remove','pryc','pryč'].includes(name.toLowerCase())) add(date, name);
    });
  });

  root.querySelectorAll('tr[data-note-row-index]').forEach((tr) => {
    const date = adminRotationDateLabel(tr.querySelector('[data-note-field="date"]')?.value || '');
    const names = adminSplitPeopleList(tr.querySelector('[data-note-field="person"]')?.value || '');
    names.forEach((name) => add(date, name));
  });

  return usedByDate;
}


function adminBuildMonthUsageSummary(monthKey) {
  const month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const knownNames = adminGetKnownNames();
  const usedByDate = new Map();
  const allUsed = new Set();
  const dateOrder = [];

  const register = (dateLabel) => {
    const label = adminRotationDateLabel(dateLabel);
    if (!label) return null;
    if (!usedByDate.has(label)) {
      usedByDate.set(label, new Set());
      dateOrder.push(label);
    }
    return usedByDate.get(label);
  };

  const addName = (dateLabel, name) => {
    const labelSet = register(dateLabel);
    const person = String(name || '').trim();
    if (!labelSet || !person) return;
    labelSet.add(person);
    allUsed.add(person);
  };

  if (month) {
    const hardRows = Array.isArray(month.hard && month.hard.rows) ? month.hard.rows : [];
    const softRows = Array.isArray(month.soft && month.soft.rows) ? month.soft.rows : [];
    const notesRows = Array.isArray(month.notes) ? month.notes : [];

    hardRows.forEach((row) => {
      const label = adminRotationDateLabel(row && row.date ? row.date : '');
      if (!label) return;
      register(label);
      const cells = row && Array.isArray(row.cells) ? row.cells : [];
      cells.forEach((cell) => {
        const name = String(cell || '').trim();
        if (name && !['dát pryč','odebrat','remove','pryc','pryč'].includes(name.toLowerCase())) addName(label, name);
      });
    });

    softRows.forEach((row) => {
      const label = adminRotationDateLabel(row && row.date ? row.date : '');
      if (!label) return;
      register(label);
      const cells = row && Array.isArray(row.cells) ? row.cells : [];
      cells.forEach((cell) => {
        const name = String(cell || '').trim();
        if (name && !['dát pryč','odebrat','remove','pryc','pryč'].includes(name.toLowerCase())) addName(label, name);
      });
    });

    notesRows.forEach((row) => {
      const label = adminRotationDateLabel(row && row.date ? row.date : '');
      if (!label) return;
      register(label);
      const names = adminSplitPeopleList(row && row.person ? row.person : '');
      names.forEach((name) => addName(label, name));
    });
  }

  const freeOverall = knownNames.filter((name) => !allUsed.has(name));
  const missingByDate = dateOrder.map((label) => ({
    label,
    missing: knownNames.filter((name) => !(usedByDate.get(label) || new Set()).has(name))
  })).filter((item) => item.missing.length);

  return { month, knownNames, usedByDate, allUsed, dateOrder, freeOverall, missingByDate };
}


function adminGetRotationActiveDateKey(root) {
  if (!root) return '';
  const focused = root.querySelector('[data-rot-field]:focus, [data-note-field]:focus');
  const row = focused && typeof focused.closest === 'function'
    ? focused.closest('tr[data-rotation-section], tr[data-note-row-index]')
    : null;
  if (!row) return '';
  const dateInput = row.querySelector('[data-rot-field="date"], [data-note-field="date"]');
  return adminRotationDateLabel(dateInput ? dateInput.value : '');
}


function adminRenderRotationAvailabilitySummary(root) {
  if (!root || root.dataset.adminView !== 'rotation') return;
  const box = root.querySelector('#adminRotationFreeNamesSummary');
  if (!box) return;
  const monthSelect = root.querySelector('#adminMonthSelect');
  const monthKey = monthSelect ? monthSelect.value : getAdminSelectedMonthKey();
  const summary = adminBuildMonthUsageSummary(monthKey);

  const makeEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  };
  const appendStrongLine = (className, strongText, tailText) => {
    const line = makeEl('div', className);
    const strong = document.createElement('b');
    strong.textContent = String(strongText || '');
    line.appendChild(strong);
    if (tailText != null) line.appendChild(document.createTextNode(String(tailText)));
    return line;
  };

  if (!summary.month) {
    const fingerprint = JSON.stringify({ state: 'empty', monthKey: monthKey || '' });
    if (typeof setElementChildrenIfChanged === 'function') {
      setElementChildrenIfChanged(box, fingerprint, () => [
        makeEl('div', 'appMenuFreeNamesTitle', 'Kontrola měsíce'),
        makeEl('div', 'appMenuFreeNamesText', 'Pro tenhle měsíc zatím nejsou data.')
      ], 'adminRotationFreeNamesSummary');
    } else {
      box.replaceChildren(
        makeEl('div', 'appMenuFreeNamesTitle', 'Kontrola měsíce'),
        makeEl('div', 'appMenuFreeNamesText', 'Pro tenhle měsíc zatím nejsou data.')
      );
    }
    return;
  }

  const freeOverall = summary.freeOverall.length ? summary.freeOverall.join(', ') : '—';
  const consecutiveRivetingIssues = adminRotationValidateMonthRules(summary.month, monthKey, { source: 'month-check' }).issues
    .filter((issue) => issue && (issue.type === 'consecutive-tnks' || issue.type === 'boundary-consecutive-tnks'))
    .map((issue) => String(issue.message || '').trim())
    .filter(Boolean);
  const missingRows = summary.missingByDate.map((item) => ({
    label: String(item && item.label ? item.label : ''),
    missing: Array.isArray(item && item.missing) ? item.missing.join(', ') : ''
  }));
  const fingerprint = JSON.stringify({ monthKey: monthKey || '', freeOverall, missingRows, consecutiveRivetingIssues });

  const buildContent = () => {
    const list = makeEl('div', 'appMenuMonthCheckList');
    if (missingRows.length) {
      missingRows.forEach((item) => {
        const row = makeEl('div', 'appMenuMonthCheckRow');
        const label = document.createElement('b');
        label.textContent = item.label + ':';
        row.appendChild(label);
        row.appendChild(document.createTextNode(' ' + item.missing));
        list.appendChild(row);
      });
    } else {
      list.appendChild(makeEl('div', 'appMenuMonthCheckRow', 'V tomhle měsíci nechybí žádné známé jméno.'));
    }

    return [
      makeEl('div', 'appMenuFreeNamesTitle', 'Kontrola měsíce ' + String(monthKey || '')),
      appendStrongLine(
        'appMenuFreeNamesText ' + (consecutiveRivetingIssues.length ? 'isError' : 'isOk'),
        'Nýtování dva dny po sobě:',
        consecutiveRivetingIssues.length ? ' nalezen problém' : ' v pořádku'
      ),
      ...(consecutiveRivetingIssues.length
        ? consecutiveRivetingIssues.map((message) => makeEl('div', 'appMenuMonthCheckRow isError', message))
        : []),
      appendStrongLine('appMenuFreeNamesText', 'V celém měsíci nikde nejsou:', ' ' + freeOverall),
      appendStrongLine('appMenuFreeNamesText uMt8', 'Chybějící jména podle dnů:', null),
      list
    ];
  };

  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(box, fingerprint, buildContent, 'adminRotationFreeNamesSummary');
  } else {
    box.replaceChildren(...buildContent());
  }
}


function buildAdminRotationPreSaveChecklistHtml(monthKey) {
  return [
    '<details class="appMenuFoldSection adminRotationPreSaveCheck" id="adminRotationPreSaveCheck" data-pre-save-month="' + escapeHtml(monthKey || '') + '">',
    '  <summary class="appMenuSubTitle">Kontrola před uložením</summary>',
    '  <div class="smallText uMb10">Rychlý stav rozpisu. Přepočítá se i při úpravách v tabulce a nic sám neukládá.</div>',
    '  <div class="adminRotationPreSaveGrid">',
    adminRotationPreSaveItemHtml({ state: 'info', title: 'Měsíc', value: monthKey || '—', detail: 'Vybraný měsíc rozpisu.' }),
    adminRotationPreSaveItemHtml({ state: 'info', title: 'Stav', value: 'počítám', detail: 'Kontrola se dopočítá po vykreslení editoru.' }),
    '  </div>',
    '</details>'
  ].join('');
}


function adminRenderRotationPreSaveChecklist(root) {
  if (!root || root.dataset.adminView !== 'rotation') return;
  const box = root.querySelector('#adminRotationPreSaveCheck');
  if (!box) return;
  const monthSelect = root.querySelector('#adminMonthSelect');
  const monthKey = monthSelect ? String(monthSelect.value || '').trim() : getAdminSelectedMonthKey();
  let month = null;
  try {
    month = typeof readAdminRotationFromDom === 'function' && root.querySelector('#adminRotationEditor')
      ? readAdminRotationFromDom(monthKey)
      : (app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null);
  } catch (err) {
    month = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  }
  const status = adminRotationBuildPreSaveStatus(monthKey, month);
  const items = [
    {
      state: status.hasMonth ? 'ok' : 'warn',
      title: 'Měsíc',
      value: status.monthKey || 'nevybrán',
      detail: status.hasMonth ? 'Měsíc existuje v rozpisu.' : 'Pro tenhle měsíc zatím nejsou data.'
    },
    {
      state: status.dayCount ? 'ok' : 'warn',
      title: 'Dny',
      value: String(status.dayCount),
      detail: 'Tvrdota řádků: ' + String(status.hardRowCount) + ', měkota řádků: ' + String(status.softRowCount) + '.'
    },
    {
      state: status.emptyCells ? 'warn' : (status.totalCells ? 'ok' : 'info'),
      title: 'Obsazení',
      value: status.totalCells ? (String(status.occupancy) + ' %') : '—',
      detail: status.totalCells ? ('Vyplněno ' + String(status.filledCells) + '/' + String(status.totalCells) + ', prázdné ' + String(status.emptyCells) + '.') : 'Žádná políčka k ověření.'
    },
    {
      state: status.notesCount ? 'ok' : 'info',
      title: 'Absence',
      value: String(status.notesCount),
      detail: status.notesCount ? 'Zadané absence / výjimky jsou v měsíci.' : 'Bez ručně zadaných absencí.'
    },
    {
      state: status.backupsCount ? 'ok' : (status.hasBackupsLoaded ? 'info' : 'warn'),
      title: 'Zálohy',
      value: status.backupsCount ? (String(status.backupsCount) + ' načteno') : 'ověřit',
      detail: status.backupsCount ? 'Online zálohy jsou načtené.' : 'Před větší změnou otevři Zálohy rozpisů.'
    },
    {
      state: 'info',
      title: 'Uložení',
      value: 'ručně',
      detail: 'Online změna proběhne až tlačítkem Uložit rozpis.'
    }
  ];
  const fingerprint = JSON.stringify(status);
  const buildContent = () => {
    const title = document.createElement('summary');
    title.className = 'appMenuSubTitle';
    title.textContent = 'Kontrola před uložením';
    const detail = document.createElement('div');
    detail.className = 'smallText uMb10';
    detail.textContent = 'Rychlý stav rozpisu. Přepočítá se i při úpravách v tabulce a nic sám neukládá.';
    const grid = document.createElement('div');
    grid.className = 'adminRotationPreSaveGrid';
    grid.innerHTML = items.map(adminRotationPreSaveItemHtml).join('');
    return [title, detail, grid];
  };
  if (typeof setElementChildrenIfChanged === 'function') {
    setElementChildrenIfChanged(box, fingerprint, buildContent, 'adminRotationPreSaveCheck');
  } else {
    box.replaceChildren(...buildContent());
  }
}


function adminRefreshRotationSuggestions(root) {
  if (!root || root.dataset.adminView !== 'rotation' || !root.isConnected) return;
  try {
    root.querySelectorAll('datalist[data-admin-rotation-suggest]').forEach((list) => list.remove());
  } catch (err) {}
  try {
    adminRenderRotationAvailabilitySummary(root);
    adminRenderRotationPreSaveChecklist(root);
  } catch (err) {
    console.warn('Admin rotation summary failed', err);
  }
}


function buildAdminRotationColgroupHtml(columnCount, firstWidthPx, otherWidthPx) {
  const cols = [];
  cols.push('<col style="width:' + String(firstWidthPx) + 'px;">');
  for (let i = 0; i < columnCount; i += 1) {
    cols.push('<col style="width:' + String(otherWidthPx) + 'px;">');
  }
  return '<colgroup>' + cols.join('') + '</colgroup>';
}


function buildAdminAbsenceColgroupHtml() {
  return '<colgroup>' +
    '<col style="width:55px;">' +
    '<col style="width:106px;">' +
    '<col style="width:32px;">' +
    '</colgroup>';
}



function buildAdminAbsenceCodeDatalistHtml() {
  const codes = ['D', 'N', 'NV', '§', 'Lázně'];
  return '<datalist id="adminAbsenceCodeOptions">' + codes.map(code => '<option value="' + escapeHtml(code) + '"></option>').join('') + '</datalist>';
}


function buildAdminAbsenceSummaryHtml(month) {
  const groups = typeof getRotationMonthShiftAbsenceGroups === 'function'
    ? getRotationMonthShiftAbsenceGroups(month)
    : [];
  if (!groups.length) return '<div class="smallText">Bez poznámek.</div>';

  const maxPairs = Math.max(1, ...groups.map(group => Math.max(1, Array.isArray(group.items) ? group.items.length : 0)));
  let html = "<div class='smallText uMt12 uBold'>Absence podle dne</div>";
  // RAK_17061_ADMIN_ABSENCE_LAYOUT: exactly the same proportional columns as public rotation.
  const absenceColgroup = "<colgroup><col style='width:58px'><col style='width:34px'>" +
    Array.from({length:maxPairs}, (_, idx) => (idx ? "<col style='width:7px'>" : '') +
      "<col style='width:68px'><col style='width:38px'>").join('') + "</colgroup>";
  const absenceWidth = 58 + 34 + maxPairs * (68 + 38) + Math.max(0, maxPairs - 1) * 7;
  html += "<div class='tableWrap'><table class='noteTable noteTableCompact rakAbsenceTable' style='width:" + String(absenceWidth) + "px;min-width:100%'>" + absenceColgroup + "<thead><tr>";
  for (let i = 0; i < maxPairs; i += 1) {
    if (i > 0) html += "<th class='noteSpacer'></th>";
    if (i === 0) html += "<th class='noteDateCell'>Datum</th><th class='noteShiftCell'>Směna</th>";
    html += "<th class='notePersonCell'>Jméno</th><th class='noteReasonCell'>Důvod</th>";
  }
  html += "</tr></thead><tbody>";
  groups.forEach(group => {
    const items = group.items && group.items.length ? group.items.slice() : [];
    html += "<tr" + (!items.length ? " class='noteEmptyAbsenceDay'" : "") + ">";
    for (let i = 0; i < maxPairs; i += 1) {
      if (i > 0) html += "<td class='noteSpacer'></td>";
      const item = items[i];
      if (i === 0) {
        html += "<td class='noteDateCell'>" + escapeHtml(group.date || '—') + "</td><td class='noteShiftCell'>" + escapeHtml(group.shift || '') + "</td>";
      }
      if (item) {
        html += "<td class='notePersonCell'>" + escapeHtml(item.person || '') + "</td><td class='noteReasonCell'>" + escapeHtml(item.reason || '') + "</td>";
      } else {
        html += "<td class='emptyCell notePersonCell'>—</td><td class='emptyCell noteReasonCell'>—</td>";
      }
    }
    html += "</tr>";
  });
  html += "</tbody></table></div>";
  return html;
}


function adminRotationCompactMachineLabel(machine) {
  const raw = String(machine || '').trim();
  const key = raw.toUpperCase();
  if (key === 'TNKS01' || key === 'TNKSO1') return 'TNK';
  if (key === 'TPKW01') return 'W01';
  if (key === 'TPKW02') return 'W02';
  return raw;
}

function buildAdminRotationCompactOverviewHtml(monthKey, hardRows, softRows, hardMachines, softMachines) {
  const renderSection = (title, rows, machines) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeMachines = Array.isArray(machines) ? machines : [];
    if (!safeRows.length) return '';
    const head = '<tr><th>Den</th>' + safeMachines.map((m) => '<th title="' + escapeHtml(String(m || '')) + '">' + escapeHtml(adminRotationCompactMachineLabel(m)) + '</th>').join('') + '</tr>';
    const body = safeRows.map((row) => {
      const date = adminRotationDateLabel(row && row.date ? row.date : '') || String(row && row.date ? row.date : '');
      const cells = Array.isArray(row && row.cells) ? row.cells : [];
      const missingCount = safeMachines.reduce((count, _, idx) => count + (String(cells[idx] || '').trim() ? 0 : 1), 0);
      return '<tr class="' + (missingCount ? 'adminRotationMiniDayHasEmpty' : '') + '"><td>' + escapeHtml(String(date || '')) + '</td>' + safeMachines.map((_, idx) => {
        const raw = String(cells[idx] || '').trim();
        const shortName = adminShortRotationName(raw);
        const empty = !shortName;
        return '<td class="' + (empty ? 'adminRotationMiniEmpty' : '') + '" data-full-name="' + escapeHtml(raw) + '">' + escapeHtml(shortName || '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return [
      '<div class="adminRotationMiniSection">',
      '  <div class="adminRotationMiniTitle">' + escapeHtml(title) + '</div>',
      '  <div class="adminRotationMiniScroll">',
      '    <table class="adminRotationMiniTable"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>',
      '  </div>',
      '</div>'
    ].join('');
  };
  return [
    '<details class="adminRotationCompactOverview" open>',
    '  <summary>Přehled měsíce</summary>',
    '  <div class="adminRotationCompactHint">Mini přehled je jen pro orientaci. Upravuje se v tabulkách níž.</div>',
    renderSection('Tvrdota', hardRows, hardMachines),
    renderSection('Měkota', softRows, softMachines),
    '</details>'
  ].join('');
}


// RAK_ROTATION_TOOLBAR_SLIM_17023
function buildAdminRotationTableHtml(monthKey) {

  const pendingMonth = typeof adminRotationGeneratorGetPendingDraft === 'function'
    ? adminRotationGeneratorGetPendingDraft(monthKey)
    : null;
  const savedMonth = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const month = pendingMonth || savedMonth;
  const hasPendingDraft = !!pendingMonth;
  if (!month) {
    return '<div class="smallText">Pro tenhle měsíc zatím nejsou data.</div>';
  }
  const hardRows = Array.isArray(month.hard && month.hard.rows) ? month.hard.rows : [];
  const softRows = Array.isArray(month.soft && month.soft.rows) ? month.soft.rows : [];
  const notesRows = Array.isArray(month.notes) ? month.notes : [];
  const hardMachines = Array.isArray(month.hard && month.hard.machines) ? month.hard.machines : HARD_MACHINE_HEADERS;
  const softMachines = Array.isArray(month.soft && month.soft.machines) ? month.soft.machines : SOFT_MACHINE_HEADERS;

  const renderRows = (section, rows, machineCount) => {
    const withBlank = rows.concat([ { date: '', cells: Array(machineCount).fill('') } ]);
    return withBlank.map((row, idx) => adminRotationRowTemplate(section, row, idx, machineCount, true)).join('');
  };

  const renderNotes = () => {
    const sortedNotesRows = adminRotationSortNotes(notesRows, month);
    const withBlank = sortedNotesRows.concat([ { date: '', person: '', code: '' } ]);
    let html = withBlank.map((row, idx) => adminNotesRowTemplate(row, idx, true)).join('');
    try {
      if (typeof rakDayModAbsenceRows === 'function') {
        const derived = rakDayModAbsenceRows(month) || [];
        html += derived.map(r =>
          '<tr class="rakDayModAbsenceRow" title="Automaticky z výjimky dne v rozpisu">'
          + '<td>' + escapeHtml(r.date) + '</td>'
          + '<td>' + escapeHtml(r.person) + '</td>'
          + '<td>' + escapeHtml(r.code) + '</td>'
          + '</tr>'
        ).join('');
      }
    } catch (e) {}
    return html;
  };

  const hardColgroup = buildAdminRotationColgroupHtml(hardMachines.length, 46, 50);
  const softColgroup = buildAdminRotationColgroupHtml(softMachines.length, 46, 50);
  const absenceColgroup = buildAdminAbsenceColgroupHtml();

  return [
    '<div class="appMenuSubSection" id="adminRotationEditor">',
    '  <div class="appMenuSubTitle">Rozpis – ' + escapeHtml(monthKey) + (hasPendingDraft ? ' · vygenerovaný návrh' : '') + '</div>',
    '  <div class="appMenuText">' + (hasPendingDraft
      ? 'Je zobrazený nový vygenerovaný návrh. Online rozpis se nezmění, dokud nekliknete na Uložit rozpis.'
      : 'Stejný rozpis, jen editovatelný. Změny zůstávají rozepsané lokálně a do Supabase jdou až po kliknutí na Uložit rozpis.') + '</div>',
    rakAdminMonthDraftRecoveryHtml(monthKey),
    '  <div class="adminRotationSaveDock">',
    '    <div class="adminRotationSaveActions">',
    '      <button type="button" class="appMenuAction adminRotationSelectedRemoveBtn" data-admin-selected-remove hidden>Odebrat vybrané</button>',
    '    </div>',
    '    <span id="adminRotationDraftStatus" class="adminRotationDraftStatus">' + (hasPendingDraft
      ? 'Zobrazen je nový návrh. Uloží se až horním tlačítkem Uložit rozpis.'
      : 'Rozepsané změny se uloží horním tlačítkem Uložit rozpis.') + '</span>',
    '  </div>',
    buildAdminRotationCompactOverviewHtml(monthKey, hardRows, softRows, hardMachines, softMachines),
    '  <div class="appMenuFreeNamesBox" id="adminRotationFreeNamesSummary">',
    '    <div class="appMenuFreeNamesTitle">Kontrola měsíce</div>',
    '    <div class="appMenuFreeNamesText">Vyber měsíc a hned uvidíš, kdo v něm není zapsaný ani jednou a na kterých dnech ještě někdo chybí.</div>',
    '  </div>',
    buildAdminPressRotationOverridesHtml(month, monthKey, hardRows),
    '  <details class="appMenuFoldSection adminRotationFold" open>',
    '    <summary>Tvrdota <button type="button" class="rakDayModModeBtn" data-daymod-mode="hard">✎ Výjimky dne</button></summary>',
    '    <div class="tableWrap appMenuTableWrap">',
    // RAK_17067_EQUAL_GRID_MARKUP: identical 84px dates / 52px names for BOTH sections.
    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="hard" style="--rak-grid-width:' + String(84 + hardMachines.length * 52) + 'px;">',
    '        ' + hardColgroup,
    '        <thead><tr><th>Datum</th>' + hardMachines.map(m => '<th>' + escapeHtml(m) + '</th>').join('') + '</tr></thead>',
    '        <tbody>' + renderRows('hard', hardRows, hardMachines.length) + '</tbody>',
    '      </table>',
    '    </div>',
    '  </details>',
    '  <details class="appMenuFoldSection adminRotationFold" open>',
    '    <summary>Měkota <button type="button" class="rakDayModModeBtn" data-daymod-mode="soft">✎ Výjimky dne</button></summary>',
    '    <div class="tableWrap appMenuTableWrap">',
    // RAK_17066_SOFT_GRID_MARKUP: date + compact machine columns, no wasted space.
    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminRotationTable" data-daymod-section="soft" style="--rak-grid-width:' + String(84 + softMachines.length * 52) + 'px;">',
    '        ' + softColgroup,
    '        <thead><tr><th>Datum</th>' + softMachines.map(m => '<th>' + escapeHtml(m) + '</th>').join('') + '</tr></thead>',
    '        <tbody>' + renderRows('soft', softRows, softMachines.length) + '</tbody>',
    '      </table>',
    '    </div>',
    '  </details>',
    '  <details class="appMenuFoldSection adminRotationFold" open>',
    '    <summary>Absence</summary>',
    '    <div class="tableWrap appMenuTableWrap">',
    '      <table class="appMenuTable appMenuAdminTable appMenuAdminTableDense appMenuAdminAbsenceTable">',
    '        ' + absenceColgroup,
    '        <thead><tr><th>Datum</th><th>Jméno</th><th>Kód</th></tr></thead>',
    '        <tbody>' + renderNotes() + '</tbody>',
    '      </table>',
    '    </div>',
    '    <div class="adminRotationAbsenceAddRow">',
    '      <button type="button" class="appMenuAction adminRotationAbsenceAddBtn" data-admin-action="add-absence-row">+ Přidat další absenci</button>',
    '    </div>',
    buildAdminAbsenceCodeDatalistHtml(),
    buildAdminAbsenceSummaryHtml(month),
    '  </details>',
    '</div>'
  ].join('');
}



function readAdminRotationFromDom(monthKey) {
  const fallback = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  const month = fallback ? JSON.parse(JSON.stringify(fallback)) : {
    hard: { title: 'Rotace tvrdota', machines: HARD_MACHINE_HEADERS.slice(), rows: [] },
    soft: { title: 'Rotace měkota', machines: SOFT_MACHINE_HEADERS.slice(), rows: [] },
    notes: []
  };

  const root = document.getElementById('appMenuBody');
  if (!root) return month;

  const readSection = (section, machineCount) => {
    const rows = [];
    const seen = new Set();
    const knownNames = adminGetKnownNames();
    const fallbackRows = Array.isArray(fallback && fallback[section] && fallback[section].rows) ? fallback[section].rows : [];
    root.querySelectorAll('tr[data-rotation-section="' + section + '"]').forEach((tr, domIndex) => {
      const rawDate = String(tr.querySelector('[data-rot-field="date"]')?.value || '').trim();
      const sourceIndex = Number(tr.getAttribute('data-rotation-row-index'));
      const fallbackRow = fallbackRows[Number.isFinite(sourceIndex) ? sourceIndex : domIndex] || fallbackRows[domIndex] || null;
      const date = adminRotationSmartManualDate(rawDate, month, fallbackRow && fallbackRow.date ? fallbackRow.date : '');
      const cells = Array.from({ length: machineCount }, (_, i) => adminRotationSmartManualName(tr.querySelector('[data-rot-field="cell-' + i + '"]')?.value || '', knownNames));
      if (!date && cells.every(v => !v)) return;
      const row = { date, cells };
      const key = makeRotationRowKey(row);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(row);
    });
    month[section] = month[section] || {};
    month[section].rows = rows;
    month[section].machines = section === 'hard' ? HARD_MACHINE_HEADERS.slice() : SOFT_MACHINE_HEADERS.slice();
    if (!month[section].title) month[section].title = section === 'hard' ? 'Rotace tvrdota' : 'Rotace měkota';
  };

  readSection('hard', HARD_MACHINE_HEADERS.length);
  readSection('soft', SOFT_MACHINE_HEADERS.length);

  const notes = [];
  const seenNotes = new Set();
  root.querySelectorAll('tr[data-note-row-index]').forEach((tr) => {
    const knownNames = adminGetKnownNames();
    const get = (field) => String(tr.querySelector('[data-note-field="' + field + '"]')?.value || '').trim();
    const rawDate = get('date');
    const sourceIndex = Number(tr.getAttribute('data-note-row-index'));
    const fallbackNotes = Array.isArray(fallback && fallback.notes) ? fallback.notes : [];
    const fallbackNote = fallbackNotes[Number.isFinite(sourceIndex) ? sourceIndex : -1] || null;
    const date = adminRotationSmartManualDate(rawDate, month, fallbackNote && fallbackNote.date ? fallbackNote.date : '');
    const person = adminRotationSmartManualPeopleText(get('person'), knownNames);
    const code = adminRotationSmartAbsenceCode(get('code'));
    const parsed = typeof parseDateToken === 'function' ? parseDateToken(date) : null;
    const shift = parsed && parsed.shift ? parsed.shift : adminRotationFindShiftForAbsenceDate(month, date);
    const text = [person, code].filter(Boolean).join(' ').trim();
    const note = { date, person, code, shift, text };
    if (!note.date && !note.person && !note.code && !note.shift && !note.text) return;
    const key = makeNoteRowKey(note);
    if (seenNotes.has(key)) return;
    seenNotes.add(key);
    notes.push(note);
  });
  month.notes = adminRotationSortNotes(notes, month);

  const pressRotationOverrides = {};
  root.querySelectorAll('[data-press-rotation-date]').forEach((select) => {
    const key = String(select.getAttribute('data-press-rotation-date') || '').trim();
    const value = String(select.value || '').trim().toLowerCase();
    if (!key || value === 'auto') return;
    if (value === 'split' || value === 'nosplit') pressRotationOverrides[key] = value;
  });
  if (Object.keys(pressRotationOverrides).length) month.pressRotationOverrides = pressRotationOverrides;
  else delete month.pressRotationOverrides;

  return normalizeMonthForImport(month, fallback);
}


function adminRotationComparableMonth(value) {
  const month = value && typeof value === 'object' ? value : {};
  const normalizeRows = (section) => (Array.isArray(section && section.rows) ? section.rows : []).map((row) => ({
    date: String(row && row.date || '').trim(),
    cells: (Array.isArray(row && row.cells) ? row.cells : []).map((cell) => String(cell || '').trim())
  }));
  const notes = (Array.isArray(month.notes) ? month.notes : []).map((note) => ({
    date: String(note && note.date || '').trim(),
    person: String(note && note.person || '').trim(),
    code: String(note && note.code || '').trim(),
    shift: String(note && note.shift || '').trim(),
    text: String(note && note.text || '').trim()
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'cs'));
  const pressRotationOverrides = Object.entries(month.pressRotationOverrides || {})
    .map(([key, value]) => [String(key), String(value)])
    .sort((a, b) => a[0].localeCompare(b[0], 'cs'));
  return JSON.stringify({
    hard: normalizeRows(month.hard),
    soft: normalizeRows(month.soft),
    notes,
    pressRotationOverrides
  });
}

function adminRotationHasManualDomChanges(monthKey, normalizedMonth) {
  const current = normalizedMonth || readAdminRotationFromDom(monthKey);
  let baseline = null;
  try {
    if (typeof adminRotationGeneratorGetPendingDraft === 'function') baseline = adminRotationGeneratorGetPendingDraft(monthKey);
  } catch (err) {}
  if (!baseline) baseline = app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
  if (!baseline) return true;
  return adminRotationComparableMonth(current) !== adminRotationComparableMonth(baseline);
}

function adminRotationBuildManualRuleOverrideState(monthKey, normalizedMonth) {
  const normalized = normalizedMonth || readAdminRotationFromDom(monthKey);
  const ruleCheck = adminRotationValidateMonthRules(normalized, monthKey, { source: 'manual-save' });
  const blockingIssues = (Array.isArray(ruleCheck.issues) ? ruleCheck.issues : [])
    .filter((issue) => issue && issue.severity === 'error');
  return { normalized, ruleCheck, blockingIssues };
}

async function adminRotationConfirmManualRuleOverride(state) {
  const blocking = state && Array.isArray(state.blockingIssues) ? state.blockingIssues : [];
  if (!blocking.length) return true;

  const previous = document.getElementById('adminRotationRuleOverrideModal');
  if (previous) previous.remove();

  return await new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'adminRotationRuleOverrideModal';
    overlay.className = 'adminRotationRuleOverrideModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'adminRotationRuleOverrideTitle');

    const card = document.createElement('div');
    card.className = 'adminRotationRuleOverrideCard';

    const title = document.createElement('div');
    title.id = 'adminRotationRuleOverrideTitle';
    title.className = 'adminRotationRuleOverrideTitle';
    title.textContent = 'Chyba v rozpisu';

    const intro = document.createElement('div');
    intro.className = 'adminRotationRuleOverrideIntro';
    intro.textContent = 'V rozpisu jsou chyby. Můžeš se vrátit a opravit je, nebo rozpis vědomě uložit i přesto.';

    const list = document.createElement('div');
    list.className = 'adminRotationRuleOverrideList';
    const limit = 10;
    blocking.slice(0, limit).forEach((issue, idx) => {
      const row = document.createElement('div');
      row.className = 'adminRotationRuleOverrideIssue';
      row.textContent = String(idx + 1) + '. ' + String(issue && issue.message || 'Porušení pravidla');
      list.appendChild(row);
    });
    if (blocking.length > limit) {
      const more = document.createElement('div');
      more.className = 'adminRotationRuleOverrideMore';
      more.textContent = '… a dalších ' + String(blocking.length - limit) + ' chyb.';
      list.appendChild(more);
    }

    const actions = document.createElement('div');
    actions.className = 'adminRotationRuleOverrideActions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'adminRotationRuleOverrideBtn adminRotationRuleOverrideClose';
    closeBtn.textContent = 'Zavřít';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'adminRotationRuleOverrideBtn adminRotationRuleOverrideSave';
    saveBtn.textContent = 'Přesto uložit';

    actions.append(closeBtn, saveBtn);
    card.append(title, intro, list, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      resolve(!!value);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finish(false);
    };

    closeBtn.addEventListener('click', () => finish(false), { once: true });
    saveBtn.addEventListener('click', () => finish(true), { once: true });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener('keydown', onKeyDown, true);

    requestAnimationFrame(() => {
      try { closeBtn.focus({ preventScroll: true }); } catch (err) { try { closeBtn.focus(); } catch (err2) {} }
    });
  });
}

async function saveAdminRotationFromDom(monthKey, options) {
  if (!monthKey) throw new Error('Chybí měsíc.');
  const opts = options || {};
  const previousRotationSnapshot = app.rotation ? JSON.parse(JSON.stringify(app.rotation)) : null;
  const normalized = opts.normalizedMonth || readAdminRotationFromDom(monthKey);
  const ruleCheck = opts.ruleCheck || adminRotationValidateMonthRules(normalized, monthKey, { source: opts.manualOverride ? 'manual-save' : 'save' });
  if (!ruleCheck.ok && opts.allowRuleViolations !== true) {
    throw new Error('Rozpis nejde uložit: ' + adminRotationFormatRuleIssues(ruleCheck.issues.filter((issue) => issue.severity === 'error')));
  }
  const candidateRotation = app.rotation ? JSON.parse(JSON.stringify(app.rotation)) : { months: {} };
  if (!candidateRotation.months) candidateRotation.months = {};
  candidateRotation.months[monthKey] = normalized;
  const normalizedRotation = normalizeRotationData(candidateRotation);
  // RAK_17065_REAL_ADMIN_SAVE_GUARD: this is the actual button path used by app-menu.js.
  // Refuse a network attempt if durable draft verification failed. Keep older drafts intact.
  const draft = rakPreserveAdminMonthDraft(monthKey, normalized);
  let saveResult = { ok:false, reason: app.adminUnlocked ? 'draft-storage-failed' : 'admin-required' };
  if (app.adminUnlocked && draft.stored) {
    try { saveResult = await saveRotationToSupabase(normalizedRotation, { source: 'admin-menu', monthKey })
      || {ok:false,reason:'no-result'}; }
    catch(_) { saveResult={ok:false,reason:'network-error'}; }
    if (saveResult && saveResult.ok === true && saveResult.queued !== true) {
      try { if(localStorage.getItem(draft.key)===draft.content)localStorage.removeItem(draft.key); }catch(_){}

      if (typeof createRotationSaveBackup === 'function') {
        try { await createRotationSaveBackup(previousRotationSnapshot, monthKey); } catch (err) {}
      }
      if (typeof rakAdminLogChange === 'function') {
        try {
          const overrideCount = Array.isArray(opts.manualOverrideIssues) ? opts.manualOverrideIssues.length : 0;
          await rakAdminLogChange('Rozpis', 'Uložen měsíc ' + String(monthKey || '') + (overrideCount ? ' · ruční výjimky: ' + String(overrideCount) : ''));
        } catch (err) {}
      }
    }
  }
  const manualOverrideIssues = Array.isArray(opts.manualOverrideIssues) ? opts.manualOverrideIssues.slice() : [];
  if (!saveResult || saveResult.ok !== true || saveResult.queued === true) {
    if (typeof app !== 'undefined' && app) app.adminRotationDirty = true;
    return { normalized, saveResult: saveResult || { ok: false, reason: 'no-result' }, ruleCheck,
      manualOverrideIssues, preservedDraft: draft.stored, draft };
  }
  app.rotation = normalizedRotation;
  app.selectedMonth = monthKey;
  app.adminRotationDirty = false;
  saveRotationData();
  renderRotace();
  if (typeof renderMonth === 'function') renderMonth(monthKey);
  if (app.selectedName && typeof renderPerson === 'function') renderPerson(app.selectedName);
  try {
    if (typeof adminRotationGeneratorClearPendingDraft === 'function') adminRotationGeneratorClearPendingDraft(monthKey);
  } catch (err) {}
  return { normalized, saveResult, ruleCheck, manualOverrideIssues };
}


function adminShowRotationSelectedRemove(input) {
  try {
    const body = document.getElementById('appMenuBody');
    const btn = adminGetSelectedRemoveButton();
    if (!body || body.dataset.adminView !== 'rotation' || !btn || !input || !body.contains(input)) {
      adminHideRotationSelectedRemove();
      return;
    }
    if (!input.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) {
      adminHideRotationSelectedRemove();
      return;
    }
    const value = String(input.value || '').trim();
    if (!value || adminRotationIsRemoveValue(value)) {
      adminHideRotationSelectedRemove();
      return;
    }
    window.__rakAdminRotationSelectedInput = input;
    // RaK 1.2 (1.155) – horní sticky tlačítko už při kliknutí do jména nevytahujeme.
    // Rychlé Odebrat se vykreslí přímo u aktivního pole přes adminShowRotationQuickRemove().
    btn.hidden = true;
    btn.dataset.targetReady = '1';
    btn.textContent = 'Odebrat vybrané';
    const status = document.getElementById('adminRotationDraftStatus');
    if (status) status.textContent = 'Vybrané: ' + value + ' · odebrání je přímo u jména.';
  } catch (err) {
    console.warn('Admin selected remove failed', err);
  }
}


function adminCloseRotationQuickRemove() {
  const box = document.getElementById('adminRotationQuickRemove');
  if (box) box.remove();
  window.__rakAdminRotationQuickRemoveInput = null;
}


function adminShowRotationQuickRemove(input) {
  try {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.adminView !== 'rotation' || !input || !body.contains(input)) return;
    if (!input.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) {
      adminCloseRotationQuickRemove();
      return;
    }
    const value = String(input.value || '').trim();
    if (!value || adminRotationIsRemoveValue(value)) {
      adminCloseRotationQuickRemove();
      return;
    }
    let box = document.getElementById('adminRotationQuickRemove');
    if (!box) {
      box = document.createElement('div');
      box.id = 'adminRotationQuickRemove';
      box.className = 'adminRotationQuickRemove';
      box.innerHTML = '<span class="adminRotationQuickRemoveText"></span><div class="adminRotationQuickRemoveActions"><button type="button" class="adminRotationQuickUnplannedBtn">Neplánovaná dovolená</button><button type="button" class="adminRotationQuickRemoveBtn">Odebrat</button></div>';
      document.body.appendChild(box);
      box.addEventListener('click', (ev) => {
        const unplannedBtn = ev.target && ev.target.closest ? ev.target.closest('.adminRotationQuickUnplannedBtn') : null;
        const removeBtn = ev.target && ev.target.closest ? ev.target.closest('.adminRotationQuickRemoveBtn') : null;
        if (!unplannedBtn && !removeBtn) return;
        ev.preventDefault();
        const target = window.__rakAdminRotationQuickRemoveInput;
        if (unplannedBtn) {
          if (target && target.isConnected && target.matches('[data-rot-field^="cell-"]') && typeof adminOpenUnplannedChangeDialog === 'function') {
            adminCloseRotationQuickRemove();
            adminOpenUnplannedChangeDialog(target);
          }
          return;
        }
        if (target && target.isConnected) {
          target.value = '';
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          try { target.focus({ preventScroll: true }); } catch (err) { try { target.focus(); } catch (err2) {} }
        }
        adminCloseRotationQuickRemove();
      });
    }
    window.__rakAdminRotationQuickRemoveInput = input;
    window.__rakAdminRotationQuickRemoveShownAt = Date.now();
    const txt = box.querySelector('.adminRotationQuickRemoveText');
    if (txt) txt.textContent = 'Jméno: ' + value;
    const unplannedBtn = box.querySelector('.adminRotationQuickUnplannedBtn');
    if (unplannedBtn) unplannedBtn.hidden = !input.matches('[data-rot-field^="cell-"]');
    const actions = box.querySelector('.adminRotationQuickRemoveActions');
    const removeBtn = box.querySelector('.adminRotationQuickRemoveBtn');
    if (actions) {
      actions.style.setProperty('display', 'grid', 'important');
      actions.style.setProperty('grid-template-columns', '1fr', 'important');
      actions.style.setProperty('width', '100%', 'important');
      actions.style.setProperty('gap', '8px', 'important');
    }
    for (const button of [unplannedBtn, removeBtn]) {
      if (!button) continue;
      button.style.setProperty('display', 'block', 'important');
      button.style.setProperty('width', '100%', 'important');
      button.style.setProperty('min-width', '0', 'important');
      button.style.setProperty('white-space', 'normal', 'important');
      button.style.setProperty('box-sizing', 'border-box', 'important');
    }
    const rect = input.getBoundingClientRect();
    const vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
    const vh = Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480);
    const pickerHeight = input.matches('[data-rot-field^="cell-"]') ? 142 : 48;
    let top = Math.round(rect.bottom + 6);
    if (top + pickerHeight > vh - 8) top = Math.max(8, Math.round(rect.top - pickerHeight - 6));
    const pickerWidth = input.matches('[data-rot-field^="cell-"]') ? Math.min(260, vw - 16) : 196;
    const left = Math.max(8, Math.min(vw - pickerWidth - 8, Math.round(rect.left + (rect.width / 2) - (pickerWidth / 2))));
    box.style.top = String(top) + 'px';
    box.style.left = String(left) + 'px';
    box.style.setProperty('display', 'grid', 'important');
    box.style.setProperty('grid-template-columns', '1fr', 'important');
    box.style.setProperty('align-items', 'stretch', 'important');
    box.style.setProperty('justify-content', 'stretch', 'important');
    box.classList.add('isVisible');
  } catch (err) {
    console.warn('Admin quick remove failed', err);
  }
}


function adminScheduleRotationQuickRemove(input) {
  try {
    window.clearTimeout(window.__rakAdminRotationQuickRemoveTimer || 0);
    window.__rakAdminRotationQuickRemoveTimer = window.setTimeout(() => adminShowRotationQuickRemove(input), 35);
  } catch (err) {
    adminShowRotationQuickRemove(input);
  }
}


function adminCloseAbsenceCodePicker() {
  const box = document.getElementById('adminAbsenceCodePicker');
  if (box) box.remove();
  window.__rakAdminAbsenceCodeInput = null;
}


function adminShowAbsenceCodePicker(input) {
  try {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.adminView !== 'rotation' || !input || !body.contains(input) || !input.matches('[data-note-field="code"]')) {
      adminCloseAbsenceCodePicker();
      return;
    }
    let box = document.getElementById('adminAbsenceCodePicker');
    if (!box) {
      box = document.createElement('div');
      box.id = 'adminAbsenceCodePicker';
      box.className = 'adminAbsenceCodePicker';
      const codes = ['D', 'N', 'NV', '§', 'Lázně'];
      box.innerHTML = '<div class="adminAbsenceCodePickerTitle">Zkratka absence</div><div class="adminAbsenceCodePickerGrid">' +
        codes.map(code => '<button type="button" class="adminAbsenceCodeChip" data-absence-code="' + escapeHtml(code) + '">' + escapeHtml(code) + '</button>').join('') +
        '</div>';
      document.body.appendChild(box);
      box.addEventListener('pointerdown', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-absence-code]') : null;
        if (!btn) return;
        ev.preventDefault();
        const target = window.__rakAdminAbsenceCodeInput;
        const code = String(btn.getAttribute('data-absence-code') || '').trim();
        if (target && target.isConnected && code) {
          target.value = code;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          try { target.focus({ preventScroll: true }); } catch (err) { try { target.focus(); } catch (err2) {} }
        }
        adminCloseAbsenceCodePicker();
      });
    }
    window.__rakAdminAbsenceCodeInput = input;
    const rect = input.getBoundingClientRect();
    const vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
    const vh = Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480);
    const pickerWidth = 214;
    const pickerHeight = 104;
    let top = Math.round(rect.bottom + 6);
    if (top + pickerHeight > vh - 8) top = Math.max(8, Math.round(rect.top - pickerHeight - 6));
    const left = Math.max(8, Math.min(vw - pickerWidth - 8, Math.round(rect.left + (rect.width / 2) - (pickerWidth / 2))));
    box.style.top = String(top) + 'px';
    box.style.left = String(left) + 'px';
    box.classList.add('isVisible');
  } catch (err) {
    console.warn('Admin absence code picker failed', err);
  }
}


function adminScheduleAbsenceCodePicker(input) {
  try {
    window.clearTimeout(window.__rakAdminAbsenceCodePickerTimer || 0);
    window.__rakAdminAbsenceCodePickerTimer = window.setTimeout(() => adminShowAbsenceCodePicker(input), 40);
  } catch (err) {
    adminShowAbsenceCodePicker(input);
  }
}


function adminSetRotationViewportLock(active) {
  try {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    if (!window.__rakDefaultViewportContent) {
      window.__rakDefaultViewportContent = meta.getAttribute('content') || 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }
    const locked = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    meta.setAttribute('content', active ? locked : window.__rakDefaultViewportContent);
  } catch (err) {}
}


function adminBindRotationZoomGuard() {
  if (window.__rakAdminRotationZoomGuardBound) return;
  window.__rakAdminRotationZoomGuardBound = true;
  const isAdminRotation = () => {
    const body = document.getElementById('appMenuBody');
    return !!(body && body.dataset.adminView === 'rotation' && document.getElementById('adminRotationEditor'));
  };
  const isAdminRotationField = (node) => !!(node && node.matches && node.matches('[data-rot-field], [data-note-field]'));
  const blockZoom = (event) => {
    if (!isAdminRotation()) return;
    adminSetRotationViewportLock(true);
    try { adminCloseRotationQuickRemove(); } catch (err) {}
    try { adminHideRotationSelectedRemove(); } catch (err) {}
    if (event && event.touches && event.touches.length < 2) return;
    try { event.preventDefault(); } catch (err) {}
  };
  const lockForField = (event) => {
    if (!isAdminRotation()) return;
    const target = event && event.target;
    if (!isAdminRotationField(target)) return;
    adminSetRotationViewportLock(true);
  };
  const recoverAfterViewportChange = () => {
    if (!isAdminRotation()) return;
    adminSetRotationViewportLock(true);
    try { adminHideRotationSelectedRemove(); } catch (err) {}
    try {
      const active = document.activeElement;
      if (active && isAdminRotationField(active)) {
        if (window.visualViewport && Number(window.visualViewport.scale || 1) > 1.01) active.blur();
        else if (active.matches && active.matches('[data-rot-field^="cell-"], [data-note-field="person"]')) window.setTimeout(() => adminShowRotationQuickRemove(active), 80);
      } else if (window.__rakAdminRotationQuickRemoveInput && window.__rakAdminRotationQuickRemoveInput.isConnected) {
        window.setTimeout(() => adminShowRotationQuickRemove(window.__rakAdminRotationQuickRemoveInput), 80);
      } else {
        adminCloseRotationQuickRemove();
      }
    } catch (err) {}
    try {
      const body = document.getElementById('appMenuBody');
      if (body) body.classList.add('adminRotationViewportRecovered');
    } catch (err) {}
  };
  try { document.addEventListener('gesturestart', blockZoom, { passive: false }); } catch (err) {}
  try { document.addEventListener('gesturechange', blockZoom, { passive: false }); } catch (err) {}
  try { document.addEventListener('gestureend', blockZoom, { passive: false }); } catch (err) {}
  try { document.addEventListener('touchstart', lockForField, { passive: true, capture: true }); } catch (err) {}
  try { document.addEventListener('focusin', lockForField, true); } catch (err) {}
  try {
    window.addEventListener('resize', recoverAfterViewportChange, { passive: true });
  } catch (err) {}
  try {
    if (!window.__rakAdminRotationQuickRemoveOutsideBound) {
      window.__rakAdminRotationQuickRemoveOutsideBound = true;
      document.addEventListener('pointerdown', (event) => {
        const body = document.getElementById('appMenuBody');
        if (!body || body.dataset.adminView !== 'rotation') return;
        const target = event && event.target;
        const quick = document.getElementById('adminRotationQuickRemove');
        const codePicker = document.getElementById('adminAbsenceCodePicker');
        if (quick && target && (quick === target || quick.contains(target))) return;
        if (codePicker && target && (codePicker === target || codePicker.contains(target))) return;
        if (target && target.matches && target.matches('[data-rot-field], [data-note-field]')) return;
        adminCloseRotationQuickRemove();
        adminCloseAbsenceCodePicker();
      }, true);
    }
  } catch (err) {}
}



function runAdminRotationEditorMaintenance(body, reason) {
  if (!body || body.dataset.adminView !== 'rotation') return;
  try {
    if (typeof adminRefreshRotationSuggestions === 'function') adminRefreshRotationSuggestions(body);
    else if (typeof adminRenderRotationAvailabilitySummary === 'function') adminRenderRotationAvailabilitySummary(body);
  } catch (err) {
    console.warn('Admin rotation maintenance failed', reason || '', err);
    const status = body.querySelector('#adminOnlineSaveStatus');
    if (status) status.textContent = 'Kontrola rozpisu se teď nepřepočítala, ale editace zůstala zachovaná.';
  }
}


function scheduleAdminRotationEditorMaintenance(body, reason, delayMs) {
  if (!body || body.dataset.adminView !== 'rotation') return;
  try {
    if (body.__adminRotationMaintenanceTimer) window.clearTimeout(body.__adminRotationMaintenanceTimer);
    const delay = Number.isFinite(delayMs) ? delayMs : 180;
    body.__adminRotationMaintenanceTimer = window.setTimeout(() => {
      body.__adminRotationMaintenanceTimer = 0;
      runAdminRotationEditorMaintenance(body, reason || 'scheduled');
    }, delay);
  } catch (err) {
    runAdminRotationEditorMaintenance(body, reason || 'fallback');
  }
}


function adminEnsureRotationNameActionMenuStyles() {
  if (document.getElementById('rakRotationNameActionMenuStyles')) return;
  const style = document.createElement('style');
  style.id = 'rakRotationNameActionMenuStyles';
  style.textContent = [
    '.adminRotationQuickRemove{width:min(260px,calc(100vw - 16px))!important;min-width:0!important;max-width:calc(100vw - 16px)!important;padding:12px!important;box-sizing:border-box!important}',
    '.adminRotationQuickRemove.isVisible{display:grid!important;grid-template-columns:1fr!important;align-items:stretch!important;justify-content:stretch!important}',
    '.adminRotationQuickRemoveActions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:8px!important}',
    '.adminRotationQuickRemoveActions button{width:100%!important;min-width:0!important;min-height:44px!important;padding:8px 12px!important;border-radius:12px!important;white-space:normal!important;line-height:1.15!important}',
    '.adminRotationQuickRemoveText{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}'
  ].join('');
  document.head.appendChild(style);
}

function adminBindRotationNameActionMenuRoute() {
  if (window.__rakAdminRotationNameActionMenuBound) return;
  window.__rakAdminRotationNameActionMenuBound = true;
  adminEnsureRotationNameActionMenuStyles();
  document.addEventListener('pointerdown', (event) => {
    const body = document.getElementById('appMenuBody');
    if (!body || body.dataset.adminView !== 'rotation') return;
    const target = event.target && event.target.closest ? event.target.closest('[data-rot-field^="cell-"]') : null;
    if (!target || !body.contains(target)) return;
    const value = String(target.value || '').trim();
    if (!value || (typeof adminRotationIsRemoveValue === 'function' && adminRotationIsRemoveValue(value))) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      const active = document.activeElement;
      if (active && active !== document.body && typeof active.blur === 'function') active.blur();
    } catch (_) {}
    try { adminCloseAbsenceCodePicker(); } catch (_) {}
    adminShowRotationQuickRemove(target);
  }, true);
}

try { adminBindRotationNameActionMenuRoute(); } catch (_) {}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-rotation-editor.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
