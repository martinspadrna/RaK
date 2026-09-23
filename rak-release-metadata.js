(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.78',
    technicalVersion: '1.7.0',
    moduleCacheVersion: '1.7.0',
    cacheVersion: 'v1.7.78',
    buildId: 'v1.7.78-pwa-durable-rotation-export-privacy1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);