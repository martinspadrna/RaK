(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.104',
    technicalVersion: '1.7.104',
    moduleCacheVersion: '1.7.104',
    cacheVersion: 'v1.7.104',
    buildId: 'v1.7.104-iphone-retest2'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);