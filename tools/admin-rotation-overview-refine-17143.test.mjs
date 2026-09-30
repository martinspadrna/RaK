import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('TO and MO are the same width as machine columns and use the same separators',()=>{
  const css=read('styles-rotation-summary-compact.css');
  assert(css.includes('width:334px !important;'));
  const blockStart=css.indexOf('/* TO + MO mají stejnou šířku');
  const blockEnd=css.indexOf('/* Strojové sloupce:',blockStart);
  const block=css.slice(blockStart,blockEnd);
  assert(block.includes('width:35px !important;'));
  assert(block.includes('min-width:35px !important;'));
  assert(block.includes('max-width:35px !important;'));
  assert(block.includes('border-left:1px solid'));
  assert(!block.includes('46px'));
});

test('local unsynced drafts panel is a real details element and starts collapsed',()=>{
  const editor=read('admin-rotation-editor.js');
  const css=read('styles-admin-polish.css');
  assert(editor.includes('<details class="appMenuCard rakAdminLocalDraftsCard" id="rakAdminPreservedDrafts">'));
  assert(editor.includes('<summary><b>Neuložené místní návrhy: '));
  assert(editor.includes('<div class="rakAdminLocalDraftsBody">'));
  assert(editor.includes("+'</details>';"));
  assert(!editor.includes('<details class="appMenuCard rakAdminLocalDraftsCard" id="rakAdminPreservedDrafts" open'));
  assert(css.includes('details.rakAdminLocalDraftsCard > summary'));
  assert(css.includes('details.rakAdminLocalDraftsCard[open] > summary::after'));
});
