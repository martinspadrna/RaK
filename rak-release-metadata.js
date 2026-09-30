(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.5',
    technicalVersion: '1.8.5',
    moduleCacheVersion: '1.8.5',
    cacheVersion: 'v1.8.5',
    buildId: 'v1.8.5-food-nav-dismiss1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
