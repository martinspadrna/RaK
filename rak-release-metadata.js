(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.162',
    technicalVersion: '1.7.162',
    moduleCacheVersion: '1.7.162',
    cacheVersion: 'v1.7.162',
    buildId: 'v1.7.162-calendar-zero-size1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
