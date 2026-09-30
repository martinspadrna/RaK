import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('bottom-nav teardown closes food modal before routing, including local-first More',()=>{
  const source=read('app-bottom-nav.js');
  const calls=[];
  const {api}=runNamedDeclarations({
    modules:[{source,names:['rakDismissTransientSurfacesForBottomNav']}],
    globals:{
      window:{},
      hideCalendarModal:()=>calls.push('calendar'),
      hideFoodScheduleModal:()=>calls.push('food'),
      hidePersonScheduleModal:()=>calls.push('person')
    },
    exports:{dismiss:'rakDismissTransientSurfacesForBottomNav'}
  });
  api.dismiss();
  assert.deepEqual(calls,['calendar','food','person']);
  const bindStart=source.indexOf("nav.addEventListener('click'");
  const bindEnd=source.indexOf("}, { passive: false });",bindStart);
  assert(bindStart>=0&&bindEnd>bindStart);
  const handler=source.slice(bindStart,bindEnd);
  assert(handler.indexOf('rakDismissTransientSurfacesForBottomNav();')<handler.indexOf('handler();'));
  assert(source.includes("menu: () => { openRakEarlyMenuShell(); }"));
});

test('both dashboard food cards still share the dismissible food schedule modal',()=>{
  const actions=read('app-actions.js');
  const navigation=read('app-navigation.js');
  assert(actions.includes("'show-food-kantyna': () => showFoodSchedule('kantyna')"));
  assert(actions.includes("'show-food-jidelna': () => showFoodSchedule('jidelna')"));
  assert(navigation.includes('function hideFoodScheduleModal()'));
  assert(navigation.includes("document.body.classList.remove('foodModalOpen')"));
});
