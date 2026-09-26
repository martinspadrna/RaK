(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.111',
    technicalVersion: '1.7.111',
    moduleCacheVersion: '1.7.111',
    cacheVersion: 'v1.7.111',
    buildId: 'v1.7.111-unplanned-diagnostics1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
