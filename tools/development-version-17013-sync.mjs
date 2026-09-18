#!/usr/bin/env node
// Second-pass finalization for 1.7.13: 1.7.01 compatibility stage re-writes version markers.
import fs from 'node:fs';
const read = path => fs.readFileSync(path,'utf8');
const write = (path,text) => fs.writeFileSync(path,text,'utf8');
const assert = (value,label) => { if (!value) throw Error('[17013-sync] '+label); };
const BUILD='v1.7.13-tpkwmobile1', VERSION='1.7.13';
assert(read('index.html').includes(`var build='${BUILD}';`),'mobile build index missing');
const replaceLine=(text,pattern,line,label) => { assert(pattern.test(text),label); return text.replace(pattern,line); };
let config=read('supabase-config.js');
assert(config.includes('https://cgshssdjgzzuprlwnabl.supabase.co')&&!config.includes('bkqamcbkiwumsvelahxr'),'test Supabase isolation');
config=replaceLine(config,/^window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`window.RAK_RELEASE_VERSION = "${VERSION}";`,'config release');
config=replaceLine(config,/^window\.RAK_TEST_DISPLAY_VERSION = "[^"]+";$/m,`window.RAK_TEST_DISPLAY_VERSION = "${VERSION}";`,'config display');
config=replaceLine(config,/^window\.RAK_PWA_BUILD = "[^"]+";$/m,`window.RAK_PWA_BUILD = "${BUILD}";`,'config build');
write('supabase-config.js',config);
let app=read('app.js');
app=replaceLine(app,/^  const RAK_DEV_UPDATE_BUILD = "[^"]+";$/m,`  const RAK_DEV_UPDATE_BUILD = "${BUILD}";`,'app build');
app=replaceLine(app,/^  window\.RAK_RELEASE_VERSION = "[^"]+";$/m,`  window.RAK_RELEASE_VERSION = "${VERSION}";`,'app version');
write('app.js',app);
let sw=read('sw.js');
assert(sw.includes("const SW_APP_VERSION = '1.7.0';"),'package version altered');
sw=replaceLine(sw,/^const CACHE_VERSION = '[^']+';$/m,`const CACHE_VERSION = 'v${VERSION}';`,'SW cache');
sw=replaceLine(sw,/^const DEVELOPMENT_TEST_DISPLAY_VERSION = '[^']+';$/m,`const DEVELOPMENT_TEST_DISPLAY_VERSION = '${VERSION}';`,'SW version');
sw=replaceLine(sw,/^const DEVELOPMENT_BUILD_ID = '[^']+';$/m,`const DEVELOPMENT_BUILD_ID = '${BUILD}';`,'SW build');
write('sw.js',sw);
for(const file of ['rak-shift-report-image.js','rak-shift-report-share.js']) {
  let source=read(file);
  assert(source.includes('// RAK_MOBILE_REPORT_LINES_17013'),file+' mobile report missing');
  // Restore compatibility markers replaced with the former two-column rendering sections.
  if(!source.includes('// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010'))
    source=source.replace('// RAK_MOBILE_REPORT_LINES_17013','// RAK_SHIFT_REPORT_FREE_ONLY_GRINDER_17010\n  // RAK_MOBILE_REPORT_LINES_17013');
  if(!source.includes('// RAK_SHIFT_REPORT_GLASS_17009'))
    source=source.replace('// RAK_MOBILE_REPORT_LINES_17013','// RAK_SHIFT_REPORT_GLASS_17009\n  // RAK_MOBILE_REPORT_LINES_17013');
  // On the lighter translucent cards use contrast-safe tones while retaining index colors.
  const oldInk="ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#173d59':tone.text;";
  const newInk="ctx.textAlign='left';ctx.fillStyle=line.kind==='total'?'#173d59':({AF:'#07558b',AD:'#07558b',AG:'#126343',AE:'#126343',AH:'#805117'}[line.index]||'#244554');";
  if(source.includes(oldInk)) source=source.replace(oldInk,newInk);
  assert(source.includes(newInk),file+' readable production text');
  write(file,source);
}
console.log('[17013-sync] OK repeated-build version synchronization + contrast-safe mobile report; test DB retained');