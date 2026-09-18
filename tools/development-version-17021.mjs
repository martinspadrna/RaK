#!/usr/bin/env node
// RaK 1.7.21: remove retired Games UI without changing real user accounts or appearance storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.21', BUILD='v1.7.21-gamescleanup1';
const MARK='// RAK_NO_RETIRED_GAMES_17021';
const read=p=>fs.readFileSync(p,'utf8');
const put=(p,text)=>fs.writeFileSync(p,text,'utf8');
function change(text,from,to,tag){if(to && text.includes(to))return text;assert(text.includes(from),'[17021] missing '+tag);return text.replace(from,to);}
function update(file,fn){const before=read(file),after=fn(before);if(before!==after)put(file,after);return after;}
// Employee bug reports use the actual logged-in account, never the removed game profile.
update('app-menu-bug-report.js',s=>{
 if(s.includes(MARK))return s;
 const begin=s.indexOf('function getBugReportAccount() {'),end=s.indexOf('function getBugReportBuildVersion() {',begin);
 assert(begin>=0&&end>begin,'bug report identity boundaries');
 s=s.slice(0,begin)+`${MARK}
function getBugReportAccount() {
  try {
    const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
    const current = typeof app !== 'undefined' && app ? app : null;
    const id = String(profile && profile.accountNumber || current && current.activeAccountId || '').trim();
    const name = String(profile && profile.fullName || current && current.activeAccountName || '').trim();
    return id && name ? { id, name } : null;
  } catch (err) { return null; }
}

`+s.slice(end);
 s=change(s,"    game: String((typeof app !== 'undefined' && app.activeGameShell) || ''),\n",'', 'game telemetry field');
 s=change(s,"    'Stránka: ' + String(report.page || '—') + (report.game ? ' · hra: ' + report.game : ''),","    'Stránka: ' + String(report.page || '—'),",'game report text');
 s=change(s,"account.name || account.id || 'Hráč'","account.name || account.id || 'Uživatel'",'report account label');
 s=s.replaceAll('Nejdřív se přihlas v herním profilu.','Nejdřív se přihlas do RaK.');
 s=change(s,"    '    <option>Hra</option>',\n",'', 'obsolete report option');
 assert(!/herním profilu|<option>Hra<\/option>|report\.game|activeGameShell/.test(s),'old game report UI remains');
 return s;
});
// Manual sync still updates rotation, profile appearance, live data and PWA, not old leaderboards.
update('dashboard.js',s=>{
 if(s.includes(MARK))return s;
 const tooltip='Kliknutím vynutíš synchronizaci rozpisu, herních statistik a kontrolu aktualizace.';
 assert(s.split(tooltip).length===3,'two dashboard tooltip anchors');
 s=s.replaceAll(tooltip,'Kliknutím vynutíš synchronizaci rozpisu, vzhledu profilu a kontrolu aktualizace.');
 s=change(s,"    await step('herni-profily', () => typeof gamesSyncProfileFromRemote === 'function' ? gamesSyncProfileFromRemote(true) : null);\n",'','old profile sync');
 s=change(s,"      const active = typeof gamesGetActiveAccount === 'function' ? gamesGetActiveAccount() : null;\n      if (active && typeof loadActiveAccountUiRemoteSettings === 'function') return loadActiveAccountUiRemoteSettings(active.id);",
`      const profile = typeof window.rakUserProfileGet === 'function' ? window.rakUserProfileGet() : null;
      const id = String(profile && profile.accountNumber || (typeof app !== 'undefined' && app && app.activeAccountId) || '').trim();
      if (id && typeof loadActiveAccountUiRemoteSettings === 'function') return loadActiveAccountUiRemoteSettings(id);`,'appearance sync account');
 s=change(s,"    await step('herni-statistiky', () => typeof gamesRefreshRemoteLeaderboards === 'function' ? gamesRefreshRemoteLeaderboards(true) : null);\n",'','old leaderboard sync');
 return MARK+'\n'+s;
});
// Native RaK profile is the only settings card. About history no longer lists removed features.
update('app-menu-pages.js',s=>{
 if(s.includes(MARK))return s;
 s=change(s,'Aplikace se dál rozdělila do menších modulů, odstranily se Hry a řada starých oprav a duplicit, takže je snazší ji bezpečně udržovat.','Aplikace se rozdělila do menších modulů, odstranily se nepoužívané části a duplicity, takže se snáze a bezpečněji udržuje.','About 1.6');
 s=change(s,'V této řadě vznikaly také Hry a online profily; později byly z RaK odstraněny, aby aplikace zůstala pracovně zaměřená.','Vznikly základy přihlášení, osobního nastavení vzhledu a dalších pracovních online funkcí.','About 1.1');
 s=change(s,'const profileCard = buildGamesProfileSettingsHtml();','const profileCard = buildRakProfileSettingsHtml();','native profile card');
 s=change(s,"      if (typeof gamesRenderAccountChips === 'function') {\n        try { gamesRenderAccountChips(); } catch (err) {}\n      }\n      if (typeof renderGamesProfileStatus === 'function') {\n        try { renderGamesProfileStatus(); } catch (err) {}\n      }\n",'', 'obsolete account chips');
 return MARK+'\n'+s;
});
// Remove old duplicate game login forms and XP/rank overlays; current profile is in app-menu-profile.js.
update('ui.js',s=>{
 if(s.includes(MARK))return s;
 const begin=s.indexOf('function buildGamesProfileSettingsHtml() {');
 const end=s.indexOf('function readSupabaseKeepaliveStatusForUi() {',begin);
 assert(begin>=0&&end>begin,'obsolete rank/profile UI boundaries');
 s=s.slice(0,begin)+MARK+'\n// Current profile UI lives in app-menu-profile.js.\n\n'+s.slice(end);
 const histStart=s.indexOf('function buildAppHistoryHtml(versionText) {');
 const histEnd=s.indexOf('// RaK 1.2 (1.155) – Administrace / Rozpisy',histStart);
 assert(histStart>=0&&histEnd>histStart,'legacy About boundaries');
 let hist=s.slice(histStart,histEnd);
 assert(hist.includes('  return [')&&hist.includes('sections.map(section => ['),'legacy history render anchors');
 hist=hist.replace('  return [',`  const workSections = sections.filter(section => !/(?:hry|herní|piškvorky|online hry)/i.test(section.title || ''))
    .map(section => ({...section,lines:(section.lines || []).filter(line => !/(?:hry|herní|piškvorky|top score|achievement|leaderboard|hráčsk|lodě online)/i.test(line))}));
  return [`);
 hist=hist.replace('sections.map(section => [','workSections.map(section => [');
 return s.slice(0,histStart)+hist+s.slice(histEnd);
});
update('app-bottom-nav.js',s=>change(s,"    games: () => { openGamesPage(); },\n",'', 'dead bottom nav route'));
update('app-actions.js',s=>change(s,"    'open-game': (el) => {\n      const gameId = String(el.dataset.game || '').trim();\n      if (gameId) openGameShell(gameId);\n    },\n",'', 'dead game action'));
// The removed game page, stylesheet and button must not be required by health audits.
update('app-health-audits.js',s=>{
 s=change(s,"    '#dashJidelna',\n    '#games'","    '#dashJidelna'",'phase-one page list');
 s=change(s,"    'styles-games.css',\n",'', 'deleted stylesheet requirement');
 s=change(s,"const requiredNavActions = ['home', 'rotace', 'kalkulacky', 'games', 'menu'];","const requiredNavActions = ['home', 'rotace', 'kalkulacky', 'menu'];",'audit nav list');
 return s;
});
update('app-postload-audits.js',s=>{
 s=change(s,"  try { runPhaseFiveGamePerformanceAudit(); } catch (err) { console.warn('Phase 5 game performance audit failed', err); }\n",'', 'game performance audit');
 s=change(s,"  try { runGameEngineBaselineAudit(); } catch (err) { console.warn('Game engine baseline audit failed', err); }\n",'', 'game engine audit');
 return s;
});
// Diagnostic UI must not suggest old game smoke/leaderboard checks are still relevant.
update('app-menu.js',s=>{
 if(s.includes(MARK))return s;
 s=change(s,"' · nových herních profilů: ' + createdCount","' · nových účtů pracovníků: ' + createdCount",'worker saved status');
 const old="        ].join('\\n');\n        body.innerHTML = [\n          '<div class=\"appMenuCard appMenuDiagnosticsCard\">',";
 const filter=".filter(line => !/(?:herní|herni|piškvorky|lodě|online hry|top.?score|leaderboard|game[_ -]|gameengine|battleship|ttt|herních profilů|session\\/pozvánky|RPC pokrytí|herní cache)/i.test(String(line)))";
 const next="        ]"+filter+".join('\\n');\n        body.innerHTML = [\n          '<div class=\"appMenuCard appMenuDiagnosticsCard\">',";
 assert(s.includes(old),'diagnostics output anchor');
 return MARK+'\n'+s.replace(old,next);
});
// Release labels and cache, still using the separate test Supabase and technical version 1.7.0.
update('supabase-config.js',s=>{
 assert(s.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!s.includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
 return s.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`)
 .replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`)
 .replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`);
});
update('app.js',s=>s.replace(/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`).replace(/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`));
update('sw.js',s=>{
 assert(s.includes("const SW_APP_VERSION = '1.7.0';"),'technical SW version');
 return s.replace(/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`)
 .replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`)
 .replace(/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`);
});
update('index.html',s=>change(s,"var build='v1.7.20-shiftteams1';",`var build='${BUILD}';`,'index build version'));
assert.equal(JSON.parse(read('package.json')).version,'1.7.0','technical package version');
// Two-pass driver must recognize new version before it attempts to replay earlier transforms.
update('tools/shift-report-mo-hotfix-170-smoke.mjs',s=>{
 const marker='// RAK_17021_TWO_PASS_GUARD';
 if(s.includes(marker))return s;
 s=change(s,"const already17020=indexSource.includes(\"var build='v1.7.20-shiftteams1';\")",
 `${marker}\nconst already17021=indexSource.includes("var build='${BUILD}';")\n  && coreSource.includes('// RAK_EXTERNAL_SHIFT_TEAMS_17020')\n  && imageSource.includes('// RAK_EXTERNAL_SHIFT_TEAMS_17020');\nconst already17020=(already17021||indexSource.includes("var build='v1.7.20-shiftteams1';"))`, 'second-pass 17020 detection');
 s=change(s,'const old=already17020?"var build=\'v1.7.20-shiftteams1\';":already17019?',
 `const old=already17021?"var build='${BUILD}';":already17020?"var build='v1.7.20-shiftteams1';":already17019?`,'second-pass index replay');
 return s;
});
for(const file of ['app-menu-bug-report.js','dashboard.js','app-menu-pages.js','ui.js','app-bottom-nav.js','app-actions.js','app-health-audits.js','app-postload-audits.js','app-menu.js','supabase-config.js','app.js','sw.js','tools/shift-report-mo-hotfix-170-smoke.mjs'])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
execFileSync(process.execPath,['tools/games-cleanup-17021-smoke.mjs'],{stdio:'inherit'});
console.log('[development-version-17021] OK retired Games UI, real employee bug-report identity, dashboard sync, audits, appearance/login compatibility and PWA version');
