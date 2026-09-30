(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.4',
    technicalVersion: '1.8.4',
    moduleCacheVersion: '1.8.4',
    cacheVersion: 'v1.8.4',
    buildId: 'v1.8.4-admin-diagnostic-copy1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
