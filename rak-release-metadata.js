(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.7',
    technicalVersion: '1.8.7',
    moduleCacheVersion: '1.8.7',
    cacheVersion: 'v1.8.7',
    buildId: 'v1.8.7-live-auth-source1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
