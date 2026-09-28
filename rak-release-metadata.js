(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.140',
    technicalVersion: '1.7.140',
    moduleCacheVersion: '1.7.140',
    cacheVersion: 'v1.7.140',
    buildId: 'v1.7.140-admin-ui-compact1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
