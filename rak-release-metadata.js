(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.2',
    technicalVersion: '1.8.2',
    moduleCacheVersion: '1.8.2',
    cacheVersion: 'v1.8.2',
    buildId: 'v1.8.2-vacation-report-calendar1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
