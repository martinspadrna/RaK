(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.125',
    technicalVersion: '1.7.125',
    moduleCacheVersion: '1.7.125',
    cacheVersion: 'v1.7.125',
    buildId: 'v1.7.125-early-interaction1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
