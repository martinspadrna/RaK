(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.1',
    technicalVersion: '1.8.1',
    moduleCacheVersion: '1.8.1',
    cacheVersion: 'v1.8.1',
    buildId: 'v1.8.1-about-compact1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
