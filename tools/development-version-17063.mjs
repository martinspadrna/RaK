#!/usr/bin/env node
// RaK 1.7.63: verified rotation baseline and read-only manual conflict inspection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.63',BUILD='v1.7.63-casbaseline1',PREVIOUS='v1.7.62-safe-review1';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function once(s,b,a,label){if(s.includes(a))return s;assert(s.includes(b),'[17063] missing '+label);assert.equal(s.split(b).length,2,'[17063] ambiguous '+label);return s.replace(b,a);}
let bridge=read('supabase-bridge.js');
assert(bridge.includes('RAK_17062_READONLY_REVIEW_GUARD')&&bridge.includes('RAK_17060_DURABLE_QUEUE_GUARD'),'1.7.62 required');
if(!bridge.includes('RAK_17063_UNKNOWN_BASELINE_GUARD')){
 const start=bridge.indexOf('      if (state.rotationRevision === null || state.rotationRevision === undefined || !Number.isFinite(Number(state.rotationRevision))) {',bridge.indexOf('  async function trySaveRotationStateViaRpc('));
 const stop=bridge.indexOf("      const { data, error } = await client.rpc('rak_admin_save_rotation_v2'",start);
 assert(start>=0&&stop>start&&stop-start<900,'unverified rotation baseline boundaries');
 bridge=bridge.slice(0,start)+`      // RAK_17063_UNKNOWN_BASELINE_GUARD: a fresh revision fetched during save is NOT
      // evidence that the edited content derives from it. Reject before any RPC/read.
      if (!Number.isSafeInteger(state.rotationRevision) || state.rotationRevision < 0) {
        const missing = new Error('Revize rozpisu není ověřena. Načti aktuální online rozpis před úpravami.');
        missing.code = 'RAK_ROTATION_REVISION_UNVERIFIED';
        throw missing;
      }
`+bridge.slice(stop);
 const a=bridge.indexOf('  async function upsertRotationMonthEntriesDirect(');
 const b=bridge.indexOf('\n  async function upsertGomokuWinDirect(',a);
 assert(a>=0&&b>a&&b-a<6500,'monthly function boundaries');
 const original=bridge.slice(a,b);
 // The 1.6.14 build stage has ALREADY removed the direct month-table fallback.
 // Preserve its exact validated RPC serialization; fix only zero-row count semantics.
 assert(original.includes("client.rpc('rak_admin_save_rotation_month_entries_v2'")
   &&original.includes('if (!hasSecureAdminContext())')
   &&!original.includes(".from('rotation_months')")
   &&!original.includes(".from('rotation_entries')"),'monthly RPC-only baseline changed');
 const fixed=once(original,
   '    return { months: 1, entries: Number(data && data.inserted || payloadRows.length) || 0 };',
   '    return { months: 1, entries: data && data.inserted !== null && Number.isSafeInteger(Number(data.inserted)) ? Number(data.inserted) : payloadRows.length };',
   'preserve zero monthly rows');
 bridge=bridge.slice(0,a)+fixed.replace('  async function upsertRotationMonthEntriesDirect(',
   '  // RAK_17063_MONTH_RPC_ONLY_GUARD: previously established RPC-only path, retain zero counts.\n  async function upsertRotationMonthEntriesDirect(')+bridge.slice(b);
 const review=`  // RAK_17063_MANUAL_REVISION_GUARD: on-demand owner/admin only, read the
  // server revision without fetching content. Equal revisions never authorize replay.
  async function reviewRakRotationRevisionOnDemand() {
    const blocked=reason=>({ok:false,reason,serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false});
    if(typeof navigator==='undefined'||!navigator.onLine)return blocked('offline');
    if(!hasSecureAdminContext())return blocked('admin-auth-required');
    const localQueue=getRakPendingSyncReview();
    if(localQueue.storageIssue)return blocked('local-queue-unverified');
    const client=getClient();
    if(!client||!client.auth||typeof client.auth.getUser!=='function')return blocked('missing-auth-client');
    try{
      const verified=await client.auth.getUser();
      if(verified.error||!verified.data||!verified.data.user)return blocked('identity-not-verified');
      const identity=verified.data.user;
      const auth=await client.rpc('rak_admin_context');
      const context=auth&&auth.data;
      if(auth.error||!context||context.authenticated!==true
        ||!['owner','admin'].includes(context.role)||!context.account_id
        ||!state.adminAuth.context||context.account_id!==state.adminAuth.context.account_id
        ||(context.user_id&&String(context.user_id)!==String(identity.id)))return blocked('admin-auth-required');
      const result=await client.from('rotation_state').select('revision').eq('key','main').maybeSingle();
      if(result.error||!result.data||!Number.isSafeInteger(Number(result.data.revision)))return blocked('revision-read-failed');
      const remote=Number(result.data.revision),local=state.rotationRevision;
      const localKnown=Number.isSafeInteger(local)&&local>=0;
      return {ok:true,remoteRevision:remote,localRevision:localKnown?local:null,
        state:!localKnown?'local-revision-unknown':local===remote?'revision-equal':'revision-changed',
        serverContentCompared:false,atomicWritePerformed:false,eligibleForReplay:false,
        checkedAt:new Date().toISOString()};
    }catch(_){return blocked('verification-failed');}
  }

`;
 bridge=once(bridge,'  window.getSupabaseSyncStatus = getSyncUiStatus;',review+'  window.getSupabaseSyncStatus = getSyncUiStatus;','manual review function');
 bridge=once(bridge,'  window.getRakPendingSyncReview = getRakPendingSyncReview;',
   '  window.getRakPendingSyncReview = getRakPendingSyncReview;\n  window.reviewRakRotationRevisionOnDemand = reviewRakRotationRevisionOnDemand;',
   'manual review export');
 write('supabase-bridge.js',bridge);
}
let dashboard=read('dashboard.js');
if(!dashboard.includes('RAK_17063_MANUAL_REVISION_DIALOG_GUARD')){
 const prompt=`    // RAK_17063_MANUAL_REVISION_DIALOG_GUARD: explicit badge tap and separate
    // approval; comparison is read-only, no payload, ID, token or automatic replay.
    if (actual && actual.conflictCount > 0
      && (source === 'dashboard-click' || source === 'dashboard-keyboard')
      && typeof app !== 'undefined' && app && app.adminUnlocked === true
      && typeof window.confirm === 'function' && typeof window.reviewRakRotationRevisionOnDemand === 'function'
      && window.confirm('Zkontrolovat pouze číslo revize rozpisu proti serveru? Neuloží ani nepřepíše žádné změny.')) {
      Promise.resolve().then(() => window.reviewRakRotationRevisionOnDemand()).then(review => {
        if (typeof window.alert !== 'function') return;
        const description = review && review.ok
          ? (review.state === 'revision-equal' ? 'Revize byly při kontrole shodné.'
            : review.state === 'revision-changed' ? 'Revize se liší. Nic nepřepisuj.'
            : 'Lokální revize nebyla ověřena. Nic nepřepisuj.')
          : 'Revizi se nepodařilo bezpečně ověřit. Nic nepřepisuj.';
        window.alert(['Kontrola revize rozpisu',description,
          'Obsah serveru a telefonu nebyl porovnán.',
          'Nebyl proveden žádný zápis ani vyřešen konflikt.'].join('\\n'));
      }).catch(() => {
        if (typeof window.alert === 'function') window.alert('Kontrola revize se nezdařila. Nic nepřepisuj.');
      });
    }
`;
 dashboard=once(dashboard,'    // RAK_17060_MANUAL_RESCUE_GUARD:',prompt+'    // RAK_17060_MANUAL_RESCUE_GUARD:','manual dashboard dialog');
 write('dashboard.js',dashboard);
}
let replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
if(!replay.includes('RAK_17063_TWO_PASS_GUARD')){
 replay=once(replay,`// RAK_17062_TWO_PASS_GUARD\nconst already17062=indexSource.includes("var build='${PREVIOUS}';");`,
 `// RAK_17062_TWO_PASS_GUARD\n// RAK_17063_TWO_PASS_GUARD\nconst already17063=indexSource.includes("var build='${BUILD}';");\nconst already17062=already17063||indexSource.includes("var build='${PREVIOUS}';");`,
 'two-pass detection');
 replay=once(replay,`already17062?"var build='${PREVIOUS}';":already17061?`,
 `already17063?"var build='${BUILD}';":already17062?"var build='${PREVIOUS}';":already17061?`,
 'two-pass marker');
 write('tools/shift-report-mo-hotfix-170-smoke.mjs',replay);
}
for(const [p,b,a] of [
 ['supabase-config.js','window.RAK_RELEASE_VERSION = "1.7.62";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['supabase-config.js','window.RAK_TEST_DISPLAY_VERSION = "1.7.62";',`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`],
 ['supabase-config.js',`window.RAK_PWA_BUILD = "${PREVIOUS}";`,`window.RAK_PWA_BUILD = "${BUILD}";`],
 ['app.js',`const RAK_DEV_UPDATE_BUILD = "${PREVIOUS}";`,`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
 ['app.js','window.RAK_RELEASE_VERSION = "1.7.62";',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
 ['sw.js',"const CACHE_VERSION = 'v1.7.62';",`const CACHE_VERSION = 'v${VERSION}';`],
 ['sw.js',"const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.62';",`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
 ['sw.js',`const DEVELOPMENT_BUILD_ID = '${PREVIOUS}';`,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
 ['index.html',`var build='${PREVIOUS}';`,`var build='${BUILD}';`]
])write(p,once(read(p),b,a,'release '+p));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl')&&!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
for(const p of ['supabase-bridge.js','dashboard.js','sw.js','app.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])execFileSync(process.execPath,['--check',p],{stdio:'pipe'});
execFileSync(process.execPath,['--test','tools/release-gate-17063.test.mjs'],{stdio:'inherit'});
console.log('[development-version-17063] PASS fail-closed baseline, admin monthly RPC and read-only revision review');
