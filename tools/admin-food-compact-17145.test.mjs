import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('food schedule renders as two compact collapsed sections without duplicated heading',()=>{
  const food=read('admin-food.js');
  assert(food.includes('adminFoodCompactSections'));
  assert(food.includes('<summary>Běžná otevírací doba</summary>'));
  assert(food.includes('<summary>Přesčasová doba</summary>'));
  assert.equal((food.match(/<details class="adminFoodFold">/g)||[]).length,2);
  assert(!food.includes('<details class="adminFoodFold" open>'));
  assert(!food.includes('<div class="appMenuSubTitle">Kantýna / jídelna</div>'));
});

test('food schedule keeps all editable data hooks and both tables',()=>{
  const food=read('admin-food.js');
  for(const token of [
    'data-food-regular-row','data-food-overtime-row','data-food-location','data-food-day',
    'data-food-schedule-field','data-food-regular-field="windows"','data-food-overtime-field="windows"',
    'adminFoodRegularTable','adminFoodOvertimeTable'
  ]) assert(food.includes(token));
});

test('food mobile layout is dense and keeps three actions in one row',()=>{
  const css=read('styles-admin-polish.css');
  const renderer=read('app-menu-admin-renderer.js');
  assert(css.includes('#appMenuBody .adminFoodCompactSections'));
  assert(css.includes('#appMenuBody .adminFoodFold > summary'));
  assert(css.includes('height:29px !important'));
  assert(css.includes('#appMenuBody .adminFoodScheduleCard > .appMenuActionRow'));
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr)) !important'));
  assert(renderer.includes('Rozbal jen běžnou nebo přesčasovou dobu, kterou chceš upravit.'));
});
