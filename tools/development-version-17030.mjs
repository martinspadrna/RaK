#!/usr/bin/env node
// RaK 1.7.30: keep the deployed owner source archive identical to its vetted file manifest.
// The older prepare stage archives all Git files; this final build gate replaces that ZIP
// with only the files already approved for the owner backup before Vercel publishes it.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const VERSION = '1.7.30';
const BUILD = 'v1.7.30-archiveprivacy1';
const ARCHIVE = 'rak-complete-backup-source.zip';
const read = path => fs.readFileSync(path, 'utf8');
function change(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (before !== after) fs.writeFileSync(path, after, 'utf8');
  return after;
}
function swap(source, before, after, label) {
  if (source.includes(before)) {
    assert.equal(source.split(before).length, 2, '[17030] duplicate anchor: ' + label);
    return source.replace(before, after);
  }
  assert(source.includes(after), '[17030] missing anchor: ' + label);
  return source;
}
function zipFiles(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length > 100000, '[17030] missing or tiny ZIP');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) {
      end = i;
      break;
    }
  }
  assert(end >= 0, '[17030] ZIP end directory not found');
  const count = bytes.readUInt16LE(end + 10);
  assert(count > 80 && count < 2000 && bytes.readUInt16LE(end + 8) === count, '[17030] unexpected ZIP entry count');
  let cursor = bytes.readUInt32LE(end + 16);
  const names = [];
  for (let i = 0; i < count; i++) {
    assert(cursor + 46 <= end && bytes.readUInt32LE(cursor) === 0x02014b50, '[17030] invalid ZIP directory entry');
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    assert(next <= end, '[17030] truncated ZIP directory');
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (!name.endsWith('/')) names.push(name);
    cursor = next;
  }
  assert(cursor === end, '[17030] unexpected ZIP directory content');
  return names.sort();
}

const inventoryMatch = read('rak-complete-backup.js').match(/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(inventoryMatch, '[17030] owner source inventory missing');
const inventory = JSON.parse('[' + inventoryMatch[1] + ']');
assert(Array.isArray(inventory) && inventory.length > 80 && inventory.length < 2000, '[17030] unexpected source inventory size');
const blockedDirs = new Set(['.git', 'node_modules', '.vercel', '.next', 'dist', 'coverage', '.cache']);
for (const name of inventory) {
  assert(typeof name === 'string' && name.length && !name.startsWith('/') && !name.includes('\\') && !name.split('/').some(part => !part || part === '..' || blockedDirs.has(part)), '[17030] unsafe repository path');
  const base = name.split('/').at(-1);
  assert(!/^\.env(?:\.|$)/i.test(base) && !/\.(?:pem|key|p12|pfx|zip|log)$/i.test(base) && !/^(?:id_rsa|id_ed25519)(?:\.|$)/i.test(base), '[17030] sensitive file listed for source archive');
}
const expected = inventory.slice().sort();
assert.deepEqual(expected, [...new Set(expected)], '[17030] duplicate file in archive manifest');
const original = fs.readFileSync(ARCHIVE);
const filtered = execFileSync('git', ['archive', '--format=zip', 'HEAD', '--', ...expected], {encoding: null, maxBuffer: 128 * 1024 * 1024});
assert.deepEqual(zipFiles(filtered), expected, '[17030] final archive must contain exactly approved files');
if (!original.equals(filtered)) fs.writeFileSync(ARCHIVE, filtered);
assert.deepEqual(zipFiles(fs.readFileSync(ARCHIVE)), expected, '[17030] deployed archive inventory mismatch');
console.log('[archive-privacy-17030] OK vetted source ZIP: ' + expected.length + ' files, no extra Git files');

change('tools/shift-report-mo-hotfix-170-smoke.mjs', source => {
  if (source.includes('// RAK_17030_TWO_PASS_GUARD')) return source;
  source = swap(source,
    'const already17029=indexSource.includes("var build=\'v1.7.29-accountprivacy1\';");',
    '// RAK_17030_TWO_PASS_GUARD\nconst already17030=indexSource.includes("var build=\'v1.7.30-archiveprivacy1\';");\nconst already17029=already17030||indexSource.includes("var build=\'v1.7.29-accountprivacy1\';");',
    'two-pass marker');
  return swap(source,
    'already17029?"var build=\'v1.7.29-accountprivacy1\';":already17028?',
    'already17030?"var build=\'v1.7.30-archiveprivacy1\';":already17029?"var build=\'v1.7.29-accountprivacy1\';":already17028?',
    'two-pass index reset');
});
change('supabase-config.js', source => {
  assert(source.includes('https://cgshssdjgzzuprlwnabl.supabase.co') && !source.includes('bkqamcbkiwumsvelahxr'), '[17030] test Supabase isolation');
  source = swap(source, 'window.RAK_RELEASE_VERSION = "1.7.29";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'release');
  source = swap(source, 'window.RAK_TEST_DISPLAY_VERSION = "1.7.29";', `window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`, 'display');
  return swap(source, 'window.RAK_PWA_BUILD = "v1.7.29-accountprivacy1";', `window.RAK_PWA_BUILD = "${BUILD}";`, 'PWA build');
});
change('app.js', source => {
  source = swap(source, 'const RAK_DEV_UPDATE_BUILD = "v1.7.29-accountprivacy1";', `const RAK_DEV_UPDATE_BUILD = "${BUILD}";`, 'update build');
  return swap(source, 'window.RAK_RELEASE_VERSION = "1.7.29";', `window.RAK_RELEASE_VERSION = "${VERSION}";`, 'app release');
});
change('sw.js', source => {
  assert(source.includes("const SW_APP_VERSION = '1.7.0';"), '[17030] technical version changed');
  source = swap(source, "const CACHE_VERSION = 'v1.7.29';", `const CACHE_VERSION = 'v${VERSION}';`, 'cache');
  source = swap(source, "const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.29';", `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`, 'worker display');
  return swap(source, "const DEVELOPMENT_BUILD_ID = 'v1.7.29-accountprivacy1';", `const DEVELOPMENT_BUILD_ID = '${BUILD}';`, 'worker build');
});
change('index.html', source => swap(source, "var build='v1.7.29-accountprivacy1';", `var build='${BUILD}';`, 'HTML build'));
assert.equal(JSON.parse(read('package.json')).version, '1.7.0', '[17030] technical package version');
for (const path of ['tools/shift-report-mo-hotfix-170-smoke.mjs', 'supabase-config.js', 'app.js', 'sw.js']) {
  execFileSync(process.execPath, ['--check', path], {stdio: 'pipe'});
}
assert(read('index.html').includes(`var build='${BUILD}';`) && read('sw.js').includes(`const CACHE_VERSION = 'v${VERSION}';`), '[17030] PWA version and cache mismatch');
console.log('[development-version-17030] OK 1.7.30: filtered owner source archive, matching inventory, aligned PWA/cache, test Supabase only');
