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
  assert.equal(fcp.maxP95DeltaMs,75);
});

test('zero-visible Google calendar behavior and protected D calendar remain unchanged',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  assert(nav.includes("frame.removeAttribute('src')"));
  assert(nav.includes("empty.style.display = 'flex'"));
  assert(nav.includes('rakEnsureBlankCalendar(empty)'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});

test('first dashboard paint is not blocked by Admin and report-only styles',()=>{
  const html=read('index.html');
  const app=read('app.js');
  for(const file of ['styles-shift-report.css','styles-admin-reports.css','styles-admin-rotation-fold.css','styles-admin-service.css','styles-admin-rotation-editor.css','styles-admin-polish.css']){
    assert(!html.includes('href="'+file+'"'),'deferred stylesheet still blocks index: '+file);
    assert(html.includes('data-rak-post-ready-style="'+file+'"'),'cascade-preserving post-ready slot missing: '+file);
  }
  assert(html.includes('data-rak-post-ready-style="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&amp;display=swap" data-rak-external-dependency="googleFonts"'),'noncritical Google font must be discovered only after startupReady');
  assert(!html.includes('<link href="https://fonts.googleapis.com/'),'Google font must not be parser-discovered during first paint');
  assert(app.includes('setTimeout(warmPostReadyStyles, 0)'));
  assert(app.includes("slot.replaceWith(link)"));
  const admin=read('styles-admin-polish.css');
  const bottomNav=read('styles-bottom-nav-runtime.css');
  assert(!admin.includes('rakBottomNavWithoutRotace17024'),'startup navigation must not depend on deferred Admin CSS');
  assert(bottomNav.includes('rakBottomNavWithoutRotace17024'),'startup navigation rule must remain eager');
});
