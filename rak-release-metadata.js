(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.99',
    technicalVersion: '1.7.99',
    moduleCacheVersion: '1.7.99',
    cacheVersion: 'v1.7.99',
    buildId: 'v1.7.99-bug-report-screenshot1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);