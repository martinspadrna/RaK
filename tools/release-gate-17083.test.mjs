import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.83 identifies the About release candidate',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.83');
  assert.equal(metadata.displayVersion,'1.7.83');
  assert.equal(metadata.buildId,'v1.7.83-about-release1');
});

test('O aplikaci explains RaK and lists only evidenced 1.7 outcomes',()=>{
  const about=read('app-menu-pages.js');
  assert(about.includes('RaK spojuje pracovní rotace, osobní směnu, výrobní úkoly, směnové reporty, dovolené a dílenské kalkulačky'));
  assert(about.includes("title: 'Výroba, bezpečnost a práce bez internetu'"));
  assert(about.includes('na ověřeném iPhonu se po úplném restartu načetla i bez internetu'));
  assert(about.includes('při návratu online se porovnává revize, čas a obsah dat'));
  assert(about.includes('při chybě bezpečně skončí bez vytvoření archivu'));
  assert(!about.includes('konflikty synchronizace jsou kompletně vyřešené'));
});

test('mandatory CI and npm check execute the 1.7.83 gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(workflow.includes('node --test tools/release-gate-17083.test.mjs'));
  assert(pkg.scripts.check.includes('tools/release-gate-17083.test.mjs'));
});

test('Phase B preserves historical Gomoku rows and closes only inactive client access',()=>{
  const sql=read('supabase/migrations/20260918193324_rak_close_retired_gomoku_public_read.sql');
  assert(sql.includes("has_function_privilege('anon', v_submit, 'EXECUTE')"));
  assert(sql.includes("has_function_privilege('authenticated', v_submit, 'EXECUTE')"));
  assert(sql.includes("has_table_privilege('anon', 'public.gomoku_wins', 'INSERT')"));
  assert(sql.includes("has_table_privilege('authenticated', 'public.gomoku_wins', 'DELETE')"));
  assert(sql.includes('REVOKE SELECT ON TABLE public.gomoku_wins FROM anon, authenticated'));
  assert(sql.includes('DROP POLICY IF EXISTS rak_gomoku_wins_public_read_v2'));
  assert(!/\b(?:delete|truncate|update)\s+(?:table\s+)?public\.gomoku_wins\b/i.test(sql));
  assert(!sql.includes('Legacy game table is not empty'));
  const guide=read('SECURITY_DEPLOYMENT.md');
  assert(guide.includes('"sha256": "dd8ebf4e9f40c835f32373155e5e52bf20bf324f97bdaf675d3f6e756ca23431"'));
});
