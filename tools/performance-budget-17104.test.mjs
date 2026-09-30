import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPerformanceBudget,loadPerformanceBudget} from './performance-budget-17104.mjs';

const SHA='a'.repeat(40);
const config=loadPerformanceBudget();
const files=[];
for(const [name,spec] of Object.entries(config.sizeGroups)){
  if(Array.isArray(spec.paths)){
    for(const p of spec.paths)if(!files.some(f=>f.path===p)){
      const onlyGroups=Object.values(config.sizeGroups).filter(g=>Array.isArray(g.paths)&&g.paths.includes(p));
      const baselineShare=Math.max(1,Math.floor(Math.min(...onlyGroups.map(g=>g.baselineBytes/g.paths.length))));
      files.push({path:p,bytes:baselineShare});
    }
  }
}
// Replace synthetic sizes with an exact set that exercises overlapping groups independently.
const exact=new Map(files.map(f=>[f.path,{...f,bytes:1}]));
exact.get('index.html').bytes=config.sizeGroups.indexHtml.baselineBytes;
const startup=config.sizeGroups.startupCore.paths;
const startupNow=startup.reduce((sum,p)=>sum+exact.get(p).bytes,0);
exact.get('dashboard.js').bytes+=config.sizeGroups.startupCore.baselineBytes-startupNow;
const rootFiles=[...exact.values()].filter(f=>!f.path.includes('/')&&/\.(?:js|mjs|css)$/.test(f.path));
const rootNow=rootFiles.reduce((n,f)=>n+f.bytes,0);
exact.set('budget-extra-root.js',{path:'budget-extra-root.js',bytes:config.sizeGroups.rootJsCssSurface.baselineBytes-rootNow});

const bootStats=Object.fromEntries(Object.entries(config.timeModes).map(([label,spec])=>[label,{p95Ms:spec.baselineP95Ms}]));

test('budget baseline is bound to the green 1.7.104 evidence and tighter hard limits',()=>{
  assert.equal(config.baseline.sha,'0d807337dac50d610fad83b80ee35697d2f1c3d6');
  assert.equal(config.baseline.actionsRunNumber,342);
  assert(config.timeModes['cold mobile'].hardBudgetMs<=5000);
  assert(config.timeModes['offline reload'].hardBudgetMs<=4000);
  assert(config.timeModes['online recovery'].hardBudgetMs<=3500);
  for(const spec of Object.values(config.sizeGroups))assert(spec.maxBytes/spec.baselineBytes<=1.101);
});

test('budget evidence records deviations and fails closed on timing or size regression',()=>{
  const good=assessPerformanceBudget({sourceCommit:SHA,bootStats,buildFiles:[...exact.values()]});
  assert.equal(good.result,'PASS');
  assert.equal(good.time['cold mobile'].deltaPct,0);
  assert.equal(good.size.indexHtml.actualBytes,config.sizeGroups.indexHtml.baselineBytes);
  const slow=structuredClone(bootStats);slow['cold mobile'].p95Ms=config.timeModes['cold mobile'].hardBudgetMs+1;
  assert.throws(()=>assessPerformanceBudget({sourceCommit:SHA,bootStats:slow,buildFiles:[...exact.values()]}),/exceeds hard/);
  const large=[...exact.values()].map(f=>({...f}));
  large.find(f=>f.path==='index.html').bytes=config.sizeGroups.indexHtml.maxBytes+1;
  assert.throws(()=>assessPerformanceBudget({sourceCommit:SHA,bootStats,buildFiles:large}),/indexHtml .* exceeds hard/);
});
