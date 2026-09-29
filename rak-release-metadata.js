(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.158',
    technicalVersion: '1.7.158',
    moduleCacheVersion: '1.7.158',
    cacheVersion: 'v1.7.158',
    buildId: 'v1.7.158-calendar-empty-isolated2'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
