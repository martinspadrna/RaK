(function installRakConflictDiagnostics(root) {
  'use strict';
  if (!root || root.RAKConflictDiagnostics) return;

  const CONFLICT = Object.freeze({
    'admin-review-required':'starší administrátorská změna vyžaduje nové ověření',
    'newer-online-state':'server má novější ověřený stav',
    'oversize-task':'položka překročila bezpečný limit',
    'unknown-task':'fronta obsahuje neznámý typ položky',
    'unsupported-task':'stará položka už není podporovaná',
    'unverified-local-version':'lokální verzi nelze bezpečně ověřit',
    'write-rejected':'server zápis odmítl',
    other:'zadržený konflikt bez bezpečně rozpoznané příčiny'
  });
  const TYPES = new Set(['starší rozpis','nastavení strojů','měsíční rozpis','výsledek hry','herní statistika','vzhled profilu','rozehraná hra','hlášení chyby','neznámá položka']);
  const FAILURES = new Set(['oprávnění','časový limit','připojení','omezení serveru','nepotvrzené uložení']);

  function capture() {
    let status = null, review = null, conflicts = null;
    try { if (typeof root.getSupabaseSyncStatus === 'function') status = root.getSupabaseSyncStatus(); } catch (_) {}
    try { if (typeof root.getRakPendingSyncReview === 'function') review = root.getRakPendingSyncReview(); } catch (_) {}
    try { if (typeof root.getRakQueueConflictItems === 'function') conflicts = root.getRakQueueConflictItems(); } catch (_) {}
    const first = conflicts && conflicts.ok && Array.isArray(conflicts.items) ? conflicts.items[0] : null;
    const rawReason = String(first && first.reason || '');
    const conflict = Object.prototype.hasOwnProperty.call(CONFLICT, rawReason) ? rawReason : (first ? 'other' : 'none');
    const queueIssue = status && status.queueIssue || {};
    const type = TYPES.has(String(first && first.label || '')) ? String(first.label)
      : TYPES.has(String(queueIssue.label || '')) ? String(queueIssue.label) : 'neznámá položka';
    const failure = FAILURES.has(String(queueIssue.failure || '')) ? String(queueIssue.failure) : 'nepotvrzené uložení';
    const storageIssue = !!(status && status.storageIssue) || !!(review && review.storageIssue)
      || !!(conflicts && conflicts.ok === false);
    const held = Math.max(0, Number(review && review.held || status && status.conflictCount || 0));
    const total = Math.max(0, Number(review && review.total || status && status.queued || 0));
    const retryable = Math.max(0, Number(review && review.retryable || 0));
    const remoteVerified = !!(review && review.remoteVerified) || !!(status && status.verified);
    const appState = status && status.kind === 'offline' ? 'offline'
      : status && status.kind === 'error' ? 'sync-error'
      : remoteVerified ? 'remote-verified' : 'remote-unverified';
    let cause = 'none';
    if (storageIssue) cause = 'queue-storage';
    else if (conflict !== 'none') cause = 'held-' + conflict;
    else if (queueIssue && Number(queueIssue.retries || 0) > 0) cause = 'retry-' + failure;
    else if (appState === 'offline') cause = 'offline';
    else if (appState === 'sync-error') cause = 'sync-error';
    else if (!remoteVerified) cause = 'remote-unverified';
    const offline = status && status.offlineError === 'rotation-offline-write-failed' ? 'write-failed'
      : status && status.offlineError === 'rotation-offline-single-copy' ? 'limited' : 'ok';
    return Object.freeze({
      schema:'rak-conflict-diagnostic-v1',
      hasIssue:cause !== 'none' || held > 0 || storageIssue,
      appState,remoteVerified,total,held,retryable,type,conflict,failure,storageIssue,offline,cause,
      serverContentCompared:false
    });
  }

  function format(d) {
    const app={offline:'offline','sync-error':'online/sync chyba','remote-verified':'online stav ověřen','remote-unverified':'online stav zatím neověřen'};
    const cause=d.storageIssue?'chyba nebo neověřitelný stav lokální fronty'
      :d.conflict&&d.conflict!=='none'?(CONFLICT[d.conflict]||CONFLICT.other)
      :String(d.cause||'').startsWith('retry-')?'čekající změna dříve selhala: '+d.failure
      :d.cause==='offline'?'zařízení je offline'
      :d.cause==='sync-error'?'poslední synchronizace selhala'
      :d.cause==='remote-unverified'?'online stav zatím nebyl čerstvě ověřen'
      :'příčinu nelze bezpečně určit';
    return ['RaK 1.7.136 – bezpečná diagnostika konfliktu',
      'Stav aplikace: '+(app[d.appState]||'neznámý'),
      'Fronta: celkem '+d.total+' · zadržené '+d.held+' · ostatní '+d.retryable,
      'Úložiště fronty: '+(d.storageIssue?'chyba / nelze ověřit':'v pořádku'),
      'Offline kopie: '+(d.offline==='write-failed'?'zápis offline kopie selhal':d.offline==='limited'?'ověřena jen jedna offline kopie':'v pořádku'),
      'Typ položky: '+d.type,
      'Příčina: '+cause,
      'Online načtení: '+(d.remoteVerified?'ověřeno':'neověřeno'),
      'Obsah serveru a telefonu nebyl porovnán.',
      'Diagnostika nic nemaže ani nezapisuje.'].join('\n');
  }

  root.RAKConflictDiagnostics = Object.freeze({capture,format});
})(typeof window !== 'undefined' ? window : globalThis);
