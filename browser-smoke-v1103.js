#!/usr/bin/env node
// RaK 1.2 (1.289) – browser smoke test přes lokální Chromium/CDP.
// Browser smoke coverage: Rotace export canvas + fixed background + file URL fallback.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT_DIR = __dirname;
const EXPECTED_APP_VERSION = '1.5';
const RAK_BROWSER_SMOKE_ENGINE = 'local-chromium-cdp';
const RAK_BROWSER_SMOKE_LOAD_MODE = 'about-blank-inline-html';
const CHROMIUM_BIN = process.env.CHROMIUM_BIN || process.env.CHROME_BIN || '/usr/bin/chromium';
const VIEWPORTS = Object.freeze([
  { name: 'iPhone 13/14 Pro Max', width: 430, height: 932, dpr: 3, mobile: true },
  { name: 'Samsung A15 / Android běžný', width: 412, height: 915, dpr: 2.625, mobile: true },
  { name: 'úzký mobil 360×800', width: 360, height: 800, dpr: 3, mobile: true }
]);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
    '.sql': 'text/plain; charset=utf-8'
  })[ext] || 'application/octet-stream';
}


function escapeInlineScript(source) {
  return String(source || '').replace(/<\/script/gi, '<\\/script');
}

function readLocalText(relPath) {
  const clean = String(relPath || '').replace(/^\.\//, '').split('?')[0];
  const full = path.normalize(path.join(ROOT_DIR, clean));
  assert(full.startsWith(ROOT_DIR), `Cesta mimo root: ${relPath}`);
  return fs.readFileSync(full, 'utf8');
}

function getAppLoaderFiles() {
  const appJs = readLocalText('app.js');
  const legacyMatch = appJs.match(/const files = \[(.*?)\];/s);
  if (legacyMatch) return Array.from(legacyMatch[1].matchAll(/"([^"]+\.js)"/g)).map(item => item[1]);
  // The inline smoke bypasses app.js' real idle scheduler, so it must include
  // the same audit groups explicitly. Otherwise health helpers used below are
  // absent and the advertised browser smoke fails before testing the UI.
  const groups = ['criticalFiles', 'deferredFiles', 'idleFoundationFiles', 'idleAuditFiles'];
  const files = groups.flatMap((group) => {
    const match = appJs.match(new RegExp('const\\s+' + group + '\\s*=\\s*\\[(.*?)\\];', 's'));
    return match ? Array.from(match[1].matchAll(/"([^"]+\.js)"/g)).map(item => item[1]) : [];
  });
  assert(files.length > 0, 'browser smoke nedokázal najít app.js files list');
  return Array.from(new Set(files));
}

function buildInlineBootScript() {
  return `
try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app.js', 'loaded', { source: 'browser-smoke-inline' }); } catch (err) {}
function rakBrowserSmokeBoot(){
  // Development větev schovává Hry již v app.js; inline smoke musí testovat stejný stav.
  document.querySelectorAll('#games, [data-action="games"], [data-page="games"], .bottomNavGamesBtn').forEach((el) => el.remove());
  try { if (typeof installPwaAndConnectivityHooks === 'function') installPwaAndConnectivityHooks(); } catch (err) { console.warn('PWA hooks smoke skip', err); }
  try { if (typeof installBottomNavBindings === 'function') installBottomNavBindings(); } catch (err) { console.warn('Bottom nav smoke skip', err); }
  try { if (typeof applyBottomNavMoreHardFix === 'function') applyBottomNavMoreHardFix(); } catch (err) { console.warn('Bottom nav Více hard-fix smoke skip', err); }
  try { if (typeof applyRakFixedBottomNavMetrics === 'function') applyRakFixedBottomNavMetrics(); } catch (err) { console.warn('Bottom nav metrics smoke skip', err); }
  try { if (typeof installDelegatedAppActions === 'function') installDelegatedAppActions(); } catch (err) { console.warn('Delegated actions smoke skip', err); }
  try { if (typeof runRakPostLoadAudits === 'function') runRakPostLoadAudits(); } catch (err) { console.warn('Post-load audits smoke skip', err); }
  try {
    if (typeof window.__rotaceBootHomeRefreshLate === 'function') window.__rotaceBootHomeRefreshLate();
    else if (typeof bootHomeRefresh === 'function') bootHomeRefresh();
  } catch (err) { console.warn('Home refresh smoke skip', err); }
  try { if (typeof runRakBootSelfTest === 'function') runRakBootSelfTest(); } catch (err) { console.warn('Boot self-test smoke skip', err); }
  try { document.documentElement.dataset.rakBrowserSmokeBoot = 'ready'; } catch (err) {}
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', rakBrowserSmokeBoot, { once: true });
else setTimeout(rakBrowserSmokeBoot, 0);`;
}

function getInlineScriptSource(file) {
  let source = readLocalText(file);
  const clean = String(file || '').replace(/^\.\//, '').split('?')[0];
  if (clean === 'data.js') {
    source = source.replace('const initialRotationData =', 'var initialRotationData =');
  }
  if (clean === 'core.js') {
    ['APP_KEY', 'APP_VERSION', 'ROTATION_BUILD', 'HARD_MACHINE_HEADERS', 'SOFT_MACHINE_HEADERS', 'KNOWN_STAT_NAMES', 'NO_START_HOLIDAYS', 'SPECIAL_OVERTIME_SUNDAY_NIGHTS_2026', 'appRotation', 'app'].forEach((name) => {
      source = source.replace(new RegExp('\\bconst\\s+' + name + '\\b'), 'var ' + name);
      source = source.replace(new RegExp('\\blet\\s+' + name + '\\b'), 'var ' + name);
    });
  }
  source = source.replace(/\bconst\s+(RAK_[A-Z0-9_]+_CONTRACT_V\d+)\b/g, 'var $1');
  return source;
}

function getExternalStub(src) {
  if (/supabase-js/i.test(src)) {
    return `const rakSmokeQueryBuilder=function(){const result={data:[],error:null};const q=new Proxy(function(){},{get:function(target,prop){if(prop==='then')return function(resolve,reject){return Promise.resolve(result).then(resolve,reject)};if(prop==='catch')return function(reject){return Promise.resolve(result).catch(reject)};if(prop==='finally')return function(cb){return Promise.resolve(result).finally(cb)};return function(){return q}}});return q};window.supabase={createClient:function(){return{channel:function(){return{on:function(){return this},subscribe:function(cb){try{if(typeof cb==='function')cb('SUBSCRIBED')}catch(e){};return this},unsubscribe:function(){return Promise.resolve({})}}},from:function(){return rakSmokeQueryBuilder()},rpc:function(){return Promise.resolve({data:null,error:null})},storage:{from:function(){return{createSignedUrl:function(){return Promise.resolve({data:null,error:null})},upload:function(){return Promise.resolve({data:null,error:null})},remove:function(){return Promise.resolve({data:null,error:null})}}}},auth:{getSession:function(){return Promise.resolve({data:{session:null},error:null})},getUser:function(){return Promise.resolve({data:{user:null},error:null})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}}; try{rakNoteExternalDependency('supabase','stubbed','${src}')}catch(e){}`;
  }
  if (/jszip/i.test(src)) return `window.JSZip=window.JSZip||function(){return{file:function(){return this},generateAsync:function(){return Promise.resolve(new Blob())}}}; try{rakNoteExternalDependency('jszip','stubbed','${src}')}catch(e){}`;
  if (/xlsx/i.test(src)) return `window.XLSX=window.XLSX||{}; try{rakNoteExternalDependency('xlsx','stubbed','${src}')}catch(e){}`;
  return `try{rakNoteExternalDependency('external','stubbed','${src}')}catch(e){}`;
}

function buildInlineSmokeHtml() {
  let html = readLocalText('index.html');
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']stylesheet["']/i.test(tag)) return tag;
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1] || '';
    if (/^https?:/i.test(href)) return `<!-- browser smoke external stylesheet stubbed: ${href} -->`;
    const css = readLocalText(href);
    return `<style data-browser-smoke-inline-css="${href}">\n${css}\n</style>`;
  });
  // The inline fixture intentionally replaces app.js with already-expanded
  // modules, so the real post-ready style loader is not present here. Inline
  // the same local cascade slots to represent the fully ready application;
  // otherwise feature-bound CSS would be absent only in the smoke harness.
  html = html.replace(/<meta\b[^>]*data-rak-post-ready-style=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    if (/^https?:/i.test(href)) return `<!-- browser smoke external post-ready stylesheet stubbed: ${href} -->`;
    const css = readLocalText(href);
    return `<style data-browser-smoke-inline-post-ready-css="${href}">\n${css}\n</style>`;
  });
  const dynamicFiles = getAppLoaderFiles();
  html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, before, src) => {
    if (/^https?:/i.test(src)) return `<script data-browser-smoke-external-stub="${src}">\n${escapeInlineScript(getExternalStub(src))}\n</script>`;
    const cleanSrc = String(src || '').replace(/^\.\//, '').split('?')[0];
    if (cleanSrc === 'app.js') {
      const inlineModules = dynamicFiles.map(file => `<script data-browser-smoke-inline-module="${file}">\n${escapeInlineScript(getInlineScriptSource(file))}\n</script>`).join('\n');
      return `${inlineModules}\n<script data-browser-smoke-inline-boot="app.js">\n${escapeInlineScript(buildInlineBootScript())}\n</script>`;
    }
    return `<script data-browser-smoke-inline-script="${cleanSrc}">\n${escapeInlineScript(getInlineScriptSource(cleanSrc))}\n</script>`;
  });
  return html;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname || '/');
      if (pathname === '/') pathname = '/index.html';
      const requestedPath = path.normalize(path.join(rootDir, pathname));
      if (!requestedPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(requestedPath, (statErr, stat) => {
        if (statErr || !stat.isFile()) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, {
          'content-type': getMime(requestedPath),
          'cache-control': 'no-store, max-age=0',
          'access-control-allow-origin': '*'
        });
        fs.createReadStream(requestedPath).pipe(res);
      });
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(err && err.stack || err));
    }
  });
  return server;
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result || {});
        return;
      }
      if (message.method && this.events.has(message.method)) {
        for (const handler of this.events.get(message.method)) handler(message.params || {});
      }
    });
  }
  open() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket timeout')), 8000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', (err) => { clearTimeout(timer); reject(err); }, { once: true });
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      this.ws.send(payload);
    });
  }
  on(method, handler) {
    if (!this.events.has(method)) this.events.set(method, new Set());
    this.events.get(method).add(handler);
  }
  close() {
    try { this.ws.close(); } catch (err) {}
  }
}

async function waitForBrowser(cdpPort) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < 10000) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) return await res.json();
    } catch (err) {
      lastError = err;
    }
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error('Chromium CDP endpoint nenaběhl: ' + (lastError && lastError.message || 'timeout'));
}

async function createTarget(cdpPort) {
  const blankUrl = encodeURIComponent('about:blank');
  let res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${blankUrl}`, { method: 'PUT' });
  if (!res.ok) res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${blankUrl}`);
  assert(res.ok, 'Nepodařilo se vytvořit CDP target');
  return res.json();
}

async function evalInPage(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const detailText = [
      details.text,
      details.exception && details.exception.description,
      details.exception && details.exception.value,
      details.lineNumber != null ? `line ${details.lineNumber}` : '',
      details.columnNumber != null ? `col ${details.columnNumber}` : ''
    ].filter(Boolean).join(' | ');
    throw new Error(detailText || 'Runtime.evaluate exception');
  }
  return result.result ? result.result.value : undefined;
}

async function waitForPageCondition(client, expression, label, timeoutMs = 12000) {
  const started = Date.now();
  let lastValue;
  while (Date.now() - started < timeoutMs) {
    try {
      lastValue = await evalInPage(client, `Boolean(${expression})`);
      if (lastValue) return;
    } catch (err) {
      lastValue = err.message;
    }
    await new Promise(resolve => setTimeout(resolve, 140));
  }
  let debug = '';
  try {
    debug = JSON.stringify(await evalInPage(client, `(() => ({
      readyState: document.readyState,
      appVersion: window.APP_VERSION || null,
      bottomNavCount: document.querySelectorAll('.bottomNavBtn').length,
      scripts: Array.from(document.scripts).map(s => ({ src: s.src, readyState: s.readyState || null })).slice(-8),
      bodyText: (document.body && document.body.innerText || '').slice(0, 500),
      smokeBoot: document.documentElement.dataset.rakBrowserSmokeBoot || null,
      hasShowPage: typeof window.showPage,
      hasInstallBottomNav: typeof window.installBottomNavBindings
    }))()`));
  } catch (err) {
    debug = err && err.message || String(err);
  }
  throw new Error(`Timeout při čekání na: ${label}; poslední stav: ${lastValue}; debug: ${debug}`);
}

async function clickAndWait(client, action, activeSelector) {
  await evalInPage(client, `(() => {
    const el = document.querySelector('[data-action="${action}"]');
    if (!el) throw new Error('Chybí akce ${action}');
    el.click();
    return true;
  })()`);
  try {
    await waitForPageCondition(client, `document.querySelector(${JSON.stringify(activeSelector)})`, activeSelector, 1400);
    return;
  } catch (err) {
    await evalInPage(client, `(() => {
      const directRoutes = {
        rotace: function(){ if (typeof openRotaceNames === 'function') openRotaceNames(); else if (typeof showPage === 'function') showPage('rotace'); },
        kalkulacky: function(){ if (typeof openKalkulacky === 'function') openKalkulacky(); else if (typeof showPage === 'function') showPage('kalkulacky'); },
        games: function(){ if (typeof openGamesPage === 'function') openGamesPage(); else if (typeof showPage === 'function') showPage('games'); },
        menu: function(){ if (typeof toggleAppMenu === 'function') toggleAppMenu(); else if (typeof showPage === 'function') showPage('menu'); },
        'page-brusy': function(){ if (typeof showPage === 'function') showPage('brusy'); },
        'page-korekce-frezky': function(){ if (typeof showPage === 'function') showPage('korekce-frezky'); }
      };
      if (!directRoutes[${JSON.stringify(action)}]) throw new Error('Chybí fallback pro akci ${action}');
      directRoutes[${JSON.stringify(action)}]();
      return true;
    })()`);
  }
  await waitForPageCondition(client, `document.querySelector(${JSON.stringify(activeSelector)})`, activeSelector, 8000);
}

async function runViewportSmoke(cdpPort, viewport, inlineHtml, liveRotationPayload) {
  const target = await createTarget(cdpPort);
  const client = new CdpClient(target.webSocketDebuggerUrl);
  const runtimeExceptions = [];
  const consoleErrors = [];
  await client.open();
  client.on('Runtime.exceptionThrown', (params) => {
    const details = params.exceptionDetails || {};
    runtimeExceptions.push([
      details.text,
      details.exception && details.exception.description,
      details.lineNumber != null ? `line ${details.lineNumber}` : '',
      details.columnNumber != null ? `col ${details.columnNumber}` : ''
    ].filter(Boolean).join(' | ') || JSON.stringify(details));
  });
  client.on('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error') {
      const text = (params.args || []).map(arg => arg.value || arg.description || '').join(' ').trim();
      consoleErrors.push(text);
    }
  });

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable').catch(() => {});
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*cdn.jsdelivr.net*', requestStage: 'Request' }] }).catch(() => {});
  client.on('Fetch.requestPaused', (params) => {
    const requestId = params.requestId;
    const requestUrl = params.request && params.request.url || '';
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/i.test(requestUrl)) {
      const stub = `const rakSmokeQueryBuilder=function(){const result={data:[],error:null};const q=new Proxy(function(){},{get:function(target,prop){if(prop==='then')return function(resolve,reject){return Promise.resolve(result).then(resolve,reject)};if(prop==='catch')return function(reject){return Promise.resolve(result).catch(reject)};if(prop==='finally')return function(cb){return Promise.resolve(result).finally(cb)};return function(){return q}}});return q};window.supabase={createClient:function(){return{channel:function(){return{on:function(){return this},subscribe:function(cb){try{if(typeof cb==='function')cb('SUBSCRIBED')}catch(e){};return this},unsubscribe:function(){return Promise.resolve({})}}},from:function(){return rakSmokeQueryBuilder()},rpc:function(){return Promise.resolve({data:null,error:null})},storage:{from:function(){return{createSignedUrl:function(){return Promise.resolve({data:null,error:null})},upload:function(){return Promise.resolve({data:null,error:null})},remove:function(){return Promise.resolve({data:null,error:null})}}}},auth:{getSession:function(){return Promise.resolve({data:{session:null},error:null})},getUser:function(){return Promise.resolve({data:{user:null},error:null})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};`;
      client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: 'text/javascript; charset=utf-8' }],
        body: Buffer.from(stub, 'utf8').toString('base64')
      }).catch(() => {});
    } else {
      client.send('Fetch.continueRequest', { requestId }).catch(() => {});
    }
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    mobile: viewport.mobile
  });
  await client.send('Emulation.setUserAgentOverride', {
    userAgent: viewport.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36'
  });
  const inlineWriteExpression = `(() => {
    const makeSmokeStorage = () => {
      const store = Object.create(null);
      return {
        getItem: (key) => Object.prototype.hasOwnProperty.call(store, String(key)) ? store[String(key)] : null,
        setItem: (key, value) => { store[String(key)] = String(value); },
        removeItem: (key) => { delete store[String(key)]; },
        clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
        key: (index) => Object.keys(store)[Number(index) || 0] || null,
        get length(){ return Object.keys(store).length; }
      };
    };
    try { Object.defineProperty(window, 'localStorage', { value: makeSmokeStorage(), configurable: true }); } catch (err) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: makeSmokeStorage(), configurable: true }); } catch (err) {}
    localStorage.setItem('rotace_kalkulacky:user_profile_v1', JSON.stringify({
      accountNumber: '0000',
      fullName: 'Test Martin',
      updatedAt: Date.now()
    }));
    document.open();
    document.write(${JSON.stringify(inlineHtml)});
    document.close();
    return true;
  })()`;
  await evalInPage(client, inlineWriteExpression);
  await waitForPageCondition(client, `document.readyState === 'complete' || document.readyState === 'interactive'`, 'DOM ready po inline about:blank injection', 10000);
  await waitForPageCondition(client, `window.APP_VERSION === ${JSON.stringify(EXPECTED_APP_VERSION)} && document.querySelectorAll('.bottomNavBtn').length >= 4 && document.documentElement.dataset.rakBrowserSmokeBoot === 'ready'`, 'app boot + verze + spodní navigace', 18000);

  const bootState = await evalInPage(client, `(() => ({
    appVersion: window.APP_VERSION || '',
    activePage: document.querySelector('.page.active') && document.querySelector('.page.active').id,
    bottomNavCount: document.querySelectorAll('.bottomNavBtn').length,
    homeCards: document.querySelectorAll('#home .dashboardCard, #home .tile').length,
    bodyBeforePosition: getComputedStyle(document.body, '::before').position,
    bodyBeforePointerEvents: getComputedStyle(document.body, '::before').pointerEvents
  }))()`);
  assert(bootState.appVersion === EXPECTED_APP_VERSION, `${viewport.name}: špatná verze ${bootState.appVersion}`);
  assert(bootState.bottomNavCount >= 4, `${viewport.name}: chybí spodní navigace`);
  assert(bootState.homeCards > 0, `${viewport.name}: Dashboard nemá karty`);
  assert(bootState.bodyBeforePosition === 'fixed', `${viewport.name}: pevné pozadí není fixed`);

  const earlyGreetingState = await evalInPage(client, `(() => ({
    cachedName: String(window.__RAK_EARLY_USER_PROFILE__ && window.__RAK_EARLY_USER_PROFILE__.fullName || ''),
    greeting: String(document.querySelector('.dashboardPersonalGreeting')?.textContent || '').trim()
  }))()`);
  assert(earlyGreetingState.cachedName === 'Test Martin' && /Martine/.test(earlyGreetingState.greeting), `${viewport.name}: první pozdrav nevyužil lokálně uložené jméno ${JSON.stringify(earlyGreetingState)}`);

  const manualLadaState = await evalInPage(client, `(async () => {
    const previousPrefs = loadUiPrefs();
    const originalDetection = getLowEndDeviceInfo;
    const originalClassify = classifyRakDevicePerformance;
    const checks = {};
    const normal = () => !document.body.matches('.ladaMode,.lightweightMode,.lowEndDevice')
      && !document.documentElement.classList.contains('rakLadaPaintLite') && getRakPerformanceDprMax() === 2;
    const reloadPrefs = () => {
      if (typeof clearLocalStorageJsonCache === 'function') clearLocalStorageJsonCache(UI_PREFS_KEY);
      applyUiPrefs(loadUiPrefs());
    };
    try {
      getLowEndDeviceInfo = () => ({ lowEnd: true, reasons: ['test-low-memory'], memory: 2, cores: 2, dpr: 3, width: 360 });
      localStorage.removeItem(UI_PREFS_KEY);
      reloadPrefs();
      checks.firstStart = normal();
      saveUiPrefs({ lightweight: true, lightweightManual: false });
      reloadPrefs();
      checks.oldAutomaticChoice = normal();
      classifyRakDevicePerformance = () => ({ score: 10, profile: 'turbo', label: 'test', recommendsLightweight: true });
      await runRakDevicePerformanceProbe({ durationMs: 420 });
      checks.slowMeasurement = normal();
      toggleUiPref('lightweight');
      reloadPrefs();
      checks.manualOnPersists = document.body.classList.contains('ladaMode') && getRakPerformanceDprMax() === 1;
      toggleUiPref('lightweight');
      reloadPrefs();
      checks.manualOffPersists = normal();
    } finally {
      getLowEndDeviceInfo = originalDetection;
      classifyRakDevicePerformance = originalClassify;
      applyUiPrefs(previousPrefs);
    }
    return checks;
  })()`);
  assert(Object.values(manualLadaState).every(Boolean), `${viewport.name}: Láďův režim musí být ruční a pamatovat volbu ${JSON.stringify(manualLadaState)}`);

  const ladaModeState = await evalInPage(client, `(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    if (typeof loadUiPrefs !== 'function' || typeof applyUiPrefs !== 'function' || typeof getLadaPerformanceHealth !== 'function') {
      return { ok: false, reason: 'lada-helpers-missing' };
    }
    const previous = loadUiPrefs();
    try {
      applyUiPrefs(Object.assign({}, previous, { lightweight: true, lightweightManual: true }));
      await wait(40);
      const card = document.querySelector('.dashboardCard, .dashboardHeroCard, .tile');
      const style = card ? getComputedStyle(card) : null;
      const health = getLadaPerformanceHealth();
      return {
        ok: !!card,
        active: health.active,
        healthOk: health.ok,
        litePaint: document.documentElement.dataset.rakLadaPaintLite,
        blur: style ? String(style.backdropFilter || style.webkitBackdropFilter || '') : '',
        transition: style ? String(style.transitionDuration || '') : '',
        animation: style ? String(style.animationDuration || '') : '',
        shadow: style ? String(style.boxShadow || '') : ''
      };
    } finally {
      applyUiPrefs(previous);
    }
  })()`);
  assert(ladaModeState.ok && ladaModeState.active && ladaModeState.healthOk && ladaModeState.litePaint === 'yes', `${viewport.name}: Láďův režim se nezapnul správně ${JSON.stringify(ladaModeState)}`);
  assert(!/blur\(/i.test(ladaModeState.blur) && /^0s(?:,|$)/.test(ladaModeState.transition) && /^0s(?:,|$)/.test(ladaModeState.animation) && ladaModeState.shadow === 'none', `${viewport.name}: Láďův režim ponechal těžké vykreslování ${JSON.stringify(ladaModeState)}`);

  const settingsSpacingState = await evalInPage(client, `(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    if (typeof openAppMenu !== 'function' || typeof hideAppMenu !== 'function') return { ok: false, reason: 'menu-helpers-missing' };
    try {
      openAppMenu('settings');
      await wait(30);
      const body = document.getElementById('appMenuBody');
      const profile = body && body.querySelector(':scope > .appMenuProfileCard');
      const privacy = body && body.querySelector(':scope > .appMenuProfileCard + .appMenuSettingsCard');
      const performance = body && body.querySelector(':scope > .rakDevicePerfCard');
      const appearance = body && body.querySelector(':scope > .appMenuThemeCardWrap');
      const pairs = [[profile, privacy], [privacy, performance], [performance, appearance]];
      const gaps = pairs.map(([before, after]) => before && after ? Math.round(after.getBoundingClientRect().top - before.getBoundingClientRect().bottom) : -1);
      return { ok: !!(profile && privacy && performance && appearance), gaps };
    } finally {
      hideAppMenu();
    }
  })()`);
  assert(settingsSpacingState.ok && settingsSpacingState.gaps.every((gap) => gap >= 9), `${viewport.name}: karty nastavení nemají čitelné mezery ${JSON.stringify(settingsSpacingState)}`);

  const loginMascotState = await evalInPage(client, `(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const savedLookup = window.rakUserProfileLookup;
    const savedWrite = window.rakUserProfileWrite;
    const savedApply = window.rakUserProfileApplyToRuntime;
    const overlay = typeof window.installRakLoginSplash === 'function' ? window.installRakLoginSplash('') : null;
    if (!overlay) return { ok: false, reason: 'login-splash-missing' };
    try {
      const brand = document.getElementById('rakSplashBrand');
      const panel = document.getElementById('rakSplashPanel');
      const input = document.getElementById('rakUserLoginAccountNumber');
      const button = document.getElementById('rakUserLoginSubmit');
      const mascot = brand && brand.querySelector('.rakSplashMascot');
      const frames = brand ? Array.from(brand.querySelectorAll('.rakSplashMascotFrame')) : [];
      const parts = brand ? Array.from(brand.querySelectorAll('.rakSplashMascotPart')) : [];
      const mascotStyles = document.getElementById('rak-login-splash-style-v6')?.textContent || '';
      if (!input || !button || !brand || !mascot) return { ok: false, reason: 'login-elements-missing' };
      input.focus();
      input.dispatchEvent(new Event('focus'));
      input.value = '1234';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const attention = { listening: brand.classList.contains('listening'), ready: brand.classList.contains('ready') };
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      button.click();
      await wait(55);
      const reject = {
        brandError: brand.classList.contains('error'),
        panelError: !!(panel && panel.classList.contains('error')),
        mascotTap: mascotStyles.includes('@keyframes rakMascotTap') && !!brand.querySelector('.rakSplashMascotFrame.tap')
      };
      brand.classList.remove('error');
      if (panel) panel.classList.remove('error');
      let smokeLookupCalls = 0;
      window.rakUserProfileLookup = async () => { smokeLookupCalls += 1; return { ok: true, accountNumber: '1234', fullName: 'Browser smoke', requiresAdminAuth: false }; };
      window.rakUserProfileWrite = () => {};
      window.rakUserProfileApplyToRuntime = () => {};
      input.value = '1234';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      button.click();
      // Úvodní pohyb maskota má dostat krátký náskok před pomalejším trhaným přechodem.
      await wait(620);
      return {
        ok: true,
        frames: frames.length,
        mascotAssets: frames.map((frame) => frame.getAttribute('src')),
        parts: parts.length,
        partAssets: parts.map((part) => part.getAttribute('src')),
        hasMotion: mascotStyles.includes('@keyframes rakCrabIdlePose') && mascotStyles.includes('@keyframes rakCrabStepPose'),
        attention,
        reject,
        lookupCalls: smokeLookupCalls,
        status: String(document.getElementById('rakUserLoginStatus')?.textContent || ''),
        disabled: !!button.disabled,
        cutting: brand.classList.contains('success'),
        pageSplit: overlay.classList.contains('pageSplit')
      };
    } finally {
      window.rakUserProfileLookup = savedLookup;
      window.rakUserProfileWrite = savedWrite;
      window.rakUserProfileApplyToRuntime = savedApply;
      overlay.remove();
    }
  })()`);
  assert(loginMascotState.ok, `${viewport.name}: login maskot se nenačetl ${JSON.stringify(loginMascotState)}`);
  assert(loginMascotState.frames === 3 && loginMascotState.parts === 0 && loginMascotState.hasMotion && loginMascotState.mascotAssets.join('|') === 'assets/rak-login-crab.png|assets/rak-login-crab-step.png|assets/rak-login-crab-tap.png', `${viewport.name}: maskot nemá připravené tři průhledné animační pózy ${JSON.stringify(loginMascotState)}`);
  assert(loginMascotState.attention?.listening && loginMascotState.attention?.ready, `${viewport.name}: maskot nereaguje na zaměření a vyplnění osobního čísla ${JSON.stringify(loginMascotState)}`);
  assert(loginMascotState.reject.brandError && loginMascotState.reject.panelError && loginMascotState.reject.mascotTap, `${viewport.name}: chybné přihlášení nespustilo poklep maskota ${JSON.stringify(loginMascotState)}`);
  assert(loginMascotState.cutting && loginMascotState.pageSplit, `${viewport.name}: úspěšné přihlášení nespustilo střih stránky ${JSON.stringify(loginMascotState)}`);

  const accessCountdownState = await evalInPage(client, `(() => {
    if (typeof buildDashboardPersonalHeroHtml !== 'function' || typeof getDashboardPersonalShiftStatus !== 'function') return { ok: false };
    const savedStatus = getDashboardPersonalShiftStatus;
    const escapeValue = (value) => String(value == null ? '' : value);
    try {
      window.getDashboardPersonalShiftStatus = () => ({ name: 'Přístup', active: null, next: null, absence: null });
      const before = buildDashboardPersonalHeroHtml(new Date('2026-09-06T12:00:00+02:00'), escapeValue);
      const during = buildDashboardPersonalHeroHtml(new Date('2026-09-07T08:00:00+02:00'), escapeValue);
      return { ok: true, before, during };
    } finally {
      window.getDashboardPersonalShiftStatus = savedStatus;
    }
  })()`);
  assert(accessCountdownState.ok && accessCountdownState.before.includes('Směna D začíná za') && accessCountdownState.during.includes('Směna D končí za'), `${viewport.name}: přístupový účet neukazuje začátek/konec směny D ${JSON.stringify(accessCountdownState)}`);

  const themePropagationState = await evalInPage(client, `(() => {
    if (!Array.isArray(window.RAK_APPEARANCE_DEFS) || typeof window.applyAppearancePreference !== 'function') {
      return { ok: false, reason: 'chybí definice vzhledů nebo jejich aplikace' };
    }
    const page = document.querySelector('#home') || document.body;
    const probe = document.createElement('div');
    probe.id = 'rakThemePropagationProbe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none';
    probe.innerHTML = [
      '<div class="dashboardTitle">Nadpis</div>',
      '<div class="sectionTitle">Sekce</div>',
      '<div class="dashboardMeta">Doplněk</div>',
      '<div class="dashboardEyebrow">Záhlaví</div>',
      '<div class="dashboardVersionTag">Verze</div>',
      '<div class="dashboardHeroLine2">Doplnění hero</div>',
      '<div class="smallText">Nápověda</div>',
      '<button class="appMenuAction">Akce</button>',
      '<input class="rakThemeProbeInput" value="Vstup">',
      '<details class="rotaceMonthPicker"><summary>Výběr měsíce</summary></details>',
      '<table class="rotTable"><thead><tr><th>Tabulka</th></tr></thead></table>',
      '<div class="statsAbsenceLegendRow">Legenda <strong>Hodnota</strong></div>',
      '<div class="statsOccupancyScaleLabel">Měřítko</div>',
      '<button class="bottomNavBtn active"><span class="bottomNavLabel">Aktivní</span></button>',
      '<button class="bottomNavBtn"><span class="bottomNavLabel">Neaktivní</span></button>'
    ].join('');
    page.appendChild(probe);
    const color = (value) => {
      const sample = document.createElement('span');
      sample.style.color = value;
      probe.appendChild(sample);
      const resolved = getComputedStyle(sample).color;
      sample.remove();
      return resolved;
    };
    const read = (selector) => getComputedStyle(probe.querySelector(selector)).color;
    const previous = document.documentElement.dataset.rakTheme || 'obsidian';
    const results = [];
    try {
      window.RAK_APPEARANCE_DEFS.forEach((theme) => {
        applyAppearancePreference(theme.id, false, { skipProfile: true, skipRemote: true });
        const rootStyle = getComputedStyle(document.documentElement);
        const personalHero = document.querySelector('#home.page.active #dashHero.dashboardHeroCard--personal');
        const expected = {
          text: color(rootStyle.getPropertyValue('--text').trim()),
          muted: color(rootStyle.getPropertyValue('--muted').trim()),
          soft: color(rootStyle.getPropertyValue('--soft').trim()),
          accent: color(rootStyle.getPropertyValue('--rakThemeAccentStrong').trim())
        };
        const colors = {
          dashboardTitle: read('.dashboardTitle'),
          sectionTitle: read('.sectionTitle'),
          dashboardMeta: read('.dashboardMeta'),
          dashboardEyebrow: read('.dashboardEyebrow'),
          dashboardVersionTag: read('.dashboardVersionTag'),
          dashboardHeroLine2: read('.dashboardHeroLine2'),
          smallText: read('.smallText'),
          appMenuAction: read('.appMenuAction'),
          input: read('.rakThemeProbeInput'),
          rotaceMonthPicker: read('.rotaceMonthPicker > summary'),
          rotationTable: read('.rotTable th'),
          statsLegend: read('.statsAbsenceLegendRow'),
          statsLegendValue: read('.statsAbsenceLegendRow strong'),
          statsScale: read('.statsOccupancyScaleLabel'),
          activeNav: read('.bottomNavBtn.active'),
          inactiveNav: read('.bottomNavBtn:not(.active)'),
          dashboardPersonalGreeting: personalHero ? getComputedStyle(personalHero.querySelector('.dashboardPersonalGreeting')).color : '',
          dashboardPersonalStatus: personalHero ? getComputedStyle(personalHero.querySelector('.dashboardPersonalStatus')).color : '',
          dashboardPersonalTitle: personalHero ? getComputedStyle(personalHero.querySelector('.dashboardPersonalTitle')).color : '',
          dashboardPersonalBackground: personalHero ? getComputedStyle(personalHero).backgroundImage : ''
        };
        const matches = {
          dashboardTitle: colors.dashboardTitle === expected.text,
          sectionTitle: colors.sectionTitle === expected.text,
          dashboardMeta: colors.dashboardMeta === expected.muted,
          dashboardEyebrow: colors.dashboardEyebrow === expected.muted,
          dashboardVersionTag: colors.dashboardVersionTag === expected.muted,
          dashboardHeroLine2: colors.dashboardHeroLine2 === expected.soft,
          smallText: colors.smallText === expected.muted,
          appMenuAction: colors.appMenuAction === expected.text,
          input: colors.input === expected.text,
          rotaceMonthPicker: colors.rotaceMonthPicker === expected.text,
          rotationTable: colors.rotationTable === expected.text,
          statsLegend: colors.statsLegend === expected.muted,
          statsLegendValue: colors.statsLegendValue === expected.soft,
          statsScale: colors.statsScale === expected.muted,
          activeNav: colors.activeNav === expected.accent,
          inactiveNav: Boolean(colors.inactiveNav) && colors.inactiveNav !== colors.activeNav,
          dashboardPersonalGreeting: colors.dashboardPersonalGreeting === expected.accent,
          dashboardPersonalStatus: colors.dashboardPersonalStatus === expected.muted,
          dashboardPersonalTitle: colors.dashboardPersonalTitle === expected.text,
          dashboardPersonalBackground: Boolean(colors.dashboardPersonalBackground)
        };
        results.push({ id: theme.id, matches, colors, expected });
      });
    } finally {
      applyAppearancePreference(previous, false, { skipProfile: true, skipRemote: true });
      probe.remove();
    }
    const failures = results.filter((result) => Object.values(result.matches).some((match) => !match));
    const personalHeroBackgrounds = new Set(results.map((result) => result.colors.dashboardPersonalBackground).filter(Boolean));
    if (personalHeroBackgrounds.size !== results.length) failures.push({ id: 'dashboard-personal-background', matches: { dashboardPersonalBackground: false } });
    return { ok: true, themes: results.length, failures };
  })()`);
  assert(themePropagationState.ok, `${viewport.name}: test přepínání textů vzhledů se nespustil ${JSON.stringify(themePropagationState)}`);
  assert(themePropagationState.themes === 10, `${viewport.name}: nečekaný počet vzhledů ${JSON.stringify(themePropagationState)}`);
  assert(themePropagationState.failures.length === 0, `${viewport.name}: text se nepropsal pro všechny vzhledy ${JSON.stringify(themePropagationState.failures)}`);

  const accountAppearanceState = await evalInPage(client, `(() => {
    if (typeof gamesGetProfile !== 'function' || typeof gamesSaveProfile !== 'function' || typeof applyProfileUiPreferencesForActiveAccount !== 'function') {
      return { ok: false, reason: 'chybí profilové funkce vzhledu' };
    }
    const previousProfile = JSON.parse(JSON.stringify(gamesGetProfile()));
    const previousAppearance = typeof getAppearancePreference === 'function' ? getAppearancePreference() : 'obsidian';
    const profile = {
      activeAccountId: 'smoke-theme-a',
      profileVersion: typeof GAMES_PROFILE_RESET_VERSION === 'number' ? GAMES_PROFILE_RESET_VERSION : 912,
      accounts: {
        'smoke-theme-a': { id: 'smoke-theme-a', name: 'Účet A', uiSettings: { themeId: 'atlantic', backgroundId: 'atlantic', updatedAt: Date.now() - 1000 }, updatedAt: Date.now() - 1000 },
        'smoke-theme-b': { id: 'smoke-theme-b', name: 'Účet B', uiSettings: { themeId: '', backgroundId: '', updatedAt: 0 }, updatedAt: 0 }
      }
    };
    try {
      app.gamesProfile = profile;
      gamesSaveProfile(profile);
      applyAppearancePreference('atlantic', true, { skipProfile: true, skipRemote: true });
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-a' });
      const firstA = document.documentElement.dataset.rakTheme;

      profile.activeAccountId = 'smoke-theme-b';
      gamesSaveProfile(profile);
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-b-empty' });
      const emptyB = document.documentElement.dataset.rakTheme;

      applyAppearancePreference('jade', true, { skipRemote: true });
      const storedB = profile.accounts['smoke-theme-b'].uiSettings.themeId;
      profile.activeAccountId = 'smoke-theme-a';
      gamesSaveProfile(profile);
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-a-return' });
      const returnA = document.documentElement.dataset.rakTheme;
      profile.activeAccountId = 'smoke-theme-b';
      gamesSaveProfile(profile);
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-b-return' });
      const returnB = document.documentElement.dataset.rakTheme;
      return { ok: true, firstA, emptyB, storedB, returnA, returnB };
    } finally {
      app.gamesProfile = previousProfile;
      gamesSaveProfile(previousProfile);
      applyAppearancePreference(previousAppearance, true, { skipProfile: true, skipRemote: true });
      if (previousProfile && previousProfile.activeAccountId) applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-restore' });
    }
  })()`);
  assert(accountAppearanceState.ok && accountAppearanceState.firstA === 'atlantic' && accountAppearanceState.emptyB === 'obsidian' && accountAppearanceState.storedB === 'jade' && accountAppearanceState.returnA === 'atlantic' && accountAppearanceState.returnB === 'jade', `${viewport.name}: vzhled se přenáší mezi účty ${JSON.stringify(accountAppearanceState)}`);

  const delayedAppearanceState = await evalInPage(client, `(async () => {
    if (typeof loadActiveAccountUiRemoteSettings !== 'function') return { ok: false, reason: 'chybí vzdálené načtení vzhledu' };
    const previousProfile = JSON.parse(JSON.stringify(gamesGetProfile()));
    const previousAppearance = typeof getAppearancePreference === 'function' ? getAppearancePreference() : 'obsidian';
    const previousBridge = window.RotationSupabaseBridge;
    let resolveLoad = null;
    const profile = {
      activeAccountId: 'smoke-delay-a',
      profileVersion: typeof GAMES_PROFILE_RESET_VERSION === 'number' ? GAMES_PROFILE_RESET_VERSION : 912,
      accounts: {
        'smoke-delay-a': { id: 'smoke-delay-a', name: 'Pomalý A', uiSettings: { themeId: '', backgroundId: '', updatedAt: 0 }, updatedAt: 0 },
        'smoke-delay-b': { id: 'smoke-delay-b', name: 'Aktivní B', uiSettings: { themeId: 'jade', backgroundId: 'jade', updatedAt: Date.now() }, updatedAt: Date.now() }
      }
    };
    try {
      window.RotationSupabaseBridge = Object.assign({}, previousBridge || {}, {
        loadGameAccountUiSettings: () => new Promise((resolve) => { resolveLoad = resolve; }),
        saveGameAccountUiSettings: async () => ({ ok: true })
      });
      app.gamesProfile = profile;
      gamesSaveProfile(profile);
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-delay-a' });
      const pending = loadActiveAccountUiRemoteSettings('smoke-delay-a');
      profile.activeAccountId = 'smoke-delay-b';
      gamesSaveProfile(profile);
      applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-delay-b' });
      resolveLoad({ theme_id: 'atlantic', background_id: 'atlantic', updated_at: new Date(Date.now() + 1000).toISOString() });
      const result = await pending;
      return {
        ok: true,
        activeTheme: document.documentElement.dataset.rakTheme,
        activeAccount: profile.activeAccountId,
        delayedAccountTheme: profile.accounts['smoke-delay-a'].uiSettings.themeId,
        skipped: result && result.reason
      };
    } finally {
      window.RotationSupabaseBridge = previousBridge;
      app.gamesProfile = previousProfile;
      gamesSaveProfile(previousProfile);
      applyAppearancePreference(previousAppearance, true, { skipProfile: true, skipRemote: true });
      if (previousProfile && previousProfile.activeAccountId) applyProfileUiPreferencesForActiveAccount({ loadRemote: false, source: 'browser-smoke-delay-restore' });
    }
  })()`);
  assert(delayedAppearanceState.ok && delayedAppearanceState.activeTheme === 'jade' && delayedAppearanceState.activeAccount === 'smoke-delay-b' && delayedAppearanceState.delayedAccountTheme === '' && delayedAppearanceState.skipped === 'account-switched', `${viewport.name}: pozdní vzhled účtu A přepsal účet B ${JSON.stringify(delayedAppearanceState)}`);

  const liteAppearanceState = await evalInPage(client, `(() => {
    const previousPrefs = loadUiPrefs();
    const previousTheme = document.documentElement.dataset.rakTheme;
    const sample = document.createElement('div');
    document.body.appendChild(sample);
    const failures = [];
    const resolved = (background) => {
      sample.style.background = background;
      const style = getComputedStyle(sample);
      return [style.backgroundColor, style.backgroundImage].join('|');
    };
    const painted = (element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.backgroundImage].join('|');
    };
    try {
      applyUiPrefs(Object.assign({}, previousPrefs, { lightweight: true, lightweightManual: true }));
      openAppMenu('settings');
      for (const theme of window.RAK_APPEARANCE_DEFS) {
        applyAppearancePreference(theme.id, false, { skipProfile: true, skipRemote: true });
        const root = getComputedStyle(document.documentElement);
        const checks = {
          background: painted(document.body) === resolved(root.getPropertyValue('--rakAppBackgroundLite') + ' ' + root.getPropertyValue('--rakBgBase')),
          shell: painted(document.querySelector('#home .dashboardShell')) === resolved(theme.themeVars['--panel']),
          card: painted(document.querySelector('#home .dashboardCard')) === resolved(theme.themeVars['--panel2']),
          navigation: painted(document.querySelector('nav.bottomNav')) === resolved(theme.themeVars['--bg']),
          menu: painted(document.querySelector('.appMenuProfileCard')) === resolved(theme.themeVars['--panel2'])
        };
        if (Object.values(checks).some((ok) => !ok)) failures.push({ id: theme.id, checks });
      }
    } finally {
      hideAppMenu();
      sample.remove();
      applyAppearancePreference(previousTheme, false, { skipProfile: true, skipRemote: true });
      applyUiPrefs(previousPrefs);
    }
    return { themes: window.RAK_APPEARANCE_DEFS.length, failures };
  })()`);
  assert(liteAppearanceState.failures.length === 0, `${viewport.name}: úsporný režim přepsal vzhled ${JSON.stringify(liteAppearanceState)}`);

  const rotationTasksState = await evalInPage(client, `(() => {
    if (typeof window.getRotationMachineTasksForAssignment !== 'function') {
      return { ok: false, reason: 'chybí mapování denních úkolů' };
    }
    const expected = {
      TNKS01: [{ label: 'O nic se nestarej a jen si užij nýtování.', place: '' }],
      TPKW01: [{ label: 'Kontrola měřidel', place: '' }, { label: 'TPM', place: '' }],
      TPKW02: [{ label: 'TPM za TNKS01', place: 'KP516' }],
      TBKR01: [{ label: 'Kontrola měřidel a TPM', place: 'KP515' }],
      TBKR07: [{ label: 'Kontrola měřidel a TPM', place: 'KP516' }],
      MSKC01: [{ label: 'Kontrola měřidel', place: 'KP518' }, { label: 'TPM', place: 'KP512' }],
      MSKC03: [{ label: 'Kontrola měřidel a TPM', place: 'KP512' }],
      MSKC04: [{ label: 'TPM', place: 'KP512' }],
      MFKF06: [{ label: 'Kontrola měřidel a TPM', place: 'KP511' }],
      MFKF10: [{ label: 'TPM', place: 'KP511' }]
    };
    const mismatches = Object.entries(expected).filter(([machine, tasks]) => {
      const actual = getRotationMachineTasksForAssignment(machine);
      return actual.machine !== machine || JSON.stringify(actual.tasks) !== JSON.stringify(tasks);
    }).map(([machine]) => machine);
    const sharedMill = getRotationMachineTasksForAssignment('MFKF10 (+ MFKF06)');
    const nightWash = getRotationMachineTasksForAssignment('TPKW01', 'N');
    const morningWash = getRotationMachineTasksForAssignment('TPKW01', 'R');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'rotaceShiftTaskCard';
    card.dataset.rotationTaskPerson = 'Testovací člověk';
    card.dataset.rotationTaskDate = '5. 9. 2026';
    card.dataset.rotationTaskShift = 'R';
    card.dataset.rotationTaskMachine = 'MSKC01';
    document.body.appendChild(card);
    card.click(); card.click(); card.click();
    const modal = document.getElementById('rotationTaskModal');
    const modalText = modal ? modal.textContent : '';
    const modalVisible = !!(modal && modal.classList.contains('isVisible'));
    if (typeof window.hideRotationTaskModal === 'function') window.hideRotationTaskModal();
    card.remove();
    return {
      ok: true,
      mismatches,
      sharedMill,
      nightWash,
      morningWash,
      modalVisible,
      modalText
    };
  })()`);
  assert(rotationTasksState.ok, `${viewport.name}: denní úkoly se nenačetly ${JSON.stringify(rotationTasksState)}`);
  assert(rotationTasksState.mismatches.length === 0, `${viewport.name}: mapování denních úkolů neodpovídá zadání ${JSON.stringify(rotationTasksState)}`);
  assert(rotationTasksState.sharedMill.machine === 'MFKF06' && rotationTasksState.sharedMill.tasks[0]?.place === 'KP511', `${viewport.name}: společné frézky nepoužily úkol MFKF06 ${JSON.stringify(rotationTasksState)}`);
  assert(rotationTasksState.nightWash.tasks.some((task) => task.label === 'ALMEN') && !rotationTasksState.morningWash.tasks.some((task) => task.label === 'ALMEN') && rotationTasksState.morningWash.tasks.some((task) => task.label === 'Odebrat jeden kus na RTG'), `${viewport.name}: úkoly TPKW01 pro ranní/noční směnu neodpovídají zadání ${JSON.stringify(rotationTasksState)}`);
  assert(rotationTasksState.modalVisible && /Testovací člověk/.test(rotationTasksState.modalText) && /KP518/.test(rotationTasksState.modalText) && /KP512/.test(rotationTasksState.modalText), `${viewport.name}: trojité klepnutí neotevřelo správný úkol ${JSON.stringify(rotationTasksState)}`);

  const vacationReportState = await evalInPage(client, `(() => {
    const text = window.RakVacationReport && typeof window.RakVacationReport.getText === 'function'
      ? window.RakVacationReport.getText('1/25') : '';
    return { available: !!text, hasTitle: /report dovolených/i.test(text), hasName: /Pech/.test(text), hasPartialVacation: /Kmínek/.test(text) };
  })()`);
  assert(vacationReportState.available && vacationReportState.hasTitle && vacationReportState.hasName && vacationReportState.hasPartialVacation, `${viewport.name}: report dovolené nečte dovolené z kalendáře správně ${JSON.stringify(vacationReportState)}`);

  const crossMonthBoundaryState = await evalInPage(client, `(() => {
    const originalMonths = JSON.parse(JSON.stringify(app.rotation?.months || {}));
    try {
      const known = typeof adminGetKnownNames === 'function' ? adminGetKnownNames() : [];
      const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
      const softHeaders = typeof SOFT_MACHINE_HEADERS !== 'undefined' ? SOFT_MACHINE_HEADERS : ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
      const blankHard = (date) => ({ date, cells: Array(hardHeaders.length).fill('') });
      const blankSoft = (date) => ({ date, cells: Array(softHeaders.length).fill('') });
      const julyHard = blankHard('31.7. R');
      const julySoft = blankSoft('31.7. R');
      julyHard.cells[0] = 'Kříž';
      julySoft.cells[4] = 'Blažek';
      const augustHard = blankHard('1.8. R');
      const augustSoft = blankSoft('1.8. R');
      augustHard.cells[0] = 'Kříž';
      augustSoft.cells[4] = 'Blažek';
      app.rotation.months = {
        '7/26': { hard: { machines: hardHeaders, rows: [julyHard] }, soft: { machines: softHeaders, rows: [julySoft] }, notes: [] },
        '8/26': { hard: { machines: hardHeaders, rows: [augustHard] }, soft: { machines: softHeaders, rows: [augustSoft] }, notes: [] }
      };
      const boundary = adminRotationGeneratorGetPreviousMonthBoundary('8/26', known);
      const issues = adminRotationValidateMonthRules(app.rotation.months['8/26'], '8/26', { source: 'generator' }).issues || [];
      const root = document.createElement('div');
      root.dataset.adminView = 'rotation';
      root.innerHTML = '<select id="adminMonthSelect"><option value="8/26" selected>8/26</option></select><div id="adminRotationFreeNamesSummary"></div>';
      document.body.appendChild(root);
      adminRenderRotationAvailabilitySummary(root);
      const monthCheckText = root.querySelector('#adminRotationFreeNamesSummary')?.textContent || '';
      root.remove();
      return {
        ok: true,
        boundary,
        canUsePress: adminRotationGeneratorCanUseHardMachine(app.rotation.months['8/26'], 0, 'TNKS01', 'Kříž', known, '8/26'),
        canUseSoloMill: adminRotationGeneratorCanUseSoloMill(app.rotation.months['8/26'], 0, 'Blažek', known, '8/26'),
        issueTypes: issues.map((issue) => issue.type),
        monthCheckText
      };
    } finally {
      app.rotation.months = originalMonths;
    }
  })()`);
  assert(crossMonthBoundaryState.ok, `${viewport.name}: kontrola přelomu měsíců se nespustila ${JSON.stringify(crossMonthBoundaryState)}`);
  assert(crossMonthBoundaryState.boundary.monthKey === '7/26' && crossMonthBoundaryState.boundary.pressNames.includes('Kříž') && crossMonthBoundaryState.boundary.soloMillName === 'Blažek', `${viewport.name}: generátor nenačetl poslední pracovní směnu minulého měsíce ${JSON.stringify(crossMonthBoundaryState)}`);
  assert(!crossMonthBoundaryState.canUsePress && !crossMonthBoundaryState.canUseSoloMill, `${viewport.name}: generátor dovolil stejné nýtování nebo samostatné frézky přes přelom měsíce ${JSON.stringify(crossMonthBoundaryState)}`);
  assert(crossMonthBoundaryState.issueTypes.includes('boundary-consecutive-tnks') && crossMonthBoundaryState.issueTypes.includes('boundary-consecutive-solo-mill'), `${viewport.name}: validace neoznačila porušení přes přelom měsíce ${JSON.stringify(crossMonthBoundaryState)}`);
  assert(crossMonthBoundaryState.monthCheckText.includes('Nýtování dva dny po sobě:') && crossMonthBoundaryState.monthCheckText.includes('Kříž nesmí nýtovat dvě směny po sobě'), `${viewport.name}: Kontrola měsíce nezobrazuje porušení zákazu dvojího nýtování ${JSON.stringify(crossMonthBoundaryState)}`);

  const liveRotationGenerator = liveRotationPayload ? await evalInPage(client, `(() => {
    const originalRotation = JSON.parse(JSON.stringify(app.rotation || {}));
    const originalDrafts = JSON.parse(JSON.stringify(app.adminRotationPendingDrafts || {}));
    const originalWindowDrafts = JSON.parse(JSON.stringify(window.__rakRotationGeneratorPendingDrafts || {}));
    try {
      app.rotation = ${JSON.stringify(liveRotationPayload)};
      app.selectedMonth = '8/26';
      const prefill = adminRotationGeneratorBuildPrefillState('8/26');
      adminRotationGeneratorSetWizardState({ step: 'absences', monthKey: '8/26', days: prefill.days, absencesByDay: prefill.absencesByDay });
      const prepared = adminRotationGeneratorEnsurePreparedMonthFromWizard();
      const before = adminBuildRotationGenerationModel('8/26').softCoreCycleState;
      const result = adminGenerateRotationMonthDraft('8/26', prepared);
      const ruleCheck = adminRotationValidateMonthRules(result.normalized, '8/26', { source: 'generator' });
      const hits = [];
      (result.normalized.hard.rows || []).forEach((row) => {
        (row.cells || []).forEach((person, idx) => {
          if (['Synek', 'Třasák', 'Střížek'].includes(String(person || '').trim())) hits.push({ date: row.date, person, machine: HARD_MACHINE_HEADERS[idx] });
        });
      });
      const balanceNames = adminGetKnownNames().filter((name) => !['Synek', 'Třasák', 'Střížek'].includes(name) && adminRotationGeneratorPersonKnowsMachine(name, 'TNKS01'));
      const pressCounts = adminRotationGeneratorCountHardMachine(result.normalized, 'TNKS01', balanceNames, '8/26');
      return { before, hits, skipped: result.softCoreSkippedSlots || 0, pressCounts, issues: ruleCheck.issues };
    } finally {
      app.rotation = originalRotation;
      app.adminRotationPendingDrafts = originalDrafts;
      window.__rakRotationGeneratorPendingDrafts = originalWindowDrafts;
    }
  })()`) : null;
  if (liveRotationGenerator) {
    assert(liveRotationGenerator.issues.length === 0, `${viewport.name}: živý srpen neprošel pravidly ${JSON.stringify(liveRotationGenerator)}`);
    assert(liveRotationGenerator.hits[0]?.date === '5.8. N' && liveRotationGenerator.hits[0]?.person === 'Střížek' && liveRotationGenerator.hits[0]?.machine === 'TNKS01', `${viewport.name}: živý srpen nezačal Střížkem 5.8. na TNKS01 ${JSON.stringify(liveRotationGenerator)}`);
    assert(liveRotationGenerator.hits[1]?.date === '6.8. N' && liveRotationGenerator.hits[1]?.person === 'Synek' && liveRotationGenerator.hits[1]?.machine === 'TNKS01', `${viewport.name}: živý srpen nepokračoval Synkem 6.8. na TNKS01 ${JSON.stringify(liveRotationGenerator)}`);
    assert(!liveRotationGenerator.hits.some((hit) => hit.date === '10.8. R'), `${viewport.name}: živý srpen nevynechal chybějícího Třasáka 10.8. ${JSON.stringify(liveRotationGenerator)}`);
  }

  const vacationShiftCountdownState = await evalInPage(client, `(() => {
    if (typeof getVacationCountdownTeamShiftCount !== 'function') return { ok: false, reason: 'missing countdown function' };
    const beforeNightEnd = getVacationCountdownTeamShiftCount(new Date(2026, 6, 18, 18, 1), new Date(2026, 6, 19, 14, 0), 'D');
    const afterNightEnd = getVacationCountdownTeamShiftCount(new Date(2026, 6, 19, 6, 1), new Date(2026, 6, 19, 14, 0), 'D');
    return { ok: true, beforeNightEnd, afterNightEnd };
  })()`);
  assert(vacationShiftCountdownState.ok, `${viewport.name}: test odpočtu směn do CZD se nespustil ${JSON.stringify(vacationShiftCountdownState)}`);
  assert(vacationShiftCountdownState.beforeNightEnd === 1, `${viewport.name}: probíhající směna D se musí počítat až do konce ${JSON.stringify(vacationShiftCountdownState)}`);
  assert(vacationShiftCountdownState.afterNightEnd === 0, `${viewport.name}: po konci směny D už do CZD nemá zbývat směna ${JSON.stringify(vacationShiftCountdownState)}`);

  const vacationNextEventState = await evalInPage(client, `(() => {
    if (typeof getVacationCountdown !== 'function') return { ok: false, reason: 'missing countdown function' };
    const afterCzd = getVacationCountdown(new Date(2026, 7, 2, 18, 1));
    return { ok: true, text: afterCzd && afterCzd.text || '', meta: afterCzd && afterCzd.meta || '', shiftText: afterCzd && afterCzd.shiftText || '' };
  })()`);
  assert(vacationNextEventState.ok, `${viewport.name}: test přepnutí odpočtu po CZD se nespustil ${JSON.stringify(vacationNextEventState)}`);
  assert(/Váno|VĂˇno/i.test(vacationNextEventState.meta), `${viewport.name}: po skončení CZD musí odpočet mířit na Vánoce ${JSON.stringify(vacationNextEventState)}`);

  await clickAndWait(client, 'rotace', '#rotace.page.active');
  const rotationState = await evalInPage(client, `(() => ({
    nameTiles: document.querySelectorAll('.rotaceNameTile, #nameButtons .tile, #rotaceNamesPanel button, #rotaceNamesPanel .bbtn').length,
    hasStatsPanel: Boolean(document.querySelector('#rotaceStatsPanel')),
    canExport: typeof createRotationMonthExportCanvas === 'function'
  }))()`);
  assert(rotationState.hasStatsPanel, `${viewport.name}: Rotace nemá stats panel`);
  assert(rotationState.canExport, `${viewport.name}: chybí createRotationMonthExportCanvas`);

  const exportState = await evalInPage(client, `(() => {
    const months = window.app && app.rotation && app.rotation.months ? Object.keys(app.rotation.months) : [];
    const selected = (document.querySelector('#monthSelect') && document.querySelector('#monthSelect').value) || months[0] || '';
    const canvas = selected && typeof createRotationMonthExportCanvas === 'function' ? createRotationMonthExportCanvas(selected) : null;
    return { selected, width: canvas ? canvas.width : 0, height: canvas ? canvas.height : 0 };
  })()`);
  assert(exportState.selected && exportState.width > 800 && exportState.height > 800, `${viewport.name}: export Rotace nevytvořil platný canvas ${JSON.stringify(exportState)}`);

  const exportAbsenceTableState = await evalInPage(client, `(() => {
    const sourceMonth = window.app && app.rotation && app.rotation.months ? app.rotation.months['8/26'] : null;
    if (!sourceMonth || typeof getRotationMonthExportAbsences !== 'function' || typeof buildRotationExportAbsenceTable !== 'function') return { ok: false, reason: 'missing helpers' };
    const month = JSON.parse(JSON.stringify(sourceMonth));
    const sampleDate = month.hard?.rows?.[0]?.date || month.soft?.rows?.[0]?.date || '5.8. N';
    month.notes = [{ date: sampleDate, person: 'Kříž', code: 'D' }];
    const absences = getRotationMonthExportAbsences(month);
    const table = buildRotationExportAbsenceTable(absences, 0.12, 0.18);
    const columns = table && table.columns ? table.columns : [];
    return {
      ok: true,
      count: absences.length,
      labels: columns.slice(0, 5).map(col => col.label),
      widths: columns.slice(0, 5).map(col => col.width),
      reasonVsPerson: columns[2] && columns[1] ? Number(columns[2].width || 0) / Math.max(0.001, Number(columns[1].width || 0)) : 99
    };
  })()`);
  assert(exportAbsenceTableState.ok, `${viewport.name}: exportní tabulka absencí se nesestavila ${JSON.stringify(exportAbsenceTableState)}`);
  assert(exportAbsenceTableState.count > 0, `${viewport.name}: testovací srpen nemá absence pro export ${JSON.stringify(exportAbsenceTableState)}`);
  assert(exportAbsenceTableState.labels.join('|').startsWith('Datum|Jméno|Důvod'), `${viewport.name}: exportní absence mají špatné sloupce ${JSON.stringify(exportAbsenceTableState)}`);
  assert(exportAbsenceTableState.reasonVsPerson > 0.25 && exportAbsenceTableState.reasonVsPerson < 0.9, `${viewport.name}: sloupec Důvod má špatnou šířku proti Jménu ${JSON.stringify(exportAbsenceTableState)}`);

  const generatorState = await evalInPage(client, `(() => {
    const monthKey = '6/26';
    const beforeMonth = window.app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    const beforeFilled = beforeMonth ? [...(beforeMonth.hard?.rows || []), ...(beforeMonth.soft?.rows || [])].flatMap(row => row.cells || []).filter(Boolean).length : -1;
    const result = typeof adminGenerateRotationMonthDraft === 'function' ? adminGenerateRotationMonthDraft(monthKey) : null;
    const month = window.app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    const rows = month ? (month.hard.rows || []).map((hardRow, idx) => ({ hard: hardRow, soft: (month.soft.rows || [])[idx] || { cells: [] } })) : [];
    let duplicateDays = 0;
    let emptyCells = 0;
    rows.forEach(pair => {
      const names = [...(pair.hard.cells || []), ...(pair.soft.cells || [])].filter(Boolean);
      emptyCells += [...(pair.hard.cells || []), ...(pair.soft.cells || [])].filter(v => !String(v || '').trim()).length;
      if (new Set(names).size !== names.length) duplicateDays += 1;
    });
    return {
      canGenerate: typeof adminGenerateRotationMonthDraft === 'function',
      beforeFilled,
      days: result ? result.days : 0,
      filledCells: result ? result.filledCells : 0,
      historyTemplates: result ? result.historyTemplates : 0,
      previousYearTemplates: result ? result.previousYearTemplates : 0,
      duplicateDays,
      emptyCells
    };
  })()`);
  assert(generatorState.canGenerate, `${viewport.name}: chybí adminGenerateRotationMonthDraft`);
  assert(generatorState.days >= 12 && generatorState.filledCells >= 120, `${viewport.name}: generátor rozpisu nevyplnil dost dat ${JSON.stringify(generatorState)}`);
  assert(generatorState.historyTemplates >= 120, `${viewport.name}: generátor rozpisu nevychází z dost historických řádků ${JSON.stringify(generatorState)}`);
  assert(generatorState.duplicateDays === 0, `${viewport.name}: generátor rozpisu vytvořil duplicitní jméno v jednom dni ${JSON.stringify(generatorState)}`);

  const augustGeneratorState = await evalInPage(client, `(() => {
    const monthKey = '8/26';
    if (typeof adminGenerateRotationMonthDraft !== 'function') return { ok: false, reason: 'missing generator' };
    const result = adminGenerateRotationMonthDraft(monthKey);
    const month = (typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft(monthKey) : null) || app.rotation?.months?.[monthKey] || null;
    if (!month) return { ok: false, reason: 'missing month' };
    const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
    const core = ['Synek', 'Třasák', 'Střížek'];
    const cycle = ['TNKS01', 'TPKW01', 'TPKW02'];
    const blockLength = 3;
    const hardRows = Array.isArray(month.hard?.rows) ? month.hard.rows : [];
    const softRows = Array.isArray(month.soft?.rows) ? month.soft.rows : [];
    const maxRows = Math.max(hardRows.length, softRows.length);
    const sequence = [];
    const duplicateDates = [];
    const coreAvailable = (rowIdx) => {
      const row = hardRows[rowIdx] || softRows[rowIdx] || null;
      const date = row?.date || '';
      if (!date) return false;
      const dayNotes = typeof adminRotationGeneratorDateNotes === 'function' ? adminRotationGeneratorDateNotes(month, date) : [];
      if (typeof adminRotationGeneratorIsDayBlocked === 'function' && adminRotationGeneratorIsDayBlocked(dayNotes)) return false;
      const absences = typeof adminRotationNamesForAbsenceDate === 'function' ? adminRotationNamesForAbsenceDate(month.notes, date, core) : new Set();
      return core.some((name) => !absences.has(name));
    };
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx += 1) {
      const hard = hardRows[rowIdx] || { cells: [] };
      const soft = softRows[rowIdx] || { cells: [] };
      const names = (hard.cells || []).concat(soft.cells || []).map((name) => String(name || '').trim()).filter(Boolean);
      if (new Set(names).size !== names.length) duplicateDates.push(hard.date || soft.date || String(rowIdx));
      core.forEach((person) => {
        const idx = (hard.cells || []).findIndex((name) => String(name || '').trim() === person);
        const machine = idx >= 0 ? String(hardHeaders[idx] || '').toUpperCase() : '';
        if (cycle.includes(machine)) sequence.push({ rowIdx, date: hard.date || soft.date || '', person, machine });
      });
    }
    const groups = [];
    sequence.forEach((item) => {
      const last = groups[groups.length - 1];
      if (!last || last.machine !== item.machine) {
        groups.push({ machine: item.machine, startIdx: item.rowIdx, endIdx: item.rowIdx, people: [item.person], dates: [item.date] });
      } else {
        last.endIdx = item.rowIdx;
        last.people.push(item.person);
        last.dates.push(item.date);
      }
    });
    const shortMiddleBlocks = groups.slice(1, -1).filter((group) => new Set(group.people).size < blockLength);
    const unnecessaryGaps = [];
    for (let idx = 0; idx < groups.length - 1; idx += 1) {
      const group = groups[idx];
      if (new Set(group.people).size < blockLength) continue;
      let gap = 0;
      for (let rowIdx = group.endIdx + 1; rowIdx < groups[idx + 1].startIdx; rowIdx += 1) {
        if (coreAvailable(rowIdx)) gap += 1;
      }
      if (!gap) continue;
      let remaining = 0;
      for (let rowIdx = group.endIdx + 1; rowIdx < maxRows; rowIdx += 1) {
        if (coreAvailable(rowIdx)) remaining += 1;
      }
      if (remaining % blockLength === 0) unnecessaryGaps.push({ after: group.machine, endDate: group.dates[group.dates.length - 1], gap, remaining });
    }
    return { ok: true, days: result ? result.days : 0, filledCells: result ? result.filledCells : 0, duplicateDates, sequence, groups, shortMiddleBlocks, unnecessaryGaps };
  })()`);
  assert(augustGeneratorState.ok, `${viewport.name}: srpnovy generator se nespustil ${JSON.stringify(augustGeneratorState)}`);
  assert(augustGeneratorState.days >= 10 && augustGeneratorState.filledCells >= 100, `${viewport.name}: srpnovy generator nevyplnil dost dat ${JSON.stringify(augustGeneratorState)}`);
  assert(augustGeneratorState.duplicateDates.length === 0, `${viewport.name}: srpnovy generator vytvoril duplicitu v jednom dni ${JSON.stringify(augustGeneratorState.duplicateDates)}`);
  assert(augustGeneratorState.shortMiddleBlocks.length === 0, `${viewport.name}: trojice z mekoty preskocila stroj pred dokoncenim vnitrniho bloku ${JSON.stringify(augustGeneratorState.shortMiddleBlocks)}`);
  assert(augustGeneratorState.unnecessaryGaps.length === 0, `${viewport.name}: trojice z mekoty ma zbytecnou mezeru mezi bloky ${JSON.stringify(augustGeneratorState.unnecessaryGaps)}`);

  const softCoreContinuationState = await evalInPage(client, `(() => {
    const original = JSON.parse(JSON.stringify(app.rotation?.months || {}));
    const originalDrafts = JSON.parse(JSON.stringify(app.adminRotationPendingDrafts || {}));
    const originalWindowDrafts = JSON.parse(JSON.stringify(window.__rakRotationGeneratorPendingDrafts || {}));
    try {
      const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
      const softHeaders = typeof SOFT_MACHINE_HEADERS !== 'undefined' ? SOFT_MACHINE_HEADERS : ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
      const blankHard = (date) => ({ date, cells: Array(hardHeaders.length).fill('') });
      const blankSoft = (date) => ({ date, cells: Array(softHeaders.length).fill('') });
      app.rotation.months = {};
      const julyHard = [blankHard('24.7. R'), blankHard('25.7. R'), blankHard('26.7. R'), blankHard('27.7. R'), blankHard('28.7. R')];
      julyHard[0].cells[2] = 'Třasák';
      julyHard[1].cells[2] = 'Střížek';
      julyHard[2].cells[2] = 'Synek';
      julyHard[3].cells[3] = 'Střížek';
      julyHard[4].cells[3] = 'Synek';
      app.rotation.months['7/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: julyHard },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: ['24.7. R', '25.7. R', '26.7. R', '27.7. R', '28.7. R'].map(blankSoft) },
        notes: []
      };
      const dates = ['5.8. N', '6.8. N', '10.8. R', '11.8. R', '14.8. N', '15.8. N'];
      app.rotation.months['8/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: dates.map(blankHard) },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: dates.map(blankSoft) },
        notes: ['5.8. N', '6.8. N', '10.8. R'].map((date) => ({ date, person: 'Třasák', code: 'D' }))
      };
      const result = adminGenerateRotationMonthDraft('8/26');
      const generated = typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft('8/26') : app.rotation.months['8/26'];
      const hits = [];
      (generated.hard.rows || []).forEach((row, rowIdx) => {
        ['Synek', 'Třasák', 'Střížek'].forEach((person) => {
          const idx = (row.cells || []).findIndex((name) => String(name || '').trim() === person);
          if (idx >= 0 && ['TNKS01', 'TPKW01', 'TPKW02'].includes(String(hardHeaders[idx] || '').toUpperCase())) hits.push({ rowIdx, date: row.date, person, machine: hardHeaders[idx] });
        });
      });
      return { ok: true, hits, skippedSlots: Number(result && result.softCoreSkippedSlots || 0) };
    } finally {
      app.rotation.months = original;
      app.adminRotationPendingDrafts = originalDrafts;
      window.__rakRotationGeneratorPendingDrafts = originalWindowDrafts;
    }
  })()`);
  assert(softCoreContinuationState.ok, `${viewport.name}: synteticka kontrola navaznosti trojice se nespustila ${JSON.stringify(softCoreContinuationState)}`);
  assert(softCoreContinuationState.skippedSlots === 1, `${viewport.name}: generator nepreskocil chybejici treti krok rozdelaneho bloku ${JSON.stringify(softCoreContinuationState)}`);
  assert(softCoreContinuationState.hits[0] && softCoreContinuationState.hits[0].person === 'Střížek' && softCoreContinuationState.hits[0].machine === 'TNKS01' && softCoreContinuationState.hits[0].date === '6.8. N', `${viewport.name}: novy blok nezacal den po preskoceni chybejiciho Trasaka ${JSON.stringify(softCoreContinuationState.hits)}`);
  assert(softCoreContinuationState.hits[1] && softCoreContinuationState.hits[1].person === 'Synek' && softCoreContinuationState.hits[1].machine === 'TNKS01' && softCoreContinuationState.hits[1].date === '10.8. R', `${viewport.name}: TNKS01 blok nepokracoval druhym dostupnym clovekem ${JSON.stringify(softCoreContinuationState.hits)}`);
  assert(softCoreContinuationState.hits[2] && softCoreContinuationState.hits[2].person === 'Třasák' && softCoreContinuationState.hits[2].machine === 'TNKS01' && softCoreContinuationState.hits[2].date === '11.8. R', `${viewport.name}: Trasak po navratu nedokoncil novy TNKS01 blok ${JSON.stringify(softCoreContinuationState.hits)}`);
  assert(!softCoreContinuationState.hits.some((hit) => hit.date === '5.8. N'), `${viewport.name}: novy blok zacal uz ve stejny den jako preskoceny treti krok ${JSON.stringify(softCoreContinuationState.hits)}`);

  const softCoreSavedJulyState = await evalInPage(client, `(() => {
    const original = JSON.parse(JSON.stringify(app.rotation?.months || {}));
    const originalDrafts = JSON.parse(JSON.stringify(app.adminRotationPendingDrafts || {}));
    const originalWindowDrafts = JSON.parse(JSON.stringify(window.__rakRotationGeneratorPendingDrafts || {}));
    try {
      const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
      const softHeaders = typeof SOFT_MACHINE_HEADERS !== 'undefined' ? SOFT_MACHINE_HEADERS : ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
      const blankHard = (date) => ({ date, cells: Array(hardHeaders.length).fill('') });
      const blankSoft = (date) => ({ date, cells: Array(softHeaders.length).fill('') });
      app.rotation.months = {};
      const julyDates = ['3.7. R', '4.7. R', '8.7. N', '9.7. N', '13.7. R', '14.7. R', '17.7. N', '18.7. N'];
      const julyHard = julyDates.map(blankHard);
      julyHard[0].cells[2] = 'Třasák';
      julyHard[1].cells[2] = 'Střížek';
      julyHard[4].cells[3] = 'Střížek';
      julyHard[5].cells[3] = 'Synek';
      app.rotation.months['7/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: julyHard },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: julyDates.map(blankSoft) },
        notes: [
          { date: '3.7. R', person: 'Synek', code: 'N' },
          { date: '4.7. R', person: 'Synek', code: 'N' },
          { date: '8.7. N', person: 'Synek', code: 'N' },
          { date: '8.7. N', person: 'Třasák', code: 'D' },
          { date: '9.7. N', person: 'Synek', code: 'N' },
          { date: '9.7. N', person: 'Třasák', code: 'D' },
          { date: '13.7. R', person: 'Třasák', code: 'D' },
          { date: '14.7. R', person: 'Třasák', code: 'D' },
          { date: '17.7. N', person: 'Třasák', code: 'D' },
          { date: '18.7. N', person: 'Třasák', code: 'D' }
        ]
      };
      const augustDates = ['5.8. N', '6.8. N', '10.8. R', '11.8. R', '14.8. N'];
      app.rotation.months['8/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: augustDates.map(blankHard) },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: augustDates.map(blankSoft) },
        notes: ['5.8. N', '6.8. N', '10.8. R'].map((date) => ({ date, person: 'Třasák', code: 'D' }))
      };
      const result = adminGenerateRotationMonthDraft('8/26');
      const generated = typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft('8/26') : app.rotation.months['8/26'];
      const hits = [];
      (generated.hard.rows || []).forEach((row) => {
        (row.cells || []).forEach((person, idx) => {
          if (['Synek', 'Třasák', 'Střížek'].includes(String(person || '').trim())) hits.push({ date: row.date, person, machine: hardHeaders[idx] });
        });
      });
      return { ok: true, hits, skippedSlots: Number(result && result.softCoreSkippedSlots || 0) };
    } finally {
      app.rotation.months = original;
      app.adminRotationPendingDrafts = originalDrafts;
      window.__rakRotationGeneratorPendingDrafts = originalWindowDrafts;
    }
  })()`);
  assert(softCoreSavedJulyState.ok, `${viewport.name}: kontrola skutecneho konce cervence se nespustila ${JSON.stringify(softCoreSavedJulyState)}`);
  assert(softCoreSavedJulyState.hits[0] && softCoreSavedJulyState.hits[0].date === '5.8. N' && softCoreSavedJulyState.hits[0].machine === 'TNKS01', `${viewport.name}: srpnovy blok po ulozenem cervenci nezacal hned 5.8. ${JSON.stringify(softCoreSavedJulyState)}`);
  assert(softCoreSavedJulyState.hits[1] && softCoreSavedJulyState.hits[1].date === '6.8. N' && softCoreSavedJulyState.hits[1].machine === 'TNKS01', `${viewport.name}: srpnovy TNKS01 blok nepokracoval 6.8. ${JSON.stringify(softCoreSavedJulyState)}`);
  assert(!softCoreSavedJulyState.hits.some((hit) => hit.date === '10.8. R'), `${viewport.name}: chybejici treti krok TNKS01 mel zustat 10.8. prazdny ${JSON.stringify(softCoreSavedJulyState)}`);
  assert(softCoreSavedJulyState.hits.some((hit) => hit.date === '11.8. R' && hit.machine === 'TPKW01'), `${viewport.name}: po preskoceni 10.8. nezacal 11.8. novy TPKW01 blok ${JSON.stringify(softCoreSavedJulyState)}`);

  const pendingDraftEditorState = await evalInPage(client, `(() => {
    const original = JSON.parse(JSON.stringify(app.rotation?.months?.['8/26'] || null));
    const originalDrafts = JSON.parse(JSON.stringify(app.adminRotationPendingDrafts || {}));
    const originalWindowDrafts = JSON.parse(JSON.stringify(window.__rakRotationGeneratorPendingDrafts || {}));
    try {
      const saved = JSON.parse(JSON.stringify(original));
      const pending = JSON.parse(JSON.stringify(original));
      saved.hard.rows[0].date = 'ULOZENO-ONLINE';
      pending.hard.rows[0].date = 'NOVY-NAVRH';
      app.rotation.months['8/26'] = saved;
      adminRotationGeneratorSetPendingDraft('8/26', pending);
      app.adminRotationPendingDrafts = {};
      const html = buildAdminRotationTableHtml('8/26');
      window.__rakRotationGeneratorPendingDrafts = {};
      const opened = adminRotationGeneratorOpenDraftInEditor({ monthKey: '8/26', result: { normalized: pending } }, null);
      return {
        hasPendingDate: html.includes('NOVY-NAVRH'),
        hasSavedDate: html.includes('ULOZENO-ONLINE'),
        reopenedFromResult: opened && app.rotation.months['8/26'].hard.rows[0].date === 'NOVY-NAVRH',
        hasPendingLabel: html.includes('vygenerovaný návrh')
      };
    } finally {
      app.rotation.months['8/26'] = original;
      app.adminRotationPendingDrafts = originalDrafts;
      window.__rakRotationGeneratorPendingDrafts = originalWindowDrafts;
    }
  })()`);
  assert(pendingDraftEditorState.hasPendingDate && !pendingDraftEditorState.hasSavedDate, `${viewport.name}: editor neuprednostnil vygenerovany navrh ${JSON.stringify(pendingDraftEditorState)}`);
  assert(pendingDraftEditorState.hasPendingLabel, `${viewport.name}: editor neoznacil zobrazeny vygenerovany navrh ${JSON.stringify(pendingDraftEditorState)}`);
  assert(pendingDraftEditorState.reopenedFromResult, `${viewport.name}: otevreni editoru neobnovilo navrh z vysledku generatoru ${JSON.stringify(pendingDraftEditorState)}`);

  const softCoreOneDayAbsenceState = await evalInPage(client, `(() => {
    const original = JSON.parse(JSON.stringify(app.rotation?.months || {}));
    const originalDrafts = JSON.parse(JSON.stringify(app.adminRotationPendingDrafts || {}));
    const originalWindowDrafts = JSON.parse(JSON.stringify(window.__rakRotationGeneratorPendingDrafts || {}));
    try {
      const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
      const softHeaders = typeof SOFT_MACHINE_HEADERS !== 'undefined' ? SOFT_MACHINE_HEADERS : ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
      const blankHard = (date) => ({ date, cells: Array(hardHeaders.length).fill('') });
      const blankSoft = (date) => ({ date, cells: Array(softHeaders.length).fill('') });
      app.rotation.months = {};
      const julyDates = ['24.7. R', '25.7. R', '26.7. R'];
      const julyHard = julyDates.map(blankHard);
      julyHard[0].cells[3] = 'Synek';
      julyHard[1].cells[3] = 'Třasák';
      julyHard[2].cells[3] = 'Střížek';
      app.rotation.months['7/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: julyHard },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: julyDates.map(blankSoft) },
        notes: []
      };
      const dates = ['5.8. N', '6.8. N', '10.8. R'];
      app.rotation.months['8/26'] = {
        hard: { title: 'Rotace tvrdota', machines: hardHeaders.slice(), rows: dates.map(blankHard) },
        soft: { title: 'Rotace měkota', machines: softHeaders.slice(), rows: dates.map(blankSoft) },
        notes: [{ date: '5.8. N', person: 'Synek', code: 'D' }]
      };
      const result = adminGenerateRotationMonthDraft('8/26');
      const generated = typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft('8/26') : app.rotation.months['8/26'];
      const hits = (generated.hard.rows || []).map((row) => {
        const idx = (row.cells || []).findIndex((name) => ['Synek', 'Třasák', 'Střížek'].includes(String(name || '').trim()));
        return idx >= 0 ? { date: row.date, person: row.cells[idx], machine: hardHeaders[idx] } : null;
      }).filter(Boolean);
      return { ok: true, hits, skippedSlots: Number(result && result.softCoreSkippedSlots || 0) };
    } finally {
      app.rotation.months = original;
      app.adminRotationPendingDrafts = originalDrafts;
      window.__rakRotationGeneratorPendingDrafts = originalWindowDrafts;
    }
  })()`);
  assert(softCoreOneDayAbsenceState.ok, `${viewport.name}: test jednodeni absence trojice se nespustil ${JSON.stringify(softCoreOneDayAbsenceState)}`);
  assert(softCoreOneDayAbsenceState.skippedSlots === 0, `${viewport.name}: jednodeni absence se nema preskocit, kdyz pomuze prohozeni poradi ${JSON.stringify(softCoreOneDayAbsenceState)}`);
  assert(softCoreOneDayAbsenceState.hits.length === 3 && softCoreOneDayAbsenceState.hits.every((hit) => hit.machine === 'TNKS01'), `${viewport.name}: jednodeni absence rozbila tridenni TNKS01 blok ${JSON.stringify(softCoreOneDayAbsenceState.hits)}`);
  assert(new Set(softCoreOneDayAbsenceState.hits.map((hit) => hit.person)).size === 3, `${viewport.name}: po jednodeni absenci se v bloku nevystridali vsichni tri ${JSON.stringify(softCoreOneDayAbsenceState.hits)}`);

  const generatorAbsenceRuleState = await evalInPage(client, `(() => {
    const monthKey = '7/26';
    const month = window.app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    if (!month || typeof adminGenerateRotationMonthDraft !== 'function') return { ok: false, reason: 'missing month/generator' };
    const firstDate = month.hard?.rows?.[0]?.date || month.soft?.rows?.[0]?.date || '';
    month.notes = [{ date: firstDate, person: 'Blažek', code: 'D' }, { date: firstDate, person: 'Kříž', code: 'D' }];
    (month.hard?.rows || []).forEach(row => { row.cells = Array(5).fill(''); });
    (month.soft?.rows || []).forEach(row => { row.cells = Array(5).fill(''); });
    const result = adminGenerateRotationMonthDraft(monthKey);
    const draft = typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft(monthKey) : null;
    const generatedMonth = draft || app.rotation.months[monthKey];
    const row = generatedMonth.soft.rows[0];
    const hardRow = generatedMonth.hard.rows[0];
    const soft = row ? row.cells || [] : [];
    const names = [...(hardRow?.cells || []), ...soft].filter(Boolean);
    return {
      ok: true,
      ruleVersion: result && result.ruleVersion,
      protectedEmptyCells: result && result.protectedEmptyCells,
      mskc01: soft[0] || '',
      mfkf06: soft[3] || '',
      mfkf10: soft[4] || '',
      filled: names.length,
      duplicate: new Set(names).size !== names.length
    };
  })()`);
  assert(generatorAbsenceRuleState.ok, `${viewport.name}: generátor pravidel absencí se nespustil ${JSON.stringify(generatorAbsenceRuleState)}`);
  assert(generatorAbsenceRuleState.ruleVersion === '1.149', `${viewport.name}: generátor nemá pravidla 1.149 ${JSON.stringify(generatorAbsenceRuleState)}`);
  assert(generatorAbsenceRuleState.mfkf06 === '', `${viewport.name}: při jednom člověku na frézkách musí být MFKF06 prázdná ${JSON.stringify(generatorAbsenceRuleState)}`);
  assert(generatorAbsenceRuleState.mskc01 === '', `${viewport.name}: při dvou absencích musí být MSKC01 prázdná ${JSON.stringify(generatorAbsenceRuleState)}`);
  assert(generatorAbsenceRuleState.mfkf10, `${viewport.name}: při dvou absencích musí být člověk na MFKF10 ${JSON.stringify(generatorAbsenceRuleState)}`);
  assert(!generatorAbsenceRuleState.duplicate, `${viewport.name}: generátor absencí vytvořil duplicitu ${JSON.stringify(generatorAbsenceRuleState)}`);

  const generatorHardRepairState = await evalInPage(client, `(() => {
    const monthKey = '8/26';
    const month = window.app && app.rotation && app.rotation.months ? app.rotation.months[monthKey] : null;
    if (!month || typeof adminGenerateRotationMonthDraft !== 'function') return { ok: false, reason: 'missing month/generator' };
    const original = JSON.parse(JSON.stringify(month));
    const originalSettingsRows = JSON.parse(JSON.stringify(app.machineSettingsRows || []));
    try {
      const allMachines = ['MSK', 'MFK', 'TNK', 'TBK', 'TPKW01', 'TPKW02'];
      const softCoreMachines = ['MSK', 'MFK', 'TNK', 'TPKW01', 'TPKW02'];
      app.machineSettingsRows = originalSettingsRows.filter((row) => row && row.machine_key !== 'WORKER_ROSTER_SETTINGS').concat([{
        machine_key: 'WORKER_ROSTER_SETTINGS',
        machine_code: 'APP',
        machine_index: 'workers',
        label: 'Pracovníci',
        category: 'frezka',
        settings_json: {
          type: 'worker_roster_settings',
          custom: true,
          workers: ['Blažek', 'Kmínek', 'Kříž', 'Novotný', 'Pech', 'Starý', 'Špadrna'].map((name) => ({ name, machines: allMachines, loginNumber: '' }))
            .concat(['Střížek', 'Synek', 'Třasák'].map((name) => ({ name, machines: softCoreMachines, loginNumber: '' })))
        }
      }]);
      month.notes = [{ date: '29.8. R', person: 'Kříž', code: 'D' }, { date: '29.8. R', person: 'Špadrna', code: 'D' }];
      (month.hard?.rows || []).forEach(row => { row.cells = Array(5).fill(''); });
      (month.soft?.rows || []).forEach(row => { row.cells = Array(5).fill(''); });
      const result = adminGenerateRotationMonthDraft(monthKey);
      const draft = typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft(monthKey) : null;
      const generatedMonth = draft || app.rotation.months[monthKey];
      const rowIdx = (generatedMonth.hard?.rows || []).findIndex(row => row.date === '29.8. R');
      const hard = rowIdx >= 0 ? (generatedMonth.hard.rows[rowIdx].cells || []) : [];
      const soft = rowIdx >= 0 ? ((generatedMonth.soft?.rows || [])[rowIdx]?.cells || []) : [];
      const names = hard.concat(soft).filter(Boolean);
      const hardHeaders = typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : ['TNKS01', 'TBKR07', 'TPKW01', 'TPKW02', 'TBKR01'];
      const softHeaders = typeof SOFT_MACHINE_HEADERS !== 'undefined' ? SOFT_MACHINE_HEADERS : ['MSKC01', 'MSKC03', 'MSKC04', 'MFKF06', 'MFKF10'];
      const trasakHardIdx = hard.findIndex((name) => String(name || '').trim() === 'Třasák');
      const trasakSoftIdx = soft.findIndex((name) => String(name || '').trim() === 'Třasák');
      return {
        ok: rowIdx >= 0,
        ruleVersion: result && result.ruleVersion,
        emptyHardCellRepairs: result && result.emptyHardCellRepairs,
        tbkr07: hard[1] || '',
        mskc01: soft[0] || '',
        trasakHardMachine: trasakHardIdx >= 0 ? hardHeaders[trasakHardIdx] : '',
        trasakSoftMachine: trasakSoftIdx >= 0 ? softHeaders[trasakSoftIdx] : '',
        hard,
        soft,
        filled: names.length,
        duplicate: new Set(names).size !== names.length
      };
    } finally {
      app.rotation.months[monthKey] = original;
      app.machineSettingsRows = originalSettingsRows;
    }
  })()`);
  assert(generatorHardRepairState.ok, `${viewport.name}: test doplnění tvrdoty se nespustil ${JSON.stringify(generatorHardRepairState)}`);
  assert(generatorHardRepairState.ruleVersion === '1.149', `${viewport.name}: doplnění tvrdoty neběží na pravidlech 1.149 ${JSON.stringify(generatorHardRepairState)}`);
  assert(generatorHardRepairState.tbkr07 && generatorHardRepairState.tbkr07 !== 'Třasák', `${viewport.name}: TBKR07 musí doplnit někdo s TBK, ne Třasák ${JSON.stringify(generatorHardRepairState)}`);
  assert(['TNKS01', 'TPKW01', 'TPKW02'].includes(generatorHardRepairState.trasakHardMachine) || !!generatorHardRepairState.trasakSoftMachine, `${viewport.name}: dostupný Třasák má být buď na povolené tvrdotě TNKS01/TPKW01/TPKW02, nebo na měkotě ${JSON.stringify(generatorHardRepairState)}`);
  assert(generatorHardRepairState.filled >= 8, `${viewport.name}: při dvou absencích má být obsazeno osm lidí ${JSON.stringify(generatorHardRepairState)}`);
  assert(!generatorHardRepairState.duplicate, `${viewport.name}: doplnění tvrdoty vytvořilo duplicitu ${JSON.stringify(generatorHardRepairState)}`);

  const generatorTuningRulesState = await evalInPage(client, `(() => {
    if (typeof getAdminRotationGeneratorRules !== 'function') return { ok: false, reason: 'missing rules getter' };
    const rules = getAdminRotationGeneratorRules();
    return {
      ok: true,
      avoidLatheEnabled: rules.avoidLatheWhenTwoLathesOneMillEnabled !== false,
      avoidLatheNames: rules.avoidLatheWhenTwoLathesOneMillNames || [],
      soloMillEnabled: rules.soloMillBalanceEnabled !== false,
      soloMillMaxSpread: rules.soloMillMaxSpread,
      softTotalEnabled: rules.softTotalBalanceEnabled !== false,
      softTotalNames: rules.softTotalBalanceNames || [],
      softTotalMaxSpread: rules.softTotalMaxSpread,
      hardKindEnabled: rules.hardPeopleSoftKindBalanceEnabled !== false,
      hardKindNames: rules.hardPeopleSoftKindBalanceNames || [],
      hardKindMaxSpread: rules.hardPeopleSoftKindMaxSpread,
      softKindGlobalEnabled: rules.softKindGlobalBalanceEnabled !== false,
      softKindMixedMinimumShifts: rules.softKindMixedMinimumShifts
    };
  })()`);
  assert(generatorTuningRulesState.ok, `${viewport.name}: pravidla jemného doladění generátoru nejsou dostupná ${JSON.stringify(generatorTuningRulesState)}`);
  assert(generatorTuningRulesState.avoidLatheEnabled && generatorTuningRulesState.avoidLatheNames.includes('Starý'), `${viewport.name}: výchozí pravidlo Starý mimo soustruhy při 2+1 chybí ${JSON.stringify(generatorTuningRulesState)}`);
  assert(generatorTuningRulesState.soloMillEnabled && Number(generatorTuningRulesState.soloMillMaxSpread) === 1, `${viewport.name}: výchozí vyrovnání samostatných frézek chybí ${JSON.stringify(generatorTuningRulesState)}`);
  assert(generatorTuningRulesState.softTotalEnabled && generatorTuningRulesState.softTotalNames.includes('Blažek') && Number(generatorTuningRulesState.softTotalMaxSpread) === 1, `${viewport.name}: výchozí vyrovnání měkoty chybí ${JSON.stringify(generatorTuningRulesState)}`);
  assert(generatorTuningRulesState.hardKindEnabled && generatorTuningRulesState.hardKindNames.includes('Kmínek') && Number(generatorTuningRulesState.hardKindMaxSpread) === 1, `${viewport.name}: výchozí vyrovnání soustruhy/frézky chybí ${JSON.stringify(generatorTuningRulesState)}`);
  assert(generatorTuningRulesState.softKindGlobalEnabled, `${viewport.name}: výchozí vyrovnání soustruhy/frézky přes celou měkotu chybí ${JSON.stringify(generatorTuningRulesState)}`);
  assert(Number(generatorTuningRulesState.softKindMixedMinimumShifts) === 3, `${viewport.name}: výchozí mix soustruhy/frézky od 3 směn chybí ${JSON.stringify(generatorTuningRulesState)}`);

  const absenceStateAfterAdd = await evalInPage(client, `(() => {
    const previousBody = document.getElementById('appMenuBody');
    if (previousBody) previousBody.remove();
    const body = document.createElement('div');
    body.id = 'appMenuBody';
    document.body.appendChild(body);
    if (typeof adminRotationGeneratorSetWizardState !== 'function' || typeof adminRotationGeneratorCollectAbsencesFromDom !== 'function' || typeof adminRotationGeneratorRenderWizard !== 'function') {
      return { ok: false, reason: 'missing wizard functions' };
    }
    adminRotationGeneratorSetWizardState({
      step: 'absences',
      monthKey: '6/26',
      days: ['1.6. R'],
      absencesByDay: [{ date: '1.6. R', rows: [{ person: 'Blažek', code: 'D' }] }]
    });
    adminRotationGeneratorRenderWizard('absences');
    const firstPerson = body.querySelector('[data-generator-absence-person]');
    const firstCode = body.querySelector('[data-generator-absence-code]');
    if (firstPerson) firstPerson.value = 'Kříž';
    if (firstCode) firstCode.value = 'D';
    const addBtn = body.querySelector('[data-admin-action="generator-absence-add"][data-day-index="0"]');
    if (!addBtn || typeof adminHandleRotationGeneratorWizardAction !== 'function') {
      return { ok: false, reason: 'missing add button/action' };
    }
    adminHandleRotationGeneratorWizardAction('generator-absence-add', addBtn);
    const rows = Array.from(document.querySelectorAll('[data-generator-absence-day="0"] [data-generator-absence-row]')).map((row) => ({
      person: row.querySelector('[data-generator-absence-person]')?.value || '',
      code: row.querySelector('[data-generator-absence-code]')?.value || ''
    }));
    return { ok: true, rows, rowCount: rows.length };
  })()`);
  assert(absenceStateAfterAdd.ok, `${viewport.name}: test zachování absencí se nespustil ${JSON.stringify(absenceStateAfterAdd)}`);
  assert(absenceStateAfterAdd.rowCount >= 2, `${viewport.name}: + Přidat jméno nepřidalo druhý řádek ${JSON.stringify(absenceStateAfterAdd)}`);
  assert(absenceStateAfterAdd.rows[0] && absenceStateAfterAdd.rows[0].person === 'Kříž' && absenceStateAfterAdd.rows[0].code === 'D', `${viewport.name}: + Přidat jméno smazalo vyplněnou absenci ${JSON.stringify(absenceStateAfterAdd)}`);

  const calendarAbsenceImportState = await evalInPage(client, `(async () => {
    const previousBody = document.getElementById('appMenuBody');
    if (previousBody) previousBody.remove();
    const body = document.createElement('div');
    body.id = 'appMenuBody';
    document.body.appendChild(body);
    if (typeof adminRotationGeneratorSetWizardState !== 'function' || typeof adminRotationGeneratorRenderWizard !== 'function' || typeof adminRotationGeneratorLoadCalendarAbsences !== 'function') {
      return { ok: false, reason: 'missing calendar import functions' };
    }
    const originalFetch = window.fetch;
    const bridge = window.RotationSupabaseBridge;
    const originalGetAdminAccessToken = bridge && bridge.getAdminAccessToken;
    try {
      if (bridge) bridge.getAdminAccessToken = async () => 'browser-smoke-admin-token';
      adminRotationGeneratorSetWizardState({
        step: 'absences',
        monthKey: '7/26',
        days: ['17.7. N', '18.7. R', '19.7. N'],
        absencesByDay: [
          { date: '17.7. N', rows: [] },
          { date: '18.7. R', rows: [] },
          { date: '19.7. N', rows: [] }
        ]
      });
      adminRotationGeneratorRenderWizard('absences');
      window.fetch = async (url) => ({
        ok: String(url || '').includes('/functions/v1/rak-absence-calendar') || String(url || '').includes('calendar.google.com'),
        status: 200,
        text: async () => [
          'BEGIN:VCALENDAR',
          'BEGIN:VEVENT',
          'SUMMARY:Třasák D',
          'DTSTART;VALUE=DATE:20260717',
          'DTEND;VALUE=DATE:20260719',
          'END:VEVENT',
          'BEGIN:VEVENT',
          'SUMMARY:Strizek NV',
          'DTSTART;VALUE=DATE:20260718',
          'DTEND;VALUE=DATE:20260719',
          'END:VEVENT',
          'BEGIN:VEVENT',
          'SUMMARY:Směna D',
          'DTSTART;VALUE=DATE:20260717',
          'DTEND;VALUE=DATE:20260718',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\\n')
      });
      const result = await adminRotationGeneratorLoadCalendarAbsences();
      const rowsByDay = (window.__rakRotationGeneratorWizard?.absencesByDay || []).map((day) => (day.rows || []).filter((row) => row.person || row.code));
      const statusText = document.getElementById('adminOnlineSaveStatus')?.textContent || '';
      return { ok: true, result, rowsByDay, statusText };
    } finally {
      window.fetch = originalFetch;
      if (bridge) bridge.getAdminAccessToken = originalGetAdminAccessToken;
    }
  })()`);
  assert(calendarAbsenceImportState.ok, `${viewport.name}: import absencí z kalendáře se nespustil ${JSON.stringify(calendarAbsenceImportState)}`);
  assert(calendarAbsenceImportState.result && calendarAbsenceImportState.result.importedCount === 3, `${viewport.name}: import z ICS má mít 3 absence ${JSON.stringify(calendarAbsenceImportState)}`);
  assert(calendarAbsenceImportState.rowsByDay[0].some((row) => row.person === 'Třasák' && row.code === 'D'), `${viewport.name}: vícedenní dovolená nezačíná 17.7. ${JSON.stringify(calendarAbsenceImportState)}`);
  assert(calendarAbsenceImportState.rowsByDay[1].some((row) => row.person === 'Třasák' && row.code === 'D'), `${viewport.name}: vícedenní dovolená nepokračuje 18.7. ${JSON.stringify(calendarAbsenceImportState)}`);
  assert(calendarAbsenceImportState.rowsByDay[1].some((row) => row.person === 'Střížek' && row.code === 'NV'), `${viewport.name}: import nezkanonizoval Strizek na Střížek ${JSON.stringify(calendarAbsenceImportState)}`);
  assert(!calendarAbsenceImportState.rowsByDay.flat().some((row) => row.person === 'Směna'), `${viewport.name}: import nesmí brát směnové události jako absence ${JSON.stringify(calendarAbsenceImportState)}`);

  const vacationCopyTextState = await evalInPage(client, `(() => {
    if (typeof buildAdminRotationVacationCopyText !== 'function') return { ok: false, reason: 'missing copy formatter' };
    const month = {
      notes: [
        { date: '5.8. R', person: 'Trasak', code: 'D' },
        { date: '6.8. N', person: 'Třasák', code: 'D' },
        { date: '1.8. R', person: 'Kříž', code: 'L' },
        { date: '2.8. N', person: 'Kříž', code: 'L' },
        { date: '25.8. R', person: 'Kříž', code: 'D' }
      ]
    };
    const text = buildAdminRotationVacationCopyText('8/26', month);
    return { ok: true, text };
  })()`);
  assert(vacationCopyTextState.ok, `${viewport.name}: formát kopírování dovolených se nespustil ${JSON.stringify(vacationCopyTextState)}`);
  assert(vacationCopyTextState.text.includes('Dovolená 8/26'), `${viewport.name}: kopie dovolených nemá nadpis měsíce ${JSON.stringify(vacationCopyTextState)}`);
  assert(vacationCopyTextState.text.includes('Třasák (dovolená) - 5.8., 6.8.'), `${viewport.name}: kopie dovolených neseskupila Třasáka ${JSON.stringify(vacationCopyTextState)}`);
  assert(vacationCopyTextState.text.includes('Kříž (lázně) - 1.8., 2.8.'), `${viewport.name}: kopie dovolených neseskupila lázně ${JSON.stringify(vacationCopyTextState)}`);
  assert(vacationCopyTextState.text.includes('Kříž (dovolená) - 25.8.'), `${viewport.name}: kopie dovolených neoddělila důvody ${JSON.stringify(vacationCopyTextState)}`);

  const wizardRunState = await evalInPage(client, `(() => {
    const previousBody = document.getElementById('appMenuBody');
    if (previousBody) previousBody.remove();
    const body = document.createElement('div');
    body.id = 'appMenuBody';
    document.body.appendChild(body);
    if (typeof adminRotationGeneratorSetWizardState !== 'function' || typeof adminRotationGeneratorRenderWizard !== 'function' || typeof adminHandleRotationGeneratorWizardAction !== 'function') {
      return { ok: false, reason: 'missing wizard functions' };
    }
    const monthKey = '6/26';
    const days = typeof adminRotationGetMonthWorkDates === 'function'
      ? adminRotationGetMonthWorkDates(monthKey).slice(0, 4)
      : ((app.rotation?.months?.[monthKey]?.hard?.rows || []).slice(0, 4).map(row => row.date).filter(Boolean));
    window.confirm = () => true;
    adminRotationGeneratorSetWizardState({
      step: 'absences',
      monthKey,
      days,
      absencesByDay: days.map((date) => ({ date, rows: [] }))
    });
    adminRotationGeneratorRenderWizard('absences');
    const runBtn = body.querySelector('[data-admin-action="generator-run"]');
    if (!runBtn) return { ok: false, reason: 'missing run button', days };
    adminHandleRotationGeneratorWizardAction('generator-run', runBtn);
    const state = window.__rakRotationGeneratorWizard || {};
    const month = (typeof adminRotationGeneratorGetPendingDraft === 'function' ? adminRotationGeneratorGetPendingDraft(monthKey) : null) || app.rotation?.months?.[monthKey] || null;
    const filled = month ? [...(month.hard?.rows || []), ...(month.soft?.rows || [])].flatMap(row => row.cells || []).filter(Boolean).length : 0;
    const machineCountHitCount = document.querySelectorAll('.adminRotationGeneratorMachineSummaryTable .adminRotationMachineCountHit').length;
    const summaryText = document.querySelector('.adminRotationGeneratorMachineSummaryTable')?.textContent || '';
    const previewText = document.querySelector('.adminRotationGeneratorPreviewTable')?.textContent || '';
    const tnksBalance = (() => {
      const names = typeof adminGetKnownNames === 'function' ? adminGetKnownNames() : [];
      const idx = (typeof HARD_MACHINE_HEADERS !== 'undefined' ? HARD_MACHINE_HEADERS : []).indexOf('TNKS01');
      const counts = {};
      names.forEach((name) => counts[name] = 0);
      if (idx >= 0 && month?.hard?.rows) {
        month.hard.rows.forEach((row) => {
          const name = String((row.cells || [])[idx] || '').trim();
          if (Object.prototype.hasOwnProperty.call(counts, name)) counts[name] += 1;
        });
      }
      const active = Object.values(counts).filter((value) => value > 0);
      return { counts, max: active.length ? Math.max(...active) : 0, min: active.length ? Math.min(...active) : 0, swaps: state.result ? Number(state.result.tnksBalanceSwaps || 0) : 0 };
    })();
    return {
      ok: true,
      resultFilledCells: state.result ? state.result.filledCells : 0,
      resultDays: state.result ? state.result.days : 0,
      filled,
      machineCountHitCount,
      tnksBalance,
      summaryTextLength: summaryText.length,
      previewTextLength: previewText.length,
      resultText: state.resultText || ''
    };
  })()`);
  assert(wizardRunState.ok, `${viewport.name}: Vygenerovat rozpis z průvodce se nespustilo ${JSON.stringify(wizardRunState)}`);
  assert(wizardRunState.resultFilledCells > 0 && wizardRunState.filled > 0, `${viewport.name}: Vygenerovat rozpis z průvodce skončilo prázdným rozpisem ${JSON.stringify(wizardRunState)}`);
  assert(wizardRunState.machineCountHitCount > 0 && wizardRunState.summaryTextLength > 20, `${viewport.name}: přehled stroje × jména po průvodci je nulový/prázdný ${JSON.stringify(wizardRunState)}`);
  assert(wizardRunState.previewTextLength > 80, `${viewport.name}: náhled celého rozpisu po průvodci chybí nebo je prázdný ${JSON.stringify(wizardRunState)}`);
  assert(wizardRunState.tnksBalance && wizardRunState.tnksBalance.max - wizardRunState.tnksBalance.min <= 1, `${viewport.name}: TNKS01/nýtovačka není po vygenerování vyrovnaná ${JSON.stringify(wizardRunState.tnksBalance)}`);

  const corruptedMonthRecovery = await evalInPage(client, `(() => {
    const monthKey = '6/26';
    const original = JSON.parse(JSON.stringify(app.rotation?.months?.[monthKey] || null));
    try {
      if (!app.rotation.months[monthKey]) return { ok: false, reason: 'missing month' };
      app.rotation.months[monthKey].hard.rows = [];
      app.rotation.months[monthKey].soft.rows = [];
      const previousBody = document.getElementById('appMenuBody');
      if (previousBody) previousBody.remove();
      const body = document.createElement('div');
      body.id = 'appMenuBody';
      document.body.appendChild(body);
      window.confirm = () => true;
      adminRotationGeneratorSetWizardState({ step: 'absences', monthKey, days: [], absencesByDay: [] });
      adminRotationGeneratorRenderWizard('absences');
      const restoredDays = (window.__rakRotationGeneratorWizard?.days || []).length;
      const runBtn = body.querySelector('[data-admin-action="generator-run"]');
      if (!runBtn) return { ok: false, reason: 'missing run button', restoredDays };
      adminHandleRotationGeneratorWizardAction('generator-run', runBtn);
      const state = window.__rakRotationGeneratorWizard || {};
      return {
        ok: true,
        restoredDays,
        resultDays: state.result ? state.result.days : 0,
        resultFilledCells: state.result ? state.result.filledCells : 0,
        resultText: state.resultText || '',
        hasOkSend: !!document.querySelector('[data-admin-action="generator-open-editor"]')
      };
    } finally {
      if (original) app.rotation.months[monthKey] = original;
    }
  })()`);
  assert(corruptedMonthRecovery.ok, `${viewport.name}: obnova prázdného měsíce v průvodci se nespustila ${JSON.stringify(corruptedMonthRecovery)}`);
  assert(corruptedMonthRecovery.restoredDays > 0 && corruptedMonthRecovery.resultDays > 0 && corruptedMonthRecovery.resultFilledCells > 0, `${viewport.name}: průvodce po prázdném měsíci znovu skončil nulou ${JSON.stringify(corruptedMonthRecovery)}`);

  await clickAndWait(client, 'kalkulacky', '#kalkulacky.page.active');
  await clickAndWait(client, 'page-brusy', '#brusy.page.active');
  const brusState = await evalInPage(client, `(() => {
    const btns = Array.from(document.querySelectorAll('#brusy .brusMachineBtn, #brusy .brusIndexBtn, #brusy .brusFreeIndexBtn'));
    const first = btns[0];
    const cs = first ? getComputedStyle(first) : null;
    const page = document.querySelector('#brusy');
    const pcs = page ? getComputedStyle(page) : null;
    return {
      count: btns.length,
      labels: btns.map(btn => btn.textContent.trim()),
      heightsByLabel: btns.map(btn => ({ label: btn.textContent.trim(), height: Math.round(btn.getBoundingClientRect().height), computed: getComputedStyle(btn).height })),
      minHeight: Math.min(...btns.map(btn => Math.round(btn.getBoundingClientRect().height))),
      maxHeight: Math.max(...btns.map(btn => Math.round(btn.getBoundingClientRect().height))),
      computedHeight: cs ? cs.height : '',
      computedMinHeight: cs ? cs.minHeight : '',
      computedMaxHeight: cs ? cs.maxHeight : '',
      computedTransform: cs ? cs.transform : '',
      computedZoom: cs ? cs.zoom : '',
      pageTransform: pcs ? pcs.transform : '',
      pageZoom: pcs ? pcs.zoom : ''
    };
  })()`);
  assert(brusState.count >= 7, `${viewport.name}: Brusy nemají očekávané volby`);

  await clickAndWait(client, 'kalkulacky', '#kalkulacky.page.active');
  await clickAndWait(client, 'page-korekce-frezky', '#korekce-frezky.page.active');
  const frezkyState = await evalInPage(client, `(() => ({
    presetCount: document.querySelectorAll('#korekce-frezky .calcFhbPresetBtn').length,
    minPresetHeight: Math.min(...Array.from(document.querySelectorAll('#korekce-frezky .calcFhbPresetBtn')).map(btn => Math.round(btn.getBoundingClientRect().height)))
  }))()`);
  assert(frezkyState.presetCount >= 4, `${viewport.name}: Frézky korekce nemají preset tlačítka`);
  assert(brusState.minHeight >= 44, `${viewport.name}: Brusy volby jsou moc nízké (${brusState.minHeight}px)`);
  assert(Math.abs(brusState.minHeight - frezkyState.minPresetHeight) <= 2, `${viewport.name}: Brusy volby (${brusState.minHeight}px) nesedí k Frézky presetům (${frezkyState.minPresetHeight}px); debug ${JSON.stringify(brusState)}`);

  const gamesState = { tiles: 0, hasStage: false, disabledInDevelopment: true };

  await clickAndWait(client, 'menu', '#menu.page.active');
  const menuState = await evalInPage(client, `(() => ({
    exists: Boolean(document.querySelector('#menu.page.active')),
    text: (document.querySelector('#menu') && document.querySelector('#menu').textContent || '').slice(0, 300)
  }))()`);
  assert(menuState.exists && /Nastavení|O aplikaci|Administrace|Více/.test(menuState.text), `${viewport.name}: Menu/Více nenaběhlo`);

  const fatalConsoleErrors = consoleErrors.filter((msg) => /Uncaught|Nepodařilo se načíst aplikační skripty|TypeError|ReferenceError|SyntaxError/i.test(msg));
  assert(runtimeExceptions.length === 0, `${viewport.name}: runtime exceptions: ${runtimeExceptions.join(' | ')}`);
  assert(fatalConsoleErrors.length === 0, `${viewport.name}: fatal console errors: ${fatalConsoleErrors.join(' | ')}`);

  await client.close();
  await fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`).catch(() => {});
  return {
    viewport: viewport.name,
    ok: true,
    appVersion: bootState.appVersion,
    homeCards: bootState.homeCards,
    rotationExport: exportState,
    rotationGenerator: generatorState,
    augustGenerator: augustGeneratorState,
    rotationGeneratorWizard: wizardRunState,
    liveRotationGenerator,
    brusChoiceHeight: { min: brusState.minHeight, max: brusState.maxHeight },
    gamesTiles: gamesState.tiles,
    consoleErrorCount: consoleErrors.length,
    runtimeExceptionCount: runtimeExceptions.length
  };
}

async function main() {
  assert(fs.existsSync(CHROMIUM_BIN), `Chromium není dostupný: ${CHROMIUM_BIN}`);
  const appPort = await getFreePort();
  const cdpPort = await getFreePort();
  const server = createStaticServer(ROOT_DIR);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(appPort, '127.0.0.1', resolve);
  });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rak-browser-smoke-'));
  const chrome = spawn(CHROMIUM_BIN, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    '--no-proxy-server',
    '--proxy-bypass-list=*',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${cdpPort}`,
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let chromeLog = '';
  chrome.stderr.on('data', chunk => { chromeLog += String(chunk); });
  chrome.stdout.on('data', chunk => { chromeLog += String(chunk); });

  try {
    await waitForBrowser(cdpPort);
    const inlineHtml = buildInlineSmokeHtml();
    let liveRotationPayload = null;
    if (process.env.RAK_LIVE_ROTATION_DIAG === '1') {
      const key = 'sb_publishable_MYL2dR_WGYFUMf0jKHpUbQ_70mCbUOy';
      const response = await fetch('https://bkqamcbkiwumsvelahxr.supabase.co/rest/v1/rotation_state?key=eq.main&select=payload', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
      const rows = await response.json();
      liveRotationPayload = rows && rows[0] ? rows[0].payload : null;
    }
    const results = [];
    for (let viewportIdx = 0; viewportIdx < VIEWPORTS.length; viewportIdx += 1) {
      results.push(await runViewportSmoke(cdpPort, VIEWPORTS[viewportIdx], inlineHtml, viewportIdx === 0 ? liveRotationPayload : null));
    }
    if (liveRotationPayload) console.error('RAK_LIVE_ROTATION_DIAG ' + JSON.stringify(results[0].liveRotationGenerator));
    console.log(JSON.stringify({ ok: true, mode: 'browser-smoke-v1103', chromium: CHROMIUM_BIN, loadMode: 'about-blank-inline-html', results }, null, 2));
  } finally {
    server.close();
    if (!chrome.killed) chrome.kill('SIGTERM');
    await new Promise(resolve => {
      const done = () => resolve();
      chrome.once('exit', done);
      setTimeout(() => {
        if (!chrome.killed) chrome.kill('SIGKILL');
        resolve();
      }, 1800).unref();
    });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
        break;
      } catch (err) {
        if (attempt === 3) {
          console.warn(JSON.stringify({ ok: true, cleanupWarning: err && err.message || String(err), userDataDir }));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 160));
      }
    }
    if (process.env.RAK_BROWSER_SMOKE_DEBUG_LOG === '1' && chromeLog.trim()) {
      console.error(chromeLog.trim());
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, mode: 'browser-smoke-v1103', error: err && err.stack || String(err) }, null, 2));
  process.exit(1);
});
