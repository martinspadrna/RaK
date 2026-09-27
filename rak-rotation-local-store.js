// RaK local-first Rotation storage. No Supabase client, fetch, realtime or remote writes.
(function installRakRotationLocalStore(root) {
  'use strict';
  if (!root || root.RakRotationLocalStore) return;

  const LOCAL_STATE_KEY = 'rotace_supabase_local_state_v1';
  const LOCAL_ROTATION_KEY = 'rotace_kalkulacky_state_v123';
  const DURABLE_ROTATION_CACHE = 'rotace-offline-data-v1';
  const DURABLE_ROTATION_REQUEST = './__rak/offline/rotation-state-v1.json';

  function validRotation(value) {
    return !!(value && typeof value === 'object' && value.months && typeof value.months === 'object');
  }

  function safeReadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function safeWriteJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  function fingerprint(rotation) {
    let json = '';
    try { json = JSON.stringify(rotation); } catch (_) { return ''; }
    let hash = 2166136261;
    for (let i = 0; i < json.length; i += 1) {
      hash ^= json.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return json.length.toString(36) + ':' + (hash >>> 0).toString(36);
  }

  function normalizeMeta(raw, fallbackSavedAt, payload) {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      schema: 2,
      savedAt: Math.max(0, Number(base.savedAt || fallbackSavedAt || 0) || 0),
      revision: Math.max(0, Number(base.revision || 0) || 0),
      remoteUpdatedAt: String(base.remoteUpdatedAt || base.updatedAt || '').slice(0, 80),
      source: String(base.source || 'local-cache').slice(0, 40),
      fingerprint: String(base.fingerprint || fingerprint(payload)).slice(0, 80)
    };
  }

  function readCanonical() {
    const rotation = safeReadJson(LOCAL_ROTATION_KEY, null);
    return validRotation(rotation) ? rotation : null;
  }

  function writeCanonical(rotation) {
    if (!validRotation(rotation)) return false;
    let expected = '';
    try { expected = JSON.stringify(rotation); } catch (_) { return false; }
    if (!safeWriteJson(LOCAL_ROTATION_KEY, rotation)) return false;
    try { return localStorage.getItem(LOCAL_ROTATION_KEY) === expected; }
    catch (_) { return !!readCanonical(); }
  }

  function readSnapshot() {
    const value = safeReadJson(LOCAL_STATE_KEY, null);
    return value && typeof value === 'object' ? value : null;
  }

  function writeLocal(rotation, metadata) {
    if (!validRotation(rotation)) return false;
    const existing = readSnapshot() || {};
    const meta = normalizeMeta(metadata, Date.now(), rotation);
    if (!writeCanonical(rotation)) return false;
    const compact = Object.assign({}, existing, {
      updatedAt: Date.now(),
      rotation: null,
      rotationKey: LOCAL_ROTATION_KEY,
      rotationSavedAt: meta.savedAt,
      rotationMeta: meta
    });
    return safeWriteJson(LOCAL_STATE_KEY, compact);
  }

  function loadCachedRotationState() {
    const snapshot = readSnapshot();
    let rotation = readCanonical();
    if (!rotation && snapshot && validRotation(snapshot.rotation)) {
      rotation = snapshot.rotation;
      const migratedMeta = normalizeMeta(snapshot.rotationMeta || {}, snapshot.rotationSavedAt || snapshot.updatedAt || 0, rotation);
      writeLocal(rotation, migratedMeta);
    }
    if (!rotation) return null;
    const actual = fingerprint(rotation);
    const rawMeta = snapshot && snapshot.rotationMeta && typeof snapshot.rotationMeta === 'object' ? snapshot.rotationMeta : {};
    let meta = normalizeMeta(rawMeta, snapshot && (snapshot.rotationSavedAt || snapshot.updatedAt) || 0, rotation);
    if (rawMeta.fingerprint && String(rawMeta.fingerprint) !== actual) {
      meta = normalizeMeta({ source: 'local-cache-unverified', fingerprint: actual }, 0, rotation);
    }
    return {
      id: 'main',
      payload: rotation,
      updatedAt: meta.savedAt || null,
      revision: meta.revision,
      meta: { source: meta.source || 'local-cache', savedAt: meta.savedAt, remoteUpdatedAt: meta.remoteUpdatedAt, fingerprint: meta.fingerprint }
    };
  }

  function durableUrl() {
    try { return new URL(DURABLE_ROTATION_REQUEST, root.location.href).href; }
    catch (_) { return DURABLE_ROTATION_REQUEST; }
  }

  async function persistDurableRotationState(rotation, metadata) {
    if (!validRotation(rotation) || typeof caches === 'undefined') return false;
    const meta = normalizeMeta(metadata, Date.now(), rotation);
    try {
      const cache = await caches.open(DURABLE_ROTATION_CACHE);
      await cache.put(durableUrl(), new Response(JSON.stringify({
        schema: 2,
        savedAt: meta.savedAt,
        revision: meta.revision,
        remoteUpdatedAt: meta.remoteUpdatedAt,
        source: meta.source,
        version: root.RAK_RELEASE_VERSION || root.APP_VERSION || '',
        fingerprint: meta.fingerprint,
        payload: rotation
      }), { status: 200, headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' } }));
      return true;
    } catch (_) { return false; }
  }

  async function loadDurableRotationState() {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(DURABLE_ROTATION_CACHE);
      const response = await cache.match(durableUrl());
      if (!response) return null;
      const stored = await response.json();
      if (!validRotation(stored && stored.payload)) return null;
      const actual = fingerprint(stored.payload);
      if (stored.fingerprint && String(stored.fingerprint) !== actual) return null;
      const meta = normalizeMeta(stored, stored.savedAt || 0, stored.payload);
      return {
        id: 'main',
        payload: stored.payload,
        updatedAt: meta.savedAt || null,
        revision: meta.revision,
        meta: { source: 'durable-cache', savedAt: meta.savedAt, remoteUpdatedAt: meta.remoteUpdatedAt, fingerprint: meta.fingerprint }
      };
    } catch (_) { return null; }
  }

  function compareCandidates(a, b) {
    if (!a) return b ? -1 : 0;
    if (!b) return 1;
    const ar = Math.max(0, Number(a.revision || 0) || 0);
    const br = Math.max(0, Number(b.revision || 0) || 0);
    if (ar !== br) {
      if (ar > 0 && br === 0) return 1;
      if (br > 0 && ar === 0) return -1;
      if (ar > 0 && br > 0) return ar - br;
    }
    const at = Math.max(0, Number(a.meta && a.meta.savedAt || a.updatedAt || 0) || 0);
    const bt = Math.max(0, Number(b.meta && b.meta.savedAt || b.updatedAt || 0) || 0);
    if (at !== bt) return at - bt;
    return (String(a.meta && a.meta.source || '') === 'durable-cache' ? 1 : 0) -
      (String(b.meta && b.meta.source || '') === 'durable-cache' ? 1 : 0);
  }

  async function loadBestOfflineRotationState(options) {
    const opts = options && typeof options === 'object' ? options : {};
    let local = loadCachedRotationState();
    let durable = await loadDurableRotationState();
    const candidates = [local, durable].filter(item => item && validRotation(item.payload));
    if (!candidates.length) return null;
    let selected = candidates[0];
    for (let i = 1; i < candidates.length; i += 1) {
      if (compareCandidates(candidates[i], selected) > 0) selected = candidates[i];
    }
    if (opts.repair !== false) {
      const selectedFingerprint = fingerprint(selected.payload);
      const repairMeta = {
        savedAt: Number(selected.meta && selected.meta.savedAt || selected.updatedAt || Date.now()) || Date.now(),
        revision: Number(selected.revision || 0) || 0,
        remoteUpdatedAt: String(selected.meta && selected.meta.remoteUpdatedAt || ''),
        source: 'offline-repair',
        fingerprint: selectedFingerprint
      };
      if (!local || fingerprint(local.payload) !== selectedFingerprint) {
        writeLocal(selected.payload, repairMeta);
        local = loadCachedRotationState();
      }
      if (!durable || fingerprint(durable.payload) !== selectedFingerprint) {
        if (await persistDurableRotationState(selected.payload, repairMeta)) durable = await loadDurableRotationState();
      }
    }
    return selected;
  }

  async function persistRotationOfflineSnapshot(rotation, metadata) {
    if (!validRotation(rotation)) return { ok: false, copies: 0, local: false, durable: false, reason: 'invalid-payload' };
    const meta = normalizeMeta(metadata, Date.now(), rotation);
    const expected = fingerprint(rotation);
    const localStored = writeLocal(rotation, meta);
    const local = localStored ? loadCachedRotationState() : null;
    const localOk = !!(local && fingerprint(local.payload) === expected);
    const durableStored = await persistDurableRotationState(rotation, meta);
    const durable = durableStored ? await loadDurableRotationState() : null;
    const durableOk = !!(durable && fingerprint(durable.payload) === expected);
    const copies = Number(localOk) + Number(durableOk);
    return {
      ok: copies > 0,
      copies,
      local: localOk,
      durable: durableOk,
      revision: meta.revision,
      savedAt: meta.savedAt,
      reason: copies >= 2 ? 'verified-two-copies' : (copies === 1 ? 'verified-one-copy' : 'verification-failed')
    };
  }

  async function getRotationOfflineDiagnostics() {
    const local = loadCachedRotationState();
    const durable = await loadDurableRotationState();
    const candidates = [local, durable].filter(item => item && item.payload);
    let selected = candidates[0] || null;
    for (let i = 1; i < candidates.length; i += 1) {
      if (compareCandidates(candidates[i], selected) > 0) selected = candidates[i];
    }
    const localFingerprint = local ? fingerprint(local.payload) : '';
    const durableFingerprint = durable ? fingerprint(durable.payload) : '';
    return {
      ok: true,
      offlineReady: !!selected,
      selectedSource: selected ? String(selected.meta && selected.meta.source || 'offline-cache') : '',
      selectedRevision: selected ? Math.max(0, Number(selected.revision || 0) || 0) : 0,
      copies: Number(!!local) + Number(!!durable),
      equivalent: !!(localFingerprint && durableFingerprint && localFingerprint === durableFingerprint),
      local: {
        present: !!local,
        revision: local ? Math.max(0, Number(local.revision || 0) || 0) : 0,
        savedAt: local ? Math.max(0, Number(local.meta && local.meta.savedAt || local.updatedAt || 0) || 0) : 0,
        source: local ? String(local.meta && local.meta.source || 'local-cache') : ''
      },
      durable: {
        present: !!durable,
        revision: durable ? Math.max(0, Number(durable.revision || 0) || 0) : 0,
        savedAt: durable ? Math.max(0, Number(durable.meta && durable.meta.savedAt || durable.updatedAt || 0) || 0) : 0,
        source: durable ? String(durable.meta && durable.meta.source || 'durable-cache') : ''
      },
      storage: { localError: '', durableError: '', offlineError: '' },
      queue: null
    };
  }

  const api = Object.freeze({
    loadCachedRotationState,
    loadDurableRotationState,
    loadBestOfflineRotationState,
    persistDurableRotationState,
    persistRotationOfflineSnapshot,
    getRotationOfflineDiagnostics,
    fingerprint
  });
  root.RakRotationLocalStore = api;

  // Compatibility surface for legacy offline callers. The full Supabase bridge
  // replaces this object later, after local-ready, when remote sync is requested.
  if (!root.RotationSupabaseBridge || root.RotationSupabaseBridge.__rakLocalOnly === true) {
    root.RotationSupabaseBridge = {
      __rakLocalOnly: true,
      loadCachedRotationState,
      loadBestOfflineRotationState,
      persistRotationOfflineSnapshot,
      getRotationOfflineDiagnostics,
      loadGameAccountUiSettings: async () => ({
        __rakUnavailable: true,
        reason: (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline-cache-miss' : 'missing-client'
      })
    };
  }

  try {
    if (typeof root.rakMarkModuleReady === 'function') {
      root.rakMarkModuleReady('rak-rotation-local-store.js', 'loaded', { source: 'local-first-storage' });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);
