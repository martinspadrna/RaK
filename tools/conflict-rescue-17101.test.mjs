import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';

const source=fs.readFileSync(new URL('../supabase-bridge.js',import.meta.url),'utf8');

function queueApi(){
  return runNamedDeclarations({
    modules:[{source,names:['rakQueueRawObjectSlices','rakQueueConflictSignature','rakRemoveRawQueueItem','rakQueueConflictCategory']}],
    exports:{slices:'rakQueueRawObjectSlices',signature:'rakQueueConflictSignature',remove:'rakRemoveRawQueueItem',category:'rakQueueConflictCategory'}
  }).api;
}

test('single-conflict raw removal preserves every untouched task byte-for-byte',()=>{
  const api=queueApi();
  const raw='[\n  {"id":"a","type":"rotation_state","conflict":"admin-review-required","payload":{"x":"A  B"}},\n\t{"id":"b","type":"machine_settings","conflict":"admin-review-required","entry":{"v":[1,2,3]}},\n  {"id":"c","type":"bug_report","entry":{"text":"keep  spaces"}}\n]';
  const slices=api.slices(raw);
  assert.equal(slices.length,3);
  const keep0=slices[0].raw;
  const keep2=slices[2].raw;
  const removed=api.remove(raw,1);
  assert.equal(removed.ok,true);
  const nextSlices=api.slices(removed.nextRaw);
  assert.equal(nextSlices.length,2);
  assert.equal(nextSlices[0].raw,keep0);
  assert.equal(nextSlices[1].raw,keep2);
  assert.equal(JSON.parse(removed.nextRaw)[0].id,'a');
  assert.equal(JSON.parse(removed.nextRaw)[1].id,'c');
});

test('first and last queue element removal stay valid JSON and exact survivors stay untouched',()=>{
  const api=queueApi();
  const raw='[{"id":"a","conflict":"x"}, {"id":"b","conflict":"x"}, {"id":"c","conflict":"x"}]';
  const original=api.slices(raw);
  const first=api.remove(raw,0);
  assert.equal(first.ok,true);
  assert.equal(api.slices(first.nextRaw)[0].raw,original[1].raw);
  const last=api.remove(raw,2);
  assert.equal(last.ok,true);
  const lastSlices=api.slices(last.nextRaw);
  assert.equal(lastSlices[0].raw,original[0].raw);
  assert.equal(lastSlices[1].raw,original[1].raw);
});

test('conflict category is explicit and unknown types never look discardable by category',()=>{
  const api=queueApi();
  assert.equal(api.category('rotation_state'),'rozpis');
  assert.equal(api.category('rotation_month_entries'),'rozpis');
  assert.equal(api.category('machine_settings'),'stroj');
  assert.equal(api.category('bug_report'),'ostatní');
  assert.equal(api.category('legacy_unknown'),'ostatní');
});

test('runtime requires private export and read-only server review before exact discard',()=>{
  assert(source.includes("return denied('private-export-required')"));
  assert(source.includes("return denied('server-review-required')"));
  assert(source.includes("if (review.category === 'ostatní') return denied('manual-review-required')"));
  assert(source.includes("atomicWritePerformed: false"));
  assert(source.includes("serverContentCompared: false"));
  assert(source.includes("rakQueueConflictExportReceipts.set(signature, Date.now())"));
  assert(source.includes("rakQueueConflictReviewReceipts.set(signature"));
});

test('dashboard flow clearly describes consequence and never promises server overwrite',()=>{
  const dashboard=fs.readFileSync(new URL('../dashboard.js',import.meta.url),'utf8');
  assert(dashboard.includes('RAK_17101_EXACT_CONFLICT_DISCARD_GUARD'));
  assert(dashboard.includes('Online rozpis se nepřepíše.'));
  assert(dashboard.includes('Online nastavení se nepřepíše.'));
  assert(dashboard.includes('Ostatní fronta zůstane zachovaná.'));
  assert(dashboard.includes('kategorie „ostatní“'));
});
