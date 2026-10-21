import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const deferred=['styles-admin-reports.css','styles-admin-rotation-fold.css','styles-admin-rotation-editor.css','styles-admin-polish.css','styles-settings-runtime.css','styles-stats-polish.css','styles-menu-polish.css'];

test('auxiliary styles load without blocking first paint and become active on load',()=>{
  const html=read('index.html');
  for(const name of deferred){
    const exact='<link rel="stylesheet" href="'+name+'" media=print onload="this.media=\\'all\\'">';
    assert(html.includes(exact),'auxiliary CSS must load and activate before admin click: '+name);
    assert(read(name).length>300,'do not remove or replace styles: '+name);
  }
  assert.equal((html.match(/media=print onload=/g)||[]).length,deferred.length,'only reviewed auxiliary styles may be deferred');
  for(const file of ['styles.css','styles-inline-legacy.css','styles-overrides-legacy-early.css','styles-dashboard-fit.css','styles-release-polish.css','styles-dashboard-polish.css']){
    assert(html.includes('<link rel="stylesheet" href="'+file+'">'),'dashboard/critical styles must remain blocking: '+file);
  }
  assert(html.includes('id="rak-critical-shell-fallback"'),'visible fallback shell must remain');
  assert(html.includes('.bottomNav{position:fixed'),'first paint navigation must be styled even while lazy styles load');
  assert(html.indexOf('styles-admin-polish.css')<html.indexOf('styles-menu-polish.css'),'late admin/menu cascade order preserved');
});

test('index size budget is not relaxed by async stylesheet change',()=>{
  const limits=JSON.parse(read('tools/performance-budget-17104.json'));
  assert.equal(limits.sizeGroups.indexHtml.maxBytes,57414);
  assert(Buffer.byteLength(read('index.html'))<57414);
});
