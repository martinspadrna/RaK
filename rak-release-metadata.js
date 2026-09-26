(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.119',
    technicalVersion: '1.7.119',
    moduleCacheVersion: '1.7.119',
    cacheVersion: 'v1.7.119',
    buildId: 'v1.7.119-unplanned-scope1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
