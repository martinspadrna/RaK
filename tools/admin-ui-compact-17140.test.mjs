import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('rotation local drafts and delete action share one card and statistics anomalies are absent',()=>{
  const renderer=read('app-menu-admin-renderer.js');
  const editor=read('admin-rotation-editor.js');
  const css=read('styles-admin-polish.css');
  const start=renderer.indexOf('const rotationHtml = [');
  const end=renderer.indexOf("const overtimeHtml = [",start);
  const rotation=renderer.slice(start,end);
  assert(!rotation.includes('rakAdminLocalDraftCleanupHtml()'));
  assert(!rotation.includes('buildAdminStatsAnomalyHtml'));
  assert(rotation.includes('buildAdminRotationTableHtml(monthKey)'));
  assert(editor.includes('class="appMenuCard rakAdminLocalDraftsCard"'));
  assert(editor.includes('id="rakAdminLocalDraftCleanup"'));
  assert(editor.includes('Smazat všechny místní návrhy'));
  assert(editor.includes('data-admin-action="discard-local-rotation-drafts"'));
  assert(css.includes('.rakAdminLocalDraftsCard .rakAdminLocalDraftDelete'));
  assert(css.includes('margin:8px 0 !important'));
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
