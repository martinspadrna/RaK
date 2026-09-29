(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.154',
    technicalVersion: '1.7.154',
    moduleCacheVersion: '1.7.154',
    cacheVersion: 'v1.7.154',
    buildId: 'v1.7.154-calendar-legend-toggle1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
