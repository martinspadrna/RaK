(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.92',
    technicalVersion: '1.7.92',
    moduleCacheVersion: '1.7.92',
    cacheVersion: 'v1.7.92',
    buildId: 'v1.7.92-calendar-time-range1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);