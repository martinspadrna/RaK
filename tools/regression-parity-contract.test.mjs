import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const exists=path=>fs.existsSync(new URL('../'+path,import.meta.url));
const manifest=JSON.parse(read('tools/regression-parity.json'));
const pkg=JSON.parse(read('package.json'));
const workflow=read('.github/workflows/rak-development-validation.yml');

test('the 1.7.69 reference maps to all seven required post-migration domains',()=>{
  assert.equal(manifest.schema,'rak-regression-parity-v1');
  assert.deepEqual(manifest.baseline,{
    version:'1.7.69',
    sha:'1693c8631c13d6e381e44a96810a55140ad6aa62'
  });
  const ids=manifest.categories.map(category=>category.id);
  assert.deepEqual(ids,['data','rotation','exports','offline','permissions','rollback','speed']);
  assert.equal(new Set(ids).size,7);
});

test('each parity domain retains baseline evidence and runs stronger current evidence',()=>{
  for(const category of manifest.categories){
    assert(category.baselineEvidence.length>0,category.id+' baseline evidence missing');
    for(const path of category.baselineEvidence)assert(exists(path),category.id+' missing baseline '+path);
    assert(category.currentEvidence.length>0,category.id+' current evidence missing');
    for(const evidence of category.currentEvidence){
      assert(exists(evidence.path),category.id+' missing current '+evidence.path);
      assert(read(evidence.path).includes(evidence.marker),category.id+' lost scenario '+evidence.marker);
      const [runner,command]=evidence.runner.split(/:(.+)/);
      if(runner==='package')assert(pkg.scripts.check.includes(command),category.id+' not in npm check: '+command);
      else if(runner==='workflow')assert(workflow.includes(command),category.id+' not in CI: '+command);
      else assert.fail(category.id+' unknown runner '+runner);
    }
  }
});

test('parity stays behind two immutable canonical builds without extending the rewrite chain',()=>{
  assert.equal(pkg.scripts['vercel-build'],'node tools/canonical-build.mjs build');
  assert(pkg.scripts.check.includes('tools/stable-runtime-tests-contract.test.mjs'));
  assert(pkg.scripts.check.includes('tools/regression-parity-contract.test.mjs'));
  assert(workflow.includes('npm run vercel-build\n          npm run vercel-build'));
  assert(workflow.includes('node --test tools/regression-parity-contract.test.mjs'));
  assert(workflow.includes('git diff --exit-code HEAD --'));
  assert(!workflow.includes('node tools/development-version-17070.mjs'));
  assert(!exists('tools/development-version-17070.mjs'));
});
