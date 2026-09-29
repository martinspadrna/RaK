(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.157',
    technicalVersion: '1.7.157',
    moduleCacheVersion: '1.7.157',
    cacheVersion: 'v1.7.157',
    buildId: 'v1.7.157-calendar-empty-isolated1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
