(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.3',
    visibleTestVersion: '2.0.3',
    technicalVersion: '2.0.3',
    moduleCacheVersion: '2.0.3',
    cacheVersion: 'v2.0.3',
    buildId: 'v2.0.3-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
