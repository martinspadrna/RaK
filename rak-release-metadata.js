(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.89',
    technicalVersion: '1.7.89',
    moduleCacheVersion: '1.7.89',
    cacheVersion: 'v1.7.89',
    buildId: 'v1.7.89-calendar-account-modal1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);