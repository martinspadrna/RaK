(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.98',
    technicalVersion: '1.7.98',
    moduleCacheVersion: '1.7.98',
    cacheVersion: 'v1.7.98',
    buildId: 'v1.7.98-chunked-complete-backup1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);