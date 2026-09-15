#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[complete-backup-ios-fix-1633-smoke] ' + message); };

const moduleJs = read('rak-complete-backup.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const archive = path.join(root, 'rak-complete-backup-source.zip');

assert(fs.existsSync(archive), 'same-origin source archive missing');
assert(fs.statSync(archive).size > 100000, 'same-origin source archive unexpectedly small');
assert(moduleJs.includes("const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = 'rak-complete-backup-source.zip';"), 'source archive marker missing');
assert(moduleJs.includes("new URL('/' + RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE"), 'same-origin source fetch missing');
assert(moduleJs.includes('window.JSZip.loadAsync(archiveData)'), 'source archive is not expanded into final ZIP');
assert(!moduleJs.includes('raw.githubusercontent.com'), 'raw GitHub fetch dependency remains');
assert(moduleJs.includes("zip.file('repository/' + path"), 'repository folder restore contract missing');
assert(sw.includes("const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';"), '1.6.33 policy missing');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.33';"), 'SW visible version mismatch');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.33-backup2';"), 'SW build id mismatch');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.33";'), 'release version mismatch');
assert(config.includes('window.RAK_TEST_DISPLAY_VERSION = "1.6.33";'), 'test display version mismatch');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.33-backup2";'), 'PWA build mismatch');

console.log('[complete-backup-ios-fix-1633-smoke] OK one-click backup uses one same-origin source archive; raw GitHub fan-out removed; version 1.6.33');
