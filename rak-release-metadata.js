(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.97',
    technicalVersion: '1.7.97',
    moduleCacheVersion: '1.7.97',
    cacheVersion: 'v1.7.97',
    buildId: 'v1.7.97-calculators-mobile-polish1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);