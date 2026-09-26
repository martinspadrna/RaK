(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.122',
    technicalVersion: '1.7.122',
    moduleCacheVersion: '1.7.122',
    cacheVersion: 'v1.7.122',
    buildId: 'v1.7.122-mo-only-absence1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
