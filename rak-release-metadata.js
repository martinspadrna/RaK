(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.84',
    technicalVersion: '1.7.0',
    moduleCacheVersion: '1.7.0',
    cacheVersion: 'v1.7.84',
    buildId: 'v1.7.84-local-first-account-sync1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);