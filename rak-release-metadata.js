(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.124',
    technicalVersion: '1.7.124',
    moduleCacheVersion: '1.7.124',
    cacheVersion: 'v1.7.124',
    buildId: 'v1.7.124-admin-password-six1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
