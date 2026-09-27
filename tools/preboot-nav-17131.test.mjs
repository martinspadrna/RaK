import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('1.7.131 preboot navigation milestone remains active in successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.131');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.131 (development)'));
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
});

test('visible bottom navigation has a dependency-free preboot click owner before app.js',()=>{
  const html=read('index.html');
  const marker='function installRakPrebootNavigation()';
  const markerAt=html.indexOf(marker);
  const appAt=html.indexOf('<script defer src="app.js?');
  assert(markerAt>0&&appAt>markerAt,'preboot nav must be installed before app.js');
  const block=html.slice(markerAt,appAt);
  assert(block.includes("nav.addEventListener('click'"));
  assert(block.includes("nav.__rotaceBound===true"));
  assert(block.includes("document.documentElement.dataset.rakAuthState==='unlocked'"));
  assert(block.includes("activatePage('kalkulacky')"));
  for(const label of ['Nastavení','O aplikaci','Kontakt','Pošli mi chybu']) assert(block.includes(label),label);
  assert(!/fetch\(|XMLHttpRequest|supabase|rakEnsureFeature\('sync'\)/i.test(block),'preboot click owner must remain local');
  assert(!/Administrace|Report dovolené|Report směny/.test(block),'preboot menu must never leak privileged links');
});

test('full interaction shell consumes a preboot tap after it binds',()=>{
  const app=read('app.js');
  const bindAt=app.indexOf("installBottomNavBindings === 'function'");
  const handoffAt=app.indexOf('RAK_17131_PREBOOT_NAV_HANDOFF');
  assert(bindAt>=0&&handoffAt>bindAt);
  assert(app.slice(handoffAt,handoffAt+700).includes('window.__rakConsumePrebootNav'));
});

test('real Chromium gate clicks while nav is visible but deliberately unbound',()=>{
  const browser=read('tools/browser-offline-17052.mjs');
  assert(browser.includes('RAK_17131_VISIBLE_NAV_PREBOOT_GATE'));
  assert(browser.includes("pathname==='/app-bottom-nav.js'&&delayStartupBottomNav"));
  assert(browser.includes("__rotaceBound===true\"),false"));
  assert(browser.includes('[17131-preboot-nav] More only worked after full nav binding'));
  assert(browser.includes('[17131-preboot-nav] Calculators only worked after full nav binding'));
  assert(browser.includes("accountNumber:'0000',fullName:'CI Returning User'"));
});

test('1.7.131 current release proof is mandatory and hidden canonical evidence is fail-closed',()=>{
  const pkg=JSON.parse(read('package.json'));
  const workflow=read('.github/workflows/rak-development-validation.yml');
  assert(pkg.scripts.check.includes('tools/preboot-nav-17131.test.mjs'));
  assert(workflow.includes('tools/preboot-nav-17131.test.mjs'));
  const at=workflow.indexOf('name: rak-170131-isolated-build-'+'$'+'{{ github.sha }}');
  assert(at>=0);
  const block=workflow.slice(at,at+420);
  assert(block.includes('include-hidden-files: true'));
  assert(block.includes('if-no-files-found: error'));
});
