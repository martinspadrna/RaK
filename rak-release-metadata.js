(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.35',
    visibleTestVersion: '2.0.35',
    technicalVersion: '2.0.35',
    moduleCacheVersion: '2.0.35',
    cacheVersion: 'v2.0.35',
    buildId: 'v2.0.35-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
