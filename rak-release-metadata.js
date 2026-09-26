(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.114',
    technicalVersion: '1.7.114',
    moduleCacheVersion: '1.7.114',
    cacheVersion: 'v1.7.114',
    buildId: 'v1.7.114-unplanned-menu-inline1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
