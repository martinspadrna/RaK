(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.120',
    technicalVersion: '1.7.120',
    moduleCacheVersion: '1.7.120',
    cacheVersion: 'v1.7.120',
    buildId: 'v1.7.120-unplanned-local1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
