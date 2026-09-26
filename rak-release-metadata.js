(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.123',
    technicalVersion: '1.7.123',
    moduleCacheVersion: '1.7.123',
    cacheVersion: 'v1.7.123',
    buildId: 'v1.7.123-kalirna-minimal1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
