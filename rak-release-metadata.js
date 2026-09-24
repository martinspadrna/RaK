(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.96',
    technicalVersion: '1.7.96',
    moduleCacheVersion: '1.7.96',
    cacheVersion: 'v1.7.96',
    buildId: 'v1.7.96-admin-rotation-workers1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);