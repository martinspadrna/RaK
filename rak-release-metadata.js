(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.100',
    technicalVersion: '1.7.100',
    moduleCacheVersion: '1.7.100',
    cacheVersion: 'v1.7.100',
    buildId: 'v1.7.100-iphone-regressions1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);