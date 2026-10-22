// Resolve the smoke/build target for GitHub Actions and native Vercel Git builds.
// Do not rewrite an explicit contradictory value: the existing isolation gates then fail closed.
export function resolveRakBuildTarget(env=process.env){
  const explicit=String(env.RAK_BUILD_TARGET||'').trim();
  if(explicit){
    if(!['test','production'].includes(explicit))throw Error('Unsupported RAK_BUILD_TARGET: '+explicit);
    return explicit;
  }
  const vercel=String(env.VERCEL||'')==='1';
  const production=vercel&&(String(env.VERCEL_ENV||'')==='production'||String(env.VERCEL_GIT_COMMIT_REF||'')==='main');
  return production?'production':'test';
}
