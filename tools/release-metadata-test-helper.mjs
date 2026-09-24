import assert from 'node:assert/strict';
import RELEASE_METADATA from '../rak-release-metadata.js';

export {RELEASE_METADATA};

export const BUILD_TARGET=String(process.env.RAK_BUILD_TARGET||'test').trim();
assert(['test','production'].includes(BUILD_TARGET),'RAK_BUILD_TARGET must be test or production');

export function assertSupabaseTarget(config,label='release'){
  if(BUILD_TARGET==='production')
    assert(config.includes('bkqamcbkiwumsvelahxr')&&!config.includes('cgshssdjgzzuprlwnabl'),label+' must use production Supabase only');
  else
    assert(config.includes('cgshssdjgzzuprlwnabl')&&!config.includes('bkqamcbkiwumsvelahxr'),label+' must use TEST Supabase only');
}

function patch(version){
  const match=String(version||'').match(/^1\.7\.(\d+)$/);
  assert(match,'invalid display version');
  return Number(match[1]);
}

export function assertCurrentReleaseIdentity(read,minimumVersion){
  const metadata=RELEASE_METADATA;
  assert(patch(metadata.displayVersion)>=patch(minimumVersion),'release regressed below '+minimumVersion);
  assert.equal(metadata.technicalVersion,'1.7.0');
  assert.equal(metadata.moduleCacheVersion,'1.7.0');
  assert.equal(metadata.cacheVersion,'v'+metadata.displayVersion);
  assert(metadata.buildId.startsWith('v'+metadata.displayVersion+'-'));
  assert.equal(JSON.parse(read('package.json')).version,metadata.technicalVersion);

  const index=read('index.html');
  assert(index.includes('<script src="rak-release-metadata.js"></script>'));
  assert(index.indexOf('rak-release-metadata.js')<index.indexOf('rak-dev-17001-update-unblock'));
  assert(index.includes('var build=metadata.buildId;'));

  const app=read('app.js');
  assert(app.includes('const releaseMetadata = window.RAK_RELEASE_METADATA;'));
  assert(app.includes('const RAK_DEV_UPDATE_BUILD = releaseMetadata.buildId;'));
  assert(app.includes('window.RAK_RELEASE_VERSION = releaseMetadata.displayVersion;'));

  const config=read('supabase-config.js');
  assert(config.includes('const rakReleaseMetadata = window.RAK_RELEASE_METADATA;'));
  assert(config.includes('window.RAK_RELEASE_VERSION = rakReleaseMetadata.displayVersion;'));
  assert(config.includes('window.RAK_PWA_BUILD = rakReleaseMetadata.buildId;'));
  assertSupabaseTarget(config,'runtime configuration');

  const sw=read('sw.js');
  assert(sw.indexOf("importScripts('./rak-release-metadata.js')")<sw.indexOf('const CACHE_VERSION'));
  assert(sw.includes('const CACHE_VERSION = RELEASE_METADATA.cacheVersion;'));
  assert(sw.includes('const DEVELOPMENT_TEST_DISPLAY_VERSION = RELEASE_METADATA.displayVersion;'));
  assert(sw.includes('const DEVELOPMENT_BUILD_ID = RELEASE_METADATA.buildId;'));
  assert(sw.includes("'./rak-release-metadata.js'"));
  return metadata;
}
