(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.85',
    technicalVersion: '1.7.85',
    moduleCacheVersion: '1.7.85',
    cacheVersion: 'v1.7.85',
    buildId: 'v1.7.85-pwa-update-delivery1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);