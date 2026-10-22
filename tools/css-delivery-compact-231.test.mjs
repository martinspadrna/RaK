import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compactPublishedCss} from './canonical-build.mjs';

test('published CSS removes only comments and indentation, preserving selectors and values',()=>{
  const input='/* ordinary comment */\n  .a .b {\n    content: "a /* literal */ \\"b\\"";\n    width: calc(1px + 2px);\n  }\n\n  .a:hover { color: red; }\n';
  const output=compactPublishedCss(input);
  assert(!output.includes('ordinary comment'));
  assert(output.includes('.a .b {'),'descendant combinator must remain');
  assert(output.includes('content: "a /* literal */ \\"b\\"";'),'quoted comment and escaped quotes must remain');
  assert(output.includes('calc(1px + 2px)'),'calc whitespace matters');
  assert(output.includes('.a:hover'),'pseudo selector preserved');
  assert.equal(compactPublishedCss(output),output,'compaction must be idempotent');
});

test('published CSS reduces static size without changing tracked source or tight performance budget',()=>{
  let saved=0;
  for(const name of ['styles-overrides-legacy-early.css','styles-admin-polish.css']){
    const source=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
    const compact=compactPublishedCss(source);
    assert(compact.length<source.length,'unchanged CSS '+name);
    saved+=Buffer.byteLength(source)-Buffer.byteLength(compact);
  }
  assert(saved>16837,'must save more than the measured 16,837B CI regression without loosening any hard budget');
  const limits=JSON.parse(fs.readFileSync(new URL('performance-budget-17104.json',import.meta.url),'utf8'));
  assert.equal(limits.sizeGroups.rootJsCssSurface.maxBytes,4796255,'production hard size ceiling is immutable');
});
