(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.144',
    technicalVersion: '1.7.144',
    moduleCacheVersion: '1.7.144',
    cacheVersion: 'v1.7.144',
    buildId: 'v1.7.144-generator-compact1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
