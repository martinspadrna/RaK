#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[complete-backup-ios-fix-1633-smoke] ' + message); };

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.vercel', '.next', 'dist', 'coverage', '.cache']);
function safeRepoPath(relative) {
  const value = String(relative || '').replace(/\\/g, '/');
  const base = path.posix.basename(value).toLowerCase();
  if (!value || value.startsWith('../')) return false;
  if (value.split('/').some((part) => EXCLUDED_DIRS.has(part))) return false;
  if (/^\.env(?:\.|$)/i.test(base)) return false;
  if (/\.(?:pem|key|p12|pfx|zip|log)$/i.test(base)) return false;
  if (/^(?:id_rsa|id_ed25519)(?:\.|$)/i.test(base)) return false;
  return true;
}
function trackedRepoFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  return output.split('\0').filter(Boolean).map((value) => value.replace(/\\/g, '/')).filter(safeRepoPath).sort();
}

const moduleJs = read('rak-complete-backup.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const archive = path.join(root, 'rak-complete-backup-source.zip');

assert(fs.existsSync(archive), 'same-origin source archive missing');
assert(fs.statSync(archive).size > 100000, 'same-origin source archive unexpectedly small');
assert(moduleJs.includes("const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = 'rak-complete-backup-source.zip';"), 'source archive marker missing');
assert(moduleJs.includes("new URL('/' + RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE"), 'same-origin source fetch missing');
assert(!moduleJs.includes('window.JSZip.loadAsync(archiveData)'), 'iOS must not reparse the nested Git ZIP');
assert(moduleJs.includes('function validateExactSourceArchive(arrayBuffer)'), 'native ZIP completeness guard missing');
assert(!moduleJs.includes('raw.githubusercontent.com'), 'raw GitHub fetch dependency remains');
assert(moduleJs.includes("zip.file('repository/source-exact.zip'"), 'exact source ZIP is not embedded into final backup');

const match = moduleJs.match(/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(match, 'repository inventory block missing');
let actual = [];
try { actual = JSON.parse('[' + match[1] + ']'); } catch (error) { throw new Error('[complete-backup-ios-fix-1633-smoke] repository inventory is not parseable: ' + error.message); }
actual = actual.slice().sort();
const expected = trackedRepoFiles();
assert(JSON.stringify(actual) === JSON.stringify(expected), 'repository inventory differs from Git-tracked files');
if (!expected.includes('package-lock.json')) assert(!actual.includes('package-lock.json'), 'untracked package-lock.json leaked into repository inventory');

assert(sw.includes("const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';"), 'iOS backup policy missing');
assert(sw.includes("const DEVELOPMENT_COMPLETE_BACKUP_INVENTORY_POLICY = 'git-tracked-only;archive-inventory-aligned';"), 'Git inventory policy missing');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.34';"), 'SW visible version mismatch');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.34-backup3';"), 'SW build id mismatch');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.34";'), 'release version mismatch');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.6.34";'), 'test display version mismatch');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.34-backup3";'), 'PWA build mismatch');

console.log('[complete-backup-ios-fix-1633-smoke] OK source ZIP is build-verified, fetched same-origin and embedded without client-side reparse; tracked=' + expected.length + '; version 1.6.34');
