#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = String(process.argv[2] || '').trim();
const DISPLAY_VERSION = '1.6.34';
const BUILD_ID = '1.6.34-backup3';
const SOURCE_ARCHIVE = 'rak-complete-backup-source.zip';
const SOURCE_ARCHIVE_PATH = path.join(root, SOURCE_ARCHIVE);
const POLICY = "const DEVELOPMENT_COMPLETE_BACKUP_IOS_POLICY = 'single-same-origin-source-archive;no-raw-github-fetch;expanded-repository-folder';";
const INVENTORY_POLICY = "const DEVELOPMENT_COMPLETE_BACKUP_INVENTORY_POLICY = 'git-tracked-only;archive-inventory-aligned';";

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, source) => fs.writeFileSync(path.join(root, file), source, 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error('[complete-backup-ios-fix-1633] ' + message); };

function gitSha() {
  const env = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  if (/^[0-9a-f]{40}$/i.test(env)) return env;
  const value = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert(/^[0-9a-f]{40}$/i.test(value), 'exact Git SHA unavailable');
  return value;
}

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

function prepare() {
  const archive = execFileSync('git', ['archive', '--format=zip', 'HEAD'], {
    cwd: root,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024
  });
  assert(Buffer.isBuffer(archive) && archive.length > 100000, 'git source archive unexpectedly small');
  fs.writeFileSync(SOURCE_ARCHIVE_PATH, archive);
  console.log('[complete-backup-ios-fix-1633] prepared exact same-origin source archive ' + SOURCE_ARCHIVE + ' · ' + archive.length + ' B · sha=' + gitSha());
}

function finalize() {
  assert(fs.existsSync(SOURCE_ARCHIVE_PATH), 'prepared source archive missing');
  const archiveSize = fs.statSync(SOURCE_ARCHIVE_PATH).size;
  assert(archiveSize > 100000, 'prepared source archive unexpectedly small');

  let moduleJs = read('rak-complete-backup.js');
  const sha = gitSha();
  assert(moduleJs.includes("const RAK_COMPLETE_BACKUP_BUILD_SHA = '" + sha + "';"), '1.6.32 exact build SHA marker missing');

  const trackedFiles = trackedRepoFiles();
  assert(trackedFiles.length > 80, 'tracked repository inventory unexpectedly small: ' + trackedFiles.length);
  assert(trackedFiles.includes('rak-complete-backup.js'), 'complete backup module missing from tracked inventory');
  const inventoryRe = /const RAK_COMPLETE_BACKUP_REPO_FILES = Object\.freeze\(\[[\s\S]*?\]\);/;
  assert(inventoryRe.test(moduleJs), 'repository inventory block missing');
  const fileLines = trackedFiles.map((file) => '    ' + JSON.stringify(file)).join(',\n');
  moduleJs = moduleJs.replace(inventoryRe, 'const RAK_COMPLETE_BACKUP_REPO_FILES = Object.freeze([\n' + fileLines + '\n  ]);');

  if (!moduleJs.includes("const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = '" + SOURCE_ARCHIVE + "';")) {
    moduleJs = moduleJs.replace(
      /const RAK_COMPLETE_BACKUP_BUILD_SHA = '[^']+';/,
      (match) => match + "\n  const RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE = '" + SOURCE_ARCHIVE + "';"
    );
  }

  moduleJs = moduleJs.replace(/\n  function rawRepoUrl\(path\) \{[\s\S]*?\n  \}\n\n  async function fetchArrayBuffer/, '\n  async function fetchArrayBuffer');

  const repoFn = `  async function addRepositorySnapshot(zip, progress) {
    if (!/^[0-9a-f]{40}$/i.test(RAK_COMPLETE_BACKUP_BUILD_SHA)) throw new Error('Chybí přesný Git SHA tohoto buildu.');
    const expected = Array.from(RAK_COMPLETE_BACKUP_REPO_FILES || []);
    if (!expected.length) throw new Error('Build neobsahuje seznam souborů repozitáře.');
    progress('Načítám lokální zdrojový archiv…');
    const archiveUrl = new URL('/' + RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE + '?v=' + encodeURIComponent(RAK_COMPLETE_BACKUP_BUILD_SHA), window.location.origin).toString();
    const archiveData = await fetchArrayBuffer(archiveUrl, 'lokálního zdrojového archivu');
    const sourceZip = await window.JSZip.loadAsync(archiveData);
    const missing = expected.filter((path) => !sourceZip.files[path] || sourceZip.files[path].dir);
    if (missing.length) throw new Error('Zdrojový archiv není kompletní. Chybí: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? '…' : ''));
    let done = 0;
    for (const path of expected) {
      const data = await sourceZip.files[path].async('uint8array');
      zip.file('repository/' + path, data, { binary: true });
      done += 1;
      if (done === expected.length || done % 15 === 0) progress('Zdrojové soubory: ' + done + '/' + expected.length);
    }
    return expected.length;
  }
`;

  const repoFnRe = /  async function addRepositorySnapshot\(zip, progress\) \{[\s\S]*?\n  \}\n\n  function deployedFileInventory/;
  assert(repoFnRe.test(moduleJs), 'repository snapshot function anchor missing');
  moduleJs = moduleJs.replace(repoFnRe, repoFn + '\n  function deployedFileInventory');
  assert(!moduleJs.includes('raw.githubusercontent.com'), 'raw GitHub dependency still present');
  assert(moduleJs.includes("new URL('/' + RAK_COMPLETE_BACKUP_SOURCE_ARCHIVE"), 'same-origin archive URL missing');
  assert(moduleJs.includes('window.JSZip.loadAsync(archiveData)'), 'source archive expansion missing');
  write('rak-complete-backup.js', moduleJs);

  let sw = read('sw.js');
  const prevPolicy = "const DEVELOPMENT_COMPLETE_BACKUP_POLICY = 'owner-only-rpc;repo-sha-snapshot;deployed-runtime;sanitized-auth;schema-rls-rpc;storage-bytes';";
  assert(sw.includes(prevPolicy), '1.6.32 backup policy missing');
  if (!sw.includes(POLICY)) sw = sw.replace(prevPolicy, prevPolicy + '\n' + POLICY);
  if (!sw.includes(INVENTORY_POLICY)) sw = sw.replace(POLICY, POLICY + '\n' + INVENTORY_POLICY);
  sw = sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m, `const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
  sw = sw.replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m, `const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);
  write('sw.js', sw);

  let config = read('supabase-config.js');
  config = config.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m, `window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
  config = config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m, `window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
  config = config.replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m, `window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
  write('supabase-config.js', config);

  let changelog = read('CHANGELOG.md');
  if (!/^## RaK 1\.6\.33$/m.test(changelog)) {
    changelog = `## RaK 1.6.33\n\n- Úplná záloha / iPhone: odstraněno 229 samostatných požadavků na raw.githubusercontent.com, které mohly v Safari skončit jen chybou „Load failed“.\n- Vercel při buildu vytvoří jeden přesný Git ZIP pro aktuální commit. iPhone ho stáhne jedním same-origin požadavkem z RaK a uvnitř výsledné zálohy ho znovu rozbalí do repository/.\n- Obsah úplné zálohy zůstává stejný: přesný zdroj, nasazená PWA, Supabase data/struktura/Auth metadata/Storage a obnovovací manifest; tajné klíče zůstávají redigované.\n\n` + changelog;
  }
  if (!/^## RaK 1\.6\.34$/m.test(changelog)) {
    changelog = `## RaK 1.6.34\n\n- Úplná záloha: očekávaný seznam zdrojových souborů se nově bere přímo z Git indexu (git ls-files), tedy ze stejného zdroje jako git archive.\n- Opraven případ, kdy npm/Vercel vytvořil během buildu neversionovaný package-lock.json; ten se dříve dostal do kontrolního seznamu, ale správně nebyl ve zdrojovém archivu.\n- Kontrola nyní porovnává celý inventory proti Git-tracked souborům, takže build artefakty už nemohou způsobit falešné „Zdrojový archiv není kompletní“.\n\n` + changelog;
  }
  write('CHANGELOG.md', changelog);

  console.log('[complete-backup-ios-fix-1633] OK RaK 1.6.34: one same-origin source archive + Git-tracked inventory; archive=' + archiveSize + ' B; tracked=' + trackedFiles.length + '; sha=' + sha);
}

if (mode === 'prepare') prepare();
else if (mode === 'finalize') finalize();
else throw new Error('[complete-backup-ios-fix-1633] use prepare or finalize');
