(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.130',
    technicalVersion: '1.7.130',
    moduleCacheVersion: '1.7.130',
    cacheVersion: 'v1.7.130',
    buildId: 'v1.7.130-menu-toggle-race1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
