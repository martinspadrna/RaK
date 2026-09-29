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
  assert(nav.includes('rakShiftCalendarBlankEmbedUrl()'));
  assert(nav.includes("frame.setAttribute('src', blankUrl)"));
  assert(nav.includes("empty.style.display = 'none';"));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
