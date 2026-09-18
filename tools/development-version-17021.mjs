#!/usr/bin/env node
// RaK 1.7.21: remove user-visible references to retired Games, not account/appearance compatibility.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const VERSION='1.7.21', BUILD='v1.7.21-gamescleanup1';
const MARK='// RAK_NO_RETIRED_GAMES_17021';
const read=p=>fs.readFileSync(p,'utf8');
const put=(p,text)=>fs.writeFileSync(p,text,'utf8');
function change(text,from,to,tag){if(text.includes(to))return text;assert(text.includes(from),'[17021] missing '+tag);return text.replace(from,to);}
function update(file,fn){let src=read(file);const newSrc=fn(src);if(src!==newSrc)put(file,newSrc);return newSrc;}
// Bug reporting must use the *real* employee login. The discontinued Games profile is not an identity provider.
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
 s=change(s,'    \u0027    <option>Hra</option>\u0027,\n','', 'obsolete report option');
 assert(!/herním profilu|<option>Hra<\/option>|report\.game|activeGameShell/.test(s),'old game report UI remains');
 return s;
});
// The old sync badge advertised and invoked leaderboard refreshes that are no longer installed.
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
// Settings should show the native RaK profile only; historical feature names do not belong in About.
update('app-menu-pages.js',s=>{
 if(s.includes(MARK))return s;
 s=change(s,'Aplikace se dál rozdělila do menších modulů, odstranily se Hry a řada starých oprav a duplicit, takže je snazší ji bezpečně udržovat.','Aplikace se rozdělila do menších modulů, odstranily se nepoužívané části a duplicity, takže se snáze a bezpečněji udržuje.','About 1.6');
 s=change(s,'V této řadě vznikaly také Hry a online profily; později byly z RaK odstraněny, aby aplikace zůstala pracovně zaměřená.','Vznikly základy přihlášení, osobního nastavení vzhledu a dalších pracovních online funkcí.','About 1.1');
 s=change(s,'const profileCard = buildGamesProfileSettingsHtml();','const profileCard = buildRakProfileSettingsHtml();','native profile card');
 s=change(s,"      if (typeof gamesRenderAccountChips === 'function') {\n        try { gamesRenderAccountChips(); } catch (err) {}\n      }\n      if (typeof renderGamesProfileStatus === 'function') {\n        try { renderGamesProfileStatus(); } catch (err) {}\n      }\n",'', 'obsolete account chips');
 return MARK+'\n'+s;
});
// Do not create duplicate old login forms or XP/rank overlays from the remaining UI bridge.
update('ui.js',s=>{
 if(s.includes(MARK))return s;
 const begin=s.indexOf('function buildGamesProfileSettingsHtml() {');
 const end=s.indexOf('function readSupabaseKeepaliveStatusForUi() {',begin);
 assert(begin>=0&&end>begin,'obsolete rank/profile UI boundaries');
 s=s.slice(0,begin)+MARK+'\n// Current login UI lives exclusively in app-menu-profile.js.\n\n'+s.slice(end);
 // Archived detailed timeline is a fallback; omit retired feature lines and sections if it renders.
 const histStart=s.indexOf('function buildAppHistoryHtml(versionText) {');
 const histEnd=s.indexOf('// RaK 1.2 (1.155) – Administrace / Rozpisy',histStart);
 assert(histStart>=0&&histEnd>histStart,'legacy About boundaries');
 let hist=s.slice(histStart,histEnd);
 assert(hist.includes('  return [')&&hist.includes('sections.map(section => ['),'legacy history render anchors');
 hist=hist.replace('  return [',`  const workSections = sections.filter(section => !/(?:hry|herní|herní hub|piškvorky|online hry|herní ladění)/i.test(section.title || ''))
    .map(section => ({...section,lines:(section.lines || []).filter(line => !/(?:hry|herní|piškvorky|top score|achievement|leaderboard|hráčsk|lodě online)/i.test(line))}));
  return [`);
 hist=hist.replace('sections.map(section => [','workSections.map(section => [');
 s=s.slice(0,histStart)+hist+s.slice(histEnd);
 return s;
});
// Removed game button and launch action must not remain in action dispatchers.
update('app-bottom-nav.js',s=>change(s,"    games: () => { openGamesPage(); },\n",'', 'dead bottom nav route'));
update('app-actions.js',s=>change(s,"    'open-game': (el) => {\n      const gameId = String(el.dataset.game || '').trim();\n      if (gameId) openGameShell(gameId);\n    },\n",'', 'dead game action'));
// Audits must not report missing #games, its deleted stylesheet, or a non-existing bottom button.
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
// The admin diagnostics panel aggregates old read-only historic audits. Exclude dead game lines,
// but retain currently needed account/appearance, Supabase, deployment and workplace metrics.
update('app-menu.js',s=>{
 if(s.includes(MARK))return s;
 s=change(s,"' · nových herních profilů: ' + createdCount","' · nových účtů pracovníků: ' + createdCount",'worker saved status');
 const old="        ].join('\\n');\n        body.innerHTML = [\n          '<div class=\"appMenuCard appMenuDiagnosticsCard\">',";
 const next=`        ]${MARK ? '.filter(line => !/(?:herní|herni|piškvorky|lodě|online hry|top.?score|leaderboard|game[_ -]|gameengine|battleship|\\bttt\\b|herních profilů|session\\/pozvánky|RPC pokrytí|herní cache)/i.test(String(line)))' : ''}.join('\\n');\n        body.innerHTML = [\n          '<div class=\"appMenuCard appMenuDiagnosticsCard\">',`;
 assert(s.includes(old),'diagnostics output anchor');
 s=s.replace(old,next);
 return MARK+'\n'+s;
});
// All versions are development-only; keep the underlying 1.7.0 technical app version intact.
update('supabase-config.js',s=>{
 assert(s.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!s.includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
 s=s.replace(/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`)
    .replace(/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`)
    .replace(/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`);
 return s;
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
// Frozen two-pass builder recognizes v1.7.20; extend the guard to recognize the new version.
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
console.log('[development-version-17021] OK retired Games UI, real employee bug-report identity, current dashboard sync, audits, appearance/login compatibility and PWA version');
