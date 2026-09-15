#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISPLAY_VERSION = '1.6.31';
const BUILD_ID = '1.6.31-export1';
const PREV_POLICY = "const DEVELOPMENT_FULL_APP_AUDIT_POLICY = 'export-manifest-current;diagnostics-no-games;keepalive-rpc-only;security-smoke-executed';";
const POLICY = "const DEVELOPMENT_EXPORT_PREFLIGHT_POLICY = 'stale-usage-css-sql-removed;runtime-cleanup;same-version-cache-refresh';";
const STALE_PATHS = [
  'app-usage-smoke-v963.js',
  'styles-overrides.css',
  'assets/docs/sql/supabase_app_usage_v963.sql'
];

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, source) { fs.writeFileSync(path.join(root, file), source, 'utf8'); }
function assert(condition, message) {
  if (!condition) throw new Error('[export-preflight-hotfix-1631] ' + message);
}

let exportJs = read('export.js');
let lazy = read('rak-lazy-external-libs.js');
let sw = read('sw.js');
let config = read('supabase-config.js');
let changelog = read('CHANGELOG.md');

// Defense 1: final build manifest must never request these removed historical files.
for (const stalePath of STALE_PATHS) {
  const escaped = stalePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  exportJs = exportJs.replace(new RegExp('^\\s*"' + escaped + '"\\s*:\\s*"[^"]+",?\\s*\\n?', 'gm'), '');
  exportJs = exportJs.replace(new RegExp('^\\s*"' + escaped + '"\\s*,?\\s*\\n?', 'gm'), '');
}

// Defense 2: even if iOS still executes a cached older export.js, the fresh lazy helper removes the stale paths at runtime.
for (const stalePath of STALE_PATHS) {
  if (!lazy.includes("    '" + stalePath + "',")) {
    const anchor = "    'assets/rak-memory-total-time-fix.js'";
    assert(lazy.includes(anchor), 'lazy export cleanup anchor missing');
    lazy = lazy.replace(anchor, "    '" + stalePath + "',\n" + anchor);
  }
}

// Defense 3: keep the historical About hotfix list byte-for-byte for old guards,
// but add a separate export hotfix list and include it in same-version cache deletion.
const sameVersionMarker = "const SAME_VERSION_HOTFIX_ASSETS = ['./app-menu-pages.js?v=1.6.0'];";
const exportHotfixMarker = "const DEVELOPMENT_EXPORT_HOTFIX_ASSETS = ['./export.js?v=1.6.0', './rak-lazy-external-libs.js?v=1.6.0'];";
assert(sw.includes(sameVersionMarker), 'same-version About hotfix marker missing');
if (!sw.includes(exportHotfixMarker)) {
  sw = sw.replace(sameVersionMarker, sameVersionMarker + '\n' + exportHotfixMarker);
}
if (!/const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\([^;]*DEVELOPMENT_EXPORT_HOTFIX_ASSETS[^;]*\);/.test(sw)) {
  const concatRe = /const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\(([^)]*)\);/;
  const match = sw.match(concatRe);
  assert(match, 'same-version hotfix cache deletion concat missing');
  const existingArgs = String(match[1] || '').trim();
  const nextArgs = existingArgs ? existingArgs + ', DEVELOPMENT_EXPORT_HOTFIX_ASSETS' : 'DEVELOPMENT_EXPORT_HOTFIX_ASSETS';
  sw = sw.replace(concatRe, 'const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS.concat(' + nextArgs + ');');
}

assert(sw.includes(PREV_POLICY), 'RaK 1.6.30 audit policy missing');
if (!sw.includes(POLICY)) sw = sw.replace(PREV_POLICY, PREV_POLICY + '\n' + POLICY);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

if (!/^## RaK 1\.6\.31$/m.test(changelog)) {
  changelog = `## RaK 1.6.31\n\n- ZIP export: odstraněny tři historické cesty, které už v aplikaci neexistují: app-usage-smoke-v963.js, styles-overrides.css a assets/docs/sql/supabase_app_usage_v963.sql.\n- iOS/PWA: export.js a rak-lazy-external-libs.js se při této stejné technické verzi explicitně vyřadí ze staré cache a načtou z aktuálního buildu.\n- Runtime pojistka: i kdyby se starý export manifest přesto objevil, lazy export cleanup tyto tři cesty odstraní před preflightem.\n\n` + changelog;
}

for (const stalePath of STALE_PATHS) {
  assert(!new RegExp('^[ \\t]*"' + stalePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"(?:\\s*:|\\s*,)', 'm').test(exportJs), 'stale path remains in export manifest: ' + stalePath);
  assert(lazy.includes("'" + stalePath + "'"), 'runtime cleanup missing stale path: ' + stalePath);
}
assert(sw.includes(exportHotfixMarker), 'export hotfix asset list missing');
assert(/const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\([^;]*DEVELOPMENT_EXPORT_HOTFIX_ASSETS[^;]*\);/.test(sw), 'export hotfix assets are not wired into same-version cache deletion');
assert(sw.includes("const CACHE_VERSION = 'v1.6.0';"), 'stable PWA cache version changed unexpectedly');
assert(sw.includes(POLICY), '1.6.31 export preflight policy missing');

write('export.js', exportJs);
write('rak-lazy-external-libs.js', lazy);
write('sw.js', sw);
write('supabase-config.js', config);
write('CHANGELOG.md', changelog);

console.log('[export-preflight-hotfix-1631] OK RaK 1.6.31: stale export paths removed + runtime cleanup + same-version PWA cache refresh.');
