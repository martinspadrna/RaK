import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('migrated runtime gates use the shared explicit fixture and no private VM slicing',()=>{
  for(const number of [17067,17068,17069]){
    const source=read('tools/release-gate-'+number+'.test.mjs');
    assert(source.includes("from './runtime-vm-fixture.mjs'"),number+' fixture import');
    assert(!source.includes("from 'node:vm'"),number+' private vm import');
    assert(!/function\\s+(?:excerpt|part|section)\\s*\\(|const\\s+(?:excerpt|part|section)\\s*=/.test(source),number+' local source slicer');
    assert(!/read\\([^)]*\\)[\\s\\S]{0,120}\\.slice\\(/.test(source),number+' comment-bounded slice');
  }
});
test('the fixture itself is exercised by the normal strict check',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert(pkg.scripts.check.includes('tools/runtime-vm-fixture.test.mjs'));
  assert(pkg.scripts.check.includes('tools/stable-runtime-tests-contract.test.mjs'));
});
