(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.3',
    technicalVersion: '1.8.3',
    moduleCacheVersion: '1.8.3',
    cacheVersion: 'v1.8.3',
    buildId: 'v1.8.3-vacation-report-spacing1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
