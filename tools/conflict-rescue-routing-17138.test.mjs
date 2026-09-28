import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Dashboard badge keeps the full conflict-rescue manual-sync owner', () => {
  const route = read('rak-feature-routing.js');
  assert(route.includes('RAK_17138_DASHBOARD_RESCUE_ROUTING'));
  assert(!/^\s*window\.runDashboardManualSync = runSafeManualSync;\s*$/m.test(route),
    'router must not unconditionally replace the full Dashboard manual-sync handler');
  assert(route.includes("const dashboardBadge = button.id === 'dashboardSyncBadge';"));
  assert(route.includes("dashboardBadge && typeof window.runDashboardManualSync === 'function'"));
  assert(route.includes("runner(dashboardBadge ? 'dashboard-click' : 'admin-service-sync')"));
  assert(route.includes("void runner('dashboard-keyboard');"));
});

test('fresh durable queue conflicts block transient green and drive rescue prompts', () => {
  const dashboard = read('dashboard.js');
  assert(dashboard.includes('RAK_17138_MANUAL_RESCUE_FRESH_QUEUE_GUARD'));
  assert(dashboard.includes("typeof window.getRakQueueConflictItems === 'function'"));
  assert(dashboard.includes('const rescueConflictCount = rescueConflicts'));
  assert(dashboard.includes('|| rescueConflictCount > 0) result.ok = false;'));
  assert(dashboard.includes('if (rescueConflictCount > 0'));
  assert(dashboard.includes('rescueConflicts && rescueConflicts.ok ? rescueConflicts : window.getRakQueueConflictItems()'));
});

test('exact-item rescue safety contract remains intact', () => {
  const dashboard = read('dashboard.js');
  const bridge = read('supabase-bridge.js');
  for (const phrase of [
    'Bez tohoto exportu RaK odstranění nepovolí.',
    'Online nastavení se nepřepíše.',
    'Ostatní fronta zůstane zachovaná.',
    'RaK ho automaticky neodstraní'
  ]) assert(dashboard.includes(phrase));
  assert(bridge.includes("return denied('private-export-required')"));
  assert(bridge.includes("return denied('server-review-required')"));
  assert(bridge.includes("review.category === 'ostatní'"));
  assert(bridge.includes('localStorage.setItem(LOCAL_QUEUE_KEY, removed.nextRaw)'));
});
