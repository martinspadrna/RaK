import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Admin rotation machine overview starts open and uses compact display-only labels',()=>{
  const runtime=read('rak-runtime-stability.js');
  assert(runtime.includes("const wasOpen = container ? !!(container.querySelector('details') && container.querySelector('details').open) : true;"));
  assert(runtime.includes("if (normalized === 'TNKS01' || normalized === 'TNKSO1') return 'TNK';"));
  assert(runtime.includes("if (normalized === 'TPKW01') return 'W01';"));
  assert(runtime.includes("if (normalized === 'TPKW02') return 'W02';"));
  assert(runtime.includes("title=\"' + esc(key) + '\">' + esc(compactMachineHeading(key))"));
  assert(runtime.includes("const preferredOrder = ['TNKS01', 'TPKW01', 'TPKW02', 'TBK', 'MSK', 'MFK'];"));
});

test('Admin rotation overview is 356px wide with exact requested column reductions',()=>{
  const css=read('styles-rotation-summary-compact.css');
  assert(css.includes('width:356px !important;'));
  assert(css.includes('width:54px !important;'));
  assert(css.includes('width:35px !important;'));
  assert(css.includes('border-left:1px solid'));
  assert(css.includes('th:nth-child(n+4)'));
  assert(!css.includes('width:452px !important;'));
  assert(!css.includes('width:60px !important;'));
  assert(!css.includes('width:50px !important;'));
});
