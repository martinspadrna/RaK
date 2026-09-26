(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.115',
    technicalVersion: '1.7.115',
    moduleCacheVersion: '1.7.115',
    cacheVersion: 'v1.7.115',
    buildId: 'v1.7.115-unplanned-reasons1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
