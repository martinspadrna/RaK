#!/usr/bin/env node
// RaK 1.7.65: remove orphan game-account provisioning in the actual worker save path.
// Executed AFTER historical 1.7.64 gates because 1.7.21 renames the legacy label.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='app-menu.js';
let source=fs.readFileSync(file,'utf8');
const marker='RAK_17065_NO_GAME_PROVISIONING_GUARD';
if(!source.includes(marker)){
  const start=source.indexOf('          let newProfilesText = appAccounts.length ?');
  const end=source.indexOf('          if (statusEl) statusEl.textContent = (result && result.queued)',start);
  assert(start>=0 && end>start && end-start<1200,'worker save block boundaries changed');
  const previous=source.slice(start,end);
  assert(previous.includes('ensureGameAccountsExistForWorkers(workerSettings.workers)') &&
    previous.includes('createdCount') && previous.includes('nových účtů pracovníků:'),
    'unexpected worker game-profile creation block');
  source=source.slice(0,start)+
    '          // '+marker+': saving workers cannot create obsolete game accounts.\n'+
    "          const newProfilesText = appAccounts.length ? (' · účty aplikace: ' + String(appAccounts.length)) : '';\n"+
    source.slice(end);
  fs.writeFileSync(file,source,'utf8');
}
assert(!source.includes('ensureGameAccountsExistForWorkers(workerSettings.workers)'));
console.log('[worker-provisioning-17065] PASS no obsolete game profile creation while saving workers');
