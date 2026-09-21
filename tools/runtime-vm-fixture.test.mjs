import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryStorage,evaluateExpression,extractConditionalBlock,extractNamedDeclaration,extractNamedDeclarations,runNamedDeclarations} from './runtime-vm-fixture.mjs';

const sample=[
  'const seed={value:2};',
  'async function target(input={value:1}) {',
  '  const text="brace } and "+input.value;',
  '  // a comment with }',
  '  if(input.value){return {text,total:seed.value+input.value};}',
  '  return null;',
  '}',
  "function next(){return 'untouched';}"
].join('\n');
test('named declarations use syntax boundaries instead of comment markers',async()=>{
  const declaration=extractNamedDeclaration(sample,'target');
  assert(declaration.includes('brace }'));
  assert(!declaration.includes('function next'));
  const all=extractNamedDeclarations([{source:sample,names:['target','seed']}]);
  assert(all.indexOf('const seed')<all.indexOf('function target'));
  const run=runNamedDeclarations({modules:[{source:sample,names:['seed','target']}],exports:{target:'target'}});
  assert.equal((await run.api.target({value:3})).total,5);
});
test('conditional blocks stop at the matched syntax block',()=>{
  const source="function action(v){if(v==='safe'){const x={ok:true};return x;} if(v==='other'){return null;}}";
  const block=extractConditionalBlock(source,"if(v==='safe')");
  assert(block.includes('return x;'));assert(!block.includes("v==='other'"));
});
test('shared browser globals provide one memory storage and window identity',()=>{
  const storage=createMemoryStorage({a:'1'});
  const value=evaluateExpression("localStorage.setItem('b','2'); window.localStorage===localStorage && document.readyState==='loading'",{localStorage:storage});
  assert.equal(value,true);assert.deepEqual(storage.snapshot(),{a:'1',b:'2'});
});
test('missing declarations and malformed blocks fail closed',()=>{
  assert.throws(()=>extractNamedDeclaration(sample,'missing'),/declaration not found/);
  assert.throws(()=>extractConditionalBlock('if(true){','if(true)'),/unterminated/);
});
