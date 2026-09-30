(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.8.8',
    technicalVersion: '1.8.8',
    moduleCacheVersion: '1.8.8',
    cacheVersion: 'v1.8.8',
    buildId: 'v1.8.8-unplanned-cas-source1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
