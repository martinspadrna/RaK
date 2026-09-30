import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertCurrentReleaseIdentity} from './release-metadata-test-helper.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('1.7.100 physical-iPhone regression milestone remains active in verified successors',()=>{
  const metadata=assertCurrentReleaseIdentity(read,'1.7.100');
  assert.equal(metadata.technicalVersion,metadata.displayVersion);
  assert.equal(metadata.moduleCacheVersion,metadata.displayVersion);
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert.equal(JSON.parse(read('package.json')).version,metadata.displayVersion);
  assert(read('index.html').includes('app.js?v='+metadata.displayVersion));
  const sw=read('sw.js');
  assert(sw.includes("importScripts('./rak-release-metadata.js?sw="+metadata.displayVersion+"');"));
  assert(sw.includes("const SW_RELEASE_CACHE_MARKER = 'v"+metadata.displayVersion+"';"));
});
test('physical iPhone regressions have concrete root-cause guards',()=>{
  const unit=read('tools/iphone-regressions-17100.test.mjs');
  const browser=read('tools/browser-iphone-regressions-17100.mjs');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/iphone-regressions-17100.test.mjs'));
  assert(unit.includes('visual viewport and repositions after keyboard/scroll changes'));
  assert(unit.includes('double-width name column'));
  assert(unit.includes('Brusy signed controls'));
  assert(unit.includes('Christmas grammar'));
  assert(unit.includes('exact login mascot assets'));
  assert(unit.includes('explicit right border'));
  assert(unit.includes('without reparsing it on iPhone'));
  assert(browser.includes('rotation picker detached from tapped field'));
  assert(browser.includes('Brusy sign controls hidden/crushed'));
});

test('complete backup preserves exact build-verified Git ZIP without nested JSZip parse',()=>{
  const app=read('rak-complete-backup.js');
  const integrity=read('tools/backup-source-integrity-17051.mjs');
  assert(app.includes('function validateExactSourceArchive(arrayBuffer)'));
  assert(app.includes("zip.file('repository/source-exact.zip', exactBytes, { binary: true, compression: 'STORE' })"));
  assert(!app.includes('window.JSZip.loadAsync(archiveData)'));
  assert(integrity.includes("execFileSync('unzip',['-tqq',ARCHIVE]"));
  assert(integrity.includes("assert.deepEqual(entries,expected"));
  assert(read('sw.js').includes("RAK_17100_BACKUP_SOURCE_POLICY = 'same-origin-build-verified-zip;embedded-exactly;no-client-reparse'"));
});

test('npm check retains 1.7.100 while CI runs the current successor gate',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/release-gate-17100.test.mjs'));
  assert(/node --test tools\/release-gate-1710[1-9]\.test\.mjs/.test(workflow));
});
