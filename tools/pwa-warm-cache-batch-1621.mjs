#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const swPath=path.join(root,'sw.js');
const configPath=path.join(root,'supabase-config.js');
let sw=read('sw.js');
let config=read('supabase-config.js');
const app=read('app.js');
const indexHtml=read('index.html');
const bridge=read('supabase-bridge.js');
const rotationTasks=read('rotation-tasks.js');
const calcCss=read('styles-calc-panels.css');
const rotationCss=read('styles-rotation-month.css');
const menuCss=read('styles-menu-polish.css');
const adminCss=read('styles-admin-polish.css');
const themeCss=read('styles-theme-polish.css');

const DISPLAY_VERSION='1.6.21';
const BUILD_ID='1.6.21-warmbatch1';
const POLICY_MARKER="const DEVELOPMENT_WARM_BATCH_POLICY = 'feature-css-10-total';";
const DEFERRED=Object.freeze([
  './styles-calc-panels.css','./styles-calculators-mid.css','./styles-shift-report.css','./styles-admin-reports.css','./styles-admin-rotation-fold.css','./styles-admin-service.css','./styles-admin-rotation-editor.css','./styles-stats-polish.css','./styles-daymods.css','./styles-rotation-tasks.css'
]);
const REQUIRED_WARM=Object.freeze([
  './app.js?v=1.5.1','./data.js','./module-readiness.js','./rak-namespace.js','./rak-audit-baseline.js','./rak-runtime-health.js','./rak-dom-security-hardening.js','./styles.css','./styles-inline-legacy.css','./styles-base.css','./styles-layout.css','./styles-theme.css','./styles-responsive.css','./styles-modal.css','./styles-rotation-summary-compact.css','./styles-overrides-legacy-early.css','./styles-interaction-guard.css','./styles-rotation-month.css','./styles-low-end-performance.css','./styles-dashboard-sync.css','./styles-settings-runtime.css','./styles-bottom-nav-runtime.css','./styles-overrides-legacy-late.css','./styles-dashboard-fit.css','./styles-admin-polish.css','./styles-menu-polish.css','./styles-viewport-polish.css','./styles-theme-polish.css','./styles-release-polish.css','./styles-dashboard-polish.css','./styles-theme-propagation.css','./assets/nav-icons/home-gray.png','./assets/nav-icons/home-green.png','./assets/nav-icons/rotace-gray.png','./assets/nav-icons/rotace-green.png','./assets/nav-icons/kalkulacky-gray.png','./assets/nav-icons/kalkulacky-green.png'
]);

function arrayBlock(source,name){
  const match=source.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n\\];`));
  if(!match) throw new Error(`[pwa-warm-cache-batch-1621] Chybí ${name}.`);
  const values=match[1].split('\n').map(row=>{const m=row.match(/^\s*'([^']+)'\s*,?\s*$/);return m?m[1]:'';}).filter(Boolean);
  return {full:match[0],values};
}
function renderArray(name,values){return `const ${name} = [\n${values.map(v=>`  '${v}'`).join(',\n')}\n];`;}
function appList(name){
  const match=app.match(new RegExp(`const ${name} = \\[\\n([\\s\\S]*?)\\n  \\];`));
  if(!match) throw new Error(`[pwa-warm-cache-batch-1621] app.js neobsahuje ${name}.`);
  return Array.from(match[1].matchAll(/"([^"]+)"/g),m=>m[1]);
}

if(!sw.includes(POLICY_MARKER)){
  const core=arrayBlock(sw,'CORE');
  const warm=arrayBlock(sw,'WARM_START');
  if(core.values.length!==8||!core.values.includes('./assets/rak-login-crab.png')) throw new Error('[pwa-warm-cache-batch-1621] CORE/login kontrakt porušen.');
  if(warm.values.length!==70) throw new Error(`[pwa-warm-cache-batch-1621] Očekáván stabilní WARM_START=70, nalezeno ${warm.values.length}.`);
  for(const asset of DEFERRED){
    if(!warm.values.includes(asset)) throw new Error('[pwa-warm-cache-batch-1621] Cílový warm asset chybí: '+asset);
    if(!indexHtml.includes(asset.replace(/^\.\//,''))) throw new Error('[pwa-warm-cache-batch-1621] Cílový CSS není linkovaný v indexu: '+asset);
  }
  const next=warm.values.filter(asset=>!DEFERRED.includes(asset));
  if(next.length!==60) throw new Error('[pwa-warm-cache-batch-1621] Přesný batch musí skončit na 60 položkách.');
  sw=sw.replace(warm.full,renderArray('WARM_START',next));
  const buildLine=/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m;
  if(!buildLine.test(sw)) throw new Error('[pwa-warm-cache-batch-1621] Chybí build marker.');
  sw=sw.replace(buildLine,line=>line+'\n'+POLICY_MARKER);
  const status='      warmStartCount: WARM_START.length,';
  if(!sw.includes(status)) throw new Error('[pwa-warm-cache-batch-1621] Chybí cache diagnostika.');
  sw=sw.replace(status,[status,'      coreCount: CORE.length,','      warmBatchPolicy: DEVELOPMENT_WARM_BATCH_POLICY,',`      deferredStyleCount: ${DEFERRED.length},`].join('\n'));
}

config=config.replace(/^window\.RAK_RELEASE_VERSION = "1\.6\.\d+";$/m,`window.RAK_RELEASE_VERSION = "${DISPLAY_VERSION}";`);
config=config.replace(/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.\d+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${DISPLAY_VERSION}";`);
config=config.replace(/^window\.RAK_PWA_BUILD = "v1\.6\.[^"]+";$/m,`window.RAK_PWA_BUILD = "v${BUILD_ID}";`);
sw=sw.replace(/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.\d+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${DISPLAY_VERSION}';`);
sw=sw.replace(/^const DEVELOPMENT_BUILD_ID = '1\.6\.[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD_ID}';`);

const core=arrayBlock(sw,'CORE').values;
const warm=arrayBlock(sw,'WARM_START').values;
if(core.length!==8||!core.includes('./assets/rak-login-crab.png')) throw new Error('[pwa-warm-cache-batch-1621] CORE musí zůstat 8 včetně login PNG.');
if(warm.length!==60) throw new Error(`[pwa-warm-cache-batch-1621] WARM_START musí být 60, je ${warm.length}.`);
for(const asset of DEFERRED) if(warm.includes(asset)) throw new Error('[pwa-warm-cache-batch-1621] Odložený CSS zůstal ve warm cache: '+asset);
for(const asset of REQUIRED_WARM) if(!warm.includes(asset)) throw new Error('[pwa-warm-cache-batch-1621] Chráněný warm asset zmizel: '+asset);
for(const file of appList('criticalFiles').concat(appList('startupFiles'))){
  const url=`./${file}?v=1.6.0`;
  if(!warm.includes(url)) throw new Error('[pwa-warm-cache-batch-1621] Boot/auth/startup dependency zmizela: '+url);
}
if(!sw.includes("strategy: 'navigation-network-first;build-static-cache-first;isolated-prewarm'")) throw new Error('[pwa-warm-cache-batch-1621] Network-first kontrakt chybí.');
if(!sw.includes("if (data.type === 'SKIP_WAITING')")||!sw.includes('self.skipWaiting();')) throw new Error('[pwa-warm-cache-batch-1621] Potvrzovací update flow chybí.');
if(!bridge.includes("const RAK_ACTIVE_WRITE_PATHS_RPC_ONLY = '1.6.14-sec1';")) throw new Error('[pwa-warm-cache-batch-1621] RPC-only security marker chybí.');
if(!rotationTasks.includes("const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';")||!rotationTasks.includes("tasksForMachine('MSKC01', normalizedShift)")||!rotationTasks.includes('sharedMskc01: shouldShareMskc01FromCard(card)')) throw new Error('[pwa-warm-cache-batch-1621] MSKC01 sharing kontrakt chybí.');
if(!calcCss.includes('calcPanel')||!rotationCss.includes('rotationViewFold')||!menuCss.includes('.appMenu')||!adminCss.includes('#appMenuBody')||!themeCss.includes('/* RaK 1.6.18 CSS cleanup: global theme dead helpers consolidated; visual contract unchanged. */')) throw new Error('[pwa-warm-cache-batch-1621] CSS cleanup 1.6.15–1.6.18 kontrakt není kompletní.');
if(!sw.includes(POLICY_MARKER)||!sw.includes('coreCount: CORE.length,')||!sw.includes('warmBatchPolicy: DEVELOPMENT_WARM_BATCH_POLICY,')||!sw.includes('deferredStyleCount: 10,')) throw new Error('[pwa-warm-cache-batch-1621] Batch diagnostika chybí.');
if(!/^window\.RAK_RELEASE_VERSION = "1\.6\.21";$/m.test(config)||!/^window\.RAK_TEST_DISPLAY_VERSION = "1\.6\.21";$/m.test(config)||!/^window\.RAK_PWA_BUILD = "v1\.6\.21-warmbatch1";$/m.test(config)||!/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '1\.6\.21';$/m.test(sw)||!/^const DEVELOPMENT_BUILD_ID = '1\.6\.21-warmbatch1';$/m.test(sw)) throw new Error('[pwa-warm-cache-batch-1621] Verze/build marker není 1.6.21-warmbatch1.');

fs.writeFileSync(swPath,sw,'utf8');
fs.writeFileSync(configPath,config,'utf8');
console.log('[pwa-warm-cache-batch-1621] OK RaK 1.6.21 WARM_START 70→60; 10 feature CSS deferred total; CORE/login/auth/startup/Menu shell/main Rotation/dashboard/update/security preserved');
