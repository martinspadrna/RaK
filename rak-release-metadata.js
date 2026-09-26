(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.108',
    technicalVersion: '1.7.108',
    moduleCacheVersion: '1.7.108',
    cacheVersion: 'v1.7.108',
    buildId: 'v1.7.108-whatsapp-caption1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
