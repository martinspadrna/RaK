import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isRuntimePath,compareManifests,capture,SNAPSHOT_SCHEMA,EXPECTED_BUILD} from './canonical-source-snapshot.mjs';
const run=(root,...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rak-snapshot-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 run(root,'init','-q');run(root,'config','user.name','test');run(root,'config','user.email','test@invalid.example');
 for(const [p,contents] of Object.entries({
  'index.html':`var build='${EXPECTED_BUILD}';`,'sw.js':"const CACHE_VERSION = 'v1.7.69';",
  'app.js':'baseline','supabase-config.js':'cgshssdjgzzuprlwnabl','supabase-bridge.js':'baseline',
  'package.json':JSON.stringify({version:'1.7.0'}),
  'admin-reports.js':'baseline','rotace.js':'baseline','dashboard.js':'baseline','export.js':'baseline',
  'core.js':'baseline','ui.js':'baseline','styles.css':'baseline',
  'assets/a.svg':'baseline','api/endpoint.js':'baseline','tools/private.js':'do not archive',
  'supabase/secret.sql':'not a runtime path','RAK_HANDOFF.md':'not a runtime path'})){
  fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),contents);
 }
 run(root,'add','.');run(root,'commit','-qm','baseline');
 for(const p of ['app.js','supabase-bridge.js','admin-reports.js','rotace.js','dashboard.js','export.js','core.js','ui.js','styles.css','assets/a.svg','api/endpoint.js'])fs.appendFileSync(path.join(root,p),'\ncompiled');
 return root;
}
test('only public runtime file extensions and directories enter the canonical overlay',()=>{
 for(const p of ['index.html','api/endpoint.js','assets/a.png','assets/a.svg','package.json'])assert(isRuntimePath(p),p);
 for(const p of ['.env','.env.production.js','tools/release.mjs','supabase/schema.sql','.github/workflows/check.yml','RAK_HANDOFF.md','rak-complete-backup-source.zip','package-lock.json','api/../../.env','node_modules/a.js'])assert(!isRuntimePath(p),p);
});
test('snapshot reads the real tracked HEAD, only changed runtime paths, exact release and TEST configuration',t=>{
 const root=fixture(t),manifest=capture(root);
 assert.equal(manifest.schema,SNAPSHOT_SCHEMA);assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);
 assert(manifest.files.some(f=>f.path==='api/endpoint.js'));
 assert(!manifest.files.some(f=>f.path==='tools/private.js' || f.path==='supabase/secret.sql'));
 assert(manifest.changedPaths.includes('app.js'));
 assert(!manifest.changedPaths.includes('index.html'));
 assert(compareManifests(manifest,capture(root)));
 fs.appendFileSync(path.join(root,'rotace.js'),'regression');
 assert.throws(()=>compareManifests(manifest,capture(root)),/runtime differs.*rotace\.js/s);
});
test('wrong release, production DB or malformed package fails closed',t=>{
 const root=fixture(t);
 fs.writeFileSync(path.join(root,'supabase-config.js'),'bkqamcbkiwumsvelahxr');
 assert.throws(()=>capture(root),/not TEST Supabase/);
 fs.writeFileSync(path.join(root,'supabase-config.js'),'cgshssdjgzzuprlwnabl');
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'1.6.0'}));
 assert.throws(()=>capture(root),/technical version/);
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'1.7.0'}));
 fs.writeFileSync(path.join(root,'index.html'),"var build='bad';");
 assert.throws(()=>capture(root),/wrong HTML build/);
});
test('different SHA and different transformed set cannot pass by matching file count',t=>{
 const a=capture(fixture(t));
 assert.throws(()=>compareManifests(a,{...a,sourceCommit:'0'.repeat(40)}),/HEAD changed/);
 assert.throws(()=>compareManifests(a,{...a,changedPaths:[]}),/changed-path list differs/);
});