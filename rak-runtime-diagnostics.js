(function installRakRuntimeDiagnostics(root) {
  'use strict';

  const scope = root || (typeof globalThis !== 'undefined' ? globalThis : null);
  if (!scope || (scope.RAK_DIAGNOSTICS && scope.RAK_DIAGNOSTICS.installed)) return;

  const consoleObject = scope.console && typeof scope.console === 'object' ? scope.console : null;
  const levels = ['debug', 'info', 'log', 'warn', 'error'];
  const original = Object.create(null);
  const errorKinds = [
    ['type-error', typeof TypeError !== 'undefined' ? TypeError : null],
    ['range-error', typeof RangeError !== 'undefined' ? RangeError : null],
    ['reference-error', typeof ReferenceError !== 'undefined' ? ReferenceError : null],
    ['syntax-error', typeof SyntaxError !== 'undefined' ? SyntaxError : null],
    ['uri-error', typeof URIError !== 'undefined' ? URIError : null]
  ];

  function boundedLength(value, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.min(Math.floor(number), maximum);
  }

  function ownDataValue(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value') ? descriptor.value : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function classifyCode(value) {
    const code = typeof value === 'string' || typeof value === 'number' ? String(value).trim().toUpperCase() : '';
    if (!code) return '';
    if (code === '40001') return 'revision-conflict';
    if (code === '42501') return 'authorization';
    if (code === '22023') return 'invalid-request';
    if (code === '429') return 'rate-limit';
    if (/^PGRST\d{3}$/.test(code)) return 'data-api';
    if (/^(?:401|403)$/.test(code)) return 'authorization';
    if (/^RAK_(?:MACHINE|ROTATION|REVISION|CONFLICT|AUTH|SESSION|OFFLINE|QUEUE|BACKUP|REPORT)/.test(code)) return 'application';
    return 'other';
  }

  function classifyCategory(label) {
    const text = typeof label === 'string' ? label.toLowerCase() : '';
    if (/service worker|\bsw\b|update/.test(text)) return 'service-worker';
    if (/supabase|sync|realtime|online|reconnect/.test(text)) return 'sync';
    if (/auth|login|profile|account|session/.test(text)) return 'account';
    if (/admin|report|backup/.test(text)) return 'admin';
    if (/dashboard|home/.test(text)) return 'dashboard';
    if (/navigation|page|menu|tile|bottom nav/.test(text)) return 'navigation';
    if (/appearance|theme/.test(text)) return 'appearance';
    if (/audit|self-test|health|performance/.test(text)) return 'audit';
    if (/export|excel|zip/.test(text)) return 'export';
    if (/rotation|rotace|rozpis|absence/.test(text)) return 'rotation';
    if (/game|gomoku|ttt|invite/.test(text)) return 'game';
    if (/storage|cache/.test(text)) return 'storage';
    if (/boot|startup|load|preload|init/.test(text)) return 'boot';
    return 'runtime';
  }

  function errorKind(value) {
    for (const [kind, constructor] of errorKinds) {
      try {
        if (constructor && value instanceof constructor) return kind;
      } catch (_) {}
    }
    try {
      if (typeof Error !== 'undefined' && value instanceof Error) return 'error';
    } catch (_) {}
    return '';
  }

  function sanitizeValue(value) {
    if (value === null) return Object.freeze({ kind: 'null' });
    const type = typeof value;
    if (type === 'undefined') return Object.freeze({ kind: 'undefined' });
    if (type === 'string') return Object.freeze({ kind: 'text', length: boundedLength(value.length, 1000000), redacted: true });
    if (type === 'number') return Object.freeze({ kind: 'number', redacted: true });
    if (type === 'bigint') return Object.freeze({ kind: 'bigint', redacted: true });
    if (type === 'boolean') return Object.freeze({ kind: 'boolean' });
    if (type === 'symbol') return Object.freeze({ kind: 'symbol' });
    if (type === 'function') return Object.freeze({ kind: 'function' });

    if (Array.isArray(value)) {
      return Object.freeze({ kind: 'array', count: boundedLength(value.length, 1000000) });
    }

    const metadata = { kind: errorKind(value) || 'object' };
    try { metadata.keyCount = boundedLength(Object.keys(value).length, 1000000); } catch (_) { metadata.keyCount = 0; }

    const codeClass = classifyCode(ownDataValue(value, 'code'));
    if (codeClass) metadata.codeClass = codeClass;

    const status = ownDataValue(value, 'status');
    if (Number.isInteger(status) && status >= 100 && status <= 599) metadata.httpStatus = status;

    let aggregateCount = 0;
    try {
      for (const key of Object.keys(value).slice(0, 64)) {
        if (!/(?:^|_)(?:count|length|size)$/i.test(key)) continue;
        const item = ownDataValue(value, key);
        if (Number.isInteger(item) && item >= 0) aggregateCount += Math.min(item, 1000000);
      }
    } catch (_) {}
    if (aggregateCount) metadata.aggregateCount = Math.min(aggregateCount, 1000000);

    return Object.freeze(metadata);
  }

  function safeRecord(level, args) {
    const list = Array.isArray(args) ? args : Array.from(args || []);
    const firstIsLabel = typeof list[0] === 'string';
    return Object.freeze({
      level: levels.includes(level) ? level : 'log',
      category: classifyCategory(firstIsLabel ? list[0] : ''),
      detailCount: Math.max(0, list.length - (firstIsLabel ? 1 : 0)),
      details: Object.freeze(list.slice(firstIsLabel ? 1 : 0, 9).map(sanitizeValue))
    });
  }

  function emit(level, args) {
    const method = original[level] || original.log;
    if (!method) return false;
    try {
      method('[RaK diagnostics]', safeRecord(level, args));
      return true;
    } catch (_) {
      return false;
    }
  }

  if (consoleObject) {
    for (const level of levels) {
      try {
        const method = consoleObject[level];
        if (typeof method === 'function') original[level] = method.bind(consoleObject);
      } catch (_) {}
    }
    for (const level of levels) {
      try {
        consoleObject[level] = function rakSanitizedConsoleMethod() {
          emit(level, Array.from(arguments));
        };
      } catch (_) {}
    }
  }


  const rejectedOperationNames = new Set([
    'auth-user',
    'admin-context',
    'admin-audit-read',
    'owner-profile-read',
    'rotation-save',
    'unplanned-absence'
  ]);

  function diagnoseRejectedOperation(operation, value) {
    const safeOperation = rejectedOperationNames.has(String(operation || '')) ? String(operation) : 'other';
    const codeClass = classifyCode(ownDataValue(value, 'code'));
    const status = ownDataValue(value, 'status');
    const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0;
    let reason = 'operation-rejected';
    if (codeClass === 'revision-conflict' || httpStatus === 409) reason = 'revision-conflict';
    else if (codeClass === 'authorization' || httpStatus === 401 || httpStatus === 403) reason = httpStatus === 401 ? 'authentication-required' : 'permission-denied';
    else if (codeClass === 'invalid-request' || httpStatus === 400 || httpStatus === 422) reason = 'invalid-request';
    else if (codeClass === 'rate-limit' || httpStatus === 429) reason = 'rate-limited';
    else if (httpStatus === 404) reason = 'endpoint-unavailable';
    else if (codeClass === 'data-api') reason = 'data-api-rejected';
    return Object.freeze({
      operation: safeOperation,
      reason,
      codeClass: codeClass || 'none',
      httpStatus
    });
  }

  const api = Object.freeze({
    installed: true,
    policy: 'aggregate-only-v1',
    sanitizeError: sanitizeValue,
    sanitizeValue,
    diagnoseRejectedOperation,
    safeLog(level, category, value) {
      return emit(level, arguments.length >= 3 ? [String(category || ''), value] : [String(category || '')]);
    }
  });
  scope.RAK_DIAGNOSTICS = api;
  scope.rakSafeLog = api.safeLog;

  if (typeof scope.addEventListener === 'function') {
    scope.addEventListener('error', function onRakRuntimeError(event) {
      emit('error', ['Unhandled runtime error', event && event.error ? event.error : null]);
      try { if (event && typeof event.preventDefault === 'function') event.preventDefault(); } catch (_) {}
    }, true);
    scope.addEventListener('unhandledrejection', function onRakUnhandledRejection(event) {
      emit('error', ['Unhandled promise rejection', event ? event.reason : null]);
      try { if (event && typeof event.preventDefault === 'function') event.preventDefault(); } catch (_) {}
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
