#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[export-preflight-hotfix-1631-smoke] ' + message); };

const exportJs = read('export.js');
const lazy = read('rak-lazy-external-libs.js');
const sw = read('sw.js');
const config = read('supabase-config.js');
const stale = ['app-usage-smoke-v963.js', 'styles-overrides.css', 'assets/docs/sql/supabase_app_usage_v963.sql'];
for (const item of stale) {
  const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(!new RegExp('^[ \\t]*"' + escaped + '"(?:\\s*:|\\s*,)', 'm').test(exportJs), 'export manifest still contains ' + item);
  assert(lazy.includes("'" + item + "'"), 'runtime stale-path cleanup missing ' + item);
}
assert(sw.includes("'./export.js?v=1.6.0'"), 'SW does not invalidate cached export.js');
assert(sw.includes("'./rak-lazy-external-libs.js?v=1.6.0'"), 'SW does not invalidate cached lazy export helper');
assert(sw.includes("const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.6.31';"), 'SW display version is not 1.6.31');
assert(sw.includes("const DEVELOPMENT_BUILD_ID = '1.6.31-export1';"), 'SW build ID is not 1.6.31-export1');
assert(config.includes('window.RAK_RELEASE_VERSION = "1.6.31";'), 'config release version is not 1.6.31');
assert(config.includes('window.RAK_PWA_BUILD = "v1.6.31-export1";'), 'config PWA build is not 1.6.31-export1');
console.log('[export-preflight-hotfix-1631-smoke] OK three stale export paths absent; cache refresh + runtime fallback locked');
