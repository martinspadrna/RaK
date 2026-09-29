(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.0',
    technicalVersion: '1.8.0',
    moduleCacheVersion: '1.8.0',
    cacheVersion: 'v1.8.0',
    buildId: 'v1.8.0-about-history1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
