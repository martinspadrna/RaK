(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.138',
    technicalVersion: '1.7.138',
    moduleCacheVersion: '1.7.138',
    cacheVersion: 'v1.7.138',
    buildId: 'v1.7.138-conflict-rescue-routing1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
