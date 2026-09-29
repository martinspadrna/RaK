import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('O aplikaci leads with RaK 1.8 and keeps 1.7 as historical generation',()=>{
  const src=read('app-menu-pages.js');
  const p18=src.indexOf("range: 'RaK 1.8'");
  const p17=src.indexOf("range: 'RaK 1.7'");
  assert(p18>=0&&p17>p18);
  assert(src.includes("title: 'Local-first, kalendáře a přesnější provoz'"));
  assert(src.includes("title: 'Stabilizace a local-first základ'"));
  assert(!src.includes("title: 'Aktuální generace'"));
});

test('RaK 1.8 history covers the delivered 1.7-to-1.8 work areas',()=>{
  const src=read('app-menu-pages.js');
  const start=src.indexOf('// RAK_180_ABOUT_START');
  const end=src.indexOf('// RAK_180_ABOUT_END',start);
  const block=src.slice(start,end);
  for(const phrase of [
    'skutečně local-first',
    'První otevření Administrace',
    'neplánované změny',
    'Kantýna',
    'Obrábění i Kalírnu A–D',
    'prázdný měsíc',
    'Kalkulačky korekcí Frézek a Brusů',
    'CAS ochranu',
    'skutečných vlastníků funkcí'
  ]) assert(block.includes(phrase),phrase);
});

test('O aplikaci shows major version 1.8 while technical release stays semver',()=>{
  const src=read('app-menu-pages.js');
  assert(src.includes("const aboutDisplayVersion = displayVersion.replace(/\\.0$/, '');"));
  assert(src.includes("versionText || '1.8.0'"));
  assert(src.includes("formatRakDisplayVersion(aboutDisplayVersion)"));
});
