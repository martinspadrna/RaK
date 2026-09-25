(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.103',
    technicalVersion: '1.7.103',
    moduleCacheVersion: '1.7.103',
    cacheVersion: 'v1.7.103',
    buildId: 'v1.7.103-iphone-retest1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);