// RaK 1.2 (1.155) – runtime guardy aplikace oddělené z app.js.
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-runtime-guards.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}

(function setupRakAppLikeTextSelectionGuard() {
  if (window.__rakAppLikeTextSelectionGuard) return;
  window.__rakAppLikeTextSelectionGuard = true;
  const isEditableTarget = (target) => {
    try {
      return !!(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], .allowTextSelect, .selectableText'));
    } catch (err) { return false; }
  };
  const preventSelection = (ev) => {
    if (isEditableTarget(ev && ev.target)) return;
    ev.preventDefault();
  };
  document.addEventListener('selectstart', preventSelection, { capture: true });
  document.addEventListener('dragstart', preventSelection, { capture: true });
})();

(function setupRakCalcNumericKeyboard() {
  if (window.__rakCalcNumericKeyboardGuard) return;
  window.__rakCalcNumericKeyboardGuard = true;
  const selector = '#soustruhy input, #frezky input, #brusy input, .calcPage input';
  const apply = () => {
    try {
      document.querySelectorAll(selector).forEach((input) => {
        const type = String(input.getAttribute('type') || '').toLowerCase();
        if (type === 'file' || type === 'hidden' || type === 'checkbox' || type === 'radio') return;
        input.setAttribute('inputmode', 'decimal');
        input.setAttribute('pattern', '[0-9]*[,.]?[0-9]*');
        input.setAttribute('autocomplete', 'off');
      });
    } catch (err) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }
})();
(function setupErrorCapture() {
  const LOG_KEY = "rotace_err_log_v1";
  const MAX = 50;
  const readLog = () => {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); }
    catch (e) { return []; }
  };
  const writeLog = (arr) => {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(-MAX))); } catch (e) {}
  };
  const push = (entry) => {
    const log = readLog();
    log.push(Object.assign({ ts: new Date().toISOString(), ver: (window.APP_VERSION || "?") }, entry));
    writeLog(log);
  };
  window.addEventListener("error", (ev) => {
    push({
      type: "error",
      msg: String(ev.message || ev.error || ""),
      src: String(ev.filename || ""),
      line: ev.lineno || 0,
      col: ev.colno || 0,
      stack: ev.error && ev.error.stack ? String(ev.error.stack).slice(0, 2000) : ""
    });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    push({
      type: "promise",
      msg: r && r.message ? String(r.message) : String(r),
      stack: r && r.stack ? String(r.stack).slice(0, 2000) : ""
    });
  });
  window.__rotaceDiag = function () {
    const log = readLog();
    const info = {
      version: window.APP_VERSION || "?",
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      time: new Date().toISOString(),
      errors: log
    };
    try {
      navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    } catch (e) {}
    return info;
  };
  window.__rotaceClearLog = function () {
    writeLog([]);
  };
})();
