// RaK development v1.5.28 – XLSX a JSZip se načítají až ve chvíli, kdy je uživatel opravdu potřebuje.
(function installRakLazyExternalLibraries() {
  const specs = Object.freeze({
    xlsx: Object.freeze({
      globalName: 'XLSX',
      src: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
      integrity: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw'
    }),
    jszip: Object.freeze({
      globalName: 'JSZip',
      src: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      integrity: 'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG'
    })
  });

  const pending = window.__RAK_LAZY_EXTERNAL_PROMISES__ || (window.__RAK_LAZY_EXTERNAL_PROMISES__ = Object.create(null));
  window.__RAK_LAZY_EXTERNAL_LIBS__ = specs;

  function note(name, status, src) {
    try {
      if (typeof window.rakNoteExternalDependency === 'function') {
        window.rakNoteExternalDependency(name, status, src);
        return;
      }
      window.__RAK_EXTERNAL_DEP_STATUS__ = window.__RAK_EXTERNAL_DEP_STATUS__ || {};
      window.__RAK_EXTERNAL_DEP_STATUS__[name] = { status, src, at: new Date().toISOString() };
    } catch (err) {}
  }

  function isReady(spec) {
    return !!(spec && spec.globalName && window[spec.globalName]);
  }

  function ensureExternalLibrary(name) {
    const key = String(name || '').trim().toLowerCase();
    const spec = specs[key];
    if (!spec) return Promise.reject(new Error('Neznámá externí knihovna: ' + key));
    if (isReady(spec)) {
      note(key, 'loaded', spec.src);
      return Promise.resolve(window[spec.globalName]);
    }
    if (pending[key]) return pending[key];

    pending[key] = new Promise((resolve, reject) => {
      note(key, 'loading', spec.src);
      let script = document.querySelector('script[data-rak-lazy-lib="' + key + '"]');
      if (!script) {
        script = document.createElement('script');
        script.src = spec.src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.integrity = spec.integrity;
        script.dataset.rakLazyLib = key;
        document.head.appendChild(script);
      }

      const finishOk = () => {
        if (!isReady(spec)) {
          finishError(new Error('Knihovna ' + key + ' se stáhla, ale není dostupná.'));
          return;
        }
        note(key, 'loaded', spec.src);
        resolve(window[spec.globalName]);
      };
      const finishError = (error) => {
        const err = error instanceof Error ? error : new Error('Nepodařilo se načíst knihovnu ' + key + '.');
        note(key, 'failed', spec.src);
        delete pending[key];
        reject(err);
      };

      script.addEventListener('load', finishOk, { once: true });
      script.addEventListener('error', () => finishError(new Error('Nepodařilo se načíst knihovnu ' + key + '.')), { once: true });
    });
    return pending[key];
  }

  window.rakEnsureExternalLibrary = ensureExternalLibrary;
  note('xlsx', 'deferred', specs.xlsx.src);
  note('jszip', 'deferred', specs.jszip.src);

  function wrapAsyncGlobal(name, libraryKey) {
    const original = window[name];
    if (typeof original !== 'function' || original.__rakLazyExternalWrapped) return;
    const wrapped = async function(...args) {
      await ensureExternalLibrary(libraryKey);
      return original.apply(this, args);
    };
    wrapped.__rakLazyExternalWrapped = true;
    wrapped.__rakLazyExternalOriginal = original;
    window[name] = wrapped;
  }

  wrapAsyncGlobal('buildRakExcelImportPreview', 'xlsx');
  wrapAsyncGlobal('adminRotationGeneratorDownloadExcel', 'xlsx');
  wrapAsyncGlobal('exportCurrentHtml', 'jszip');
  wrapAsyncGlobal('triggerRakZipExport', 'jszip');

  // Staré Games soubory a jejich Memory guard už nejsou součástí nasazeného runtime.
  const deadGamePaths = new Set([
    'games-engine.js',
    'games-profile.js',
    'games-gomoku.js',
    'games-classic.js',
    'games-arcade.js',
    'gomoku-ai-smoke-v966.js',
    'styles-games.css',
    'assets/nav-icons/games-gray.png',
    'assets/nav-icons/games-green.png',
    'app-usage-smoke-v963.js',
    'styles-overrides.css',
    'assets/docs/sql/supabase_app_usage_v963.sql',
    'assets/rak-memory-total-time-fix.js'
  ]);
  try {
    if (window.EXPORT_SOURCE_IDS && typeof window.EXPORT_SOURCE_IDS === 'object') {
      deadGamePaths.forEach((path) => { delete window.EXPORT_SOURCE_IDS[path]; });
      window.EXPORT_SOURCE_IDS['rak-lazy-external-libs.js'] = 'src-rak-lazy-external-libs-js';
    }
    if (Array.isArray(window.EXPORT_JS_FILES)) {
      window.EXPORT_JS_FILES = window.EXPORT_JS_FILES.filter((path) => !deadGamePaths.has(path));
      if (!window.EXPORT_JS_FILES.includes('rak-lazy-external-libs.js')) window.EXPORT_JS_FILES.push('rak-lazy-external-libs.js');
    }
    if (Array.isArray(window.EXPORT_TEXT_FILES)) {
      window.EXPORT_TEXT_FILES = window.EXPORT_TEXT_FILES.filter((path) => !deadGamePaths.has(path));
    }
    if (window.EXPORT_BINARY_FILES && typeof window.EXPORT_BINARY_FILES.delete === 'function') {
      deadGamePaths.forEach((path) => window.EXPORT_BINARY_FILES.delete(path));
    }
  } catch (err) {
    console.warn('RaK export manifest cleanup selhal', err);
  }

  // Přímé události jsou pojistka pro historické handlery, které si drží původní funkci v closure.
  document.addEventListener('change', async (event) => {
    const input = event.target;
    if (!input || input.id !== 'excelFile' || input.dataset.rakLazyExternalReplay === '1' || window.XLSX) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await ensureExternalLibrary('xlsx');
      input.dataset.rakLazyExternalReplay = '1';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
      alert('Excel knihovnu se nepodařilo načíst: ' + (err && err.message ? err.message : String(err)));
    } finally {
      delete input.dataset.rakLazyExternalReplay;
    }
  }, true);

  document.addEventListener('click', async (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-admin-action],[data-menu-action],#exportBtn') : null;
    if (!target || target.dataset.rakLazyExternalReplay === '1') return;
    const adminAction = String(target.getAttribute('data-admin-action') || '').trim();
    const menuAction = String(target.getAttribute('data-menu-action') || '').trim();
    const needsXlsx = adminAction === 'generator-download-excel' || adminAction === 'admin-download-rotation-excel';
    const needsJsZip = adminAction === 'export' || menuAction === 'export' || target.id === 'exportBtn';
    const libraryKey = needsXlsx ? 'xlsx' : (needsJsZip ? 'jszip' : '');
    if (!libraryKey || (libraryKey === 'xlsx' ? window.XLSX : window.JSZip)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await ensureExternalLibrary(libraryKey);
      target.dataset.rakLazyExternalReplay = '1';
      target.click();
    } catch (err) {
      const label = libraryKey === 'xlsx' ? 'Excel' : 'ZIP';
      alert(label + ' knihovnu se nepodařilo načíst: ' + (err && err.message ? err.message : String(err)));
    } finally {
      delete target.dataset.rakLazyExternalReplay;
    }
  }, true);

  window.getRakLazyExternalLibrariesHealth = function getRakLazyExternalLibrariesHealth() {
    return {
      xlsx: { ready: !!window.XLSX, status: String(window.__RAK_EXTERNAL_DEP_STATUS__?.xlsx?.status || 'deferred') },
      jszip: { ready: !!window.JSZip, status: String(window.__RAK_EXTERNAL_DEP_STATUS__?.jszip?.status || 'deferred') },
      loaderReady: typeof window.rakEnsureExternalLibrary === 'function',
      mode: 'lazy-on-demand-v1.5.28'
    };
  };
})();