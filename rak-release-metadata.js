(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.94',
    technicalVersion: '1.7.94',
    moduleCacheVersion: '1.7.94',
    cacheVersion: 'v1.7.94',
    buildId: 'v1.7.94-calendar-mobile-readability1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);