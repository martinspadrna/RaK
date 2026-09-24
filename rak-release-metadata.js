(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.90',
    technicalVersion: '1.7.90',
    moduleCacheVersion: '1.7.90',
    cacheVersion: 'v1.7.90',
    buildId: 'v1.7.90-native-public-calendar1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);