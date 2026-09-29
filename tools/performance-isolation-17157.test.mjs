import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('parity runner isolates every sample with a detached Chromium process group',()=>{
  const script=read('tools/performance-parity-17069.mjs');
  assert(script.includes("const POSIX_CHROME_GROUP=process.platform!=='win32'"));
  assert(script.includes('detached:POSIX_CHROME_GROUP'));
  assert(script.includes('function chromeProcessGroup'));
  assert(script.includes('function stopChromeProcessTree(chrome)'));
  assert(script.includes("process.kill(-pid,name)"));
  assert(script.includes('await stopChromeProcessTree(chrome)'));
});

test('performance limits and sample count are unchanged by isolation fix',()=>{
  const config=JSON.parse(read('tools/performance-parity-17069.json'));
  assert.equal(config.rounds,20);
  assert.deepEqual(Object.keys(config.metrics),['firstContentfulPaintMs']);
  const fcp=config.metrics.firstContentfulPaintMs;
  assert.equal(fcp.maxMedianRegressionPct,10);
  assert.equal(fcp.minMedianToleranceMs,20);
  assert.equal(fcp.baselineMadMultiplier,2);
  assert.equal(fcp.maxNoiseAllowanceMs,50);
  assert.equal(fcp.maxP95DeltaMs,75);
});

test('calendar zero-visible fix remains interaction-only and protected D source is unchanged',()=>{
  const nav=read('app-navigation.js');
  const core=read('core.js');
  const start=nav.indexOf('function rakCalendarApplyLegendVisibility');
  const end=nav.indexOf('function rakShiftCalendarEmbedUrl',start);
  const fn=nav.slice(start,end);
  assert(fn.includes('if (!visibleCalendars.length)'));
  assert(fn.includes("frame.removeAttribute('src')"));
  assert(!fn.includes('requestIdleCallback'));
  assert(core.includes("obrabeni: '31eea99edff1771be15ba877f7c2f5b1371e0a742ad9d54fca526d41eafa5995@group.calendar.google.com'"));
});
