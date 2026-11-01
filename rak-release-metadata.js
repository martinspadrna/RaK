(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.42',
    visibleTestVersion: '2.0.42',
    technicalVersion: '2.0.42',
    moduleCacheVersion: '2.0.42',
    cacheVersion: 'v2.0.42',
    buildId: 'v2.0.42-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
