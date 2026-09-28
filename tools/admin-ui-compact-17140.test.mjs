import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('rotation cleanup button is visible in Admin Rozpisy',()=>{
  const renderer=read('app-menu-admin-renderer.js');
  const editor=read('admin-rotation-editor.js');
  const start=renderer.indexOf('const rotationHtml = [');
  const end=renderer.indexOf("const overtimeHtml = [",start);
  const rotation=renderer.slice(start,end);
  assert(rotation.includes('rakAdminLocalDraftCleanupHtml()'));
  assert(rotation.indexOf('rakAdminLocalDraftCleanupHtml()')<rotation.indexOf('buildAdminRotationTableHtml(monthKey)'));
  assert(editor.includes('Smazat všechny místní návrhy'));
  assert(editor.includes('data-admin-action="discard-local-rotation-drafts"'));
});

test('rotation cleanup keeps the existing fail-closed local-only behavior',()=>{
  const menu=read('app-menu.js');
  const bridge=read('supabase-bridge.js');
  assert(menu.includes("adminAction==='discard-local-rotation-drafts'"));
  assert(menu.includes('bridge.loadRotationState()'));
  assert(menu.includes("Místní návrhy zůstaly zachovány."));
  assert(bridge.includes('function rakDiscardLocalRotationDrafts(expectedSignature)'));
  assert(bridge.includes("['rotation_state','rotation_month_entries'].includes(task.type)"));
  assert(bridge.includes('otherConflicts'));
});
