import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const VENDOR='supabase-vendor-2.110.7.js';
const PINNED_SRI='sha384-hazsLVND17GNLVdtV19te6qbFT2YuLgl8SamcF+QR5eIOC+W4dGKrUNMxU1jH1zD';
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');

test('public Supabase SDK is actually tracked for deployment, not only generated in canonical build',()=>{
  const indexed=execFileSync('git',['ls-files','--error-unmatch',VENDOR],{cwd:ROOT,encoding:'utf8'}).trim();
  assert.equal(indexed,VENDOR,'Git must track the exact JS file uploaded to Vercel');
  const full=fs.readFileSync(path.join(ROOT,VENDOR));
  assert(full.length>180000,'Supabase SDK must not be missing, shortened or a stub');
  assert(full.subarray(0,12).toString('utf8').startsWith('var supabase'),'expected bundled UMD');
  const sri='sha384-'+crypto.createHash('sha384').update(full).digest('base64');
  assert.equal(sri,PINNED_SRI,'runtime SRI must match real tracked bytes');
  const app=read('app.js');
  assert(app.includes("const RAK_SUPABASE_SDK_URL = '"+VENDOR+"'"));
  assert(app.includes("const RAK_SUPABASE_SDK_INTEGRITY = '"+PINNED_SRI+"'"));
  assert(read('sw.js').includes("'./"+VENDOR+"'"));
  assert(read('tools/canonical-build.mjs').includes("const SUPABASE_VENDOR_RELATIVE='"+VENDOR+"'"));
});

test('SDK delivery is required for logged-out and local-first clients',()=>{
  const app=read('app.js');
  assert(app.indexOf('"rak-account-access.js"')>=0);
  assert(app.includes('ensureRakSupabaseSdk({ force: true })'));
  assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v4'"));
  assert(read('supabase-bridge.js').includes("label: '🔴 Supabase není připojena'"));
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/supabase-vendor-delivery-20261020.test.mjs'));
});
