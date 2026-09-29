(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.161',
    technicalVersion: '1.7.161',
    moduleCacheVersion: '1.7.161',
    cacheVersion: 'v1.7.161',
    buildId: 'v1.7.161-calendar-zero-local1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
