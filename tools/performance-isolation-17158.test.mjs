import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Chrome process-group isolation ignores only zombie members and remains fail-closed for live members',()=>{
  const script=read('tools/performance-parity-17069.mjs');
  assert(script.includes("spawnSync('ps',['-eo','pgid=,stat=']"));
  assert(script.includes("!String(match[2]).startsWith('Z')"));
  assert(script.includes('chromeProcessGroupHasLiveMembers(pid)'));
  assert(script.includes("signal('SIGKILL')"));
  assert(script.includes("waitForChromeTreeExit(chrome,10000)"));
  assert(script.includes("'[perf-parity] live Chrome process tree did not exit cleanly'"));
});

test('1.7.158 changes no parity thresholds or sample count',()=>{
  const config=JSON.parse(read('tools/performance-parity-17069.json'));
  assert.equal(config.rounds,20);
  const fcp=config.metrics.firstContentfulPaintMs;
  assert.equal(fcp.maxMedianRegressionPct,10);
  assert.equal(fcp.minMedianToleranceMs,20);
  assert.equal(fcp.baselineMadMultiplier,2);
  assert.equal(fcp.maxNoiseAllowanceMs,50);
  assert.equal(fcp.maxP90DeltaMs,75);
});

test('zero-visible Google calendar behavior and protected D calendar remain unchanged',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  assert(nav.includes("frame.removeAttribute('src')"));
  assert(nav.includes("empty.style.display = 'flex'"));
  assert(nav.includes('rakEnsureBlankCalendar(empty)'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});

test('visual parity styles stay parser-loaded so cached PWA files cannot expose unstyled routes',()=>{
  const html=read('index.html');
  const sw=read('sw.js');
  for(const file of ['styles-shift-report.css','styles-admin-reports.css','styles-admin-rotation-fold.css','styles-admin-service.css','styles-admin-rotation-editor.css','styles-admin-polish.css']){
    assert(html.includes('rel="stylesheet" href="'+file+'"'),'route stylesheet must be parser-loaded: '+file);
    assert(!html.includes('data-rak-post-ready-style="'+file+'"'),'route stylesheet must not depend on a cached runtime loader: '+file);
  }
  assert(html.includes('<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&amp;display=swap" rel="stylesheet"'),'established application font must be parser-loaded');
  assert(sw.includes("const DEVELOPMENT_VISUAL_PARITY_HOTFIX_POLICY = 'parser-css-main-parity;cross-shift-nav-home-calculators-more';"),'service worker must refresh the restored visual-parity shell');
  const admin=read('styles-admin-polish.css');
  const bottomNav=read('styles-bottom-nav-runtime.css');
  assert(!admin.includes('rakBottomNavWithoutRotace17024'),'startup navigation must not depend on deferred Admin CSS');
  assert(bottomNav.includes('rakBottomNavWithoutRotace17024'),'startup navigation rule must remain eager');
});

test('cross-shift navigation hardens the three equal slots against legacy column rules',()=>{
  const core=read('core.js');
  const bottomNav=read('styles-bottom-nav-runtime.css');
  assert(core.includes("rail.style.setProperty('grid-template-columns','repeat(3,minmax(0,1fr))','important')"));
  assert(core.includes("button.style.setProperty('grid-column',String(index+1),'important')"));
  assert.match(bottomNav,/button\[data-action="home"\]\s*\{\s*grid-column:1 !important;/);
  assert.match(bottomNav,/button\[data-action="kalkulacky"\]\s*\{\s*grid-column:2 !important;/);
  assert.match(bottomNav,/button\[data-action="menu"\]\s*\{\s*grid-column:3 !important;/);
  assert(core.includes("button.style.setProperty('display','none','important')"));
});

test('calculator styles are parser-loaded for first-open visual parity',()=>{
  const html=read('index.html');
  const app=read('app.js');
  for(const file of ['styles-calc-panels.css','styles-calculators-mid.css']){
    assert(html.includes('rel="stylesheet" href="'+file+'"'),'calculator stylesheet must be parser-loaded: '+file);
    assert(!html.includes('data-rak-post-ready-style="'+file+'"'),'calculator stylesheet must not depend on lazy runtime state: '+file);
  }
  assert(app.includes('calculators: Object.freeze({ files: calculatorFeatureFiles, styles: Object.freeze(["styles-calc-panels.css", "styles-calculators-mid.css"])'));
  assert(app.includes('await Promise.all([loadFiles(spec.files), loadFeatureStyles(spec.styles || [])])'),'feature readiness must wait for both scripts and styles');
  assert(app.includes('slot.replaceWith(link)'),'dynamic style must preserve its original cascade position');
  assert(app.includes('featureStylePromises'),'intent loading and post-ready warmup must share one stylesheet request');
  const browserSmoke=read('browser-smoke-v1103.js');
  assert(browserSmoke.includes('data-browser-smoke-inline-post-ready-css'),'inline browser fixture must preserve post-ready local styles after replacing app.js');
});

test('menu and rotation styles are parser-loaded for first-open visual parity',()=>{
  const html=read('index.html');
  const app=read('app.js');
  for(const file of ['styles-settings-runtime.css','styles-menu-polish.css','styles-rotation-month.css','styles-stats-polish.css','styles-rotation-tasks.css']){
    assert(html.includes('rel="stylesheet" href="'+file+'"'),'feature stylesheet must be parser-loaded: '+file);
    assert(!html.includes('data-rak-post-ready-style="'+file+'"'),'feature stylesheet must not depend on lazy runtime state: '+file);
  }
  assert(app.includes('rotation: Object.freeze({ files: rotationFeatureFiles, styles: Object.freeze(["styles-rotation-month.css", "styles-stats-polish.css", "styles-rotation-tasks.css"])'));
  assert(app.includes('menu: Object.freeze({ files: menuFeatureFiles, styles: Object.freeze(["styles-settings-runtime.css", "styles-menu-polish.css"])'));
});
