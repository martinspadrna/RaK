import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const nav = read('app-bottom-nav.js');
const menu = read('app-menu.js');
const metadata = read('rak-release-metadata.js');
const version = JSON.parse(read('package.json')).version;
const patch = Number(String(version).split('.').at(-1) || 0);

assert(patch >= 129, '1.7.129 local-menu milestone must remain active in successors');
assert(metadata.includes("displayVersion: '" + version + "'"));
assert(read('CHANGELOG.md').includes('## RaK 1.7.129 (development)'));

assert.match(nav, /function rakEarlyMenuLocalRootHtml\(\)/, 'early menu needs a local root renderer');
for (const label of ['Nastavení','O aplikaci','Kontakt','Pošli mi chybu']) {
  assert(nav.includes(label), 'early local menu missing ' + label);
}
assert.match(nav, /page\.dataset\.rakEarlyMenuShell = '1';[\s\S]*rakPopulateEarlyMenuLocalRoot\(page\);/, 'existing menu page must always be populated before lazy feature load');
assert.match(nav, /window\.rakEnsureFeature\('menu'\)/, 'early menu may lazy-load only the local menu feature');
assert.doesNotMatch(nav, /rakEnsureFeature\('sync'\)/, 'early menu must not wait for sync');
const earlyRenderer = nav.slice(nav.indexOf('function rakEarlyMenuLocalRootHtml'), nav.indexOf('function rakPopulateEarlyMenuLocalRoot'));
assert.doesNotMatch(earlyRenderer, /Administrace|Report dovolené|Report směny|data-menu-action="admin"/, 'privileged entries must never appear in the unverified early shell');

assert.match(menu, /function appMenuShouldShowAdminEntry\(\)[\s\S]*rakAdminCanOpenShiftReport/, 'full menu must keep secure role gating');
assert.match(menu, /const verifiedRole = appMenuShouldShowAdminEntry\(\);/, 'privileged root must still depend on verified role');

console.log('menu-local-shell-17129: PASS');
