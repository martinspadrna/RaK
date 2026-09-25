(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.107',
    technicalVersion: '1.7.107',
    moduleCacheVersion: '1.7.107',
    cacheVersion: 'v1.7.107',
    buildId: 'v1.7.107-calendar-whatsapp1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
