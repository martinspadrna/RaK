import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Kalírna evidence reuses the same kalirnaOut daymod and targets only MFKF06',()=>{
  const day=read('admin-daymods.js');
  assert(day.includes("mod.type !== 'kalirnaOut'"));
  assert(day.includes("=== 'MFKF06'"));
  assert(day.includes('window.rakKalirnaEvidenceForCell'));
  assert(day.includes('window.rakKalirnaEvidenceForAdminCell'));
  assert(day.includes('assigned.has(key)'));
  assert(!day.includes('kalirnaEvidenceMachine'));
  assert(!day.includes('kalirnaEvidencePerson'));
});

test('public/admin render Jméno with the same →K badge without writing a machine value',()=>{
  const day=read('admin-daymods.js');
  const admin=read('admin-rotation.js');
  const rotation=read('rotace.js');
  assert(day.includes("if (mod.type === 'kalirnaOut') return '→K';"));
  assert(admin.includes('rakKalirnaEvidenceForAdminCell'));
  assert(admin.includes('rakKalirnaEvidenceName'));
  assert(rotation.includes('rakKalirnaEvidenceForCell'));
  assert(rotation.includes('evidenceNames.join(\' / \')'));
  assert(rotation.includes("const metaMod = mod || (kalirnaEvidence.length ? kalirnaEvidence[0] : null);"));
});

test('Kalírna evidence stays presentation-only and existing minimal reflow/staffing logic remains authoritative',()=>{
  const wizard=read('admin-rotation-generator-wizard.js');
  const stats=read('kalirna-stats-override.js');
  assert(wizard.includes('adminRotationUnplannedTryMinimalKalirnaSoftReflow'));
  assert(wizard.includes("type: 'kalirnaOut'"));
  assert(wizard.includes('if (stillAssigned) throw new Error'));
  assert(stats.includes("if (!mod || mod.type !== 'kalirnaOut') return;"));
  assert(stats.includes('return \'\';'));
});
