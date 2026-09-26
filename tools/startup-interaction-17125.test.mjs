import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const routing=read('rak-feature-routing.js');
const browser=read('tools/browser-offline-17052.mjs');

test('visible startup shell is bound before returning-PWA Rotation hydration and startupReady',()=>{
  const startupLoaded=app.indexOf('await loadFiles(startupFiles);');
  const earlyMarker=app.indexOf('RAK_17125_EARLY_INTERACTION');
  const bind=app.indexOf("installBottomNavBindings === 'function'",earlyMarker);
  const hydrate=app.indexOf('const rakReturningServiceWorkerStart');
  const ready=app.indexOf('window.__rakBootV2StartupReady = true;');
  assert(startupLoaded>=0&&earlyMarker>startupLoaded,'early interaction hook must follow startup module load');
  assert(bind>earlyMarker&&bind<hydrate,'bottom nav must bind before returning-PWA hydration');
  assert(hydrate<ready,'hydration contract must still precede startupReady');
  assert(app.includes("markRakFirstInteractive('startup-shell-bound')"));
  assert(app.includes('firstInteractiveMs: Number(window.__rakFirstInteractiveMs || 0) || null'));
});

test('ordinary More menu no longer waits for Supabase sync but Admin still does',()=>{
  assert(routing.includes("if (key === 'menu') return window.rakEnsureFeature('menu');"));
  assert(routing.includes("if (key === 'admin') return window.rakEnsureFeature('sync').then(() => window.rakEnsureFeature('admin'));"));
  assert(!routing.includes("if (key === 'menu' || key === 'admin')"));
  const warmup=routing.slice(routing.indexOf('function startBackgroundWarmup()'),routing.indexOf('function queueBackgroundWarmup()'));
  assert(warmup.indexOf("window.rakEnsureFeature('menu')") < warmup.indexOf("window.rakEnsureFeature('sync')"),'menu warmup should not queue behind network sync');
});

test('real Chromium gate measures interaction readiness in every boot mode',()=>{
  assert(browser.includes('[17125-interactive] bottom navigation is visible but not bound'));
  assert(browser.includes('data.firstInteractiveMs<=data.startupReadyMs'));
  assert(browser.includes('[17125-interactive] ${label} PASS firstInteractive='));
});
