(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.110',
    technicalVersion: '1.7.110',
    moduleCacheVersion: '1.7.110',
    cacheVersion: 'v1.7.110',
    buildId: 'v1.7.110-whatsapp-shift-label1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
