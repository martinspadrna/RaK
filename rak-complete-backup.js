// RaK 1.6.32 – one-click complete disaster-recovery backup for the owner account.
(function installRakCompleteBackup() {
  'use strict';

  const RAK_COMPLETE_BACKUP_REPO = 'martinspadrna/RaK';
  const RAK_COMPLETE_BACKUP_BUILD_SHA = '__RAK_COMPLETE_BACKUP_BUILD_SHA__';
  const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([
    /* RAK_COMPLETE_BACKUP_REPO_FILES */
  ]);
  const RPC_NAME = 'rak_owner_complete_backup_v1';
  const STATUS_ID = 'adminCompleteBackupStatus';
  const MAX_PARALLEL_FETCHES = 5;

  function status(text) {
    try {
      const el = document.getElementById(STATUS_ID);
      if (el) el.textContent = String(text || '');
    } catch (_) {}
  }

  function safePart(value) {
    return String(value || '').replace(/[<>:"\\|?*\x00-\x1F]/g, '_').replace(/^\/+|\/+$/g, '');
  }

  function encodePath(value) {
    return String(value || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  }

  function timestampForFile(date) {
    const d = date instanceof Date ? date : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-') + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes());
  }

  function bytesLabel(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function isOwnerUi() {
    try {
      return typeof window.rakAdminCanManageAdmins === 'function' && window.rakAdminCanManageAdmins();
    } catch (_) {
      return false;
    }
  }

  async function ensureZip() {
    if (window.JSZip) return window.JSZip;
    if (typeof window.rakEnsureExternalLibrary === 'function') await window.rakEnsureExternalLibrary('jszip');
    if (!window.JSZip) throw new Error('ZIP knihovna není dostupná.');
    return window.JSZip;
  }

  async function ownerAccessToken() {
    const bridge = window.RotationSupabaseBridge;
    if (!bridge || typeof bridge.getAdminAccessToken !== 'function') throw new Error('Supabase administrace není připravená.');
    const token = await bridge.getAdminAccessToken();
    if (!token) throw new Error('Chybí platná relace hlavního admina. Odemkni znovu Administraci.');
    return token;
  }

  async function fetchCompleteSnapshot(token) {
    const cfg = window.SUPABASE_CONFIG || {};
    const base = String(cfg.url || '').replace(/\/$/, '');
    const key = String(cfg.publishableKey || '');
    if (!base || !key) throw new Error('Chybí veřejná Supabase konfigurace.');
    const response = await fetch(base + '/rest/v1/rpc/' + RPC_NAME, {
      method: 'POST',
      cache: 'no-store',
      headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: '{}'
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload && (payload.message || payload.error_description || payload.hint);
      throw new Error('Databázová záloha selhala' + (message ? ': ' + message : ' (HTTP ' + response.status + ')'));
    }
    if (!payload || payload.format !== 'rak-complete-backup-v1') throw new Error('Supabase vrátila nečekaný formát úplné zálohy.');
    return payload;
  }

  function rawRepoUrl(path) {
    return 'https://raw.githubusercontent.com/' + RAK_COMPLETE_BACKUP_REPO + '/' + encodeURIComponent(RAK_COMPLETE_BACKUP_BUILD_SHA) + '/' + encodePath(path);
  }

  async function fetchArrayBuffer(url, label) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Nepodařilo se stáhnout ' + label + ' (HTTP ' + response.status + ').');
    return await response.arrayBuffer();
  }

  async function mapConcurrent(items, limit, worker) {
    const list = Array.from(items || []);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(Math.max(1, limit || 1), Math.max(1, list.length)) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= list.length) return;
        await worker(list[index], index);
      }
    });
    await Promise.all(runners);
  }

  async function addRepositorySnapshot(zip, progress) {
    if (!/^[0-9a-f]{40}$/i.test(RAK_COMPLETE_BACKUP_BUILD_SHA)) throw new Error('Chybí přesný Git SHA tohoto buildu.');
    const files = Array.from(RAK_COMPLETE_BACKUP_REPO_FILES || []);
    if (!files.length) throw new Error('Build neobsahuje seznam souborů repozitáře.');
    let done = 0;
    await mapConcurrent(files, MAX_PARALLEL_FETCHES, async (path) => {
      const data = await fetchArrayBuffer(rawRepoUrl(path), 'repo/' + path);
      zip.file('repository/' + path, data, { binary: true });
      done += 1;
      if (done === files.length || done % 10 === 0) progress('Zdrojové soubory GitHubu: ' + done + '/' + files.length);
    });
    return files.length;
  }

  function deployedFileInventory() {
    const js = Array.isArray(window.EXPORT_JS_FILES) ? window.EXPORT_JS_FILES : [];
    const text = Array.isArray(window.EXPORT_TEXT_FILES) ? window.EXPORT_TEXT_FILES : [];
    const binary = window.EXPORT_BINARY_FILES && typeof window.EXPORT_BINARY_FILES[Symbol.iterator] === 'function' ? Array.from(window.EXPORT_BINARY_FILES) : [];
    const textSet = new Set(['index.html'].concat(js, text, ['rak-complete-backup.js']));
    binary.forEach((item) => textSet.delete(item));
    return { text: Array.from(textSet).filter(Boolean), binary: Array.from(new Set(binary)).filter(Boolean) };
  }

  async function addDeployedSnapshot(zip, progress) {
    if (typeof window.readExportText !== 'function' || typeof window.readExportBinary !== 'function') throw new Error('Exportní čtečky aplikace nejsou připravené.');
    const inventory = deployedFileInventory();
    let done = 0;
    const total = inventory.text.length + inventory.binary.length;
    for (const path of inventory.text) {
      zip.file('deployed-app/' + path, await window.readExportText(path));
      done += 1;
      if (done === total || done % 15 === 0) progress('Nasazená PWA: ' + done + '/' + total);
    }
    for (const path of inventory.binary) {
      zip.file('deployed-app/' + path, await window.readExportBinary(path), { binary: true });
      done += 1;
      if (done === total || done % 15 === 0) progress('Nasazená PWA: ' + done + '/' + total);
    }
    return total;
  }

  function addJson(zip, path, value) {
    zip.file(path, JSON.stringify(value == null ? null : value, null, 2));
  }

  function sqlFromDefinitions(items, key) {
    return (Array.isArray(items) ? items : []).map((item) => String(item && item[key] || '').trim()).filter(Boolean).join('\n\n') + '\n';
  }

  function addSupabaseSnapshotFiles(zip, snapshot) {
    const data = snapshot && snapshot.data || {};
    const publicData = data.public && typeof data.public === 'object' ? data.public : {};
    addJson(zip, 'supabase/complete-snapshot.json', snapshot);
    Object.keys(publicData).sort().forEach((table) => addJson(zip, 'supabase/data/public/' + safePart(table) + '.json', publicData[table]));
    addJson(zip, 'supabase/auth/users-sanitized.json', data.auth && data.auth.users_sanitized || []);
    addJson(zip, 'supabase/auth/identities-sanitized.json', data.auth && data.auth.identities_sanitized || []);
    addJson(zip, 'supabase/storage/metadata.json', data.storage || { buckets: [], objects: [] });
    addJson(zip, 'supabase/schema/schema-metadata.json', snapshot.schema || {});
    const schema = snapshot.schema || {};
    zip.file('supabase/schema/functions.sql', sqlFromDefinitions(schema.functions, 'definition'));
    zip.file('supabase/schema/triggers.sql', sqlFromDefinitions(schema.triggers, 'definition'));
    return Object.keys(publicData).length;
  }

  async function addStorageObjectBytes(zip, snapshot, token, progress) {
    const cfg = window.SUPABASE_CONFIG || {};
    const base = String(cfg.url || '').replace(/\/$/, '');
    const key = String(cfg.publishableKey || '');
    const objects = snapshot && snapshot.data && snapshot.data.storage && Array.isArray(snapshot.data.storage.objects) ? snapshot.data.storage.objects : [];
    let done = 0;
    for (const object of objects) {
      const bucket = String(object && object.bucket_id || '');
      const name = String(object && object.name || '');
      if (!bucket || !name) throw new Error('Storage metadata obsahují neúplný objekt.');
      const url = base + '/storage/v1/object/authenticated/' + encodeURIComponent(bucket) + '/' + encodePath(name);
      const response = await fetch(url, { cache: 'no-store', headers: { apikey: key, Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Úplná záloha se zastavila: Storage objekt ' + bucket + '/' + name + ' nelze stáhnout (HTTP ' + response.status + ').');
      zip.file('supabase/storage-files/' + safePart(bucket) + '/' + name.split('/').map(safePart).join('/'), await response.arrayBuffer(), { binary: true });
      done += 1;
      progress('Supabase Storage: ' + done + '/' + objects.length);
    }
    return objects.length;
  }

  function buildRestoreReadme(snapshot, metrics) {
    const exclusions = Array.isArray(snapshot && snapshot.sensitive_exclusions) ? snapshot.sensitive_exclusions : [];
    return [
      'RaK – ÚPLNÁ ZÁLOHA / DISASTER RECOVERY',
      '========================================',
      '',
      'Vytvořeno: ' + String(snapshot && snapshot.generated_at || new Date().toISOString()),
      'RaK verze: ' + String(window.RAK_RELEASE_VERSION || window.RAK_TEST_DISPLAY_VERSION || '—'),
      'Git SHA: ' + RAK_COMPLETE_BACKUP_BUILD_SHA,
      'Supabase projekt: ' + String((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '').replace(/^https?:\/\//, '').split('.')[0],
      '',
      'OBSAH',
      '-----',
      'repository/            přesný zdrojový stav GitHub repozitáře pro uvedený SHA',
      'deployed-app/          skutečně nasazená/transformovaná PWA verze',
      'supabase/data/         aktuální data aplikačních tabulek',
      'supabase/auth/         sanitizovaný přehled Auth uživatelů/identit',
      'supabase/schema/       struktura DB, RLS policies, RPC, grants, triggery, indexy...',
      'supabase/storage/      metadata Storage',
      'supabase/storage-files/ fyzické Storage soubory, pokud existovaly',
      'backup-manifest.json   souhrn a kontrolní počty',
      '',
      'OBNOVA – DOPORUČENÉ POŘADÍ',
      '---------------------------',
      '1. Obnov repository/ do Git repozitáře na uvedeném SHA.',
      '2. V novém Supabase projektu aplikuj SQL migrace z repository/supabase/migrations/ v pořadí.',
      '3. Zkontroluj supabase/schema/schema-metadata.json proti nové DB (RLS, RPC, grants, triggery, extensions, realtime publikace).',
      '4. Nahraj aplikační data ze supabase/data/public/.',
      '5. Auth účty znovu vytvoř/nastav přístupová hesla. Sanitizovaný Auth snapshot slouží jako seznam a metadata, ne jako kopie aktivních přihlašovacích údajů.',
      '6. Pokud existují soubory ve supabase/storage-files/, vytvoř odpovídající bucket(y) a soubory nahraj zpět.',
      '7. Znovu nastav Supabase/Vercel tajné klíče a environment proměnné. Ty se z bezpečnostních důvodů nezálohují.',
      '8. Nasaď aplikaci a proveď critical runtime + security smoke.',
      '',
      'ZÁMĚRNĚ NEZAHRNUTO',
      '------------------',
      ...(exclusions.length ? exclusions.map((x) => '- ' + x) : ['- aktivní tajné klíče a relace']),
      '',
      'POZNÁMKA',
      '--------',
      'Tento balík je úplná obnovovací záloha RaK se záměrnou redakcí aktivních tajemství.',
      'Pro maximálně věrnou platformní kopii interních Supabase Auth/system tabulek lze navíc použít oficiální Supabase db dump (roles + schema + data).',
      '',
      'KONTROLNÍ POČTY',
      '---------------',
      'Repo souborů: ' + String(metrics.repositoryFiles || 0),
      'Nasazených PWA souborů: ' + String(metrics.deployedFiles || 0),
      'Aplikačních tabulek: ' + String(metrics.publicTables || 0),
      'Storage objektů: ' + String(metrics.storageObjects || 0),
      ''
    ].join('\n');
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  async function createCompleteBackup() {
    if (!isOwnerUi()) throw new Error('Úplnou zálohu může vytvořit jen hlavní admin.');
    if (!navigator.onLine) throw new Error('Úplná záloha vyžaduje připojení k internetu.');
    const JSZip = await ensureZip();
    status('Připravuji úplnou zálohu…');
    const token = await ownerAccessToken();
    status('Načítám aktuální Supabase data a strukturu…');
    const snapshot = await fetchCompleteSnapshot(token);
    const zip = new JSZip();
    const metrics = { repositoryFiles: 0, deployedFiles: 0, publicTables: 0, storageObjects: 0 };
    const progress = (text) => status(text);
    metrics.publicTables = addSupabaseSnapshotFiles(zip, snapshot);
    metrics.storageObjects = await addStorageObjectBytes(zip, snapshot, token, progress);
    status('Stahuji přesný zdrojový snapshot GitHubu…');
    metrics.repositoryFiles = await addRepositorySnapshot(zip, progress);
    status('Přidávám skutečně nasazenou PWA…');
    metrics.deployedFiles = await addDeployedSnapshot(zip, progress);
    const manifest = {
      format: 'rak-one-click-complete-backup-v1',
      createdAt: new Date().toISOString(),
      appVersion: String(window.RAK_RELEASE_VERSION || window.RAK_TEST_DISPLAY_VERSION || ''),
      pwaBuild: String(window.RAK_PWA_BUILD || ''),
      git: { repository: RAK_COMPLETE_BACKUP_REPO, sha: RAK_COMPLETE_BACKUP_BUILD_SHA },
      supabaseProjectRef: String((window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '').replace(/^https?:\/\//, '').split('.')[0],
      metrics,
      sensitiveExclusions: snapshot.sensitive_exclusions || [],
      restoreReadme: 'README-OBNOVA.txt'
    };
    addJson(zip, 'backup-manifest.json', manifest);
    zip.file('README-OBNOVA.txt', buildRestoreReadme(snapshot, metrics));
    status('Komprimuji úplnou zálohu…');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => {
      if (meta && Number.isFinite(meta.percent)) status('Komprimuji úplnou zálohu… ' + Math.round(meta.percent) + ' %');
    });
    const fileName = 'RaK_uplna_zaloha_' + timestampForFile(new Date()) + '.zip';
    triggerDownload(blob, fileName);
    status('Úplná záloha připravena ✓ · ' + bytesLabel(blob.size) + ' · ' + metrics.repositoryFiles + ' repo souborů · ' + metrics.publicTables + ' DB tabulek · ' + metrics.storageObjects + ' Storage souborů');
    return { ok: true, blobSize: blob.size, fileName, metrics, manifest };
  }

  window.rakCreateCompleteBackup = createCompleteBackup;
  window.getRakCompleteBackupHealth = function getRakCompleteBackupHealth() {
    return { ready: typeof window.rakCreateCompleteBackup === 'function', repositoryFileCount: RAK_COMPLETE_BACKUP_REPO_FILES.length, buildSha: RAK_COMPLETE_BACKUP_BUILD_SHA, rpc: RPC_NAME, secretRedaction: true, storageBytesRequired: true, mode: 'one-click-disaster-recovery-v1' };
  };

  document.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-admin-action="create-complete-rak-backup"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.dataset.rakCompleteBackupRunning === '1') return;
    if (!isOwnerUi()) {
      status('Úplnou zálohu může vytvořit jen hlavní admin.');
      return;
    }
    if (!confirm('Vytvořit jednu úplnou zálohu RaK? ZIP bude obsahovat zdroj aplikace, nasazenou PWA, aktuální data Supabase, DB strukturu/RLS/RPC a Storage. Tajné klíče a aktivní relace se z bezpečnostních důvodů nezahrnou.')) return;
    target.dataset.rakCompleteBackupRunning = '1';
    target.disabled = true;
    createCompleteBackup().catch((err) => {
      const message = err && err.message ? err.message : String(err || 'Neznámá chyba');
      status('Úplná záloha selhala: ' + message);
      try { alert('Úplná záloha RaK se nepovedla: ' + message); } catch (_) {}
    }).finally(() => {
      delete target.dataset.rakCompleteBackupRunning;
      target.disabled = false;
    });
  }, true);
})();
