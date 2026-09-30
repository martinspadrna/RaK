import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const menu=read('app-menu.js');
const unlock=read('app-admin-unlock.js');

function bodyBetween(source,start,end){
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,start);
  return source.slice(a,b);
}

test('privileged More links require a verified secure role',()=>{
  const show=bodyBetween(menu,'function appMenuShouldShowAdminEntry()','function appMenuShouldOfferRoleRefresh()');
  assert(show.includes('rakAdminCanOpenShiftReport'));
  assert(!show.includes('rakAdminAccountRequiresPassword'));
  assert(!show.includes("activeId === '9811'"));
  const rootRender=bodyBetween(menu,'function appMenuRenderRoot(body)','function appMenuRerenderVisibleRoot()');
  assert(rootRender.includes('const verifiedRole = appMenuShouldShowAdminEntry();'));
  assert(rootRender.includes('data-menu-action="admin"'));
  assert(rootRender.includes('data-admin-action="vacation-report"'));
  assert(rootRender.includes('data-rak-shift-report-entry="1"'));
  assert(rootRender.includes('data-menu-action="role-refresh"'));
});

test('opening More restores role in background without unrelated sync or settings preload',()=>{
  const open=bodyBetween(menu,'function openAppMenu(view)','function toggleAppMenu()');
  assert(open.includes("void appMenuRefreshRoleAccess('menu-open');"));
  const passive=bodyBetween(menu,'async function appMenuRefreshRoleAccess(reason)','async function appMenuEnsureAdminAccessFromMenu()');
  assert(passive.includes('rakAdminRestoreSecureSessionForActiveAccount'));
  assert(!passive.includes('loadMachineSettings'));
  assert(!passive.includes('appMenuEnsureAdminAccessFromMenu'));
  const click=menu.slice(menu.indexOf("if (menuAction === 'role-refresh')"),menu.indexOf("if (menuAction === 'admin')"));
  assert(click.includes('await appMenuEnsureAdminAccessFromMenu();'));
});

test('secure role changes rerender visible root and restore is deduplicated',()=>{
  assert(unlock.includes("window.dispatchEvent(new Event('rak-admin-access-changed'))"));
  assert(unlock.includes("rakAdminNotifyAccessChanged('secure-context')"));
  assert(unlock.includes("rakAdminNotifyAccessChanged('locked')"));
  assert(menu.includes("window.addEventListener('rak-admin-access-changed', appMenuRerenderVisibleRoot)"));
  const restore=bodyBetween(unlock,'async function rakAdminRestoreSecureSessionForActiveAccount(reason)','async function rakAdminSecureSignIn(accountId, password)');
  assert(restore.includes('rakAdminSecureRestorePromise && rakAdminSecureRestoreAccountId === activeId'));
  assert(restore.includes('rakAdminCanOpenShiftReport()'));
  assert(restore.includes('rakAdminSecureRestorePromise = pending'));
});
