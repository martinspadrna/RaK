#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOT_LABELS,BUDGET_MS,ROUNDS,parseBootTimes,assessBootSamples} from './pwa-start-bench-17068.mjs';
const log=(times)=>Object.entries(times).map(([key,value])=>`[17052-browser] ${key} PASS ${value}ms viewport=390 document=390 SW=${key==='cold mobile'?'false':'true'}`).join('\n');
const good={'cold mobile':1100,'offline reload':600,'online recovery':900};
test('parse actual three labeled durations only, never estimates or silently skips',()=>{
 assert.deepEqual(parseBootTimes(log(good)),good);
 assert.throws(()=>parseBootTimes(log({'cold mobile':1})),/missing real/);
 assert.throws(()=>parseBootTimes(log(good)+'\n'+log(good)),/duplicate/);
 assert.throws(()=>parseBootTimes(log(good).replace('1100ms','-1ms')),/missing real/);
});
test('three independent cycles and strict fixed per-mode P95 budgets',()=>{
 assert.equal(ROUNDS,3);assert.deepEqual(BOOT_LABELS,['cold mobile','offline reload','online recovery']);
 const three=[good,{...good,'cold mobile':1200},{...good,'cold mobile':1300}];
 const stats=assessBootSamples(three);assert.equal(stats['cold mobile'].p50Ms,1200);assert.equal(stats['cold mobile'].p95Ms,1300);
 assert.throws(()=>assessBootSamples(three.slice(1)),/three independent/);
 assert.throws(()=>assessBootSamples([{...good,'offline reload':BUDGET_MS['offline reload']+1},good,good]),/exceeds fixed/);
 assert.throws(()=>assessBootSamples([good,{...good,'online recovery':NaN},good]),/invalid/);
});
