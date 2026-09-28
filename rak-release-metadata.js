(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.148',
    technicalVersion: '1.7.148',
    moduleCacheVersion: '1.7.148',
    cacheVersion: 'v1.7.148',
    buildId: 'v1.7.148-unplanned-local1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
