(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.109',
    technicalVersion: '1.7.109',
    moduleCacheVersion: '1.7.109',
    cacheVersion: 'v1.7.109',
    buildId: 'v1.7.109-whatsapp-runtime-align1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
