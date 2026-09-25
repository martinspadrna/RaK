(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.105',
    technicalVersion: '1.7.105',
    moduleCacheVersion: '1.7.105',
    cacheVersion: 'v1.7.105',
    buildId: 'v1.7.105-diagnostics-privacy1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
