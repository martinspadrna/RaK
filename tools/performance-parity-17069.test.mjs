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
 assert.equal(config.baseline.buildPasses,2);assert.equal(config.rounds,5);
 assert.deepEqual(config.viewport,{width:390,height:844,deviceScaleFactor:3});
 for(const key of ['startupReadyMs','wallReadyMs','firstContentfulPaintMs'])assert(config.metrics[key],key);
 for(const marker of ["git',['-C',WORKSPACE,'worktree','add','--detach'","npm',['run','vercel-build']","window.__rakBootV2StartupReady","first-contentful-paint","dashboardVisible","baseline-1.7.69","current-1.7.104"])assert(script.includes(marker),'missing '+marker);
 assert(workflow.includes('node --test tools/performance-parity-17069.test.mjs'));
 assert(workflow.includes('node tools/performance-parity-17069.mjs'));
});
test('parity tolerance is bounded, median-based and guarded against P95 outliers',()=>{
 assert.deepEqual(Object.keys(config.metrics).sort(),['firstContentfulPaintMs','startupReadyMs']);
 assert.deepEqual(config.diagnostics,['wallReadyMs']);
 for(const spec of Object.values(config.metrics)){
   assert(spec.maxMedianRegressionPct<=10);
   assert(spec.minMedianToleranceMs>0&&spec.minMedianToleranceMs<=20);
   assert(spec.maxP95DeltaMs>0&&spec.maxP95DeltaMs<=100);
 }
 const script=read('tools/performance-parity-17069.mjs');
 assert(script.includes('p50Ms:percentile(values,50)'));
 assert(script.includes("assert(c[metric].p50Ms<=medianLimit"));
 assert(script.includes("assert(c[metric].p95Ms<=p95Limit"));
});
