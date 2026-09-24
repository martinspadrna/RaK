(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.95',
    technicalVersion: '1.7.95',
    moduleCacheVersion: '1.7.95',
    cacheVersion: 'v1.7.95',
    buildId: 'v1.7.95-google-shift-iframe1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);