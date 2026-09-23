// Conservative deployment policy: only explicitly verified non-runtime changes may skip a build.
// Unknown metadata, unrecognized files and missing previous SHAs always request a build.
const RELEASE_BRANCHES = new Set(['development', 'main']);
// Fail closed: only these exact documentation families are proven unable to change
// runtime, CI execution or build output. Workflow and executable/test files build.
const NON_RUNTIME_PATHS = [
  /^RAK_HANDOFF\.md$/,
  /^RAK_PLAN_13\.md$/,
  /^RAK_PLAN_17\d+_STATUS\.md$/,
  /^RAK_STABILIZATION_PLAN\.md$/,
  /^SECURITY_DEPLOYMENT\.md$/
];
export function classifyVercelBuild({ branch = '', previous = '', files = null } = {}) {
  const ref = String(branch || '').trim();
  if (ref && !RELEASE_BRANCHES.has(ref)) {
    return { skip: true, reason: 'non-release-branch' };
  }
  if (!/^[0-9a-f]{40}$/i.test(String(previous || '').trim())) {
    return { skip: false, reason: 'missing-or-invalid-previous-sha' };
  }
  if (!Array.isArray(files)) return { skip: false, reason: 'unverified-diff' };
  if (files.length === 0) return { skip: true, reason: 'no-changes' };
  const verificationOnly = files.every(file =>
    typeof file === 'string' && file.length > 0 &&
    !file.includes('..') && !file.includes('\\') &&
    NON_RUNTIME_PATHS.some(pattern => pattern.test(file))
  );
  return verificationOnly
    ? { skip: true, reason: 'verification-or-documentation-only' }
    : { skip: false, reason: 'runtime-or-unknown-change' };
}
