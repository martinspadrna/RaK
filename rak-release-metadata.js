(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.44',
    visibleTestVersion: '2.0.44',
    technicalVersion: '2.0.44',
    moduleCacheVersion: '2.0.44',
    cacheVersion: 'v2.0.44',
    buildId: 'v2.0.44-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
