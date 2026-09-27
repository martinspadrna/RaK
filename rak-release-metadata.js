(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.128',
    technicalVersion: '1.7.128',
    moduleCacheVersion: '1.7.128',
    cacheVersion: 'v1.7.128',
    buildId: 'v1.7.128-shift-calendar-absence1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
