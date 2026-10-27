(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.36',
    visibleTestVersion: '2.0.36',
    technicalVersion: '2.0.36',
    moduleCacheVersion: '2.0.36',
    cacheVersion: 'v2.0.36',
    buildId: 'v2.0.36-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
