#!/usr/bin/env node
// RaK 1.7.65: patch real admin action handler after all historical stages.
// Earlier 1.7.21 renamed the game-profile text; preserve the old regression stages.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='app-menu.js';
let source=fs.readFileSync(file,'utf8');
function once(before,after,label){
 if(source.includes(after))return;
 assert(source.includes(before),'[17065-menu] missing '+label);
 assert.equal(source.split(before).length,2,'[17065-menu] ambiguous '+label);
 source=source.replace(before,after);
}
const marker='RAK_17065_NO_GAME_PROVISIONING_GUARD';
if(!source.includes(marker)){
 const start=source.indexOf('          let newProfilesText = appAccounts.length ?');
 const end=source.indexOf('          if (statusEl) statusEl.textContent = (result && result.queued)',start);
 assert(start>=0&&end>start&&end-start<1200,'worker save boundaries changed');
 const previous=source.slice(start,end);
 assert(previous.includes('ensureGameAccountsExistForWorkers(workerSettings.workers)')
   &&previous.includes('createdCount')&&previous.includes('nových účtů pracovníků:'),
   'unexpected obsolete worker-game provisioning');
 source=source.slice(0,start)+
   '          // '+marker+': saving workers must not create game profiles.\n'+
   "          const newProfilesText = appAccounts.length ? (' · účty aplikace: ' + String(appAccounts.length)) : '';\n"+
   source.slice(end);
}
assert(!source.includes('ensureGameAccountsExistForWorkers(workerSettings.workers)'));
// The 17065 stage formerly used the worker marker to guard the ENTIRE menu patch.
// Finish the actual save action here; stage sees the worker marker and only handles other files.
once("      if (adminAction === 'save-rotation') {",
`      if (adminAction === 'download-unsynced-draft') {
        if (typeof rakDownloadPreservedAdminMonthDraft !== 'function'
          || !rakDownloadPreservedAdminMonthDraft(String(target.getAttribute('data-draft-key')||'')))
          throw new Error('Soukromý návrh se nepodařilo stáhnout. Původní data zůstávají beze změny.');
        return;
      }
      if (adminAction === 'save-rotation') {`,'manual recovery action');
once("        const baseText = saveResult && saveResult.ok === true",
"        const baseText = saveResult && saveResult.ok === true && saveResult.queued !== true",'correct status');
once("        if (saveResult && saveResult.ok === true) renderAdminMenuBody(body, currentView);",
"        if (saveResult && saveResult.ok === true && saveResult.queued !== true) renderAdminMenuBody(body, currentView);",'preserve failed editor');
once(`        if (statusEl) statusEl.textContent = saveResult && saveResult.ok === true
          ? statusText
          : 'Rozpis se nepodařilo uložit online. Rozepsané změny zůstaly v editoru.';
        return;`,
`        if (statusEl) statusEl.textContent = saveResult && saveResult.ok === true && saveResult.queued !== true
          ? statusText
          : ((saveResult && saveResult.reason === 'draft-storage-failed')
              ? 'Uložení zastaveno: nelze ověřit místní zálohu. Neobnovuj stránku; stáhni návrh.'
              : 'Rozpis se nepodařilo potvrdit online. Návrh zůstal zachován; neobnovuj bez zálohy.');
        if (!(saveResult && saveResult.ok === true && saveResult.queued !== true)
          && result && result.draft && typeof rakShowAdminDraftExport === 'function') {
          rakShowAdminDraftExport(result.draft,statusEl||document.getElementById('adminRotationDraftStatus'));
        }
        return;`,'preserve and export failed button draft');
const first=source.indexOf("      if (adminAction === 'save-rotation') {");
const last=source.indexOf("      if (adminAction === 'load-food-schedule') {",first);
assert(first>=0&&last>first,'real save action boundaries');
const save=source.slice(first,last);
for(const literal of ['result.draft','rakShowAdminDraftExport',"saveResult.reason === 'draft-storage-failed'",'saveResult.ok === true && saveResult.queued !== true'])
 assert(save.includes(literal),'real save action missing '+literal);
fs.writeFileSync(file,source,'utf8');
console.log('[worker-provisioning-17065] PASS obsolete game provisioning removed; real admin save has durable export and guarded online status');
