(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.142',
    technicalVersion: '1.7.142',
    moduleCacheVersion: '1.7.142',
    cacheVersion: 'v1.7.142',
    buildId: 'v1.7.142-rotation-overview1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
