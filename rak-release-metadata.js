(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.101',
    technicalVersion: '1.7.101',
    moduleCacheVersion: '1.7.101',
    cacheVersion: 'v1.7.101',
    buildId: 'v1.7.101-conflict-rescue1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);