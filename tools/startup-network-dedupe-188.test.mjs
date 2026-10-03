import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runNamedDeclarations } from './runtime-vm-fixture.mjs';

const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('clean pnpm installs allow only the pinned image dependency build', () => {
  assert.equal(read('pnpm-workspace.yaml').replace(/\r\n?/g, '\n').trim(), 'allowBuilds:\n  sharp: true');
});

test('Supabase bridge initialization is single-flight and repeat init is read-free', async () => {
  const state = { ready: false, announcements: [] };
  let refreshes = 0;
  let releaseRefresh;
  const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
  const { api } = runNamedDeclarations({
    modules: [{ source: read('supabase-bridge.js'), names: ['supabaseInitPromise', 'init'] }],
    globals: {
      state,
      hasClient: () => true,
      bindRealtimeSubscriptions: () => true,
      scheduleSupabaseQueueFlush: () => true,
      scheduleSupabaseKeepalive: () => true,
      refreshPublicData: async () => {
        refreshes += 1;
        await refreshGate;
        state.ready = true;
        return { announcements: state.announcements };
      }
    },
    exports: { init: 'init' }
  });

  const first = api.init();
  const joined = api.init();
  assert.equal(first, joined);
  await Promise.resolve();
  assert.equal(refreshes, 1);
  releaseRefresh();
  await first;
  await api.init();
  assert.equal(refreshes, 1);
});

test('startup lifecycle notifications cannot start a competing remote refresh', () => {
  const source = read('app-pwa-connectivity.js');
  assert(source.includes('RAK_188_STARTUP_REFRESH_DEDUPE'));
  assert(source.includes("!window.__rakBootV2StartupReady && ['pageshow', 'focus', 'visible'].includes"));
  assert(source.includes("return 'startup-pending';"));
  assert(source.includes("void runLiveRefresh('online', { force: true })"), 'real online recovery must remain forced');
});

test('live refresh owns one machine settings read while rotation sync skips its copy', () => {
  const source = read('app-pwa-connectivity.js');
  const rotation = read('app-rotation-sync.js');
  assert(source.includes('RAK_188_MACHINE_SETTINGS_DEDUPE'));
  const sharedStart = source.indexOf('let machineSettingsPromise = null;');
  const joined = source.indexOf('await Promise.all([rotationPromise, machineSettingsPromise])', sharedStart);
  assert(sharedStart >= 0 && joined > sharedStart);
  const segment = source.slice(sharedStart, joined);
  assert(segment.indexOf('loadMachineSettings()') < segment.indexOf('syncRotationFromSupabase(false'), 'machine read must start before rotation sync');
  assert(source.includes('skipMachineSettings: machineSettingsPromise !== null'));
  assert(rotation.includes('if (options.skipMachineSettings !== true) refreshRakMachineSettingsInBackground(bridge);'));
});
