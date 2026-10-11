import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../admin-shift-overview.js',import.meta.url),'utf8');
function fixture(storage=new Map()) {
 const state={identity:{accountId:'9811',userId:'owner-a'},calls:0};
 const window={rakAdminCanManageAdmins:()=>!!state.identity,rakAdminGetActiveAccountId:()=>state.identity?.accountId,
 RotationSupabaseBridge:{getShiftOverviewIdentity:()=>state.identity},addEventListener(){}};
 const context=vm.createContext({window,document:{getElementById:()=>({})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
 vm.runInContext(source.replace('  const AAR_COLUMNS = [','  root.draftTest={readDraft,persistDraft,draftKey,draftOwners,renderedRecords,renderedRevisions,defaultRecord,cloudRead};\n  const AAR_COLUMNS = ['),context);
 const api=window.draftTest;
 function editor(value,revision=3){const field={value,getAttribute:()=> 'nitrogen'};const el={querySelector:s=>s.includes('date]')?{value:'2026-10-11'}:s.includes('shift]')?{value:'B:nocni12'}:null,querySelectorAll:()=>[field]};
 api.draftOwners.set(el,api.draftKey());api.renderedRecords.set(el,api.defaultRecord('2026-10-11','B:nocni12'));api.renderedRevisions.set(el,revision);return el;}
 return {api,state,storage,editor};
}
test('unsubmitted expressions persist synchronously across reload, separate from saved data and outbox',()=>{
 const a=fixture();a.api.persistDraft(a.editor('200+32'));
 const b=fixture(a.storage);assert.equal(b.api.readDraft().record.nitrogen,'200+32');assert.equal(b.api.readDraft().revision,3);
 assert.equal(Object.keys(b.api.cloudRead(b.state.identity).pending).length,0);assert.equal(Object.keys(b.api.cloudRead(b.state.identity).records).length,0);
 b.state.identity={accountId:'9812',userId:'owner-b'};assert.equal(b.api.readDraft(),null);
});
test('account switch cannot write the old editor into another account draft',()=>{
 const f=fixture(),el=f.editor('77');f.state.identity={accountId:'9812',userId:'owner-b'};f.api.persistDraft(el);assert.equal(f.storage.size,0);
});
test('empty draft remains authoritative after clearing and does not remove saved online/local records',()=>{
 const f=fixture();f.storage.set('rak_shift_overview_account_v1:owner-a',JSON.stringify({records:{saved:{nitrogen:'999'}}}));
 f.api.persistDraft(f.editor(''));const reopened=fixture(f.storage);assert.equal(reopened.api.readDraft().record.nitrogen,'');
 assert.equal(reopened.api.cloudRead(reopened.state.identity).records.saved.nitrogen,'999');
});

test('completion of an older save cannot overwrite a cleared or replaced editor draft',()=>{
 const f=fixture(),old=f.editor('999'),fresh=f.editor('');f.api.persistDraft(fresh);old.isConnected=false;f.api.persistDraft(old);
 assert.equal(f.api.readDraft().record.nitrogen,'');
});
