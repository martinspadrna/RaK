import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n?/g,'\n');

test('dashboard startup waits for Rotation but not full More or calculators',()=>{
  const app=read('app.js');
  const start=app.indexOf('const rakMustHydrateRotationBeforeReady = true');
  const ready=app.indexOf('window.__rakBootV2StartupReady = true;',start);
  assert(start>=0&&ready>start);
  const startup=app.slice(start,ready);
  assert(startup.includes("await ensureFeature('rotation')"),'Rotation must remain available for dashboard kam jdu');
  assert(!startup.includes("ensureFeature('menu')"),'full More module must stay outside the awaited startup path');
  assert(!startup.includes("ensureFeature('calculators')"),'calculator modules must stay outside the awaited startup path');
  assert(startup.includes('RAK_188_STARTUP_CORE_BOUNDARY'));
});

test('deferred modules retain local first-intent loading and isolated failure handling',()=>{
  const app=read('app.js');
  const routing=read('rak-feature-routing.js');
  const bottomNav=read('app-bottom-nav.js');
  assert(app.includes('calculators: Object.freeze({ files: calculatorFeatureFiles'));
  assert(app.includes('menu: Object.freeze({ files: menuFeatureFiles'));
  assert(routing.includes("if (key === 'menu') return window.rakEnsureFeature('menu');"));
  assert(routing.includes('return window.rakEnsureFeature(key);'));
  assert(bottomNav.includes("window.rakEnsureFeature('menu').then(openRequested)"),'More shell must hydrate without waiting for remote sync');
  assert(routing.includes("window.rakHandleFeatureLoadError(err, feature)"),'one deferred feature failure must remain locally handled');
});

test('deferred local features remain guaranteed by the offline cache',()=>{
  const sw=read('sw.js');
  const warm=sw.slice(sw.indexOf('const WARM_START = ['),sw.indexOf('const OFFLINE_REQUIRED'));
  const offline=sw.slice(sw.indexOf('const OFFLINE_REQUIRED'),sw.indexOf('const STATIC_EXT'));
  for(const asset of ['brusy.js','soustruhy.js','app-menu.js','app-menu-pages.js','app-menu-profile.js']){
    assert(warm.includes(asset),asset+' missing from warm cache');
    assert(offline.includes(asset),asset+' missing from offline-required cache');
  }
});

test('initial Rotation local-first hydration renders Home and grid exactly once',()=>{
  const app=read('app.js');
  const onReady=app.slice(app.indexOf("if (name === 'rotation')"),app.indexOf("} else if (name === 'calculators')"));
  assert(onReady.includes('if (!rakBootLocalHydrationInProgress) {'));
  assert(onReady.indexOf('if (!rakBootLocalHydrationInProgress)')<onReady.indexOf('updateDashboard()'));
  const startup=app.slice(app.indexOf('const rakMustHydrateRotationBeforeReady = true'),app.indexOf('window.__rakBootV2LocalReady = true'));
  assert(startup.includes('rakBootLocalHydrationInProgress = true'));
  assert(startup.includes("await ensureFeature('rotation')"));
  assert(startup.includes('updateDashboard()'));
  assert(startup.includes('renderRotace()'));
  assert(startup.includes('rakBootLocalHydrationInProgress = false'));
});
