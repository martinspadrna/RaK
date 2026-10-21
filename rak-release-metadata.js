(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.31',
    visibleTestVersion: '2.0.31',
    technicalVersion: '2.0.31',
    moduleCacheVersion: '2.0.31',
    cacheVersion: 'v2.0.31',
    buildId: 'v2.0.31-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
