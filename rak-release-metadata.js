(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.102',
    technicalVersion: '1.7.102',
    moduleCacheVersion: '1.7.102',
    cacheVersion: 'v1.7.102',
    buildId: 'v1.7.102-server-cas1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);