import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('tools/performance-parity-17069.json'));
const script=read('tools/performance-parity-17069.mjs');
const workflow=read('.github/workflows/rak-development-validation.yml');
test('P2.1 parity uses immutable 1.7.69, its historical two-pass build and common browser metrics',()=>{
 assert.equal(config.schema,'rak-performance-parity-v1');
 assert.equal(config.baseline.sha,'1693c8631c13d6e381e44a96810a55140ad6aa62');
 assert.equal(config.baseline.buildPasses,2);assert.equal(config.rounds,20);
 assert.deepEqual(config.viewport,{width:390,height:844,deviceScaleFactor:3});
 assert(config.metrics.firstContentfulPaintMs,'firstContentfulPaintMs');
 assert(!config.metrics.startupReadyMs,'startupReady semantics changed to complete local-ready and must remain diagnostic');
 assert.deepEqual(config.diagnostics,['startupReadyMs','wallReadyMs']);
 for(const marker of ["git',['-C',WORKSPACE,'worktree','add','--detach'","npm',['run','vercel-build']","window.__rakBootV2StartupReady","first-contentful-paint","dashboardVisible","baseline-1.7.69","const currentLabel='current-'+currentVersion","CONFIG.current&&CONFIG.current.version"])assert(script.includes(marker),'missing '+marker);
 assert(workflow.includes('node --test tools/performance-parity-17069.test.mjs'));
 assert(workflow.includes('node tools/performance-parity-17069.mjs'));
 assert(script.includes("/^\\d+\\.\\d+\\.\\d+$/"),'current performance release must accept semver successors');
});
test('parity tolerance is bounded, median-based and P90 uses enough alternating samples',()=>{
 assert.deepEqual(Object.keys(config.metrics),['firstContentfulPaintMs']);
 assert.deepEqual(config.diagnostics,['startupReadyMs','wallReadyMs']);
 for(const spec of Object.values(config.metrics)){
   assert(spec.maxMedianRegressionPct<=10);
   assert(spec.minMedianToleranceMs>0&&spec.minMedianToleranceMs<=20);
   assert(spec.baselineMadMultiplier>0&&spec.baselineMadMultiplier<=2);
   assert(spec.maxNoiseAllowanceMs>0&&spec.maxNoiseAllowanceMs<=50);
   assert(spec.maxP90DeltaMs>0&&spec.maxP90DeltaMs<=100);
 }
 const script=read('tools/performance-parity-17069.mjs');
 assert(config.rounds>=20,'P90 must retain enough samples to ignore only isolated runner stalls');
 assert(script.includes('if(round%2===1)'),'baseline/current order must alternate by round');
 assert(script.includes('madMs:medianAbsoluteDeviation(values,p50Ms)'));
 assert(script.includes('Math.min(spec.maxNoiseAllowanceMs,summary.madMs*spec.baselineMadMultiplier)'));
 assert(script.includes("assert(c[metric].p50Ms<=medianLimit"));
 assert(script.includes("assert(c[metric].p90Ms<=p90Limit"));
 assert(script.includes("p95DiagnosticDeltaMs"));
});

test('each parity sample tears down the complete Chromium process group before the next sample',()=>{
 assert(script.includes("const POSIX_CHROME_GROUP=process.platform!=='win32'"));
 assert(script.includes('detached:POSIX_CHROME_GROUP'));
 assert(script.includes('function stopChromeProcessTree(chrome)'));
 assert(script.includes("process.kill(-pid,name)"));
 assert(script.includes('await stopChromeProcessTree(chrome)'));
 assert(script.includes('function chromeProcessGroupHasLiveMembers(pid)'));
 assert(script.includes("!String(match[2]).startsWith('Z')"));
 assert(script.includes("'[perf-parity] live Chrome process tree did not exit cleanly'"));
 assert(!script.includes("chrome.kill('SIGTERM');for(let i=0;i<20"));
});
