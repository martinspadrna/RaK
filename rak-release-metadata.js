(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.6',
    technicalVersion: '1.8.6',
    moduleCacheVersion: '1.8.6',
    cacheVersion: 'v1.8.6',
    buildId: 'v1.8.6-deputy-signed-session1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
