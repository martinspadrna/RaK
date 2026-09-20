import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const VERSION='1.7.61', BUILD='v1.7.61-absencelayout1';
const WIDTHS=[58,34,68,38,7,68,38,7,68,38];
function extract(source,begin,end){
  const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
  assert(a>=0&&b>a,'missing code boundary '+begin);return source.slice(a,b);
}
function renderedHeader(file,marker,loopStart,outputName,count){
  const src=extract(read(file),marker,loopStart);
  const ctx={maxPairs:count,absenceHtml:'',html:''};
  vm.runInNewContext(src+`\n globalThis.__layout={markup:${outputName},width:absenceWidth,colgroup:absenceColgroup};`,ctx);
  return ctx.__layout;
}
function widths(markup){return Array.from(markup.matchAll(/<col style='width:(\d+)px'>/g),match=>Number(match[1]));}
test('final 1.7.61 labels, technical version and isolated TEST Supabase stay aligned',()=>{
  for(const [path,fragment] of [
    ['index.html',`var build='${BUILD}';`],
    ['sw.js',`const CACHE_VERSION = 'v${VERSION}';`],
    ['sw.js',`const DEVELOPMENT_BUILD_ID = '${BUILD}';`],
    ['sw.js',`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`],
    ['app.js',`const RAK_DEV_UPDATE_BUILD = "${BUILD}";`],
    ['app.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
    ['supabase-config.js',`window.RAK_RELEASE_VERSION = "${VERSION}";`],
    ['supabase-config.js',`window.RAK_PWA_BUILD = "${BUILD}";`]])assert(read(path).includes(fragment),'marker '+path);
  assert.equal(JSON.parse(read('package.json')).version,'1.7.0');
  assert(read('supabase-config.js').includes('cgshssdjgzzuprlwnabl'));
  assert(!read('supabase-config.js').includes('bkqamcbkiwumsvelahxr'));
  assert(read('rak-user-profile.js').includes("client.rpc('rak_lookup_account_for_login_v2'"));
});
test('public absence name columns are 68px, date gets reclaimed 24px, shift separated',()=>{
  const publicView=renderedHeader('rotace.js','    // RAK_17061_PUBLIC_ABSENCE_LAYOUT:',
    '    for (let i = 0; i < maxPairs; i += 1) {','absenceHtml',3);
  assert.deepEqual(Array.from(widths(publicView.colgroup)),WIDTHS);
  assert.equal(publicView.width,424);
  assert(publicView.markup.includes("class='noteTable rakAbsenceTable'"));
  assert(publicView.markup.includes("width:424px;min-width:100%"));
  assert.equal((publicView.colgroup.match(/width:68px/g)||[]).length,3);
});
test('admin absence overview uses precisely the same width algorithm for all pair counts',()=>{
  for(const count of [1,2,3,5]){
    const a=renderedHeader('rotace.js','    // RAK_17061_PUBLIC_ABSENCE_LAYOUT:',
      '    for (let i = 0; i < maxPairs; i += 1) {','absenceHtml',count);
    const b=renderedHeader('admin-rotation-editor.js','  // RAK_17061_ADMIN_ABSENCE_LAYOUT:',
      '  for (let i = 0; i < maxPairs; i += 1) {','html',count);
    assert.deepEqual(Array.from(widths(b.colgroup)),Array.from(widths(a.colgroup)));
    assert.equal(b.width,a.width);assert.equal(a.width,92+106*count+7*(count-1));
    assert(b.markup.includes('noteTableCompact rakAbsenceTable'));
  }
});
test('date, shift, name, reason and empty cells retain data and table semantics',()=>{
  const pub=read('rotace.js'),adm=read('admin-rotation-editor.js');
  for(const src of [pub,adm]){
    for(const cls of ['noteDateCell','noteShiftCell','notePersonCell','noteReasonCell','noteSpacer','noteEmptyAbsenceDay'])
      assert(src.includes(cls),'missing absence table semantics: '+cls);
    assert(src.includes('escapeHtml(item.person ||'), 'person must remain escaped');
    assert(src.includes('escapeHtml(group.date ||'), 'date must remain escaped');
    assert(src.includes('escapeHtml(group.shift ||'), 'shift must remain escaped');
  }
  assert(adm.includes('data-rot-field')&&adm.includes('data-note-field'));
});
test('CSS is last in legacy cascade and all width adjustments are scoped to requested tables',()=>{
  const css=extract(read('styles-inline-legacy.css'),'/* RAK_17061_ABSENCE_CSS:', '\n/* END_RAK_17061_ABSENCE_CSS */');
  assert(css.includes('.noteTable.rakAbsenceTable .noteDateCell'));
  for(const name of ['noteShiftCell','notePersonCell','noteReasonCell','noteSpacer'])assert(css.includes('.noteTable.rakAbsenceTable .'+name));
  assert(css.includes('.appMenuAdminRotationTable col:first-child'));
  assert(css.includes('.appMenuAdminRotationTable input[data-rot-field="date"]'));
  assert(css.includes('width:92px !important')&&css.includes('width:90px !important'));
  assert(css.includes('.appMenuAdminAbsenceTable col:nth-child(1)'));
  assert(css.includes('.appMenuAdminAbsenceTable col:nth-child(2)'));
  assert(css.includes('width:86px !important')&&css.includes('width:84px !important'));
  assert(css.includes('margin-left:0 !important'));
  assert(!css.includes('font-size:12px !important;')&&!css.includes('font-size:14px !important;'));
  assert(css.includes('@media(max-width:700px)'));
  assert.equal(read('styles-inline-legacy.css').split('RAK_17061_ABSENCE_CSS:').length,2);
});
test('both builds retain historical 1.7.60 gate, new gate, ZIP/Chromium/offline/HTTP and 13-point status',()=>{
  const chain=read('tools/development-version-17048.mjs');
  assert(chain.includes("await import('./development-version-17060.mjs');"));
  assert(chain.includes("execFileSync(process.execPath,['--test','tools/release-gate-17060.test.mjs']"));
  assert(chain.includes("await import('./development-version-17061.mjs');"));
  assert(chain.indexOf('17060.mjs')<chain.lastIndexOf('17061.mjs'));
  const replay=read('tools/shift-report-mo-hotfix-170-smoke.mjs');
  assert(replay.includes('RAK_17061_TWO_PASS_GUARD'));
  assert(replay.includes(`already17061?"var build='${BUILD}';":already17060?`));
  const ci=read('.github/workflows/rak-development-validation.yml');
  for(const phrase of ['npm run vercel-build\n          npm run vercel-build',
    'node --test tools/release-gate-17060.test.mjs',
    'node --test tools/release-gate-17061.test.mjs',
    'node tools/browser-absence-layout-17061.mjs',
    'node tools/browser-offline-17052.mjs',
    'node tools/http-anon-audit-17050.mjs',
    'node tools/backup-source-integrity-17051.mjs'])assert(ci.includes(phrase),phrase);
  const plan=read('RAK_PLAN_13.md');assert(plan.includes('2/13')&&plan.includes('Izolovaná plná obnova zatím nebyla provedena'));
  const status=read('RAK_PLAN_17061_STATUS.md');
  for(const key of ['P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4','2/13'])assert(status.includes(key));
});
