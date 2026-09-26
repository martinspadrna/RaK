(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.127',
    technicalVersion: '1.7.127',
    moduleCacheVersion: '1.7.127',
    cacheVersion: 'v1.7.127',
    buildId: 'v1.7.127-real-interaction1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
