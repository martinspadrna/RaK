#!/usr/bin/env node
// Read-only TEST startup measurement. Never logs headers, request bodies or URL queries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

let targetUrl = process.env.RAK_TEST_URL || 'https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/';
const TEST_SUPABASE_HOST = 'cgshssdjgzzuprlwnabl.supabase.co';
const CHROME = process.env.CHROMIUM_BIN || process.env.CHROME_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.resolve(process.cwd());
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rak-test-network-'));
let browser;
let ws;
let localServer;
let localVendor = null;
let nextId = 0;
const pending = new Map();
const requests = new Map();
const exceptions = [];
let firstRequestTimestamp = 0;

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function send(method, params = {}) {
  assert(ws && ws.readyState === WebSocket.OPEN, 'debugger disconnected');
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error('CDP timeout: ' + method));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'browser evaluation failed');
  return result.result.value;
}

async function until(expression, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(expression)) return;
    } catch {}
    await delay(200);
  }
  throw new Error('browser wait timed out: ' + expression);
}

function safeRoute(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === TEST_SUPABASE_HOST) return url.pathname;
    if (url.origin === new URL(targetUrl).origin) return url.pathname;
    return url.hostname + url.pathname;
  } catch {
    return '[invalid-url]';
  }
}

try {
  assert(fs.existsSync(CHROME), 'Chromium/Edge binary missing');
  if (process.env.RAK_MEASURE_LOCAL === '1') {
    const vendorResponse = await fetch('https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/supabase-vendor-2.110.7.js');
    assert(vendorResponse.ok, 'deployed pinned Supabase SDK unavailable');
    localVendor = Buffer.from(await vendorResponse.arrayBuffer());
    localServer = http.createServer((request, response) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
      catch { response.writeHead(400); response.end(); return; }
      if (pathname === '/supabase-vendor-2.110.7.js') {
        response.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' });
        response.end(localVendor);
        return;
      }
      const requestedPath = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
      const filename = requestedPath;
      if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403); response.end(); return; }
      fs.stat(filename, (error, stat) => {
        if (error || !stat.isFile()) { response.writeHead(404); response.end(); return; }
        const extension = path.extname(filename);
        const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' })[extension] || 'application/octet-stream';
        response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'service-worker-allowed': '/' });
        fs.createReadStream(filename).pipe(response);
      });
    });
    const localPort = await freePort();
    await new Promise((resolve, reject) => {
      localServer.once('error', reject);
      localServer.listen(localPort, '127.0.0.1', resolve);
    });
    targetUrl = 'http://127.0.0.1:' + localPort + '/';
  }
  const port = await freePort();
  browser = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port,
    '--user-data-dir=' + profileDir, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  let debuggerReady = false;
  for (let attempt = 0; attempt < 250; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (response.ok) { debuggerReady = true; break; }
    } catch {}
    await delay(100);
  }
  assert(debuggerReady, 'browser debugger did not start');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find((item) => item.type === 'page');
  assert(tab && tab.webSocketDebuggerUrl, 'browser page missing');
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(item.timeout);
      if (message.error) item.reject(new Error(message.error.message || 'CDP error'));
      else item.resolve(message.result || {});
      return;
    }
    if (message.method === 'Network.requestWillBeSent') {
      const data = message.params;
      const url = data.request && data.request.url;
      if (!url) return;
      const parsed = new URL(url);
      if (parsed.hostname !== TEST_SUPABASE_HOST && parsed.origin !== new URL(targetUrl).origin) return;
      if (!firstRequestTimestamp) firstRequestTimestamp = data.timestamp;
      requests.set(data.requestId, {
        host: parsed.hostname === TEST_SUPABASE_HOST ? 'supabase-test' : 'test-app',
        method: data.request.method,
        route: safeRoute(url),
        type: data.type,
        start: data.timestamp,
        status: 0,
        bytes: 0
      });
    }
    if (message.method === 'Fetch.requestPaused') {
      const request = message.params.request || {};
      const parsed = new URL(request.url);
      const isSupabaseWrite = parsed.hostname === TEST_SUPABASE_HOST
        && request.method !== 'GET'
        && request.method !== 'HEAD'
        && request.method !== 'OPTIONS'
        && !['/rest/v1/rpc/rak_load_account_ui_preferences', '/rest/v1/rpc/rak_lookup_account_for_login_v4', '/rest/v1/rpc/rak_admin_auth_capabilities'].includes(parsed.pathname);
      const action = isSupabaseWrite
        ? send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'BlockedByClient' })
        : send('Fetch.continueRequest', { requestId: message.params.requestId });
      void action.catch(() => {});
    }
    if (message.method === 'Network.responseReceived' && requests.has(message.params.requestId)) {
      const item = requests.get(message.params.requestId);
      item.status = message.params.response.status;
      item.response = message.params.timestamp;
    }
    if (message.method === 'Network.loadingFinished' && requests.has(message.params.requestId)) {
      requests.get(message.params.requestId).bytes = Number(message.params.encodedDataLength || 0);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params && message.params.exceptionDetails;
      exceptions.push(String(detail && (detail.exception?.description || detail.text) || 'browser exception').slice(0, 300));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable')]);
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  // Fail closed: the measurement may call read-only RPCs but cannot mutate TEST.
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://' + TEST_SUPABASE_HOST + '/*', requestStage: 'Request' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try{localStorage.setItem('rotace_kalkulacky:user_profile_v1',JSON.stringify({accountNumber:'0000',fullName:'Network Measurement',shiftTeam:'D',calendarAssignment:'obrabeni-D',updatedAt:Date.now()}));}catch(e){}"
  });
  const startedAt = Date.now();
  const navigation = await send('Page.navigate', { url: targetUrl });
  assert(!navigation.errorText, navigation.errorText || 'navigation failed');
  await until('document.readyState === "complete" && window.__rakBootV2StartupReady === true');
  const startupReadyMs = Date.now() - startedAt;
  await until('window.rakIsFeatureReady?.("sync") === true');
  await delay(10000);
  const browserState = await evaluate(`(() => ({
    release: String(window.RAK_RELEASE_VERSION || ''),
    startupReadyMs: Number(window.__rakBootV2StartupReadyMs || 0),
    firstInteractiveMs: Number(window.__rakFirstInteractiveMs || 0),
    sync: window.rakIsFeatureReady?.('sync') === true,
    syncHealth: window.getSupabasePerformanceHealth?.() || null
  }))()`);

  const rows = [...requests.values()].filter((item) => item.host === 'supabase-test');
  const groups = new Map();
  for (const item of rows) {
    const key = item.method + ' ' + item.route;
    const group = groups.get(key) || { key, count: 0, statuses: {}, bytes: 0, offsetsMs: [], durationsMs: [] };
    group.count += 1;
    group.statuses[item.status || 'pending'] = (group.statuses[item.status || 'pending'] || 0) + 1;
    group.bytes += item.bytes;
    if (item.start && firstRequestTimestamp) group.offsetsMs.push(Math.round((item.start - firstRequestTimestamp) * 1000));
    if (item.response && item.start) group.durationsMs.push(Math.round((item.response - item.start) * 1000));
    groups.set(key, group);
  }
  const appRows = [...requests.values()].filter((item) => item.host === 'test-app');
  console.log(JSON.stringify({
    schema: 'rak-test-startup-network-v1',
    measuredAt: new Date().toISOString(),
    target: new URL(targetUrl).hostname,
    startupReadyWallMs: startupReadyMs,
    browser: browserState,
    appRequests: { count: appRows.length, bytes: appRows.reduce((sum, item) => sum + item.bytes, 0) },
    supabaseRequests: [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)),
    browserExceptionCount: exceptions.length
  }, null, 2));
} finally {
  try { if (ws) ws.close(); } catch {}
  try { if (browser) browser.kill(); } catch {}
  try { if (localServer) localServer.close(); } catch {}
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
