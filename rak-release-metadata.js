(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.143',
    technicalVersion: '1.7.143',
    moduleCacheVersion: '1.7.143',
    cacheVersion: 'v1.7.143',
    buildId: 'v1.7.143-rotation-overview2'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
