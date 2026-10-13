// RaK TEST – owner-only Přehled směny.
// Account-scoped online backup with a durable local outbox.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('admin-shift-overview.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

(function installRakAdminShiftOverview(root) {
  'use strict';

  const STORAGE_KEY = 'rak_admin_shift_overview_v1';
  const MAX_RECORDS = 120;
  const renderedRecords = new WeakMap();
  const renderedRevisions = new WeakMap();
  const quantityUndo = new WeakMap();
  const draftOwners = new WeakMap();
  const DRAFT_PREFIX = 'rak_shift_overview_draft_v1:';
  function draftKey() {
    const identity = currentIdentity();
    return identity ? DRAFT_PREFIX + identity.userId : (!bridge() && ownerAllowed() ? DRAFT_PREFIX + 'local' : null);
  }
  function readDraft() {
    const key = draftKey();
    const draft = key && jsonRead(key, null);
    return draft?.record && /^\d{4}-\d{2}-\d{2}$/.test(draft.record.date || '') ? draft : null;
  }
  function draftHasContent(record) {
    const base = defaultRecord(record?.date, record?.shift);
    function differs(value, expected) {
      if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, child]) => differs(child, expected?.[key]));
      }
      return value != null && String(value).trim() !== '' && value !== expected;
    }
    return Object.entries(record || {}).some(([key, value]) =>
      !['date', 'shift', 'updatedAt'].includes(key) && differs(value, base[key]));
  }
  function draftForOpening(draft, defaults) {
    // Empty drafts select the current shift; entered data and pending saves stay intact.
    if (!draft || draft.mutationId || draftHasContent(draft.record)
      || recordKey(draft.record.date, draft.record.shift) === recordKey(defaults.date, defaults.shift)) return draft;
    return { record: defaultRecord(defaults.date, defaults.shift), revision: null, mutationId: '' };
  }
  function persistDraft(rootEl) {
    const key = draftKey();
    if (!key || rootEl?.isConnected === false || !ownerAllowed() || draftOwners.get(rootEl) !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ record: readDom(rootEl), revision: renderedRevisions.get(rootEl) ?? null, mutationId: rootEl.dataset?.cloudMutation || '' }));
    } catch (_) { status(rootEl, 'Rozepsaný přehled se nepodařilo uložit v zařízení.'); }
  }
  const cloudJobs = new Map();
  const CLOUD_PREFIX = 'rak_shift_overview_account_v1:';
  let cloudView = null;
  function bridge() { return root.RotationSupabaseBridge; }
  function jsonRead(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; }
  }
  function currentIdentity() {
    if (!ownerAllowed()) return null;
    const signed = bridge()?.getShiftOverviewIdentity?.();
    if (signed) return signed;
    const accountId = String(root.rakAdminGetActiveAccountId?.() || '');
    const userId = accountId && jsonRead(CLOUD_PREFIX + 'identities', {})[accountId];
    return userId ? { accountId, userId } : null;
  }
  function sameIdentity(identity) {
    const current = currentIdentity();
    return !!current && current.userId === identity.userId && current.accountId === identity.accountId;
  }
  function cloudRead(identity) {
    const value = jsonRead(CLOUD_PREFIX + identity.userId, {});
    return { records: value.records || {}, revisions: value.revisions || {}, pending: value.pending || {},
      conflicts: value.conflicts || {}, recovery: value.recovery || [] };
  }
  function cloudWrite(identity, value) { localStorage.setItem(CLOUD_PREFIX + identity.userId, JSON.stringify(value)); }
  function mutationId() { return root.crypto.randomUUID(); }
  function comparable(payload) {
    function sorted(value) {
      if (Array.isArray(value)) return value.map(sorted);
      if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k => k !== 'updatedAt').map(k => [k, sorted(value[k])]));
      return value;
    }
    return JSON.stringify(sorted(payload));
  }
  function migrateLocal(identity) {
    const identities = jsonRead(CLOUD_PREFIX + 'identities', {});
    identities[identity.accountId] = identity.userId;
    localStorage.setItem(CLOUD_PREFIX + 'identities', JSON.stringify(identities));
    if (identity.accountId !== '9811' || localStorage.getItem(CLOUD_PREFIX + 'legacy-owner')) return;
    const state = cloudRead(identity);
    const legacy = jsonRead(STORAGE_KEY, {});
    Object.values(legacy).forEach(record => {
      if (!record || !/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) return;
      const payload = normalizeRecord(record, record.date, normalizeShift(record.shift));
      const key = recordKey(payload.date, payload.shift);
      if (!state.records[key]) {
        state.records[key] = payload;
        state.pending[key] = [{ id: mutationId(), revision: null, payload }];
      }
    });
    cloudWrite(identity, state);
    // Original local data remains untouched as a recovery copy. Claim it once.
    localStorage.setItem(CLOUD_PREFIX + 'legacy-owner', identity.userId);
  }
  function localCloudSave(record, editorRevision) {
    const identity = currentIdentity();
    if (!identity) throw new Error('Pro zálohování se přihlas ke svému účtu online.');
    const state = cloudRead(identity), key = recordKey(record.date, record.shift);
    state.records[key] = clone(record);
    const queue = state.pending[key] || (state.pending[key] = []);
    // Keep the in-flight mutation, including across reloads, for idempotent retry.
    const id = mutationId();
    queue.push({ id, revision: queue.length ? null : (arguments.length > 1 ? editorRevision : (state.revisions[key] ?? null)), payload: clone(record) });
    cloudWrite(identity, state);
    return { ...identity, mutationId: id };
  }
  function acknowledgeEditor(identity, head, revision) {
    const view = cloudView;
    if (view && sameIdentity(identity) && view.root.dataset.cloudMutation === head.id) {
      renderedRevisions.set(view.root, revision);
      renderedRecords.set(view.root, clone(head.payload));
      persistDraft(view.root);
    }
  }
  function showCloudState(identity, message) {
    const view = cloudView;
    if (!view || !sameIdentity(identity) || !view.root.isConnected) return;
    const state = cloudRead(identity);
    const date = view.root.querySelector('[data-shift-overview-date]')?.value;
    const shift = view.root.querySelector('[data-shift-overview-shift]')?.value;
    const key = recordKey(date, shift);
    const conflict = state.conflicts[key];
    const draft = readDraft();
    const unsubmitted = draft && draftOwners.get(view.root) === draftKey()
      && recordKey(draft.record.date, draft.record.shift) === key
      && (!state.records[key] || comparable(draft.record) !== comparable(normalizeRecord(state.records[key], date, shift)));
    status(view.root, conflict ? 'Online je jiná verze. Místní přehled zůstává uložený.'
      : unsubmitted ? 'Rozepsaný přehled uložen v zařízení · pro online zálohu stiskni Uložit.' : message);
    const panel = view.root.querySelector('[data-shift-overview-cloud-conflict]');
    if (panel) panel.hidden = !conflict;
  }
  async function syncCloud() {
    if (!ownerAllowed() || !bridge()?.ensureShiftOverviewIdentity || root.navigator?.onLine === false) return false;
    let identity;
    try { identity = await bridge().ensureShiftOverviewIdentity(); } catch (_) { return false; }
    if (!identity || !sameIdentity(identity)) return false;
    if (cloudJobs.has(identity.userId)) return cloudJobs.get(identity.userId);
    const job = (async () => {
      migrateLocal(identity);
      const listed = await bridge().listShiftOverviews(identity);
      if (!listed.ok || !sameIdentity(identity)) return false;
      const state = cloudRead(identity);
      const remote = new Map((Array.isArray(listed.data) ? listed.data : []).map(row => [recordKey(row.shift_date, row.shift_code), row]));
      for (const [key, row] of remote) {
        if (!state.pending[key]?.length) {
          state.records[key] = row.payload;
          state.revisions[key] = row.revision;
          delete state.conflicts[key];
        }
      }
      for (const [key, queue] of Object.entries(state.pending)) {
        const row = remote.get(key), head = queue[0];
        if (!head) continue;
        if (row && (row.mutation_id === head.id || (head.revision === null && comparable(row.payload) === comparable(head.payload)))) {
          acknowledgeEditor(identity, head, row.revision);
          queue.shift(); state.revisions[key] = row.revision;
          if (queue.length) queue[0].revision = row.revision;
          else delete state.pending[key];
          delete state.conflicts[key];
        } else if (head.revision === null) {
          if (row) state.conflicts[key] = row;
          else head.revision = 0;
        } else if (row && row.revision !== head.revision) state.conflicts[key] = row;
      }
      cloudWrite(identity, state);
      let allSaved = true;
      for (const key of Object.keys(state.pending)) {
        while (sameIdentity(identity)) {
          const current = cloudRead(identity), head = current.pending[key]?.[0];
          if (!head) break;
          if (current.conflicts[key]) { allSaved = false; break; }
          const result = await bridge().saveShiftOverview(identity, head);
          if (!sameIdentity(identity)) return false;
          if (!result.ok) return false;
          const next = cloudRead(identity);
          if (next.pending[key]?.[0]?.id !== head.id) return false;
          if (!result.data?.ok) {
            if (result.data?.conflict) next.conflicts[key] = result.data.row || { revision: 0 };
            cloudWrite(identity, next); allSaved = false; break;
          }
          next.pending[key].shift();
          acknowledgeEditor(identity, head, result.data.row.revision);
          next.revisions[key] = result.data.row.revision;
          if (next.pending[key].length) next.pending[key][0].revision = result.data.row.revision;
          else delete next.pending[key];
          delete next.conflicts[key];
          cloudWrite(identity, next);
        }
      }
      return allSaved;
    })();
    cloudJobs.set(identity.userId, job);
    try {
      const ok = await job;
      showCloudState(identity, ok ? 'Zálohováno online k přihlášenému účtu ✓' : 'Uloženo v zařízení · čeká na online zálohu.');
      return ok;
    } catch (_) {
      showCloudState(identity, 'Uloženo v zařízení · online záloha se nyní nepodařila.');
      return false;
    } finally { cloudJobs.delete(identity.userId); }
  }
  function cloudResolution(useRemote, date, shift) {
    const identity = currentIdentity();
    if (!identity) return null;
    const state = cloudRead(identity), key = recordKey(date, shift), remote = state.conflicts[key];
    if (!remote) return null;
    state.recovery.push({ key, record: state.records[key], pending: state.pending[key], at: new Date().toISOString() });
    state.recovery = state.recovery.slice(-20);
    if (useRemote) {
      if (!remote.payload) return null;
      state.records[key] = remote.payload; state.revisions[key] = remote.revision; delete state.pending[key];
    } else state.pending[key] = [{ id: mutationId(), revision: remote.revision, payload: clone(state.records[key]) }];
    delete state.conflicts[key]; cloudWrite(identity, state);
    return state.records[key];
  }
  root.addEventListener?.('online', () => { void syncCloud(); });
  root.addEventListener?.('focus', () => { void syncCloud(); });
  document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible') void syncCloud(); });
  const AAR_COLUMNS = [
    { key: 'agAe', label: 'AG / AE', cls: 'isGreen' },
    { key: 'afAd', label: 'AF / AD', cls: 'isBlue' },
    { key: 'ahAh', label: 'AH', cls: 'isOrange' }
  ];
  const AAR_ROWS = [
    { key: 'op1121', label: 'op 11+21' },
    { key: 'op212Stock', label: 'op 212 – do skladu' },
    { key: 'turning', label: 'Soustružení' },
    { key: 'washing', label: 'Koncové praní' },
    { key: 'toStock', label: 'Do skladu' },
    { key: 'stock', label: 'Stav skladu' }
  ];
  const PRE_KILN_ROWS = ['Awa','Awi','TW1','TW2','TW3','SR1','SR2','SR3','SR4','SR5','SR6','SR7','FR3','FR5','FR7','ZSB-RLR','SRRG','AAR'];
  const OAM_ROWS = [
    { key: 'ag', left: '0AM 409 155 AG', right: '0AM 409 111 AE', cls: 'isGreen' },
    { key: 'af', left: '0AM 409 155 AF', right: '0AM 409 111 AD', cls: 'isBlue' },
    { key: 'ah', left: '0AM 409 155 AH', right: '0AM 409 111 AH', cls: 'isOrange' }
  ];
  const OAM_LEFT_COLUMNS = [
    { key: 'op1020', label: '10+20', sub: 'Volné' },
    { key: 'op1121', label: '11+21', sub: 'Lis' },
    { key: 'op30', label: '30', sub: 'Volné' },
    { key: 'op31', label: '31', sub: 'Lis' },
    { key: 'op120', label: '120', sub: 'Volné' },
    { key: 'op121', label: '121', sub: 'Lis' },
    { key: 'op145', label: 'Před 145', sub: '' },
    { key: 'after145', label: '145', sub: '' }
  ];
  const OAM_RIGHT_COLUMNS = [
    { key: 'hard', label: '212' },
    { key: 'stock', label: 'Sklad' },
    { key: 'planStock', label: 'Plán sklad' },
    { key: 'assembly', label: 'Montáž' }
  ];
  const PROCESS_COLUMNS = [
    { key: 'soft', label: 'MO' },
    { key: 'beforeKiln', label: 'Před kalírnou' },
    { key: 'kilnDone', label: 'Sklad-vykaleno' },
    { key: 'before145', label: 'Před 145' },
    { key: 'before150', label: 'Před op. 150' },
    { key: 'emergency', label: 'Nouzový sklad' },
    { key: 'washer', label: 'u pračky' },
    { key: 'stock', label: 'Sklad' },
    { key: 'assembly', label: 'Montáž' }
  ];
  const LEGACY_PROCESS_COLUMNS = [
    { key: 'kiln', label: 'Kalírna' },
    { key: 'kilnStock', label: 'Sklad kalírna' },
    { key: 'riveting', label: 'Nýtování' },
    { key: 'after150', label: 'Po op. 150' },
    { key: 'before162', label: 'Před op. 162' }
  ];
  const INPUT_ROWS = ['AAR','SRRG','ZSB-RLR','FR7','FR5','FR3','SR7','SR6','SR5','SR4','SR3','SR2','SR1','TW3','TW2','TW1','Awi','Awa'];

  function ownerAllowed() {
    try {
      return typeof root.rakAdminCanOpenShiftOverview === 'function'
        ? root.rakAdminCanOpenShiftOverview()
        : typeof root.rakAdminCanManageAdmins === 'function' && root.rakAdminCanManageAdmins();
    } catch (_) { return false; }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function localDateString(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function displayDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? Number(match[3]) + '. ' + Number(match[2]) + '. ' + match[1] : String(value || '');
  }

  function syncDateDisplay(rootEl) {
    const input = rootEl.querySelector('[data-shift-overview-date]');
    const display = rootEl.querySelector('[data-shift-overview-date-display]');
    if (input && display) display.textContent = displayDate(input.value);
  }

  function currentShiftContext(now) {
    const time = now || new Date();
    try {
      const active = typeof root.getActiveShiftNow === 'function' ? root.getActiveShiftNow(time) : null;
      if (active && ['A','B','C','D'].includes(active.team) && active.start instanceof Date && active.end instanceof Date) {
        const hours = (active.end - active.start) / 3600000;
        const night = active.start.getHours() >= 18 || active.start.getHours() < 6;
        return { date: localDateString(active.start), shift: active.team + ':' + (night ? 'nocni' : 'ranni') + (hours <= 8 ? '8' : '12') };
      }
    } catch (_) {}
    return { date: localDateString(time), shift: '' };
  }

  function normalizeShift(value) {
    const shift = String(value || '');
    return /^(ranni|nocni)(8|12)$/.test(shift) ? 'D:' + shift : shift;
  }

  function defaultRecord(date, shift) {
    const matrix = {};
    AAR_ROWS.forEach((row) => {
      matrix[row.key] = {};
      AAR_COLUMNS.forEach((col) => { matrix[row.key][col.key] = ''; });
    });
    const preKiln = {};
    PRE_KILN_ROWS.forEach((name) => { preKiln[name] = ''; });
    const oamRows = {};
    OAM_ROWS.forEach((row) => {
      oamRows[row.key] = {};
      OAM_LEFT_COLUMNS.forEach((col) => { oamRows[row.key][col.key] = ''; });
      OAM_RIGHT_COLUMNS.forEach((col) => { oamRows[row.key][col.key] = ''; });
    });
    return {
      date: date || localDateString(),
      shift: normalizeShift(shift),
      preKiln,
      lastBatch: { ald1: '', ald2: '', ald3: '' },
      ald: [1, 2, 3].map((id) => ({ id, inserts: '', faults: '', rejects: '', running: '', longFaults: '' })),
      aar: {
        plan: 'Po–So 1150/1150 · Ne 704/800',
        matrix,
        freeTurning: '', freeTurningKs: '',
        freeGround: '', freeGroundKs: '',
        freeHardened: '', freeHardenedKs: '',
        faults: ''
      },
      oam: { rows: oamRows },
      process: { rows: {} },
      inputs: { ald1: '', ald2: '', ald3: '', partsAssignment: 2, rows: {} },
      calculations: {},
      nitrogen: '',
      machiningFaults: '',
      notes: '',
      updatedAt: ''
    };
  }

  function readStore() {
    if (bridge()) {
      const identity = currentIdentity();
      if (!identity) return {};
      const records = cloudRead(identity).records;
      // Show existing local records immediately while their first upload runs.
      // Only a verified signed identity may claim the previously unscoped copy.
      const signed = bridge().getShiftOverviewIdentity?.();
      if (identity.accountId === '9811' && signed?.userId === identity.userId && !localStorage.getItem(CLOUD_PREFIX + 'legacy-owner')) {
        return { ...jsonRead(STORAGE_KEY, {}), ...records };
      }
      return records;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeStore(store) {
    if (bridge()) {
      const identity = currentIdentity();
      if (!identity) throw new Error('Přihlášení k účtu je nutné.');
      const state = cloudRead(identity); state.records = store; cloudWrite(identity, state); return;
    }
    const rows = Object.entries(store || {}).sort((a, b) => {
      const aa = String(a[1] && a[1].updatedAt || '');
      const bb = String(b[1] && b[1].updatedAt || '');
      return bb.localeCompare(aa);
    }).slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(rows)));
  }

  function recordKey(date, shift) { return String(date || '') + '|' + String(shift || ''); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function normalizeRecord(record, date, shift) {
    const base = defaultRecord(date, shift);
    const src = record && typeof record === 'object' ? record : {};
    base.date = String(src.date || date || base.date);
    base.shift = normalizeShift(src.shift || shift || base.shift);
    base.calculations = Object.fromEntries(Object.entries(src.calculations && typeof src.calculations === 'object' ? src.calculations : {}).map(([path,history]) => [path, validQuantityHistory(history)]).filter(([,history]) => history));
    base.notes = String(src.notes || '');
    base.nitrogen = String(src.nitrogen ?? '');
    base.machiningFaults = String(src.machiningFaults || '');
    base.updatedAt = String(src.updatedAt || '');
    base.preKiln = Object.assign({}, base.preKiln, src.preKiln || {});
    PRE_KILN_ROWS.forEach((name) => {
      if (base.preKiln[name] == null) base.preKiln[name] = '';
    });
    base.lastBatch = Object.assign({}, base.lastBatch, src.lastBatch || {});
    base.ald = base.ald.map((row, index) => Object.assign(row, src.ald && src.ald[index] ? src.ald[index] : {}));
    base.aar = Object.assign(base.aar, src.aar || {});
    base.aar.matrix = base.aar.matrix || {};
    AAR_ROWS.forEach((row) => {
      base.aar.matrix[row.key] = Object.assign({}, base.aar.matrix[row.key] || {});
      AAR_COLUMNS.forEach((col) => {
        if (base.aar.matrix[row.key][col.key] == null) base.aar.matrix[row.key][col.key] = '';
      });
    });
    base.oam = Object.assign({}, base.oam, src.oam || {});
    base.process = Object.assign({}, base.process, src.process || {});
    base.process.rows = Object.assign({}, base.process.rows || {});
    OAM_ROWS.forEach((row) => {
      base.process.rows[row.key] = Object.assign({}, base.process.rows[row.key] || {});
      PROCESS_COLUMNS.concat(LEGACY_PROCESS_COLUMNS).forEach((col) => {
        if (base.process.rows[row.key][col.key] == null) base.process.rows[row.key][col.key] = '';
      });
    });
    base.inputs = Object.assign({}, base.inputs, src.inputs || {});
    base.inputs.rows = Object.assign({}, base.inputs.rows || {});
    INPUT_ROWS.forEach((name) => {
      base.inputs.rows[name] = Object.assign({ ald1: '', ald2: '' }, base.inputs.rows[name] || {});
    });
    // Carry each part's saved quantities and calculator history to its corrected ALD.
    // The payload marker makes repeat loads/saves idempotent; original stores remain intact.
    if (src.inputs && src.inputs.partsAssignment !== 2) {
      INPUT_ROWS.forEach(name => {
        const row = base.inputs.rows[name];
        [row.ald1, row.ald2] = [row.ald2, row.ald1];
        const first = 'inputs.rows.' + name + '.ald1';
        const second = 'inputs.rows.' + name + '.ald2';
        const left = base.calculations[first], right = base.calculations[second];
        delete base.calculations[first]; delete base.calculations[second];
        if (right) base.calculations[first] = right;
        if (left) base.calculations[second] = left;
      });
    }
    base.inputs.partsAssignment = 2;
    base.oam.rows = Object.assign({}, base.oam.rows || {});
    OAM_ROWS.forEach((row) => {
      base.oam.rows[row.key] = Object.assign({}, base.oam.rows[row.key] || {});
      OAM_LEFT_COLUMNS.concat(OAM_RIGHT_COLUMNS).forEach((col) => {
        if (base.oam.rows[row.key][col.key] == null) base.oam.rows[row.key][col.key] = '';
      });
    });
    return base;
  }

  function getSaved(date, shift) {
    const store = readStore();
    const found = store[recordKey(date, shift)] || (String(shift).startsWith('D:') ? store[recordKey(date, String(shift).slice(2))] : null);
    return found ? normalizeRecord(found, date, shift) : null;
  }

  function numberOrZero(value) {
    const normalized = String(value == null ? '' : value).trim().replace(',', '.');
    if (!normalized) return 0;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function nestedGet(source, path) {
    return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], source);
  }

  function nestedSet(target, path, value) {
    const parts = String(path || '').split('.');
    let cursor = target;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = value;
      else {
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part];
      }
    });
  }

  function field(path, record, options) {
    const opts = options || {};
    const value = nestedGet(record, path);
    const history = validQuantityHistory(record.calculations?.[path]);
    const historyAttrs = history ? ' data-quantity-expression="' + esc(history.expression) + '" data-quantity-result="' + esc(history.result) + '" data-quantity-factor="' + history.factor + '"' : '';
    if (opts.area) {
      return '<textarea class="rakShiftOverviewArea" data-shift-overview-field="' + esc(path) + '" aria-label="' + esc(opts.label || path) + '" rows="' + String(opts.rows || 3) + '" placeholder="' + esc(opts.placeholder || '') + '">' + esc(value) + '</textarea>';
    }
    return '<input class="appMenuInlineInput rakShiftOverviewInput" data-shift-overview-field="' + esc(path) + '" aria-label="' + esc(opts.label || path) + '" type="text" inputmode="' + esc(opts.inputmode || 'text') + '"' + (['numeric','decimal'].includes(opts.inputmode) ? ' data-shift-overview-calculate' : '') + historyAttrs + ' value="' + esc(value) + '" placeholder="' + esc(opts.placeholder || '') + '">';
  }

  function shiftOptions(selected) {
    const types = [
      ['ranni12', 'Ranní 12 h · 6–18'], ['nocni12', 'Noční 12 h · 18–6'],
      ['ranni8', 'Ranní 8 h · 6–14'], ['nocni8', 'Noční 8 h · 22–6']
    ];
    return '<option value="">Vyber směnu</option>' + ['A','B','C','D'].map(team => types.map(([key,label]) => {
      const value = team + ':' + key;
      return '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + team + ' · ' + label + '</option>';
    }).join('')).join('');
  }


  function evaluateQuantityExpression(value) {
    const text = String(value == null ? '' : value).replace(/\s/g, '').replace(/−/g, '-');
    if (!/^[+-]?\d+(?:[.,]\d+)?(?:[+-]\d+(?:[.,]\d+)?)+$/.test(text)) return null;
    const tokens = text.match(/[+-]?\d+(?:[.,]\d+)?/g);
    const precision = Math.max(...tokens.map(token => (token.split(/[.,]/)[1] || '').length));
    if (precision > 6) return null;
    const scale = 10 ** precision;
    let total = 0;
    for (const token of tokens) {
      const number = Math.round(Number(token.replace(',', '.')) * scale);
      if (!Number.isSafeInteger(number) || !Number.isSafeInteger(total + number)) return null;
      total += number;
    }
    return String(total / scale);
  }

  function calculateQuantity(input) {
    if (!input || input.readOnly || !input.hasAttribute('data-shift-overview-calculate')) return;
    const expression = input.value;
    const result = evaluateQuantityExpression(expression);
    if (result !== null) {
      input.value = result;
      rememberQuantityHistory(input, expression, result);
    }
  }

  function validQuantityHistory(value) {
    if (!value || typeof value !== 'object') return null;
    const expression = String(value.expression ?? '');
    const result = String(value.result ?? '');
    const factor = Number(value.factor || 0);
    const expected = factor === 32 || factor === 64
      ? (canMultiply(expression) ? String(Number(expression.trim()) * factor) : null)
      : factor === 0 ? evaluateQuantityExpression(expression) : null;
    return expected !== null && expected === result ? { expression, result, factor } : null;
  }

  function inputQuantityHistory(input) {
    if (!input?.getAttribute) return null;
    return validQuantityHistory({ expression: input.getAttribute('data-quantity-expression'), result: input.getAttribute('data-quantity-result'), factor: input.getAttribute('data-quantity-factor') });
  }

  function quantityHistoryText(history) {
    const expression = history.factor ? history.expression.trim() + ' × ' + history.factor : history.expression.trim();
    return expression + ' = ' + history.result;
  }

  function rememberQuantityHistory(input, expression, result, factor) {
    if (!input.setAttribute) return;
    const history = validQuantityHistory({expression, result, factor});
    if (!history) return;
    input.setAttribute('data-quantity-expression', history.expression);
    input.setAttribute('data-quantity-result', history.result);
    input.setAttribute('data-quantity-factor', String(history.factor));
    const rootEl = input.closest('#rakShiftOverviewRoot');
    if (!rootEl) return;
    clearQuantityUndo(rootEl);
    const display = input.closest('.rakShiftOverviewIndexRow')?.querySelector('[data-quantity-history]') || input.closest('label')?.querySelector('[data-quantity-history]');
    if (display) {
      quantityUndo.set(rootEl, { input, history, display });
      display.hidden = false;
      display.querySelector('[data-quantity-history-text]').textContent = quantityHistoryText(history);
    }
  }

  function clearQuantityUndo(rootEl) {
    rootEl.querySelectorAll('[data-quantity-history]').forEach(display => { display.hidden = true; });
    quantityUndo.delete(rootEl);
  }

  function quantityUndoControl(label) {
    return '<div class="rakShiftOverviewHistory" data-quantity-history hidden><span data-quantity-history-text></span><button type="button" data-quantity-restore aria-label="Vrátit poslední zadání · ' + esc(label) + '">Vrátit</button></div>';
  }

  function quantityMultiplier(key) {
    return { stock: 32, assembly: 32, op1121: 32, hard: 32, after145: 32, op31: 64, op121: 64, op145: 64 }[key] || 0;
  }

  function canMultiply(value) {
    const text = String(value == null ? '' : value).trim();
    return /^\d{1,2}$/.test(text) && Number(text) >= 1 && Number(text) <= 99;
  }

  function refreshMultipliers(rootEl) {
    rootEl.querySelectorAll('[data-shift-overview-multiply]').forEach(button => {
      const input = button.parentElement.querySelector('[data-shift-overview-field]');
      button.hidden = !input || !canMultiply(input.value);
    });
  }

  function labeledField(label, path, record, options) {
    const opts = Object.assign({ label }, options);
    let control = field(path, record, opts);
    if (opts.multiplier) {
      control = '<div class="rakShiftOverviewQuantity">' + control +
        '<button type="button" class="appMenuAction rakShiftOverviewMultiply" data-shift-overview-multiply="' + esc(path) + '" aria-label="Vynásobit ' + esc(opts.label) + ' číslem ' + opts.multiplier + '"' + (canMultiply(nestedGet(record,path)) ? '' : ' hidden') + '>×' + opts.multiplier + '</button></div>';
    }
    const historyControl = ['numeric','decimal'].includes(opts.inputmode) && !opts.indexRow ? quantityUndoControl(opts.label) : '';
    return '<label' + (opts.sideLabel ? ' class="rakShiftOverviewSideLabel"' : '') + '>' + (label ? '<span>' + esc(label) + '</span>' : '') + control + historyControl + '</label>';
  }

  function panel(title, html, cls) {
    return '<section class="rakShiftOverviewPanel ' + (cls || '') + '"><h3>' + esc(title) + '</h3>' + html + '</section>';
  }

  const ALD1_INPUT_ROWS = ['Awa','Awi','TW1','TW2','TW3'];
  const ALD2_INPUT_ROWS = ['SR1','SR2','SR3','SR4','SR5','SR6','SR7','FR3','FR5','FR7','ZSB-RLR','SRRG','AAR'];

  function batchCounter(name, id, record) {
    const path = 'inputs.rows.' + name + '.ald' + id;
    const label = name.replace('-', ' ');
    const value = nestedGet(record, path);
    return '<div class="rakShiftOverviewCounter"><span>' + esc(label) + '</span>' +
      '<button type="button" class="appMenuAction rakShiftOverviewCountMinus" data-shift-overview-count="' + esc(path) + '" data-count-step="-1" aria-label="Odebrat vsázku ' + esc(label) + ' ALD' + id + '">−</button>' +
      '<output class="rakShiftOverviewInput rakShiftOverviewCountValue" data-shift-overview-field="' + esc(path) + '" aria-label="Počet vsázek ' + esc(label) + ' ALD' + id + '">' + esc(value === '' ? '0' : value) + '</output>' +
      '<button type="button" class="appMenuAction rakShiftOverviewCountPlus" data-shift-overview-count="' + esc(path) + '" data-count-step="1" aria-label="Přidat vsázku ' + esc(label) + ' ALD' + id + '">+</button></div>';
  }

  function inputsTable(record) {
    return '<div class="rakShiftOverviewBatchColumns">' + [[1,ALD1_INPUT_ROWS],[2,ALD2_INPUT_ROWS]].map(([id,rows]) => panel('ALD' + id,
      labeledField('Poslední vsázka', 'lastBatch.ald' + id, record, { sideLabel: true, inputmode: 'numeric', label: 'ALD' + id + ' · Poslední vsázka' }) +
      '<div class="rakShiftOverviewInputRows">' + rows.map(name => batchCounter(name,id,record)).join('') + '</div><div class="rakShiftOverviewAldTotal"><span>Celkem vsázek</span><output data-shift-overview-ald-total="' + id + '" aria-live="polite">0</output></div>')).join('') +
      '<div class="rakShiftOverviewUtilities">' + panel('ALD3',labeledField('Poslední vsázka','lastBatch.ald3',record,{sideLabel:true,inputmode:'numeric',label:'ALD3 · Poslední vsázka'}) + labeledField('Celkem vsázek','inputs.ald3',record,{sideLabel:true,inputmode:'numeric',label:'ALD3 · Celkem vsázek'})) +
      panel('Dusík',labeledField('','nitrogen',record,{inputmode:'decimal',label:'Dusík'})) + '</div></div>';
  }

  function oamTable(record) {
    const groups = [
      ['Měkké obrábění', OAM_LEFT_COLUMNS.slice(0,2)],
      ['Sklad před kalením', OAM_LEFT_COLUMNS.slice(2,4)],
      ['Sklad po kalení', OAM_LEFT_COLUMNS.slice(4,6)],
      ['Po 145', [OAM_LEFT_COLUMNS[7]]],
      ['Po broušení (op 212)', [{key:'hard',label:'212'}]],
      ['Sklad', [{key:'stock',label:'Sklad'}]],
      ['Montáž', [{key:'assembly',label:'Montáž'}]]
    ];

    function stationRows(cols, title) {
      return '<div class="rakShiftOverviewStationRows">' + OAM_ROWS.map((row,index) => '<div class="rakShiftOverviewIndexRow ' + row.cls + '"><div class="rakShiftOverviewIndexIdentity"><h4>' + esc(AAR_COLUMNS[index].label) + '</h4>' + quantityUndoControl(AAR_COLUMNS[index].label + ' · ' + title) + '</div><div class="rakShiftOverviewFieldGrid">' + cols.map(col => labeledField(cols.length === 1 ? '' : col.label + (col.sub ? ' · ' + col.sub : ''), 'oam.rows.' + row.key + '.' + col.key,record,{indexRow:true,inputmode:'numeric',multiplier:quantityMultiplier(col.key),label:AAR_COLUMNS[index].label + ' · ' + title + ' · ' + col.label + (col.sub ? ' · ' + col.sub : '')})).join('') + '</div></div>').join('') + '</div>';
    }
    return '<div class="rakShiftOverviewFlow">' + groups.map(([title,cols]) => panel(title,
      stationRows(cols,title) + (title === 'Sklad po kalení' ? '<section class="rakShiftOverviewBefore145" aria-label="Před 145"><h4 class="rakShiftOverviewSubsectionTitle">Před 145</h4>' + stationRows([OAM_LEFT_COLUMNS[6]],title) + '</section>' : '')
    )).join('') + '</div>';
  }

  function shiftStation(record, title, columns) {
    return panel(title, '<div class="rakShiftOverviewStationRows">' + OAM_ROWS.map((row,index) =>
      '<div class="rakShiftOverviewIndexRow ' + row.cls + '"><div class="rakShiftOverviewIndexIdentity"><h4>' +
      esc(AAR_COLUMNS[index].label) + '</h4>' + quantityUndoControl(AAR_COLUMNS[index].label + ' · ' + title) +
      '</div><div class="rakShiftOverviewFieldGrid">' + columns.map(col => {
        const control = (item, label) => labeledField(label, 'oam.rows.' + row.key + '.' + item.key, record,
          { indexRow:true, inputmode:'numeric', multiplier:quantityMultiplier(item.key), label:AAR_COLUMNS[index].label + ' · ' + title + ' · ' + col.label + (item.label ? ' · ' + item.label : '') });
        if (col.fields) return '<div class="rakShiftOverviewFieldGroup" role="group" aria-label="' + esc(AAR_COLUMNS[index].label + ' · ' + col.label) + '"><h5>' + esc(col.label) + '</h5>' + col.fields.map(item=>control(item,item.label || ' ')).join('') + '</div>';
        return control(col, columns.length === 1 ? '' : col.label + (col.sub ? ' · ' + col.sub : ''));
      }).join('') + '</div></div>').join('') + '</div>');
  }

  function inactiveUnits(record, id) {
    const count = id === 3 ? 5 : 10;
    const values = record.ald[id-1]?.inactiveUnits;
    return Array.isArray(values) ? [...new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= count))] : [];
  }

  function runningUnits(record, id) {
    const label = id === 3 ? 'ST' : 'BK';
    const off = inactiveUnits(record,id);
    return '<div class="rakShiftOverviewUnits"><span>' + label + ' v provozu</span><div class="rakShiftOverviewUnitGrid" data-running-units="' + id + '" role="group" aria-label="ALD' + id + ' · ' + label + ' v provozu">' +
      Array.from({length:id === 3 ? 5 : 10},(_,index)=>{
        const number=index+1, active=!off.includes(number);
        return '<button type="button" class="rakShiftOverviewUnit' + (active ? ' isActive' : '') + '" data-running-unit="' + number + '" data-running-ald="' + id + '" aria-pressed="' + active + '" aria-label="ALD' + id + ' · ' + label + ' ' + number + '">' + number + '</button>';
      }).join('') + '</div></div>';
  }

  function shiftAld(record, id) {
    const rows = id === 1 ? ALD1_INPUT_ROWS : ALD2_INPUT_ROWS;
    return panel('ALD' + id,
      labeledField('Poslední vsázka','lastBatch.ald'+id,record,{sideLabel:true,inputmode:'numeric'}) +
      runningUnits(record,id) +
      labeledField('Závady', 'ald.' + (id-1) + '.faults', record, {area:true,rows:3}) +
      '<h4 class="rakShiftOverviewSubsectionTitle">Vsázky</h4><div class="rakShiftOverviewInputRows">' +
      rows.map(name=>batchCounter(name,id,record)).join('') + '</div><div class="rakShiftOverviewAldTotal"><span>Celkem vsázek</span><output data-shift-overview-ald-total="' + id + '" aria-live="polite">0</output></div>');
  }

  function shiftLayout(record) {
    const shift = normalizeShift(record.shift);
    // An unselected shift keeps the complete editor until the user chooses.
    if (!shift) return oamTable(record) + '<div class="rakShiftOverviewLower">' + inputsTable(record) +
      panel('Závady', labeledField('Obrábění','machiningFaults',record,{area:true,rows:3}) +
      [0,1,2].map(index=>labeledField('ALD'+(index+1),'ald.'+index+'.faults',record,{area:true,rows:3})).join('')) + '</div>';
    const night = shift.includes(':nocni');
    const section = (key, html) => '<div data-shift-overview-section="' + key + '">' + html + '</div>';
    let html = section('stock',shiftStation(record,'Sklad',[{key:'stock',label:'Sklad'}]));
    if (night) html += section('assembly',shiftStation(record,'Montáž',[{key:'assembly',label:'Montáž'}]));
    html += section('ald3',panel('ALD3',
      labeledField('Poslední vsázka','lastBatch.ald3',record,{sideLabel:true,inputmode:'numeric'}) +
      labeledField('Celkem vsázek před','inputs.ald3',record,{sideLabel:true,inputmode:'numeric'}) +
      runningUnits(record,3) +
      labeledField('Závady','ald.2.faults',record,{area:true,rows:3})));
    if (!night) html += section('nitrogen',panel('Dusík',labeledField('','nitrogen',record,{inputmode:'decimal',label:'Dusík'})));
    if (night) {
      html += section('before-kiln',shiftStation(record,'Sklad před kalením',OAM_LEFT_COLUMNS.slice(2,4)));
      html += section('after-kiln',shiftStation(record,'Sklad po kalení',OAM_LEFT_COLUMNS.slice(4,6)));
      html += section('ground',shiftStation(record,'Po broušení (op 212)',[{key:'hard',label:'212'}]));
      html += section('after-145',shiftStation(record,'Po 145',[OAM_LEFT_COLUMNS[7]]));
      html += section('before-145',shiftStation(record,'Před 145',[OAM_LEFT_COLUMNS[6]]));
      html += section('soft',shiftStation(record,'Měkké obrábění',OAM_LEFT_COLUMNS.slice(0,2)));
    }
    html += section('machining',panel('Obrábění',
      '<h4 class="rakShiftOverviewSubsectionTitle">Závěr</h4>' + shiftStation(record,'Závěr',[
        {label:'MO',fields:[{key:'producedMOFree',label:'Volné'},{key:'producedMOPress',label:'Pod lisem'}]},
        {label:'TO',fields:[{key:'producedTO',label:''}]}]) +
      '<h4 class="rakShiftOverviewSubsectionTitle">Brusy · TBKR01</h4>' + shiftStation(record,'TBKR01',[
        {key:'groundTBKR01Free',label:'Volné'},{key:'groundTBKR01Press',label:'Lis'}]) +
      '<h4 class="rakShiftOverviewSubsectionTitle">Brusy · TBKR07</h4>' + shiftStation(record,'TBKR07',[
        {key:'groundTBKR07Free',label:'Volné'},{key:'groundTBKR07Press',label:'Lis'}]) +
      labeledField('Závady','machiningFaults',record,{area:true,rows:3})));
    html += section('ald2',shiftAld(record,2)) + section('ald1',shiftAld(record,1));
    return html;
  }

  function updateShiftLayout(rootEl) {
    const layout = rootEl.querySelector('[data-shift-overview-layout]');
    if (!layout || !ownerAllowed()) return;
    // Snapshot visible edits into the full record before replacing fields.
    // readDom retains hidden stages and calculation history from that record.
    const record = readDom(rootEl);
    const previous = renderedRecords.get(rootEl);
    if (previous && recordKey(previous.date,previous.shift) !== recordKey(record.date,record.shift)) {
      const identity = currentIdentity();
      renderedRevisions.set(rootEl, identity ? (cloudRead(identity).revisions[recordKey(record.date,record.shift)] ?? null) : null);
      if (rootEl.dataset) rootEl.dataset.cloudMutation = '';
    }
    renderedRecords.set(rootEl, clone(record));
    clearQuantityUndo(rootEl);
    layout.innerHTML = shiftLayout(record);
    refreshMultipliers(rootEl);
    refreshTotals(rootEl);
    refreshSummary(rootEl);
    persistDraft(rootEl);
  }

  function summaryNumber(value) {
    const result = evaluateQuantityExpression(value);
    return numberOrZero(result === null ? value : result);
  }

  function summaryValue(value) {
    const text = String(value ?? '').trim();
    return evaluateQuantityExpression(text) ?? text;
  }

  // A vector image stays sharp when zoomed; only active, editable data is shown.
  function summarySvg(record) {
    const width = 900;
    const parts = [];
    const colors = ['#a8cf60','#8ac5ed','#f19a76'];
    function cell(x,y,w,h,text,fill,bold,size) {
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || '#fff') + '" stroke="#25313d" stroke-width="1.4"/>');
      const lines = String(text ?? '').split('\n');
      const font = Math.min(size || 18, (w-12) / Math.max(1, ...lines.map(line=>line.length)) / 0.62);
      lines.forEach((line,i) => parts.push('<text x="' + (x+w/2) + '" y="' + (y+h/2+(i-(lines.length-1)/2)*font*1.2) + '" text-anchor="middle" dominant-baseline="middle" font-size="' + font + '" font-weight="' + (bold ? 700 : 400) + '">' + esc(line) + '</text>'));
    }
    function heading(y,text) { parts.push('<text x="24" y="' + y + '" font-size="28" font-weight="700">' + esc(text) + '</text>'); }
    const team = String(record.shift).split(':');
    const shift = team[1] ? team[0] + ' · ' + (team[1].startsWith('nocni') ? 'Noční ' : 'Ranní ') + (team[1].endsWith('12') ? '12 h' : '8 h') : 'Směna nevybrána';
    heading(40, 'Přehled směny · ' + displayDate(record.date) + ' · ' + shift);
    const header='#e9edf1';
    const leftColumns=[['op1020','10+20\nVolné'],['op1121','11+21\nLis'],['op30','30\nVolné'],['op31','31\nLis'],['op120','120\nVolné'],['op121','121\nLis'],['op145','Před 145']];
    const rightColumns=[['after145','145'],['hard','212'],['stock',''],['assembly','VHLV']];
    const columns=leftColumns.concat(rightColumns),sums={};
    columns.forEach(([key])=>{sums[key]=OAM_ROWS.reduce((total,row)=>total+summaryNumber(record.oam.rows[row.key][key]),0);});
    // One continuous Excel-style table: both part numbers share each colored row.
    const positions=[24,192,290,388,486,584,682,780,878,1046,1144,1242,1340,1436];
    const tableScale=852/1412;
    parts.push('<g data-summary-production="whole" transform="translate('+(24-24*tableScale)+' '+(74-65*tableScale)+') scale('+tableScale+')">');
    cell(24,65,168,104,'0AM 409 155\nČíslo dílu / op',header,true,18);
    cell(878,65,168,104,'0AM 409 111\nČíslo dílu / op',header,true,18);
    [['Měkké\nobrábění',1,2],['Sklad před\nkalením',3,2],['Sklad po kalení',5,3],['Po 145',9,1],['Po broušení',10,1],['Sklad',11,1],['Montáž',12,1]].forEach(([label,col,count])=>cell(positions[col],65,positions[col+count]-positions[col],52,label,header,true,18));
    columns.forEach(([,label],col)=>{
      const position=col>=7?col+2:col+1;
      cell(positions[position],117,positions[position+1]-positions[position],52,label,header,true,19);
    });
    OAM_ROWS.forEach((row,index)=>{
      const y=169+index*58;
      parts.push('<g data-summary-index="'+row.key+'">');
      cell(24,y,168,58,row.left,colors[index],true,17);
      cell(878,y,168,58,row.right,colors[index],true,17);
      columns.forEach(([key],col)=>{
        const position=col>=7?col+2:col+1;
        cell(positions[position],y,positions[position+1]-positions[position],58,summaryValue(record.oam.rows[row.key][key]),colors[index],true,24);
      });
      parts.push('</g>');
    });
    cell(24,343,168,48,'Σ po operacích',header,true,18);
    cell(878,343,168,48,'Σ po operacích',header,true,18);
    columns.forEach(([key],col)=>{
      const position=col>=7?col+2:col+1;
      cell(positions[position],343,positions[position+1]-positions[position],48,String(Number(sums[key].toFixed(6))),header,true,24);
    });
    parts.push('</g><g transform="translate(0 -480)">');
    const flow=columns.filter(([key])=>!['stock','assembly'].includes(key)).reduce((total,[key])=>total+sums[key],0);
    const overall=flow+sums.stock+sums.assembly;
    heading(800,'Přehled dílů ve vsázkách');
    cell(24,822,276,44,'Díl',header,true,24);
    cell(300,822,132,44,'Počet',header,true,24);
    const aldTotals=[ALD1_INPUT_ROWS,ALD2_INPUT_ROWS].map((names,index)=>names.reduce((total,name)=>total+summaryNumber(record.inputs.rows[name]['ald'+(index+1)]),0));
    const total3=summaryNumber(record.inputs.ald3);
    // Each active part belongs to one visible ALD list. Archived combinations stay excluded.
    INPUT_ROWS.forEach((name,index)=>{
      const count=[ALD1_INPUT_ROWS,ALD2_INPUT_ROWS].reduce((total,names,id)=>total+(names.includes(name)?summaryNumber(record.inputs.rows[name]['ald'+(id+1)]):0),0);
      parts.push('<g data-summary-part="'+esc(name)+'">');
      cell(24,866+index*42,276,42,name.replace('-',' '),'#fff',true,25);
      cell(300,866+index*42,132,42,count?String(count):'','#fff',true,25);
      parts.push('</g>');
    });
    const partTotal=aldTotals[0]+aldTotals[1];
    const partsBottom=866+INPUT_ROWS.length*42;
    cell(24,partsBottom,276,44,'Celkem',header,true,24);
    cell(300,partsBottom,132,44,String(partTotal),header,true,25);
    [['Díly v toku',flow],['Sklad celkem',sums.stock],['Montáž',sums.assembly],['Celkem kusů',overall]].forEach(([label,total],index)=>{
      cell(458,822+index*48,266,48,label,header,true,24);
      cell(724,822+index*48,152,48,String(Number(total.toFixed(6))),'#fff',true,26);
    });
    parts.push('<text x="458" y="1070" font-size="25" font-weight="700">Čísla posledních vsázek</text>');
    const batchX=[458,626,709,792,876];
    cell(458,1092,168,44,'',header,true);
    ['ALD1','ALD2','ALD3'].forEach((label,i)=>cell(batchX[i+1],1092,batchX[i+2]-batchX[i+1],44,label,header,true,22));
    parts.push('<g data-summary-last-batches="ald1-ald2-ald3">');
    cell(458,1136,168,56,'Poslední\nvsázka',header,true,21);
    [1,2,3].forEach((id,i)=>cell(batchX[i+1],1136,batchX[i+2]-batchX[i+1],56,summaryValue(record.lastBatch['ald'+id]),'#fff',true,22));
    parts.push('</g>');
    cell(458,1192,168,56,'Celkem\nvsázek',header,true,21);
    [...aldTotals,record.inputs.ald3?total3:''].forEach((total,i)=>cell(batchX[i+1],1192,batchX[i+2]-batchX[i+1],56,total,'#fff',true,25));
    cell(458,1276,266,52,'Celkem vsázek',header,true,24);
    cell(724,1276,152,52,aldTotals[0]+aldTotals[1]+total3,'#fff',true,26);
    cell(458,1356,266,52,'Dusík',header,true,24);
    cell(724,1356,152,52,summaryValue(record.nitrogen),'#fff',true,26);
    const activeRows = keys => OAM_ROWS.map((row,index)=>({row,index})).filter(({row})=>keys.some(key=>summaryNumber(record.oam.rows[row.key][key])!==0));
    const machines=['TBKR01','TBKR07'].map(machine=>({machine,rows:activeRows(['ground'+machine+'Free','ground'+machine+'Press'])})).filter(item=>item.rows.length);
    let reportY=1454;
    if(machines.length){
      parts.push('<g data-summary-grinding="by-machine">');
      parts.push('<text x="458" y="'+reportY+'" font-size="25" font-weight="700">Nabroušeno · brusy</text>');
      const grindX=[458,550,664,770,876];reportY+=20;
      ['Brus','Index','Volné','Pod lisem'].forEach((label,i)=>cell(grindX[i],reportY,grindX[i+1]-grindX[i],40,label,header,true,18));reportY+=40;
      machines.forEach(({machine,rows})=>{
        const stem='ground'+machine;
        parts.push('<g data-summary-grinder="'+machine+'">');
        cell(grindX[0],reportY,grindX[1]-grindX[0],rows.length*36,machine,header,true,18);
        rows.forEach(({row,index},offset)=>{
          const rowY=reportY+offset*36,values=record.oam.rows[row.key];
          parts.push('<g data-summary-grinding-index="'+row.key+'">');
          cell(grindX[1],rowY,grindX[2]-grindX[1],36,AAR_COLUMNS[index].label,colors[index],true,18);
          ['Free','Press'].forEach((type,i)=>cell(grindX[i+2],rowY,grindX[i+3]-grindX[i+2],36,summaryValue(values[stem+type]),colors[index],true,21));
          parts.push('</g>');
        });
        reportY+=rows.length*36;
        cell(grindX[0],reportY,grindX[2]-grindX[0],36,'Celkem '+machine,header,true,18);
        ['Free','Press'].forEach((type,i)=>{
          const values=rows.map(({row})=>record.oam.rows[row.key][stem+type]);
          const total=values.some(value=>String(value??'').trim())?values.reduce((sum,value)=>sum+summaryNumber(value),0):'';
          cell(grindX[i+2],reportY,grindX[i+3]-grindX[i+2],36,total,header,true,21);
        });
        reportY+=36;parts.push('</g>');
      });
      parts.push('</g>');reportY+=40;
    }
    const conclusionKeys=['producedMOFree','producedMOPress','producedTO'];
    const conclusionRows=activeRows(conclusionKeys);
    if(conclusionRows.length){
      parts.push('<g data-summary-machining="conclusion">');
      parts.push('<text x="458" y="'+reportY+'" font-size="25" font-weight="700">Obrábění · závěr</text>');reportY+=20;
      const conclusionX=[458,576,676,776,876];
      ['Index','MO\nVolné','MO\nPod lisem','TO'].forEach((label,i)=>cell(conclusionX[i],reportY,conclusionX[i+1]-conclusionX[i],48,label,header,true,18));reportY+=48;
      conclusionRows.forEach(({row,index})=>{
        parts.push('<g data-summary-conclusion-index="'+row.key+'">');
        cell(conclusionX[0],reportY,conclusionX[1]-conclusionX[0],36,AAR_COLUMNS[index].label,colors[index],true,18);
        conclusionKeys.forEach((key,i)=>cell(conclusionX[i+1],reportY,conclusionX[i+2]-conclusionX[i+1],36,summaryValue(record.oam.rows[row.key][key]),colors[index],true,21));
        reportY+=36;parts.push('</g>');
      });
      parts.push('</g>');reportY+=16;
    }
    let y=Math.max(partsBottom+78,reportY+20);
    const notes=[['Obrábění',record.machiningFaults],...record.ald.map((row,i)=>['ALD'+(i+1),row.faults]),['Poznámky',record.notes]].filter(([,value])=>String(value??'').trim());
    if(notes.length){
      heading(y+22,'Závady a poznámky');y+=40;
      notes.forEach(([label,value])=>{
        const lines=String(value).split('\n').flatMap(line=>{
          const words=line.split(/\s+/);const wrapped=[];let current='';
          words.forEach(word=>{while(word.length>46){if(current){wrapped.push(current);current='';}wrapped.push(word.slice(0,46));word=word.slice(46);}if((current+' '+word).trim().length>46){wrapped.push(current);current=word;}else current=(current+' '+word).trim();});wrapped.push(current);return wrapped;
        });
        const height=Math.max(44,lines.length*28+16);
        cell(24,y,180,height,label,header,true,17);
        parts.push('<rect x="204" y="'+y+'" width="672" height="'+height+'" fill="#fff" stroke="#25313d" stroke-width="1.4"/>');
        lines.forEach((line,index)=>parts.push('<text x="220" y="'+(y+27+index*28)+'" font-size="'+Math.min(22,640/Math.max(1,line.length))+'">'+esc(line)+'</text>'));y+=height;
      });
    }
    parts.push('</g>');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+(y+24-480)+'" viewBox="0 0 '+width+' '+(y+24-480)+'"><rect width="100%" height="100%" fill="#fff"/><g font-family="Arial,sans-serif" fill="#172433">'+parts.join('')+'</g></svg>';
  }

  function refreshSummary(rootEl) {
    if (!ownerAllowed()) return;
    const img = rootEl.querySelector('[data-shift-overview-summary-image]');
    if (!img) return;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(summarySvg(readDom(rootEl)));
  }

  let closeSummaryViewer = () => {};
  function openSummaryViewer(rootEl) {
    if (!ownerAllowed()) return;
    closeSummaryViewer();
    refreshSummary(rootEl);
    const trigger = rootEl.querySelector('[data-shift-overview-summary-open]');
    const dialog = document.createElement('dialog');
    dialog.className = 'rakShiftOverviewViewer';
    dialog.setAttribute('aria-label','Celkový přehled směny');
    dialog.innerHTML = '<div class="rakShiftOverviewViewerToolbar"><strong>Celkový přehled</strong><button type="button" data-summary-close aria-label="Zavřít náhled">×</button></div><div class="rakShiftOverviewViewerViewport"><img alt="Souhrnná tabulka směny" draggable="false"></div>';
    const viewport=dialog.querySelector('.rakShiftOverviewViewerViewport'),img=dialog.querySelector('img');
    img.src=rootEl.querySelector('[data-shift-overview-summary-image]').src;
    document.body.appendChild(dialog);
    let scale=1,closed=false;
    function zoom(next,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
      const previous=scale;scale=Math.max(1,Math.min(6,next));
      img.style.width=(scale*100)+'%';
      viewport.scrollLeft=(viewport.scrollLeft+x)*scale/previous-x;
      viewport.scrollTop=(viewport.scrollTop+y)*scale/previous-y;
    }
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-summary-close]')){dialog.close();return;}
    });
    const pointers=new Map();let gesture=null;
    function startGesture(){
      const points=[...pointers.values()],rect=viewport.getBoundingClientRect();
      gesture={points,scale,left:viewport.scrollLeft,top:viewport.scrollTop,rect};
    }
    viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);startGesture();});
    viewport.addEventListener('pointermove',event=>{
      if(!pointers.has(event.pointerId)||!gesture)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const points=[...pointers.values()];
      if(points.length===1&&gesture.points.length===1){viewport.scrollLeft=gesture.left+gesture.points[0].x-points[0].x;viewport.scrollTop=gesture.top+gesture.points[0].y-points[0].y;}
      if(points.length>=2&&gesture.points.length>=2){const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),base=distance(gesture.points);if(!base)return;const x=(gesture.points[0].x+gesture.points[1].x)/2-gesture.rect.left,y=(gesture.points[0].y+gesture.points[1].y)/2-gesture.rect.top;scale=Math.max(1,Math.min(6,gesture.scale*distance(points)/base));img.style.width=scale*100+'%';viewport.scrollLeft=(gesture.left+x)*scale/gesture.scale-x;viewport.scrollTop=(gesture.top+y)*scale/gesture.scale-y;}
    });
    ['pointerup','pointercancel'].forEach(type=>viewport.addEventListener(type,event=>{pointers.delete(event.pointerId);startGesture();}));
    viewport.addEventListener('dblclick',()=>zoom(scale===1?2:1));
    const observer=new MutationObserver(()=>{if(!rootEl.isConnected||!ownerAllowed())cleanup();});
    observer.observe(document.body,{childList:true,subtree:true});
    function cleanup(){if(closed)return;closed=true;observer.disconnect();if(dialog.open)dialog.close();dialog.remove();if(trigger?.isConnected&&ownerAllowed())trigger.focus({preventScroll:true});}
    dialog.addEventListener('close',cleanup);
    closeSummaryViewer=cleanup;
    dialog.showModal();
  }

  function buildHtml(record) {
    return [
      '<div class="appMenuCard appMenuAdminCard rakShiftOverviewCard" id="rakShiftOverviewRoot">',
      '<div class="appMenuCardTitle">Přehled směny</div>',
      '<div class="appMenuText smallText">Přehled podle provozní tabulky · záloha k přihlášenému účtu.</div>',
      '<div class="rakShiftOverviewHeader">',
      '<label>Datum<input class="appMenuInlineInput rakShiftOverviewDate" aria-label="Datum směny" data-shift-overview-date type="date" value="' + esc(record.date) + '"></label>',
      '<label>Směna<select class="appMenuSelect" data-shift-overview-shift>' + shiftOptions(record.shift) + '</select></label>',
      '</div>',
      '<div class="appMenuActionRow rakShiftOverviewTopActions"><button type="button" class="appMenuAction" data-shift-overview-action="load">Načíst</button><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit</button><button type="button" class="appMenuAction" data-shift-overview-action="clear">Vymazat přehled</button></div>',
      '<div class="smallText rakShiftOverviewStatus" data-shift-overview-status role="status" aria-live="polite">' + (record.updatedAt ? 'Načteno · naposledy uloženo ' + esc(new Date(record.updatedAt).toLocaleString('cs-CZ')) : 'Pro tento den zatím není uložený přehled.') + '</div>',
      '<div class="appMenuSubTitle">Tok dílů</div>',
      '<div class="rakShiftOverviewShiftLayout" data-shift-overview-layout>',
      shiftLayout(record),
      '</div>',
      '<div class="appMenuSubTitle">Celkové poznámky ke směně</div>',
      field('notes', record, { area: true, rows: 4, placeholder: 'Další důležité informace ze směny…' }),
      '<div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-shift-overview-action="save">Uložit přehled</button><button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button></div>',
      panel('Celkový přehled','<button type="button" class="rakShiftOverviewPreview" data-shift-overview-summary-open aria-label="Zvětšit celkový přehled směny"><img data-shift-overview-summary-image alt="Barevná souhrnná tabulka směny"><span>Klepnutím zvětšíš přehled</span></button>'),
      '</div>'
    ].join('');
  }

  function readDom(rootEl) {
    const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
    const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || '');
    const record = normalizeRecord(clone(renderedRecords.get(rootEl) || {}), date, shift);
    record.date = date;
    record.shift = normalizeShift(shift);
    rootEl.querySelectorAll('[data-shift-overview-field]').forEach((el) => {
      const path = el.getAttribute('data-shift-overview-field');
      nestedSet(record, path, String(el.value || '').trim());
      const history = inputQuantityHistory(el);
      if (history) record.calculations[path] = history;
    });
    record.updatedAt = new Date().toISOString();
    return record;
  }

  function refreshTotals(rootEl) {
    let batchTotal = 0;
    INPUT_ROWS.forEach((name) => {
      const total = ['ald1', 'ald2'].reduce((sum, key) => {
        const el = rootEl.querySelector('[data-shift-overview-field="inputs.rows.' + name + '.' + key + '"]');
        return sum + numberOrZero(el && el.value);
      }, 0);
      const out = rootEl.querySelector('[data-shift-overview-input-total="' + name + '"]');
      if (out) out.textContent = String(total);
      batchTotal += total;
    });
    [[1,ALD1_INPUT_ROWS],[2,ALD2_INPUT_ROWS]].forEach(([id,names]) => {
      const total = names.reduce((sum,name) => {
        const input = rootEl.querySelector('[data-shift-overview-field="inputs.rows.' + name + '.ald' + id + '"]');
        return sum + numberOrZero(input && input.value);
      },0);
      const output = rootEl.querySelector('[data-shift-overview-ald-total="' + id + '"]');
      if (output) output.textContent = String(total);
    });
    const batches = rootEl.querySelector('[data-shift-overview-batch-total]');
    if (batches) batches.textContent = String(batchTotal);
    AAR_ROWS.forEach((row) => {
      let total = 0;
      AAR_COLUMNS.forEach((col) => {
        const el = rootEl.querySelector('[data-shift-overview-field="aar.matrix.' + row.key + '.' + col.key + '"]');
        total += numberOrZero(el && el.value);
      });
      const out = rootEl.querySelector('[data-shift-overview-total="' + row.key + '"]');
      if (out) out.textContent = String(total);
    });
    const stockTotal = rootEl.querySelector('[data-shift-overview-total="stock"]');
    const grand = rootEl.querySelector('[data-shift-overview-grand-total]');
    if (grand) grand.textContent = stockTotal ? stockTotal.textContent : '0';

    OAM_LEFT_COLUMNS.concat(OAM_RIGHT_COLUMNS).forEach((col) => {
      let total = 0;
      OAM_ROWS.forEach((row) => {
        const el = rootEl.querySelector('[data-shift-overview-field="oam.rows.' + row.key + '.' + col.key + '"]');
        total += numberOrZero(el && el.value);
      });
      const out = rootEl.querySelector('[data-shift-overview-oam-total="' + col.key + '"]');
      if (out) out.textContent = String(total);
    });
  }

  function status(rootEl, message) {
    const el = rootEl.querySelector('[data-shift-overview-status]');
    if (el) el.textContent = String(message || '');
  }

  let removeQuantityKeyboard = () => {};

  // Native numeric keyboards lack operators on iOS. Keep the focused numeric
  // input and place a small accessory in the visible viewport above the keyboard.
  function bindQuantityKeyboard(rootEl) {
    const bar = document.createElement('div');
    bar.className = 'rakShiftOverviewKeyboard';
    bar.hidden = true;
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Výpočet v číselném poli');
    bar.innerHTML = '<button type="button" data-quantity-operator="+" aria-label="Přidat plus">+</button><button type="button" data-quantity-operator="-" aria-label="Přidat mínus">−</button>';
    document.body.appendChild(bar);
    let input = null;
    const viewport = root.visualViewport;
    function position() {
      if (!rootEl.isConnected) { cleanup(); return; }
      const visible = ownerAllowed() && input && input.isConnected && document.activeElement === input;
      bar.hidden = !visible;
      if (!visible) return;
      bar.style.top = Math.max(0, (viewport ? viewport.offsetTop + viewport.height : root.innerHeight) - bar.offsetHeight - 8) + 'px';
      bar.style.left = ((viewport ? viewport.offsetLeft : 0) + (viewport ? viewport.width : root.innerWidth) / 2) + 'px';
    }
    function focus(event) {
      input = event.target.matches('[data-shift-overview-calculate]:not([readonly])') ? event.target : null;
      position();
    }
    function blur() { input = null; bar.hidden = true; }
    function insert(event) {
      const button = event.target.closest('button');
      if (!button || !ownerAllowed() || !input || !input.isConnected || document.activeElement !== input) return;
      const operator = button.getAttribute('data-quantity-operator');
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      input.setRangeText(operator, start, end, 'end');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Prevent a pointer tap from closing the keyboard or evaluating too early.
    bar.addEventListener('pointerdown', event => event.preventDefault());
    bar.addEventListener('mousedown', event => event.preventDefault());
    bar.addEventListener('click', insert);
    rootEl.addEventListener('focusin', focus);
    rootEl.addEventListener('focusout', blur);
    viewport?.addEventListener('resize', position);
    viewport?.addEventListener('scroll', position);
    root.addEventListener('resize', position);
    const observer = new MutationObserver(() => { if (!rootEl.isConnected) cleanup(); });
    observer.observe(document.body, { childList: true, subtree: true });
    function cleanup() {
      input = null;
      bar.remove();
      observer.disconnect();
      rootEl.removeEventListener('focusin', focus);
      rootEl.removeEventListener('focusout', blur);
      viewport?.removeEventListener('resize', position);
      viewport?.removeEventListener('scroll', position);
      root.removeEventListener('resize', position);
    }
    removeQuantityKeyboard = cleanup;
  }

  function render(body, forcedRecord) {
    removeQuantityKeyboard();
    closeSummaryViewer();
    if (!body) return false;
    if (!ownerAllowed()) {
      body.dataset.adminView = 'shift-overview';
      body.innerHTML = '<div class="appMenuCard appMenuAdminCard"><div class="appMenuCardTitle">Přehled směny</div><div class="appMenuText">Přehled směny je dostupný hlavnímu správci a mistrům.</div><button type="button" class="appMenuAction appMenuBack" data-menu-back="1">Zpět</button></div>';
      return false;
    }
    const defaults = currentShiftContext();
    const draft = !forcedRecord ? draftForOpening(readDraft(), defaults) : null;
    if (draft) forcedRecord = draft.record;
    const date = forcedRecord && forcedRecord.date ? String(forcedRecord.date) : defaults.date;
    const shift = forcedRecord ? normalizeShift(forcedRecord.shift) : defaults.shift;
    const record = normalizeRecord(forcedRecord || getSaved(date, shift) || defaultRecord(date, shift), date, shift);
    body.dataset.adminView = 'shift-overview';
    body.innerHTML = buildHtml(record);
    const rootEl = body.querySelector('#rakShiftOverviewRoot');
    if (rootEl) {
      draftOwners.set(rootEl, draftKey());
      renderedRecords.set(rootEl, clone(record));
      const identity = currentIdentity();
      renderedRevisions.set(rootEl, draft ? draft.revision : (identity ? (cloudRead(identity).revisions[recordKey(date, shift)] ?? null) : null));
      if (draft) { rootEl.dataset.edited = '1'; rootEl.dataset.cloudMutation = draft.mutationId || ''; }
    }
    bind(body);
    if (rootEl && bridge()) {
      cloudView = { root: rootEl, body };
      const conflict = document.createElement('div');
      conflict.hidden = true;
      conflict.setAttribute('data-shift-overview-cloud-conflict', '');
      conflict.innerHTML = '<button type="button" class="appMenuAction" data-shift-overview-action="cloud-load">Načíst online verzi</button><button type="button" class="appMenuAction" data-shift-overview-action="cloud-save">Zálohovat místní verzi místo online</button>';
      rootEl.querySelector('[data-shift-overview-status]')?.after(conflict);
      const identity = currentIdentity();
      if (identity) showCloudState(identity, draft ? 'Rozepsaný přehled obnoven z tohoto zařízení.' : 'Místní kopie · ověřuji online zálohu…');
      if (draft) void syncCloud();
      if (!forcedRecord) {
        void syncCloud().then((online) => {
          if (cloudView?.root !== rootEl || rootEl.dataset.edited === '1' || !ownerAllowed() || !rootEl.isConnected) return;
          const saved = getSaved(date, shift);
          if (saved) {
            render(body, saved);
            const nextIdentity = currentIdentity();
            if (nextIdentity) showCloudState(nextIdentity, !online || cloudRead(nextIdentity).pending[recordKey(date, shift)]?.length
              ? 'Místní kopie v zařízení · online záloha nyní není potvrzená.' : 'Zálohováno online k přihlášenému účtu ✓');
          } else status(rootEl, root.navigator?.onLine === false ? 'Offline · místní kopie v zařízení.' : 'Pro tuto směnu zatím není uložený přehled.');
        }).catch(() => { status(rootEl, 'Online záloha se nyní nepodařila. Místní data zůstala zachována.'); });
      }
    }
    return true;
  }

  function bind(body) {
    const rootEl = body && body.querySelector ? body.querySelector('#rakShiftOverviewRoot') : null;
    if (!rootEl || rootEl.dataset.bound === '1') return;
    rootEl.dataset.bound = '1';
    bindQuantityKeyboard(rootEl);
    refreshTotals(rootEl);
    refreshMultipliers(rootEl);
    refreshSummary(rootEl);
    const dateInput = rootEl.querySelector('[data-shift-overview-date]');
    dateInput?.addEventListener('click', () => {
      if (!ownerAllowed()) return;
      try { dateInput.showPicker?.(); } catch (_) { dateInput.focus(); }
    });

    function finishQuantity(event) {
      if (!ownerAllowed()) return;
      if (event.type === 'change') rootEl.dataset.edited = '1';
      if (event.type === 'change' && event.target?.matches?.('[data-shift-overview-shift], [data-shift-overview-date]')) {
        updateShiftLayout(rootEl);
        return;
      }
      calculateQuantity(event.target);
      syncDateDisplay(rootEl);
      refreshMultipliers(rootEl);
      refreshTotals(rootEl);
      refreshSummary(rootEl);
      persistDraft(rootEl);
    }
    rootEl.addEventListener('change', finishQuantity);
    rootEl.addEventListener('focusout', finishQuantity);
    rootEl.addEventListener('input', (event) => {
      rootEl.dataset.edited = '1';
      const undo = quantityUndo.get(rootEl);
      if (undo && undo.input !== event.target) clearQuantityUndo(rootEl);
      syncDateDisplay(rootEl);
      refreshMultipliers(rootEl);
      if (event.target && event.target.matches && (
        event.target.matches('[data-shift-overview-field^="aar.matrix."]')
        || event.target.matches('[data-shift-overview-field^="oam.rows."]')
        || event.target.matches('[data-shift-overview-field^="inputs.rows."]')
      )) refreshTotals(rootEl);
      refreshSummary(rootEl);
      persistDraft(rootEl);
    });

    rootEl.addEventListener('click', async (event) => {
      const unit = event.target.closest?.('[data-running-unit]');
      if (unit && rootEl.contains(unit)) {
        event.preventDefault();
        if (!ownerAllowed()) return;
        const id=Number(unit.getAttribute('data-running-ald')), number=Number(unit.getAttribute('data-running-unit'));
        if (![1,2,3].includes(id) || !Number.isInteger(number) || number<1 || number>(id===3?5:10)) return;
        const record=readDom(rootEl), off=inactiveUnits(record,id);
        record.ald[id-1].inactiveUnits=off.includes(number)?off.filter(value=>value!==number):[...off,number];
        renderedRecords.set(rootEl,clone(record));
        rootEl.dataset.edited='1';
        const active=!record.ald[id-1].inactiveUnits.includes(number);
        unit.classList.toggle('isActive',active);unit.setAttribute('aria-pressed',String(active));
        clearQuantityUndo(rootEl);persistDraft(rootEl);
        return;
      }

      if (event.target.closest?.('[data-shift-overview-summary-open]')) { event.preventDefault(); openSummaryViewer(rootEl); return; }
      const restore = event.target?.closest?.('[data-quantity-restore]');
      if (restore && rootEl.contains(restore)) {
        event.preventDefault();
        if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
        const undo = quantityUndo.get(rootEl);
        if (undo && undo.display.contains(restore) && !undo.input.readOnly) {
          undo.input.value = undo.history.expression;
          clearQuantityUndo(rootEl);
          refreshMultipliers(rootEl);
          refreshTotals(rootEl);
          refreshSummary(rootEl);
          persistDraft(rootEl);
        }
        return;
      }
      const multiply = event.target && event.target.closest ? event.target.closest('[data-shift-overview-multiply]') : null;
      if (multiply && rootEl.contains(multiply)) {
        event.preventDefault();
        if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
        const path = multiply.getAttribute('data-shift-overview-multiply');
        const input = multiply.parentElement.querySelector('[data-shift-overview-field]');
        const factor = quantityMultiplier(String(path).split('.').pop());
        if (input && factor && canMultiply(input.value)) {
          rootEl.dataset.edited = '1';
          const expression = input.value;
          input.value = String(Number(expression.trim()) * factor);
          rememberQuantityHistory(input, expression, input.value, factor);
          refreshMultipliers(rootEl);
          refreshTotals(rootEl);
          refreshSummary(rootEl);
          persistDraft(rootEl);
        }
        return;
      }
      const counter = event.target && event.target.closest ? event.target.closest('[data-shift-overview-count]') : null;
      if (counter && rootEl.contains(counter)) {
        event.preventDefault();
        if (!ownerAllowed()) { status(rootEl, 'Přístup byl zamítnut.'); return; }
        const path = counter.getAttribute('data-shift-overview-count');
        const input = rootEl.querySelector('[data-shift-overview-field="' + path + '"]');
        if (input) {
          const step = counter.getAttribute('data-count-step') === '-1' ? -1 : 1;
          input.value = String(Math.max(0, numberOrZero(input.value) + step));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          refreshTotals(rootEl);
          refreshSummary(rootEl);
          persistDraft(rootEl);
        }
        return;
      }
      const button = event.target && event.target.closest ? event.target.closest('[data-shift-overview-action]') : null;
      if (!button || !rootEl.contains(button)) return;
      event.preventDefault();
      if (!ownerAllowed()) {
        status(rootEl, 'Přístup byl zamítnut. Funkce je pro hlavního správce a mistry.');
        return;
      }
      const action = String(button.getAttribute('data-shift-overview-action') || '');
      const date = String(rootEl.querySelector('[data-shift-overview-date]')?.value || localDateString());
      const shift = String(rootEl.querySelector('[data-shift-overview-shift]')?.value || '');

      if (action === 'clear') {
        const empty = defaultRecord(date, shift);
        render(body, empty);
        const next = body.querySelector('#rakShiftOverviewRoot');
        if (next) { next.dataset.edited = '1'; persistDraft(next); status(next, 'Rozepsaný přehled vymazán v zařízení. Online záloha zůstala zachována.'); }
        return;
      }

      if (action === 'save') {
        if (!/^[ABCD]:(ranni|nocni)(8|12)$/.test(shift)) { status(rootEl, 'Vyber směnu pro tento přehled.'); return; }
        try {
          rootEl.querySelectorAll('[data-shift-overview-calculate]').forEach(calculateQuantity);
          refreshMultipliers(rootEl);
          refreshTotals(rootEl);
          refreshSummary(rootEl);
          const record = readDom(rootEl);
          persistDraft(rootEl);
          if (bridge()) {
            const opened = renderedRecords.get(rootEl);
            const base = opened && opened.date === record.date && opened.shift === record.shift ? renderedRevisions.get(rootEl) : null;
            const queued = localCloudSave(record, base ?? null);
            rootEl.dataset.cloudMutation = queued.mutationId;
            persistDraft(rootEl);
            status(rootEl, 'Uloženo v zařízení · zálohuji online…');
            await syncCloud();
            const identity = currentIdentity();
            if (identity) {
              const state = cloudRead(identity);
              if (!state.pending[recordKey(record.date, record.shift)]?.length && !state.conflicts[recordKey(record.date, record.shift)]) {
                renderedRevisions.set(rootEl, state.revisions[recordKey(record.date, record.shift)] ?? null);
                renderedRecords.set(rootEl, clone(record));
              }
              persistDraft(rootEl);
              showCloudState(identity, state.pending[recordKey(record.date, record.shift)]?.length
                ? 'Uloženo v zařízení · čeká na online zálohu.' : 'Zálohováno online k přihlášenému účtu ✓');
              if (state.pending[recordKey(record.date, record.shift)]?.length && !state.conflicts[recordKey(record.date, record.shift)]
                  && root.navigator?.onLine !== false) await syncCloud();
            }
            return;
          }
          const store = readStore();
          store[recordKey(record.date, record.shift)] = record;
          writeStore(store);
          status(rootEl, 'Uloženo v tomto zařízení ✓ · ' + new Date(record.updatedAt).toLocaleString('cs-CZ'));
        } catch (err) {
          status(rootEl, 'Uložení se nepodařilo: ' + String(err && err.message ? err.message : err));
        }
        return;
      }

      if (action === 'load') {
        const identity = currentIdentity();
        const beforeLoad = comparable(readDom(rootEl));
        status(rootEl, 'Načítám přehled…');
        const online = bridge() ? await syncCloud() : false;
        if (bridge() && identity && !sameIdentity(identity)) return;
        if (cloudView && cloudView.root !== rootEl) return;
        if (comparable(readDom(rootEl)) !== beforeLoad) { status(rootEl, 'Online kopie načtena. Rozepsané změny zůstaly ve formuláři.'); return; }
        const saved = getSaved(date, shift);
        render(body, saved || defaultRecord(date, shift));
        const next = body.querySelector('#rakShiftOverviewRoot');
        if (next) persistDraft(next);
        if (next && !saved) status(next, 'Pro vybraný den a směnu zatím není nic uložené.');
        else if (next && bridge() && currentIdentity()) showCloudState(currentIdentity(), online
          ? 'Načteno z online zálohy účtu ✓' : 'Načtena místní kopie · offline nebo online záloha nedostupná.');
        return;
      }

      if (action === 'cloud-load' || action === 'cloud-save') {
        try {
          const record = cloudResolution(action === 'cloud-load', date, shift);
          if (!record) return;
          if (action === 'cloud-load') { render(body, record); persistDraft(body.querySelector('#rakShiftOverviewRoot')); }
          else {
            const identity = currentIdentity();
            rootEl.dataset.cloudMutation = identity ? (cloudRead(identity).pending[recordKey(date, shift)]?.[0]?.id || '') : '';
          }
          await syncCloud();
        } catch (_) { status(rootEl, 'Změna se nepodařila. Místní data zůstala zachována.'); }
      }

    });
  }

  function installStyle() {
    if (document.getElementById('rakShiftOverviewStyle')) return;
    const style = document.createElement('style');
    style.id = 'rakShiftOverviewStyle';
    style.textContent = [
      '#rakShiftOverviewRoot .rakShiftOverviewPreview{display:grid;gap:8px;width:100%;margin:0;padding:0;background:transparent;border:0;color:var(--text);font:inherit;cursor:pointer;}.rakShiftOverviewPreview img{display:block;width:100%;height:auto;border:1px solid #ffffff44;border-radius:8px;background:white;}.rakShiftOverviewPreview span{font-size:12px;opacity:.7;}',
      'dialog.rakShiftOverviewViewer{position:fixed;inset:0;margin:0;padding:0;border:0;border-radius:0;width:100vw;max-width:none;height:100dvh;max-height:none;background:#161827;color:#fff;overflow:hidden;}dialog.rakShiftOverviewViewer[open]{display:flex;flex-direction:column;}dialog.rakShiftOverviewViewer::backdrop{background:#111d;}.rakShiftOverviewViewerToolbar{display:flex;align-items:center;gap:6px;flex:none;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;}.rakShiftOverviewViewerToolbar strong{flex:1;min-width:0;font:700 14px Arial,sans-serif;}.rakShiftOverviewViewerToolbar button{width:auto;min-width:38px;min-height:44px;margin:0;padding:4px 8px;border:1px solid #ffffff55;border-radius:8px;background:#ffffff15;color:inherit;font:700 16px Arial,sans-serif;}.rakShiftOverviewViewerViewport{flex:1;min-height:0;overflow:auto;touch-action:none;padding-bottom:env(safe-area-inset-bottom);}.rakShiftOverviewViewerViewport img{display:block;width:100%;max-width:none;height:auto;user-select:none;}',
      '.rakShiftOverviewHistory{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:11px;font-weight:400;color:var(--text);opacity:.72;overflow-wrap:anywhere;}.rakShiftOverviewHistory[hidden]{display:none}.rakShiftOverviewHistory>span{flex:1;}#rakShiftOverviewRoot .rakShiftOverviewHistory button{display:inline-block;width:auto;max-width:100%;font:inherit;color:inherit;background:transparent;border:0;border-radius:0;box-shadow:none;text-decoration:underline;min-height:32px;padding:4px 0;margin:0;cursor:pointer;}#rakShiftOverviewRoot .rakShiftOverviewSideLabel{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:10px;}#rakShiftOverviewRoot .rakShiftOverviewSideLabel>span{text-align:left;font-size:13px;}#rakShiftOverviewRoot .rakShiftOverviewSideLabel .rakShiftOverviewHistory{grid-column:1/-1;}.rakShiftOverviewIndexIdentity{display:grid;gap:4px;}.rakShiftOverviewIndexIdentity .rakShiftOverviewHistory{display:grid;gap:0;font-size:10px;}.rakShiftOverviewIndexIdentity .rakShiftOverviewHistory[hidden]{display:none;}#rakShiftOverviewRoot .rakShiftOverviewIndexIdentity .rakShiftOverviewHistory button{justify-self:start;min-height:24px;padding:2px 0;}',
      '.rakShiftOverviewKeyboard{position:fixed;z-index:2147483646;transform:translateX(-50%);display:flex;gap:8px;padding:6px;background:#30235d;color:#fff68a;border:1px solid #ffffff55;border-radius:14px;box-shadow:0 2px 12px #0006;max-width:calc(100% - 16px);box-sizing:border-box}',
      '.rakShiftOverviewKeyboard[hidden]{display:none}.rakShiftOverviewKeyboard button{font:inherit;font-weight:700;color:inherit;background:#ffffff18;border:1px solid #ffffff44;border-radius:10px;min-width:56px;height:44px;margin:0;padding:0 14px;touch-action:manipulation}',
      '#appMenuBody[data-admin-view="shift-overview"] .rakShiftOverviewCard{display:grid;gap:12px;min-width:0;}',
      '.rakShiftOverviewCard *{box-sizing:border-box;min-width:0;}',
      '.rakShiftOverviewCard label{display:grid;gap:6px;font-size:12px;font-weight:800;overflow-wrap:anywhere;}',
      '.rakShiftOverviewHeader{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:12px;align-items:start;}.rakShiftOverviewHeader>label{grid-template-rows:auto 44px;}.rakShiftOverviewTwo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.rakShiftOverviewInput,.rakShiftOverviewArea,.rakShiftOverviewHeader input,.rakShiftOverviewHeader select{width:100%;max-width:100%;min-width:0;margin:0;}.rakShiftOverviewInput,.rakShiftOverviewHeader input,.rakShiftOverviewHeader select{min-height:44px;font-size:16px;}',
      '#rakShiftOverviewRoot .rakShiftOverviewDate{display:block!important;position:relative!important;opacity:1!important;pointer-events:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;height:44px!important;min-height:44px!important;margin:0!important;padding:0 6px!important;box-sizing:border-box!important;font-size:16px!important;text-align:center!important;color:var(--text,#fff)!important;color-scheme:dark;}#rakShiftOverviewRoot .rakShiftOverviewDate::-webkit-calendar-picker-indicator{cursor:pointer;opacity:1;position:absolute;right:6px;}#rakShiftOverviewRoot .rakShiftOverviewDate::-webkit-datetime-edit{padding:0;text-align:center;flex:1;}#rakShiftOverviewRoot .rakShiftOverviewDate::-webkit-date-and-time-value{text-align:center;width:100%;}.rakShiftOverviewHeader select{height:44px;min-height:44px;padding:0 6px;overflow:hidden;}',
      '.rakShiftOverviewArea{resize:vertical;min-height:76px;border:1px solid rgba(124,255,124,.18);border-radius:12px;background:rgba(255,255,255,.045);color:var(--text);padding:10px;font:inherit;}',
      '.rakShiftOverviewPanel{border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px;display:grid;gap:12px;align-content:start;background:rgba(255,255,255,.025);}',
      '.rakShiftOverviewPanel h3{font-size:14px;margin:0;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.15);}',
      '.rakShiftOverviewPanel.isGreen{border-top:5px solid #87ac3a;}.rakShiftOverviewPanel.isBlue{border-top:5px solid #1472c2;}.rakShiftOverviewPanel.isOrange{border-top:5px solid #ce552f;}',
      '.rakShiftOverviewFlow,.rakShiftOverviewUtilities{display:grid;gap:12px;}',
      '.rakShiftOverviewAldTotal{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,.18);font-weight:700;}.rakShiftOverviewAldTotal output{min-width:44px;text-align:center;} .rakShiftOverviewBefore145{margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.18);}.rakShiftOverviewSubsectionTitle{margin:0 0 10px;font-size:13px;} .rakShiftOverviewStationRows{display:grid;gap:8px;}.rakShiftOverviewIndexRow{border-left:4px solid transparent;padding:8px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:10px;align-items:center;}.rakShiftOverviewIndexRow h4{margin:0;font-size:12px;}.rakShiftOverviewIndexRow label>span{display:block;width:100%;text-align:center;}.rakShiftOverviewIndexRow label:has(.rakShiftOverviewMultiply:not([hidden]))>span{width:calc(100% - 42px);}.rakShiftOverviewIndexRow{border-radius:10px;}.rakShiftOverviewIndexRow.isGreen{border-color:#87ac3a;background:rgba(135,172,58,.24);}.rakShiftOverviewIndexRow.isBlue{border-color:#1472c2;background:rgba(20,114,194,.27);}.rakShiftOverviewIndexRow.isOrange{border-color:#ce552f;background:rgba(206,85,47,.25);}',
      '.rakShiftOverviewStage{display:grid;align-content:start;gap:8px;}.rakShiftOverviewStage h4{font-size:12px;margin:0;overflow-wrap:anywhere;}',
      '.rakShiftOverviewFieldGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start;}.rakShiftOverviewIndexRow .rakShiftOverviewFieldGrid>label{grid-template-rows:32px 44px;align-content:start;}.rakShiftOverviewIndexRow .rakShiftOverviewFieldGrid>label>span{height:32px;display:grid;place-items:center;line-height:1.2;}.rakShiftOverviewIndexRow .rakShiftOverviewInput{height:44px;min-height:44px;align-self:start;}',
      '.rakShiftOverviewFieldGroup{display:grid;gap:10px;min-width:0;}.rakShiftOverviewFieldGroup>h5{height:32px;margin:0;display:grid;place-items:center;font-size:13px;}.rakShiftOverviewFieldGroup>label{min-width:0;grid-template-rows:32px 44px;}.rakShiftOverviewFieldGroup>label>span{height:32px;display:grid;place-items:center;}.rakShiftOverviewFieldGroup>label:not(:has(>span)){padding-top:32px;grid-template-rows:44px;}',
      '.rakShiftOverviewStage:nth-child(n+4) .rakShiftOverviewFieldGrid{grid-template-columns:minmax(0,1fr);}',
      '.rakShiftOverviewIndexRow .rakShiftOverviewFieldGrid:has(>label:only-child){grid-template-columns:minmax(0,1fr);}.rakShiftOverviewQuantity{display:flex;align-items:center;gap:4px;}.rakShiftOverviewQuantity .rakShiftOverviewInput{flex:1;}.rakShiftOverviewQuantity .rakShiftOverviewMultiply{flex:0 0 38px;width:38px;min-width:0;height:44px;min-height:44px;margin:0;padding:0;display:grid;place-items:center;font-size:12px;line-height:1;}.rakShiftOverviewMultiply[hidden]{display:none!important;}',
      '.rakShiftOverviewStages .rakShiftOverviewInput{padding:8px 4px;text-align:center;}',
      '.rakShiftOverviewStages label{font-size:11px;}',
      '.rakShiftOverviewPanels{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;}',
      '.rakShiftOverviewUnits{margin:10px 0;}.rakShiftOverviewUnits>span{display:block;margin-bottom:8px;}.rakShiftOverviewUnitGrid{display:grid;grid-template-columns:repeat(5,44px);gap:8px;}#rakShiftOverviewRoot .rakShiftOverviewUnitGrid button.rakShiftOverviewUnit{width:44px!important;height:44px!important;min-height:44px;padding:0!important;margin:0!important;border-radius:6px;display:grid;place-items:center;background:#666b73!important;color:#fff!important;border:2px solid #a1a6ae!important;font-size:16px;font-weight:700;opacity:1!important;box-shadow:none!important;filter:none!important;}#rakShiftOverviewRoot .rakShiftOverviewUnitGrid button.rakShiftOverviewUnit.isActive{background:#167a35!important;border-color:#72f29a!important;color:#fff!important;}#rakShiftOverviewRoot .rakShiftOverviewUnitGrid button.rakShiftOverviewUnit:focus-visible{outline:3px solid #fff;outline-offset:2px;}',
      '.rakShiftOverviewLower{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;align-items:start;}',
      '.rakShiftOverviewShiftLayout{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;}.rakShiftOverviewShiftLayout .rakShiftOverviewPanel .rakShiftOverviewPanel{background:transparent;padding:0;border:0;}.rakShiftOverviewShiftLayout .rakShiftOverviewPanel .rakShiftOverviewPanel>h3{display:none;}',
      '.rakShiftOverviewBatchColumns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;align-items:start;}',
      '.rakShiftOverviewUtilities{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr));}',
      '.rakShiftOverviewInputRows{display:grid;gap:6px;}.rakShiftOverviewInputRows label{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;}',
      '.rakShiftOverviewInputRows input{padding:8px;text-align:center;}',
      '.rakShiftOverviewCounter{display:grid;grid-template-columns:minmax(40px,.65fr) minmax(44px,.85fr) minmax(54px,1fr) minmax(44px,1fr);gap:8px;align-items:center;padding:8px 0;}.rakShiftOverviewCounter+.rakShiftOverviewCounter{border-top:1px solid rgba(255,255,255,.12);}.rakShiftOverviewCounter>span{font-size:16px;font-weight:800;overflow-wrap:anywhere;}.rakShiftOverviewCounter .appMenuAction{width:100%;min-width:0;height:44px;min-height:44px;margin:0;padding:0;display:grid;place-items:center;line-height:1;font-size:24px;align-self:center;}.rakShiftOverviewCounter .rakShiftOverviewCountValue{display:grid;place-items:center;height:44px;min-height:44px;margin:0;text-align:center;font-weight:900;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:rgba(255,255,255,.035);color:var(--text);padding:0;align-self:center;}.rakShiftOverviewCounter .rakShiftOverviewCountMinus{width:calc(100% - 8px);justify-self:start;opacity:.75;}',

      '.rakShiftOverviewStatus,.rakShiftOverviewSummary,.rakShiftOverviewBatchSummary{padding:10px;border-radius:12px;background:rgba(124,255,124,.06);overflow-wrap:anywhere;}',
      '.rakShiftOverviewSummary,.rakShiftOverviewBatchSummary{display:flex;justify-content:space-between;gap:10px;}',
      '.rakShiftOverviewDetails{border:1px solid rgba(124,255,124,.16);border-radius:12px;padding:10px;}.rakShiftOverviewDetails summary{cursor:pointer;font-weight:800;}',
      '.rakShiftOverviewExtra{display:grid;gap:12px;margin-top:12px;}',
      '.rakShiftOverviewFree{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:10px;}',
      '.rakShiftOverviewCard .appMenuActionRow{flex-wrap:wrap;}',
      '.rakShiftOverviewFlow{grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));}.rakShiftOverviewHeader select{font-size:13px;}',
      '@media(max-width:650px){.rakShiftOverviewStages{grid-template-columns:repeat(2,minmax(0,1fr));}.rakShiftOverviewLower{grid-template-columns:minmax(0,1fr);}.rakShiftOverviewBatchColumns{grid-template-columns:minmax(0,1fr);}}',
      '@media(max-width:430px){.rakShiftOverviewCard{padding:12px!important;}.rakShiftOverviewUtilities{grid-template-columns:minmax(0,1fr);}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyle();
  root.renderAdminShiftOverview = render;
  root.RakAdminShiftOverview = Object.freeze({ render, storageKey: STORAGE_KEY, ownerAllowed });
})(typeof window !== 'undefined' ? window : globalThis);
