#!/usr/bin/env node
// Run before 1.7.21's finalizer, which separately fixes the phase-one audit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path='app-health-audits.js';
let s=fs.readFileSync(path,'utf8');
const marker='// RAK_NO_GAME_AUDIT_REQUIREMENTS_17021';
if(!s.includes(marker)){
 const replace=(a,b,label)=>{assert(s.includes(a),'[17021 health] '+label);s=s.replace(a,b);};
 replace("    const allowedActions = new Set(['home', 'rotace', 'kalkulacky', 'games', 'menu']);","    const allowedActions = new Set(['home', 'rotace', 'kalkulacky', 'menu']);",'allowed nav action');
 replace("    const allowedPages = new Set(['home', 'rotace', 'kalkulacky', 'games', 'menu']);","    const allowedPages = new Set(['home', 'rotace', 'kalkulacky', 'menu']);",'allowed nav page');
 replace("    const requiredActions = ['home', 'rotace', 'kalkulacky', 'games', 'menu'];","    const requiredActions = ['home', 'rotace', 'kalkulacky', 'menu'];",'required nav');
 replace("    if (!document.getElementById('games')) health.missing.push('DOM #games');\n",'', 'deleted page validation');
 replace("      'home',\n      'games',\n      'kalkulacky',","      'home',\n      'kalkulacky',",'required pages');
 replace("      'gamesGrid',\n",'', 'retired grid requirement');
 replace("    const navAllowed = new Set(['home', 'rotace', 'kalkulacky', 'rozpisy', 'statistiky', 'games', 'menu']);","    const navAllowed = new Set(['home', 'rotace', 'kalkulacky', 'rozpisy', 'statistiky', 'menu']);",'action nav allowlist');
 replace("      'open-game',\n",'', 'removed launch action required');
 replace("      if (action === 'open-game' && !String(node.getAttribute('data-game') || '').trim()) health.missingTargets.push('open-game data-game');\n",'', 'removed launch target');
 replace("    '#games .gamesStage',\n    '#games .gameBoard',\n    '#games .arcadePanel'","    '.appMenuSettingBtn'",'performance samples');
 s=marker+'\n'+s;
 fs.writeFileSync(path,s,'utf8');
}
const detailed=s.slice(s.indexOf('function getPhaseTenNavigationHealth() {'));
assert(!detailed.includes("'games', 'menu'")&&!detailed.includes("'open-game',")&&!detailed.includes("DOM #games")&&!detailed.includes("'gamesGrid'"),'obsolete detailed audit expectations remain');
console.log('[games-cleanup-17021-health] OK navigation, page, actions and performance audits no longer require missing games');
