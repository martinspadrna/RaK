(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.145',
    technicalVersion: '1.7.145',
    moduleCacheVersion: '1.7.145',
    cacheVersion: 'v1.7.145',
    buildId: 'v1.7.145-food-compact1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
