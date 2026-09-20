// One content-independent contract for the living thirteen-point roadmap.
// Historical release gates verify the stable taxonomy, while CI verifies current progress.
import assert from 'node:assert/strict';

export const RAK_ROADMAP_IDS = Object.freeze([
  'P0.1','P0.2','P0.3','P0.4','P1.1','P1.2','P1.3','P1.4','P1.5','P2.1','P2.2','P2.3','P2.4'
]);

const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function verifyRoadmapSummary(markdown) {
  assert.equal(typeof markdown, 'string', 'Roadmap must be text');
  const ids = [...markdown.matchAll(/^\| (P[012]\.\d) \|/gm)].map(match => match[1]);
  assert.deepEqual(ids, RAK_ROADMAP_IDS, 'Roadmap must contain exactly thirteen unique, ordered IDs');
  return ids;
}

export function verifyRoadmapProgress(markdown) {
  const ids = verifyRoadmapSummary(markdown);
  const rows = [...markdown.matchAll(/^\| (P[012]\.\d) \|[^\n]*?\| \*\*(\d+) % \((\d+)\/(\d+)\)\*\* \|([^\n]*)$/gm)];
  assert.deepEqual(rows.map(row => row[1]), ids, 'Each roadmap row needs its own numeric percentage and fraction');
  const headings = [...markdown.matchAll(/^### (P[012]\.\d)\s*[–-][^\n]*$/gm)];
  assert.deepEqual(headings.map(heading => heading[1]), ids, 'Each task requires one detailed acceptance section');
  const progress = [];
  for (let index = 0; index < ids.length; index += 1) {
    const heading = headings[index];
    const tail = markdown.slice(heading.index + heading[0].length);
    const boundary = /^(?:## |### |---\s*$)/m.exec(tail);
    const section = boundary ? tail.slice(0, boundary.index) : tail;
    const checks = [...section.matchAll(/^- \[([x ])\] .+$/gm)];
    const completed = checks.filter(check => check[1] === 'x').length;
    const total = checks.length;
    assert(total >= 3, ids[index] + ': at least three explicit acceptance checks are required');
    const row = rows[index];
    const percentage = Number(row[2]);
    assert.equal(Number(row[3]), completed, ids[index] + ': completed count differs from checklist');
    assert.equal(Number(row[4]), total, ids[index] + ': total count differs from checklist');
    assert.equal(percentage, Math.round(completed / total * 100), ids[index] + ': percentage differs from checklist');
    if (ids[index] === 'P0.2') {
      assert(/rizik|rozhodnut/i.test(row[5]), 'P0.2 100% must disclose accepted risk, not claim technical privacy');
      assert(/rizik|rozhodnut/i.test(section), 'P0.2 details must preserve the accepted-risk limitation');
    }
    progress.push(Object.freeze({id:ids[index],completed,total,percentage}));
  }
  return Object.freeze(progress);
}
