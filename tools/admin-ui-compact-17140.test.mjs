import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('rotation cleanup is visible while the existing safe all-local handler remains intact',()=>{
  const renderer=read('app-menu-admin-renderer.js');
  const editor=read('admin-rotation-editor.js');
  const menu=read('app-menu.js');
  const bridge=read('supabase-bridge.js');
  const start=renderer.indexOf('const rotationHtml = [');
  const end=renderer.indexOf("const overtimeHtml = [",start);
  const rotation=renderer.slice(start,end);
  assert(rotation.includes('rakAdminLocalDraftCleanupHtml()'));
  assert(rotation.indexOf('rakAdminLocalDraftCleanupHtml()')<rotation.indexOf('buildAdminRotationTableHtml(monthKey)'));
  assert(editor.includes('Smazat všechny místní návrhy'));
  assert(editor.includes('data-admin-action="discard-local-rotation-drafts"'));
  assert(menu.includes("adminAction==='discard-local-rotation-drafts'"));
  assert(menu.includes('bridge.loadRotationState()'));
  assert(bridge.includes('function rakDiscardLocalRotationDrafts(expectedSignature)'));
});

test('grouped machine overview starts open and uses display-only TNK W01 W02 labels',()=>{
  const runtime=read('rak-runtime-stability.js');
  const css=read('styles-rotation-summary-compact.css');
  assert(runtime.includes("const wasOpen = container ? !!(container.querySelector('details') && container.querySelector('details').open) : true;"));
  assert(runtime.includes("return 'TNK'"));
  assert(runtime.includes("return 'W01'"));
  assert(runtime.includes("return 'W02'"));
  assert(runtime.includes('compactMachineHeading(key)'));
  assert(css.includes('width:356px !important'));
  assert(css.includes('width:54px !important'));
  assert(css.includes('width:35px !important'));
  assert(css.includes('border-left:1px solid'));
});

test('generator food and admin pages are compact on mobile without changing form data contracts',()=>{
  const css=read('styles-admin-polish.css');
  const generator=read('admin-rotation-generator.js');
  const food=read('admin-food.js');
  const admins=read('app-admin-unlock.js');
  for(const marker of ['#appMenuBody .adminGeneratorSettingsCard','#appMenuBody .adminFoodScheduleCard','#appMenuBody .adminAccountsCard']) assert(css.includes(marker));
  assert(css.includes('grid-template-columns:repeat(2,minmax(0,1fr)) !important'));
  assert(css.includes('grid-template-columns:repeat(auto-fit,minmax(82px,1fr)) !important'));
  assert(css.includes('#appMenuBody .adminFoodScheduleFold > .appMenuSubTitle'));
  assert(generator.includes('data-generator-settings-field'));
  assert(food.includes('data-food-schedule-field'));
  assert(admins.includes('data-admin-account-field'));
});
