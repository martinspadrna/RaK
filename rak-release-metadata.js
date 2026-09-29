(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.151',
    technicalVersion: '1.7.151',
    moduleCacheVersion: '1.7.151',
    cacheVersion: 'v1.7.151',
    buildId: 'v1.7.151-google-calendar-all1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
