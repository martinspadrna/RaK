import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.96 admin-workflow milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.96');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('rotation editor removes only the local-draft cleanup UI and keeps the underlying safety functions',()=>{
  const editor=read('admin-rotation-editor.js');
  const start=editor.indexOf('function buildAdminRotationTableHtml(monthKey)');
  const end=editor.indexOf('function readAdminRotationFromDom',start);
  const renderer=editor.slice(start,end);
  assert(!renderer.includes('rakAdminLocalDraftCleanupHtml()'));
  assert(editor.includes('function rakAdminLocalDraftCleanupHtml()'));
  const menu=read('app-menu.js');
  const bridge=read('supabase-bridge.js');
  assert(menu.includes("adminAction==='discard-local-rotation-drafts'"));
  assert(bridge.includes('rakDiscardLocalRotationDrafts'));
});

test('compact overview abbreviates only display labels',()=>{
  const editor=read('admin-rotation-editor.js');
  const {api}=runNamedDeclarations({
    modules:[{source:editor,names:['adminRotationCompactMachineLabel']}],
    globals:{},
    exports:{label:'adminRotationCompactMachineLabel'}
  });
  assert.equal(api.label('TNKS01'),'TNK');
  assert.equal(api.label('TNKSO1'),'TNK');
  assert.equal(api.label('TPKW01'),'W01');
  assert.equal(api.label('TPKW02'),'W02');
  assert.equal(api.label('MFKF10'),'MFKF10');
  assert(editor.includes('title="' + "' + escapeHtml(String(m || '')) + '" + '"'));
});

test('rotation and absence choices use anchored filtered pickers and save validation still rejects absence conflicts',()=>{
  const rotation=read('admin-rotation.js');
  const editor=read('admin-rotation-editor.js');
  const css=read('styles-admin-rotation-editor.css');
  assert(rotation.includes('function adminRotationSuggestionContext(root)'));
  assert(rotation.includes('[data-rot-field^="cell-"]'));
  assert(rotation.includes('[data-note-field="date"]'));
  assert(rotation.includes('[data-note-field="person"]'));
  assert(rotation.includes('!scheduled.has(name) && !absent.has(name)'));
  assert(rotation.includes('adminRotationChoicePicker'));
  assert(css.includes('.adminRotationChoicePicker{'));
  assert(rotation.includes("addIssue('error', 'absence-conflict'"));
  assert(editor.includes('if (top + pickerHeight > vh - 8)'));
});

test('worker and admin account editors keep exactly one blank seed and can maintain one blank dynamically',()=>{
  const core=read('core.js');
  const admins=read('app-admin-unlock.js');
  const menu=read('app-menu.js');
  assert(core.includes("+ buildAdminApplicationAccountRowHtml({ name: '', loginNumber: '' });"));
  assert(!core.includes("Array.from({ length: 3 }, () => buildAdminApplicationAccountRowHtml"));
  assert(core.includes('function ensureAdminAppAccountBlankRow(root, preferredRow)'));
  assert(admins.includes("settings.admins.concat([{ accountId: '', label: '', passwordHash: '', enabled: true, role: 'admin' }])"));
  assert(!admins.includes("settings.admins.concat(Array.from({ length: 4 }"));
  assert(admins.includes('function ensureAdminAccountsBlankRow(root, preferredRow)'));
  assert(menu.includes('ensureAdminAppAccountBlankRow(body'));
  assert(menu.includes('ensureAdminAccountsBlankRow(body'));
});

test('worker status card is gone, account directory is compact, and Monday burn reminder is retired',()=>{
  const core=read('core.js');
  const access=read('rak-account-access.js');
  const stats=read('stats.js');
  const css=read('styles-admin-polish.css');
  const start=core.indexOf('function buildAdminWorkerRosterSettingsHtml()');
  const end=core.indexOf('function ensureAdminAppAccountBlankRow',start);
  assert(!core.slice(start,end).includes('buildAdminWorkerRosterStatusHtml'));
  assert(css.includes('.adminWorkerNameCol{width:84px;}'));
  assert(css.includes('.adminWorkerLoginCol{width:63px;}'));
  assert(access.includes('rakAccountDirectoryTable'));
  assert(access.includes('.rakAccountDirectoryNameCol{width:160px}'));
  assert(access.includes('.rakAccountDirectoryNumberCol{width:60px}'));
  assert(!core.includes("id: 'mondayBurn'"));
  assert(!stats.includes('Brusy- spálení'));
  assert(core.includes("id: 'firstMorningRivet'"));
});

test('four operational admin pages share the same mobile card hierarchy',()=>{
  const renderer=read('app-menu-admin-renderer.js');
  const css=read('styles-admin-polish.css');
  assert.equal((renderer.match(/adminOpsUnifiedCard/g)||[]).length,4);
  assert(css.includes('#appMenuBody .adminOpsUnifiedCard{'));
  assert(css.includes('#appMenuBody .adminOpsUnifiedCard > .appMenuActionRow'));
});

test('visible rotation triple-tap help is removed without removing task behavior',()=>{
  const rotation=read('rotace.js');
  assert(!rotation.includes('3× klepni na kartu člověka pro jeho úkol.'));
  assert(rotation.includes('data-rotation-task-person'));
});

test('npm check retains 1.7.96 while CI runs the current release gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17096.test.mjs'));
  assert(/node --test tools\/release-gate-1709\d\.test\.mjs/.test(workflow));
});
