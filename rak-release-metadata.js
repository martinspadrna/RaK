(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.9.0',
    visibleTestVersion: '1.9.13',
    technicalVersion: '1.9.0',
    moduleCacheVersion: '1.9.0',
    cacheVersion: 'v1.9.0',
    buildId: 'v1.9.0-shift-overview13'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
