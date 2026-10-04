import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('app.js');
const access = read('rak-account-access.js');

function group(name) {
  const match = app.match(new RegExp('const\\s+' + name + '\\s*=\\s*\\[(.*?)\\];', 's'));
  assert(match, `missing ${name}`);
  return Array.from(match[1].matchAll(/["']([^"']+\\.js)["']/g)).map((item) => item[1]);
}

const adminAuth = group('adminAuthFeatureFiles');
assert.deepEqual(adminAuth, ['supabase-bridge.js', 'app-admin-unlock.js'],
  'admin-auth must reuse the existing secure bridge + admin unlock modules');

assert.match(app,
  /"admin-auth": Object\.freeze\(\{ files: adminAuthFeatureFiles, dependencies: Object\.freeze\(\[\]\) \}\)/,
  'admin-auth feature must be an on-demand feature without startup dependencies');

const startup = group('startupFiles');
assert(!startup.includes('app-admin-unlock.js'),
  'full admin unlock module must stay out of the fast startup shell');

assert.match(access,
  /rakEnsureFeature\('admin-auth'\)/,
  'admin password gate must actively trigger the dedicated admin-auth feature');

assert.match(access,
  /rakEnsureSupabaseSdk\(\{ force: true \}\)/,
  'admin password gate must proactively ensure the Supabase SDK');

assert.match(access,
  /waitForSecureSignIn\(12000\)/,
  'the existing bounded login wait must remain as the final fail-closed guard');

console.log('[admin-login-startup-191] OK dedicated admin-auth lazy feature is triggered by the admin password gate without moving the full admin module into startup');
