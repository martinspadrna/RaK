import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
function fixture(role='foreman') {
 const app={adminAuthVersion:2,adminUnlocked:true,adminAccountId:'1234',adminRole:role};
 const api=runNamedDeclarations({modules:[{source:read('app-admin-unlock.js'),names:['rakAdminHasVerifiedRole','rakAdminCanOpenShiftOverview','rakAdminCanOpenShiftReport','rakAdminCanOpenAdmin','rakAdminIsForeman','rakAdminIsDeputy']}],globals:{app,rakAdminGetActiveAccountId:()=>'1234'},exports:{verified:'rakAdminHasVerifiedRole',overview:'rakAdminCanOpenShiftOverview',report:'rakAdminCanOpenShiftReport',admin:'rakAdminCanOpenAdmin',foreman:'rakAdminIsForeman',deputy:'rakAdminIsDeputy'}}).api;
 return {app,api};
}
test('Mistr permits only overview; verified owner/admin/deputy retain their boundaries',()=>{
 for(const [role,overview,report,admin] of [['owner',true,true,true],['admin',false,true,true],['deputy',false,true,false],['foreman',true,false,false],['guest',false,false,false]]){
 const {api,app}=fixture(role);assert.equal(api.overview(),overview);assert.equal(api.report(),report);assert.equal(api.admin(),admin);assert.equal(api.foreman(),role==='foreman');
 app.adminUnlocked=false;assert.equal(api.overview(),false);app.adminUnlocked=true;app.adminAccountId='other';assert.equal(api.verified(),false);
 }
});
test('Mistr More section exposes exactly overview and no diagnostic/admin/report links',()=>{
 const {api}=fixture();const body={innerHTML:''};
 const menu=read('app-menu.js');
 const f=runNamedDeclarations({modules:[{source:menu,names:['appMenuRenderRoot']}],globals:{rakAdminIsForeman:api.foreman,rakAdminIsDeputy:api.deputy,rakAdminCanOpenShiftOverview:api.overview,appMenuShouldShowAdminEntry:api.verified,appMenuLiveAuthDiagnosticEnabled:()=>true,appMenuShouldOfferRoleRefresh:()=>false},exports:{render:'appMenuRenderRoot'}}).api;
 f.render(body);const section=body.innerHTML.split('<section')[1];assert(section.includes('Mistr'));assert(section.includes('Přehled směny'));assert.equal((section.match(/<button/g)||[]).length,1);assert(!section.includes('Administrace'));assert(!section.includes('Report směny'));
});
test('owner A outside has A dashboard assignment and rotation; all other A/B/C stay blocked',()=>{
 let owner=false;let team='A';
 const api=runNamedDeclarations({modules:[{source:read('core.js'),names:['rakCanAccessRotations']}],globals:{window:{rakAdminCanManageAdmins:()=>owner},getRakActiveAccountShiftTeam:()=>team},exports:{allowed:'rakCanAccessRotations'}}).api;
 for(team of ['A','B','C'])assert.equal(api.allowed(),false);team='D';assert.equal(api.allowed(),true);team='A';owner=true;assert.equal(api.allowed(),true);
 const dash=read('dashboard.js');assert(dash.includes('if(assigned.outside)'));assert(dash.includes('getDashboardAccountTeamStatus(now,assigned.team)'));
});
test('Mistr backend management denied and owner role cannot be overwritten by role editor',()=>{
 const edge=read('supabase/functions/rak-admin-users/index.ts');const block=edge.indexOf('if (actor.role === "foreman")');assert(block>edge.indexOf('if (action === "change-own-password")'));assert(block<edge.indexOf('if (action === "list-admin-directory")'));assert(edge.includes('existing?.role === "owner"'));assert(edge.includes('id !== "9811"'));
 const feature=read('admin-shift-overview.js');assert(feature.includes("if (identity.accountId !== '9811'"));assert(feature.includes("identity.accountId === '9811' && signed?.userId"));
});
