(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.112',
    technicalVersion: '1.7.112',
    moduleCacheVersion: '1.7.112',
    cacheVersion: 'v1.7.112',
    buildId: 'v1.7.112-unplanned-popup1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
