(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.91',
    technicalVersion: '1.7.91',
    moduleCacheVersion: '1.7.91',
    cacheVersion: 'v1.7.91',
    buildId: 'v1.7.91-calendar-shift-labels1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);