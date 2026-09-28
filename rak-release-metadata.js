(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.139',
    technicalVersion: '1.7.139',
    moduleCacheVersion: '1.7.139',
    cacheVersion: 'v1.7.139',
    buildId: 'v1.7.139-diagnostic-version1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
