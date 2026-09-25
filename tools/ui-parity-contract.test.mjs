import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('tools/ui-parity-17069.json'));

function git(...args){return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function attr(tag,name){const m=tag.match(new RegExp('\\b'+name+'=["\\\']([^"\\\']*)["\\\']','i'));return m?m[1]:'';}
function pageMap(html){
  const out=new Map();
  for(const m of html.matchAll(/<div\s+id=["']([^"']+)["']\s+class=["']([^"']*\bpage\b[^"']*)["']/gi)){out.set(m[1],m[2].split(/\s+/).filter(Boolean));}
  return out;
}
function navMap(html){
  const out=[];
  for(const m of html.matchAll(/<button\b[^>]*class=["'][^"']*\bbottomNavBtn\b[^"']*["'][^>]*>/gi)){const tag=m[0];out.push({page:attr(tag,'data-page'),action:attr(tag,'data-action')});}
  return out;
}
function escRe(value){return String(value).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');}
function hasSelector(html,selector){
  if(selector.startsWith('#')) return new RegExp('\\bid=["\\\']'+escRe(selector.slice(1))+'["\\\']','i').test(html);
  if(selector.startsWith('.')) return new RegExp('\\bclass=["\\\'][^"\\\']*\\b'+escRe(selector.slice(1))+'\\b','i').test(html);
  throw new Error('unsupported selector '+selector);
}

test('P2.2 UI parity reads immutable 1.7.69 directly from Git',()=>{
  assert.equal(manifest.schema,'rak-ui-parity-v1');
  assert.equal(manifest.baseline.version,'1.7.69');
  assert.equal(git('rev-parse',manifest.baseline.sha+':index.html'),manifest.baseline.indexBlobSha);
  const baseline=git('show',manifest.baseline.sha+':index.html');
  const current=read('index.html');
  const before=pageMap(baseline),after=pageMap(current);
  for(const page of manifest.criticalPages){
    assert(before.has(page.id),'baseline lost critical page '+page.id);
    assert(after.has(page.id),'current build lost critical page '+page.id);
    assert(before.get(page.id).includes('page'),'baseline root is not a page '+page.id);
    assert(after.get(page.id).includes('page'),'current root is not a page '+page.id);
    for(const selector of page.selectors){
      assert(hasSelector(baseline,selector),'baseline selector missing '+selector);
      assert(hasSelector(current,selector),'current selector missing '+selector);
    }
  }
  assert.deepEqual(navMap(baseline),manifest.bottomNav);
  assert.deepEqual(navMap(current),manifest.bottomNav);
});

test('P2.2 UI parity is semantic and browser-enforced, not screenshot/text matching',()=>{
  const workflow=read('.github/workflows/rak-development-validation.yml');
  const browser=read('tools/browser-ui-parity-17104.mjs');
  assert.equal(manifest.viewports.length,2);
  assert(manifest.viewports.some(v=>v.width===390&&v.height===844));
  assert(manifest.viewports.some(v=>v.width===430&&v.height===932));
  assert(workflow.includes('node --test tools/ui-parity-contract.test.mjs'));
  assert(workflow.includes('node tools/browser-ui-parity-17104.mjs'));
  assert(browser.includes("document.querySelectorAll('.page')"));
  assert(browser.includes('document.documentElement.scrollWidth'));
  assert(browser.includes('bottomNavBtn'));
  assert(!browser.includes('pixelmatch'));
});
