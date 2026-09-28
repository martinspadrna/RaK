import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Správci use compact collapsed sections while keeping status visible',()=>{
  const source=read('app-admin-unlock.js');
  const renderer=read('app-menu-admin-renderer.js');
  assert(source.includes('adminAccountsCompactSections'));
  for(const label of ['Účty správců','Role a bezpečnost','Přihlášená zařízení','Moje heslo']){
    assert(source.includes('<summary>'+label+'</summary>'));
  }
  assert(!source.includes('<details class="adminAccountsFold" open>'));
  assert(renderer.includes('Rozbal jen část, kterou chceš upravit.'));
  assert(renderer.includes('Změny účtů odešli tlačítkem Uložit správce.'));
});

test('Správci keep secure hooks and scope editable-row maintenance to the editor table',()=>{
  const source=read('app-admin-unlock.js');
  const renderer=read('app-menu-admin-renderer.js');
  for(const token of [
    'rakAdminCanManageAdmins()',
    'data-admin-action="revoke-admin-session"',
    'data-admin-owner-password="current"',
    'data-admin-own-password="current"',
    'minlength="6"',
    'adminAccountsEditorTable tbody'
  ]) assert(source.includes(token));
  assert(source.includes('adminAccountsSessionTable'));
  assert(renderer.includes('data-admin-action="save-admin-accounts"'));
  assert(renderer.includes('data-admin-action="load-admin-accounts"'));
});

test('Správci mobile status is a compact 2x2 summary and actions stay in one row',()=>{
  const css=read('styles-admin-polish.css');
  assert(css.includes('/* RaK 1.7.146 – compact Správci editor */'));
  assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr)) !important'));
  assert(css.includes('.adminAccountsStatusItem small'));
  assert(css.includes('display:flex !important'));
  assert(css.includes('.adminAccountsCard > .appMenuActionRow > .appMenuAction'));
});
