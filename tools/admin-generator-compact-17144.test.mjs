import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('generator settings render as five compact collapsed sections',()=>{
  const generator=read('admin-rotation-generator.js');
  const summaries=['Kontrola a souhrn pravidel','Lidé a pořadí','Cykly strojů','Vyrovnávací pravidla','Základní soustruhy měkoty'];
  assert(generator.includes('adminGeneratorCompactSections'));
  for(const label of summaries) assert(generator.includes('<summary>'+label+'</summary>'));
  assert.equal((generator.match(/<details class="adminGeneratorFold">/g)||[]).length,5);
  assert(!generator.includes('<details class="adminGeneratorFold" open>'));
});

test('generator field data contract is preserved inside the compact layout',()=>{
  const generator=read('admin-rotation-generator.js');
  const ids=[
    'adminGeneratorSoftPreferred','adminGeneratorHardPreferred','adminGeneratorSoftCore',
    'adminGeneratorSoftHardCycle','adminGeneratorSoftHardBlockLength','adminGeneratorHardCycle',
    'adminGeneratorAvoidLatheWhenTwoLathesOneMillEnabled','adminGeneratorAvoidLatheWhenTwoLathesOneMillNames',
    'adminGeneratorSoloMillBalanceEnabled','adminGeneratorSoloMillMaxSpread',
    'adminGeneratorSoftTotalBalanceEnabled','adminGeneratorSoftTotalBalanceNames','adminGeneratorSoftTotalMaxSpread',
    'adminGeneratorHardPeopleSoftKindBalanceEnabled','adminGeneratorSoftKindGlobalBalanceEnabled',
    'adminGeneratorHardPeopleSoftKindBalanceNames','adminGeneratorHardPeopleSoftKindMaxSpread',
    'adminGeneratorSoftKindMixedMinimumShifts'
  ];
  for(const id of ids) assert(generator.includes('id="'+id+'"'));
  assert(generator.includes('data-generator-settings-field'));
  assert(generator.includes('data-generator-base-row'));
  assert(generator.includes('data-generator-base-field="person"'));
  assert(generator.includes('data-generator-base-field="machine"'));
});

test('generator mobile CSS is intentionally dense without changing other admin pages',()=>{
  const css=read('styles-admin-polish.css');
  assert(css.includes('#appMenuBody .adminGeneratorCompactSections'));
  assert(css.includes('#appMenuBody .adminGeneratorFold > summary'));
  assert(css.includes('grid-template-columns:minmax(0,1fr) 82px !important'));
  assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr)) !important'));
  assert(css.includes('min-height:44px !important'));
  const renderer=read('app-menu-admin-renderer.js');
  assert(renderer.includes('Rozbal jen část, kterou chceš upravit.'));
});
