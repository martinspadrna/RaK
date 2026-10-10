import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('O aplikaci leads with RaK 1.9 and keeps 1.8 as historical generation',()=>{
  const src=read('app-menu-pages.js');
  const p19=src.indexOf("range: 'RaK 1.9'");
  const p18=src.indexOf("range: 'RaK 1.8'");
  const p17=src.indexOf("range: 'RaK 1.7'");
  assert(p19>=0&&p18>p19&&p17>p18);
  assert(src.includes("title: 'Rychlejší start bez změny funkcí a vzhledu'"));
  assert(src.includes("title: 'Local-first, kalendáře a přesnější provoz'"));
  assert(src.includes("title: 'Stabilizace a local-first základ'"));
  assert(!src.includes("title: 'Aktuální generace'"));
});

test('RaK 1.8 history stays compact while retaining the delivered work areas',()=>{
  const src=read('app-menu-pages.js');
  const start=src.indexOf('// RAK_180_ABOUT_START');
  const end=src.indexOf('// RAK_180_ABOUT_END',start);
  const block=src.slice(start,end);
  for(const phrase of [
    'skutečně local-first',
    'neplánované změny',
    'Kalírnou',
    'Obrábění i Kalírnu A–D',
    'prázdný měsíc',
    'Korekce Frézek a Brusů',
    'CAS ochranu',
    'reprodukovatelný build'
  ]) assert(block.includes(phrase),phrase);
  const lineBlock=block.slice(block.indexOf('lines: ['),block.indexOf(']\n    }'));
  assert.equal((lineBlock.match(/^\s*'/gm)||[]).length,5);
});

test('O aplikaci shows the full visible TEST version so every published TEST update is obvious',()=>{
  const src=read('app-menu-pages.js');
  const metadata=read('rak-release-metadata.js');
  assert(metadata.includes("visibleTestVersion: '1.9.7'"));
  assert(src.includes('releaseMetadata.visibleTestVersion || window.RAK_RELEASE_VERSION'));
  assert(src.includes("versionText || '1.9.0'"));
  assert(src.includes("formatRakDisplayVersion(displayVersion)"));
  assert(!src.includes("displayParts.slice(0, 2).join('.')"));
});
