import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('More admin quick links hide the idle TEST diagnostic copy but preserve live status target',()=>{
  const menu=read('app-menu.js');
  assert(!menu.includes('TEST diagnostika se spustí pouze klepnutím.'));
  assert(menu.includes('<div class="smallText" id="rakLiveAuthDiagnosticStatus" role="status" aria-live="polite"></div>'));
  assert(menu.includes('data-menu-action="live-auth-check"'));
  assert(menu.includes("document.getElementById('rakLiveAuthDiagnosticStatus')"));
  assert(menu.includes('status.textContent = message'));
});
