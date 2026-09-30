import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNamedDeclarations} from './runtime-vm-fixture.mjs';

const bridge=fs.readFileSync(new URL('../supabase-bridge.js',import.meta.url),'utf8');
const menu=fs.readFileSync(new URL('../app-menu-bug-report.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../admin-reports.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260924201500_rak_bug_report_optional_screenshot_17099.sql',import.meta.url),'utf8');

function bridgeRuntime(client){
  const calls=[];
  const {api}=runNamedDeclarations({
    modules:[{source:bridge,names:[
      'normalizeBugReportType','normalizeBugReportPayload','saveBugReportDirect',
      'isBugReportUuid','loadBugReportScreenshotDirect'
    ]}],
    globals:{
      navigator:{onLine:true,userAgent:'test-agent'},
      window:{APP_VERSION:'1.7.99',innerWidth:390,innerHeight:844,devicePixelRatio:3},
      hasSecureAdminContext:()=>true,
      runSupabaseOperation:async(name,fn)=>{calls.push(name);return await fn();}
    },
    exports:{normalize:'normalizeBugReportPayload',save:'saveBugReportDirect',loadScreenshot:'loadBugReportScreenshotDirect'}
  });
  return {api,calls,client};
}

test('text-only bug report keeps v3 screenshot parameters null and never invents image data',async()=>{
  const rpc=[];
  const client={rpc:async(name,args)=>{rpc.push({name,args});return {data:{ok:true,id:'11111111-1111-4111-8111-111111111111',has_screenshot:false},error:null};}};
  const {api}=bridgeRuntime(client);
  const result=await api.save(client,{id:'report-1',type:'Chyba',text:'Textová chyba',accountId:'1234',accountName:'Test'});
  assert.equal(result.ok,true);
  assert.equal(rpc.length,1);
  assert.equal(rpc[0].name,'rak_submit_bug_report_v3');
  assert.equal(rpc[0].args.p_screenshot_base64,null);
  assert.equal(rpc[0].args.p_screenshot_mime,null);
  assert.equal(rpc[0].args.p_screenshot_width,null);
  assert.equal(rpc[0].args.p_screenshot_height,null);
});

test('online screenshot is passed only to bounded v3 RPC and returned row drops base64',async()=>{
  const rpc=[];
  const client={rpc:async(name,args)=>{rpc.push({name,args});return {data:{ok:true,id:'22222222-2222-4222-8222-222222222222',has_screenshot:true},error:null};}};
  const {api}=bridgeRuntime(client);
  const base64='YWJjZA==';
  const result=await api.save(client,{
    id:'report-2',type:'Chyba',text:'Chyba se screenshotem',
    screenshot:{base64,mime:'image/jpeg',width:390,height:844}
  });
  assert.equal(rpc[0].name,'rak_submit_bug_report_v3');
  assert.equal(rpc[0].args.p_screenshot_base64,base64);
  assert.equal(rpc[0].args.p_screenshot_mime,'image/jpeg');
  assert.equal(rpc[0].args.p_screenshot_width,390);
  assert.equal(rpc[0].args.p_screenshot_height,844);
  assert.deepEqual(JSON.parse(JSON.stringify(result.row.screenshot)),{mime:'image/jpeg',width:390,height:844});
  assert.equal(JSON.stringify(result.row).includes(base64),false);
});

test('admin screenshot read uses dedicated admin RPC and validates UUID before request',async()=>{
  const rpc=[];
  const client={rpc:async(name,args)=>{rpc.push({name,args});return {data:{ok:true,found:true,mime_type:'image/jpeg',base64:'YWJjZA=='},error:null};}};
  const {api}=bridgeRuntime(client);
  const id='33333333-3333-4333-8333-333333333333';
  const good=await api.loadScreenshot(client,id);
  assert.equal(good.found,true);
  assert.equal(rpc[0].name,'rak_admin_get_bug_report_screenshot_v3');
  assert.equal(rpc[0].args.p_id,id);
  const bad=await api.loadScreenshot(client,'not-a-uuid');
  assert.equal(bad.ok,false);
  assert.equal(rpc.length,1);
});

test('client privacy contract keeps screenshot out of local queue/storage paths',()=>{
  assert(menu.includes('RAK_BUG_SCREENSHOT_MAX_BYTES = 650000'));
  assert(menu.includes("canvas.toBlob"));
  assert(menu.includes("bugReportCanvasBlob(canvas, 'image/jpeg'"));
  assert(menu.includes('odstraňuji metadata'));
  assert(menu.includes('Screenshot lze odeslat jen online'));
  assert(menu.includes('localBackup: true, hasScreenshot: !!rakBugReportScreenshot'));
  assert(!menu.includes('localBackup: true, screenshot:'));
  assert(bridge.includes("if (hasScreenshot) return { ok: false, queued: false, reason: 'screenshot-online-required' }"));
  assert(bridge.includes("reason: 'screenshot-upload-failed'"));
  assert(!bridge.includes("enqueueAndMaybeFlush({ type: 'bug_report', entry: payload, screenshot"));
});

test('admin list carries only screenshot flag while bytes load on explicit admin action',()=>{
  assert(admin.includes('row.has_screenshot && isAdminReportUuid(row.id)'));
  assert(admin.includes('data-admin-action="report-screenshot"'));
  assert(admin.includes('bridge.loadBugReportScreenshot(id)'));
  assert(admin.includes("base64.length > 1000000"));
  assert(!admin.includes('row.screenshot_base64'));
});

test('SQL screenshot storage is private, bounded, additive and has no Storage bucket',()=>{
  assert(migration.includes('CREATE TABLE IF NOT EXISTS public.bug_report_attachments'));
  assert(migration.includes('ALTER TABLE public.bug_report_attachments ENABLE ROW LEVEL SECURITY'));
  assert(migration.includes('REVOKE ALL ON TABLE public.bug_report_attachments FROM PUBLIC,anon,authenticated'));
  assert(migration.includes('CHECK (pg_catalog.octet_length(content_bytes) BETWEEN 1 AND 750000)'));
  assert(migration.includes("mime_type IN ('image/jpeg','image/png','image/webp')"));
  assert(migration.includes('p_screenshot_width NOT BETWEEN 1 AND 1600'));
  assert(migration.includes("MESSAGE='screenshot_mime_mismatch'"));
  assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_admin_get_bug_report_screenshot_v3'));
  assert(migration.includes('PERFORM private.rak_require_admin(false)'));
  assert(migration.includes('DELETE FROM public.bug_report_attachments WHERE report_id=p_id'));
  assert(migration.includes('CREATE OR REPLACE FUNCTION public.rak_submit_bug_report_v3'));
  assert(!migration.includes('CREATE OR REPLACE FUNCTION public.rak_submit_bug_report_v2'));
  assert(!migration.includes('storage.buckets'));
  assert(!migration.includes('storage.objects'));
});
