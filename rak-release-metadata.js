(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.88',
    technicalVersion: '1.7.88',
    moduleCacheVersion: '1.7.88',
    cacheVersion: 'v1.7.88',
    buildId: 'v1.7.88-calendar-admin-ui1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);