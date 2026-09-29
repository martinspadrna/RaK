(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.160',
    technicalVersion: '1.7.160',
    moduleCacheVersion: '1.7.160',
    cacheVersion: 'v1.7.160',
    buildId: 'v1.7.160-calendar-legend-account1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
