import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('app.js');
const access = read('rak-account-access.js');

function group(name) {
  const match = app.match(new RegExp('const\\s+' + name + '\\s*=\\s*\\[(.*?)\\];', 's'));
  assert(match, `missing ${name}`);
  return Array.from(match[1].matchAll(/["']([^"']+\.js)["']/g)).map((item) => item[1]);
}

const startup = group('startupFiles');

assert.doesNotMatch(app, /["']admin-auth["']/, 'admin login must not add a new startup feature bucket');
assert(!startup.includes('app-admin-unlock.js'), 'full admin unlock module must stay out of the fast startup shell');

assert.match(access, /rakEnsureFeature\('menu'\)/,
  'admin password gate must trigger the existing menu feature so app-admin-unlock.js is available');
assert.match(access, /rakEnsureFeature\('sync'\)/,
  'admin password gate must trigger the existing sync feature so RotationSupabaseBridge is available');
assert.match(access, /rakAdminSecureSignIn/,
  'admin password gate must still wait for the secure sign-in function');
assert.match(access, /waitForSecureSignIn\(12000\)/,
  'the bounded fail-closed login wait must remain');

console.log('[admin-login-startup-191] OK admin login preloads existing menu + sync modules without adding startup feature overhead');
