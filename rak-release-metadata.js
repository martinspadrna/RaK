(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.30',
    visibleTestVersion: '2.0.30',
    technicalVersion: '2.0.30',
    moduleCacheVersion: '2.0.30',
    cacheVersion: 'v2.0.30',
    buildId: 'v2.0.30-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
