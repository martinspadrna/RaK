#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISPLAY_VERSION = '1.6.32';
const BUILD_ID = '1.6.32-backup1';
const POLICY = "const DEVELOPMENT_COMPLETE_BACKUP_POLICY = 'owner-only-rpc;repo-sha-snapshot;deployed-runtime;sanitized-auth;schema-rls-rpc;storage-bytes';";
const HOTFIX = "const DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS = ['./app.js?v=1.5.1', './app-menu-admin-renderer.js?v=1.6.0', './rak-complete-backup.js?v=1.6.0'];";

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, source) => fs.writeFileSync(path.join(root, file), source, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[complete-backup-1632] ' + message); };

function gitSha() {
  const env = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  if (/^[0-9a-f]{40}$/i.test(env)) return env;
  try {
    const value = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(value)) return value;
  } catch (_) {}
  throw new Error('[complete-backup-1632] exact Git SHA unavailable');
}

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.vercel', '.next', 'dist', 'coverage', '.cache']);
function safeRepoPath(relative) {
  const value = relative.replace(/\\/g, '/');
  const base = path.posix.basename(value).toLowerCase();
  if (!value || value.startsWith('../')) return false;
  if (value.split('/').some((part) => EXCLUDED_DIRS.has(part))) return false;
  if (/^\.env(?:\.|$)/i.test(base)) return false;
  if (/\.(?:pem|key|p12|pfx|zip|log)$/i.test(base)) return false;
  if (/^(?:id_rsa|id_ed25519)(?:\.|$)/i.test(base)) return false;
  return true;
}

function walk(dir, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (!safeRepoPath(relative)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function appendExportJsFile(source, file) {
  const re = /var EXPORT_JS_FILES = \[([\s\S]*?)\n\];/;
  const match = source.match(re);
  assert(match, 'EXPORT_JS_FILES block missing');
  if (match[1].includes('"' + file + '"')) return source;
  let body = match[1].replace(/\s+$/, '');
  if (body.trim() && !body.trim().endsWith(',')) body += ',';
  body += '\n  "' + file + '",';
  return source.replace(re, 'var EXPORT_JS_FILES = [' + body + '\n];');
}

const sha = gitSha();
const repoFiles = walk(root).sort();
assert(repoFiles.length > 80, 'repository inventory unexpectedly small: ' + repoFiles.length);
assert(repoFiles.includes('rak-complete-backup.js'), 'complete backup module missing from repository inventory');
assert(repoFiles.includes('supabase/history/non-production-migrations/20260915133113_rak_owner_complete_backup_v1.sql'), 'complete backup migration missing from repository inventory');

let moduleJs = read('rak-complete-backup.js');
const fileLines = repoFiles.map((file) => '    ' + JSON.stringify(file)).join(',\n');
moduleJs = moduleJs.replace(/const RAK_COMPLETE_BACKUP_BUILD_SHA = '[^']*';/, "const RAK_COMPLETE_BACKUP_BUILD_SHA = '" + sha + "';");
moduleJs = moduleJs.replace(/const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[[\s\S]*?\]\);/, 'const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([\n' + fileLines + '\n  ]);');
assert(!moduleJs.includes('__RAK_COMPLETE_BACKUP_BUILD_SHA__'), 'Git SHA placeholder remains');
assert(!moduleJs.includes('/* RAK_COMPLETE_BACKUP_REPO_FILES */'), 'repository inventory placeholder remains');

let app = read('app.js');
const adminAnchor = '    "app-excel-import.js",\n    "rak-lazy-external-libs.js"\n  ];';
if (!app.includes('    "app-excel-import.js",\n    "rak-lazy-external-libs.js",\n    "rak-complete-backup.js"\n  ];')) {
  assert(app.includes(adminAnchor), 'admin feature anchor missing');
  app = app.replace(adminAnchor, '    "app-excel-import.js",\n    "rak-lazy-external-libs.js",\n    "rak-complete-backup.js"\n  ];');
}
const deferredAnchor = '    "app-excel-import.js",\n    "rak-lazy-external-libs.js",\n    "app-rotation-controls.js",';
if (!app.includes('    "rak-lazy-external-libs.js",\n    "rak-complete-backup.js",\n    "app-rotation-controls.js",')) {
  assert(app.includes(deferredAnchor), 'deferred feature anchor missing');
  app = app.replace(deferredAnchor, '    "app-excel-import.js",\n    "rak-lazy-external-libs.js",\n    "rak-complete-backup.js",\n    "app-rotation-controls.js",');
}
assert(count(app, '"rak-complete-backup.js"') === 2, 'complete backup module must be present exactly in admin + deferred inventories');

let renderer = read('app-menu-admin-renderer.js');
if (!renderer.includes('adminCompleteRakBackupPanel')) {
  const anchor = '    buildAdminFullSettingsBackupStatusHtml(),';
  assert(renderer.includes(anchor), 'settings backup renderer anchor missing');
  const panel = [
    '    \'<div class="appMenuCard adminCompleteRakBackupPanel">\',',
    '    \'  <div class="appMenuCardTitle">Úplná záloha RaK</div>\',',
    '    \'  <div class="appMenuText"><div>Jeden ZIP pro obnovu celé aplikace: přesný Git zdroj, skutečně nasazená PWA, aktuální data Supabase, DB struktura/RLS/RPC a Storage.</div><div class="smallText">Hesla, aktivní relace a tajné klíče se z bezpečnostních důvodů nezahrnují. Při obnově se vytvoří znovu.</div><div class="smallText" id="adminCompleteBackupStatus">Připraveno k vytvoření úplné zálohy.</div></div>\',',
    '    \'  <div class="appMenuActionRow"><button type="button" class="appMenuAction isActive" data-admin-action="create-complete-rak-backup">Stáhnout úplnou zálohu RaK (.zip)</button></div>\',',
    '    \'</div>\',',
    anchor
  ].join('\n');
  renderer = renderer.replace(anchor, panel);
}

let exportJs = read('export.js');
if (!exportJs.includes('"rak-complete-backup.js": "src-rak-complete-backup-js"')) {
  const marker = '\n};\n\nvar SOURCE_CACHE';
  assert(exportJs.includes(marker), 'EXPORT_SOURCE_IDS closing marker missing');
  exportJs = exportJs.replace(marker, ',\n  "rak-complete-backup.js": "src-rak-complete-backup-js"\n};\n\nvar SOURCE_CACHE');
}
exportJs = appendExportJsFile(exportJs, 'rak-complete-backup.js');

let sw = read('sw.js');
const exportHotfix = "const DEVELOPMENT_EXPORT_HOTFIX_ASSETS = ['./export.js?v=1.6.0', './rak-lazy-external-libs.js?v=1.6.0'];";
assert(sw.includes(exportHotfix), '1.6.31 export hotfix marker missing');
if (!sw.includes(HOTFIX)) sw = sw.replace(exportHotfix, exportHotfix + '\n' + HOTFIX);
if (!/const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\([^;]*DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS[^;]*\);/.test(sw)) {
  const re = /const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS\.concat\(([^)]*)\);/;
  const match = sw.match(re);
  assert(match, 'same-version hotfix concat missing');
  const args = String(match[1] || '').trim();
  sw = sw.replace(re, 'const hotfixAssets = SAME_VERSION_HOTFIX_ASSETS.concat(' + (args ? args + ', ' : '') + 'DEVELOPMENT_COMPLETE_BACKUP_HOTFIX_ASSETS);');
}
const previousPolicy = "const DEVELOPMENT_EXPORT_PREFLIGHT_POLICY = 'stale-usage-css-sql-removed;runtime-cleanup;same-version-cache-refresh';";
assert(sw.includes(previousPolicy), '1.6.31 policy marker missing');
if (!sw.includes(POLICY)) sw = sw.replace(previousPolicy, previousPolicy + '\n' + POLICY);
sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

let config = read('supabase-config.js');
config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);

let changelog = read('CHANGELOG.md');
if (!/^## RaK 1\.6\.32$/m.test(changelog)) {
  changelog = `## RaK 1.6.32\n\n- Administrace / Zálohy nastavení: přidána „Úplná záloha RaK“ na jeden klik.\n- ZIP obsahuje přesný zdrojový snapshot GitHubu pro aktuální SHA, skutečně nasazenou PWA, všechna aktuální aplikační data Supabase, sanitizovaný Auth přehled, DB strukturu/RLS/RPC/granty/triggery/extensions a Storage metadata i fyzické soubory.\n- Bezpečnost: databázový snapshot je owner-only RPC; anonymní role nemá EXECUTE. Aktivní session tokeny, heslové hashe a tajné Supabase/Vercel klíče se do ZIPu záměrně neukládají.\n- Součástí ZIPu je README-OBNOVA.txt a backup-manifest.json s přesným SHA a kontrolními počty.\n\n` + changelog;
}

write('rak-complete-backup.js', moduleJs);
write('app.js', app);
write('app-menu-admin-renderer.js', renderer);
write('export.js', exportJs);
write('sw.js', sw);
write('supabase-config.js', config);
write('CHANGELOG.md', changelog);

console.log('[complete-backup-1632] OK RaK 1.6.32: owner-only DB snapshot + exact repo SHA + deployed runtime + storage + restore manifest; repo files=' + repoFiles.length + '; sha=' + sha);
