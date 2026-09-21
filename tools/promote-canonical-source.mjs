#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PROMOTION=path.join(ROOT,'.rak-promotion','snapshot');
const OVERLAY=path.join(PROMOTION,'overlay');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const write=(p,value)=>{const target=path.join(ROOT,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const safe=p=>typeof p==='string'&&p.length>0&&!p.startsWith('/')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
const walk=(folder,prefix='')=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{const rel=prefix?prefix+'/'+entry.name:entry.name;return entry.isDirectory()?walk(path.join(folder,entry.name),rel):entry.isFile()?[rel]:[];});

assert.equal(process.env.GITHUB_REF_NAME,'development','promotion is development-only');
assert.match(process.env.GITHUB_SHA||'',/^[a-f0-9]{40}$/,'missing workflow SHA');
const manifest=JSON.parse(fs.readFileSync(path.join(PROMOTION,'manifest.json'),'utf8'));
assert.equal(manifest.schema,'rak-canonical-runtime-overlay-v1');
assert.equal(manifest.sourceCommit,process.env.GITHUB_SHA,'artifact belongs to another commit');
assert.equal(manifest.release,'1.7.69');
assert.equal(manifest.buildId,'v1.7.69-local-drafts1');
assert(Array.isArray(manifest.changedPaths)&&manifest.changedPaths.length>10,'overlay is incomplete');
const expected=[...manifest.changedPaths].sort(),actual=walk(OVERLAY).sort();
assert.deepEqual(actual,expected,'artifact overlay path set differs from manifest');
const entries=new Map(manifest.files.map(entry=>[entry.path,entry]));
for(const relative of actual){
  assert(safe(relative),'unsafe overlay path '+relative);
  const data=fs.readFileSync(path.join(OVERLAY,relative)),entry=entries.get(relative);
  assert(entry&&entry.sha256===sha(data),'hash mismatch for '+relative);
  const destination=path.join(ROOT,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(OVERLAY,relative),destination);
}

const releasePairs={
  'index.html':[["var build='v1.7.69-local-drafts1';","var build='v1.7.70-canonical-source1';"]],
  'sw.js':[["const CACHE_VERSION = 'v1.7.69';","const CACHE_VERSION = 'v1.7.70';"],
    ["const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.69';","const DEVELOPMENT_TEST_DISPLAY_VERSION = '1.7.70';"],
    ["const DEVELOPMENT_BUILD_ID = 'v1.7.69-local-drafts1';","const DEVELOPMENT_BUILD_ID = 'v1.7.70-canonical-source1';"]],
  'app.js':[['const RAK_DEV_UPDATE_BUILD = "v1.7.69-local-drafts1";','const RAK_DEV_UPDATE_BUILD = "v1.7.70-canonical-source1";'],
    ['window.RAK_RELEASE_VERSION = "1.7.69";','window.RAK_RELEASE_VERSION = "1.7.70";']],
  'supabase-config.js':[['window.RAK_RELEASE_VERSION = "1.7.69";','window.RAK_RELEASE_VERSION = "1.7.70";'],
    ['window.RAK_TEST_DISPLAY_VERSION = "1.7.69";','window.RAK_TEST_DISPLAY_VERSION = "1.7.70";'],
    ['window.RAK_PWA_BUILD = "v1.7.69-local-drafts1";','window.RAK_PWA_BUILD = "v1.7.70-canonical-source1";']]
};
for(const [relative,pairs] of Object.entries(releasePairs)){
  let value=read(relative);
  for(const [before,after] of pairs){assert(value.includes(before),'missing release marker '+before);value=value.replace(before,after);}
  write(relative,value);
}

const pkg=JSON.parse(read('package.json'));
const legacy=pkg.scripts['legacy:vercel-build']||pkg.scripts['vercel-build'];
assert(legacy.includes('tools/release-170.mjs pre')&&legacy.includes('tools/shift-report-mo-hotfix-170-smoke.mjs'),'unexpected legacy build');
pkg.version='1.7.0';
pkg.scripts['legacy:vercel-build']=legacy;
pkg.scripts['vercel-build']='node tools/canonical-build.mjs build';
pkg.scripts['test:canonical-build']='node --test tools/canonical-build-contract.test.mjs';
write('package.json',JSON.stringify(pkg,null,2)+'\n');

const vercel=JSON.parse(read('vercel.json'));
vercel.outputDirectory='.rak-dist';
assert.equal(vercel.git?.deploymentEnabled?.development,false);
write('vercel.json',JSON.stringify(vercel,null,2)+'\n');

let ignored=read('.gitignore');
for(const entry of ['.rak-canonical-build/','.rak-dist/','.rak-promotion/'])if(!ignored.split(/\r?\n/).includes(entry))ignored+=entry+'\n';
write('.gitignore',ignored);

write('.github/workflows/rak-development-validation.yml',"name: RaK development validation\n\non:\n  push:\n    branches: [development]\n  pull_request:\n    branches: [development]\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\nconcurrency:\n  group: rak-development-validation-${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    timeout-minutes: 25\n    steps:\n      - name: Check out exact development commit\n        uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - name: Preflight isolated build policy and measured thirteen-point roadmap\n        run: node --test tools/vercel-build-policy.test.mjs tools/development-deploy-gate.test.mjs tools/build-architecture-contract.test.mjs tools/roadmap-contract.test.mjs tools/canonical-source-snapshot.test.mjs tools/canonical-build-contract.test.mjs\n      - name: Install dependencies\n        run: npm install --no-audit --no-fund\n      - name: Build and run npm check and critical smoke twice\n        run: |\n          npm run vercel-build\n          npm run vercel-build\n      # Exact historical version tests run in stages on BOTH builds before their next bump.\n      # node --test tools/release-gate-17043.test.mjs\n      # node --test tools/release-gate-17044.test.mjs\n      # node --test tools/release-gate-17045.test.mjs\n      # node --test tools/release-gate-17046.test.mjs\n      # node --test tools/release-gate-17047.test.mjs\n      # node --test tools/release-gate-17048.test.mjs\n      # node --test tools/release-gate-17049.test.mjs\n      # node --test tools/release-gate-17050.test.mjs\n      # node --test tools/release-gate-17051.test.mjs\n      # node --test tools/release-gate-17052.test.mjs\n      # node --test tools/release-gate-17053.test.mjs\n      # node --test tools/release-gate-17054.test.mjs\n      # node --test tools/release-gate-17055.test.mjs\n      # node --test tools/release-gate-17056.test.mjs\n      # node --test tools/release-gate-17057.test.mjs\n      # node --test tools/release-gate-17058.test.mjs\n      # node --test tools/release-gate-17059.test.mjs\n      # node --test tools/release-gate-17060.test.mjs\n      # node --test tools/release-gate-17061.test.mjs\n      # node --test tools/release-gate-17062.test.mjs\n      # node --test tools/release-gate-17063.test.mjs\n      # node --test tools/release-gate-17064.test.mjs\n      # node --test tools/release-gate-17065.test.mjs\n      # node --test tools/release-gate-17066.test.mjs\n      - name: Verify final release and inherited quality gates\n        working-directory: .rak-canonical-build/work\n        run: |\n          node --test tools/release-gate-17039.test.mjs\n          node --test tools/rotation-release-gate-17040.test.mjs\n          node --test tools/two-pass-release-17041.test.mjs\n          node --test tools/release-gate-17067.test.mjs\n          node --test tools/release-gate-17068.test.mjs\n          node --test tools/release-gate-17069.test.mjs\n      - name: Verify non-destructive rollback contract and measured PWA budgets\n        working-directory: .rak-canonical-build/work\n        run: |\n          node --check tools/preview-rollback-preflight-17068.mjs\n          node --check tools/pwa-start-bench-17068.mjs\n          node --test tools/preview-rollback-preflight-17068.test.mjs\n          node --test tools/pwa-start-bench-17068.test.mjs\n      - name: Verify source backup ZIP inventory, excluded files and CRC\n        working-directory: .rak-canonical-build/work\n        run: node tools/backup-source-integrity-17051.mjs\n      - name: Real Chromium mobile start, offline restart and online recovery\n        working-directory: .rak-canonical-build/work\n        run: |\n          node --test tools/pwa-offline-17052.test.mjs\n          node tools/browser-offline-17052.mjs\n          node tools/browser-absence-layout-17061.mjs\n          node tools/browser-soft-grid-17066.mjs\n          node tools/browser-equal-grid-17067.mjs\n      - name: Benchmark PWA three times in independent Chromium profiles\n        working-directory: .rak-canonical-build/work\n        run: node tools/pwa-start-bench-17068.mjs\n      - name: Verify live anonymous HTTP against isolated TEST Supabase\n        working-directory: .rak-canonical-build/work\n        run: node tools/http-anon-audit-17050.mjs\n      - name: Verify isolated output and immutable canonical sources\n        run: |\n          node --test tools/canonical-build-contract.test.mjs\n          test -f .rak-canonical-build/verified.json\n          git diff --exit-code HEAD --\n      - name: Retain isolated-build reproducibility evidence\n        uses: actions/upload-artifact@v4\n        with:\n          name: rak-17070-isolated-build-${{ github.sha }}\n          path: .rak-canonical-build/*.json\n          if-no-files-found: error\n          retention-days: 30\n");
write('tools/build-architecture-contract.test.mjs',"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');\n\ntest('the frozen 1.7.69 rewrite chain is retained only as a compatibility compiler',()=>{\n  const chain=read('tools/development-version-17048.mjs');\n  assert(chain.includes(\"development-version-17069.mjs\"));\n  assert(!chain.includes(\"development-version-17070.mjs\"));\n  assert(!fs.existsSync(new URL('./development-version-17070.mjs',import.meta.url)),'new rewrite script is forbidden');\n  const pkg=JSON.parse(read('package.json'));\n  assert.equal(pkg.scripts['vercel-build'],'node tools/canonical-build.mjs build');\n  assert(pkg.scripts['legacy:vercel-build'].includes('tools/release-170.mjs pre'));\n});\n\ntest('strict historical, browser, HTTP and repeat-build gates remain active',()=>{\n  const ci=read('.github/workflows/rak-development-validation.yml');\n  for(const command of [\n    'npm run vercel-build\\n          npm run vercel-build',\n    'node --test tools/release-gate-17068.test.mjs',\n    'node --test tools/release-gate-17069.test.mjs',\n    'node tools/browser-offline-17052.mjs',\n    'node tools/http-anon-audit-17050.mjs',\n    'git diff --exit-code HEAD --',\n    'test -f .rak-canonical-build/verified.json'\n  ])assert(ci.includes(command),'missing safety check: '+command);\n});\n");

let plan=read('RAK_PLAN_13.md');
plan=plan.replace('| P1.3 | Reprodukovatelný build, testy a verze | **33 % (2/6)** | **Znovu otevřeno; nejvyšší systémová priorita** |','| P1.3 | Reprodukovatelný build, testy a verze | **50 % (3/6)** | Otevřeno; S2 dokončeno, S3 pokračuje |');
plan=plan.replace('### P1.3 – Reprodukovatelný build, testy a jednotná verze · **33 % (2/6)**','### P1.3 – Reprodukovatelný build, testy a jednotná verze · **50 % (3/6)**');
plan=plan.replace('- [ ] **S2 – jeden neměnný zdrojový strom:**','- [x] **S2 – jeden neměnný zdrojový strom:**');
const marker='## Záznam aktualizací\n';
const log='\n- **21. 9. 2026 – S2, kanonické zdroje a izolovaný výstup:** ověřený artefakt funkčního stavu 1.7.69 z běhu na SHA `'+process.env.GITHUB_SHA+'` byl po kontrole manifestu a SHA-256 převeden do kanonických zdrojů a pro nový preview release přímo označen jako 1.7.70 (`v1.7.70-canonical-source1`). Veřejný build nyní pracuje v `.rak-canonical-build/work`, publikuje do `.rak-dist`, hlídá čistý Git strom a porovnává dva průchody; ZIP je jediný výslovně deklarovaný proměnný artefakt. Historický přepisovací řetězec zůstal zmrazený jako kompatibilní překladač, nevznikl žádný 1.7.70 patch. P1.3 se zvyšuje na 50 % (3/6); S3 a sjednocení metadat zůstávají otevřené. `main` a produkční Supabase beze změn.\n';
assert(plan.includes(marker)&&!plan.includes('S2, kanonické zdroje a izolovaný výstup'),'plan update precondition failed');
plan=plan.replace(marker,marker+log);write('RAK_PLAN_13.md',plan);

fs.rmSync(path.join(ROOT,'tools','promote-canonical-source.mjs'));
execFileSync(process.execPath,['--check','tools/canonical-build.mjs'],{cwd:ROOT,stdio:'inherit'});
execFileSync(process.execPath,['--test','tools/canonical-build-contract.test.mjs','tools/build-architecture-contract.test.mjs'],{cwd:ROOT,stdio:'inherit'});
console.log('[canonical-promotion] PASS '+actual.length+' verified files promoted; configuration and CI migrated');
