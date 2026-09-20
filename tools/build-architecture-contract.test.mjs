import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// Temporary migration guard: stop adding version-specific text-rewrite stages.
// Once the canonical source build replaces this legacy chain, remove this guard in
// the same reviewed change and replace it with the new build-contract tests.
test('the legacy rewrite chain is frozen at 1.7.69, without another appended patch', () => {
  const chain = read('tools/development-version-17048.mjs');
  const stages = [...chain.matchAll(/await import\('\.\/development-version-(\d+)\.mjs'\);/g)]
    .map(match => Number(match[1]));
  assert(stages.includes(17048) === false, '17048 is the entrypoint, not an imported stage');
  assert.equal(stages.at(-1), 17069, 'do not append a 1.7.70 rewrite stage');
  assert(stages.every(version => version <= 17069), 'new text-rewrite release stages are forbidden');
  const stageFiles = fs.readdirSync(new URL('./', import.meta.url))
    .filter(name => /^development-version-17\d+\.mjs$/.test(name));
  assert(stageFiles.every(name => Number(name.match(/\d+/)[0]) <= 17069), 'new rewrite scripts require an architectural migration instead');
});

test('legacy quality gates remain intact during the migration', () => {
  const ci = read('.github/workflows/rak-development-validation.yml');
  const chain = read('tools/development-version-17048.mjs');
  for (const version of [17060, 17063, 17068, 17069]) {
    assert(chain.includes(`development-version-${version}.mjs`), `missing stage ${version}`);
  }
  for (const command of [
    'npm run vercel-build\n          npm run vercel-build',
    'node --test tools/release-gate-17068.test.mjs',
    'node --test tools/release-gate-17069.test.mjs',
    'node tools/browser-offline-17052.mjs',
    'node tools/http-anon-audit-17050.mjs'
  ]) assert(ci.includes(command), `missing safety check: ${command}`);
});
