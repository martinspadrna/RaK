(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.77',
    technicalVersion: '1.7.0',
    moduleCacheVersion: '1.7.0',
    cacheVersion: 'v1.7.77',
    buildId: 'v1.7.77-pwa-durable-rotation1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
