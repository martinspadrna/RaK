import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.147 presentation-only evidence path is explicitly superseded by direct-cell 1.7.148',()=>{
  const day=read('admin-daymods.js');
  const admin=read('admin-rotation.js');
  const rotation=read('rotace.js');
  const wizard=read('admin-rotation-generator-wizard.js');
  assert(read('CHANGELOG.md').includes('## RaK 1.7.147 (development)'));
  assert(read('CHANGELOG.md').includes('## RaK 1.7.148 (development)'));
  assert(!day.includes('rakKalirnaEvidenceForCell'));
  assert(!admin.includes('rakKalirnaEvidenceForAdminCell'));
  assert(!rotation.includes('rakKalirnaEvidenceList'));
  assert(wizard.includes('adminRotationUnplannedPlaceKalirnaDisplayCell'));
  assert(day.includes("if (mod.type === 'kalirnaOut') return '→K';"));
});
