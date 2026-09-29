(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.149',
    technicalVersion: '1.7.149',
    moduleCacheVersion: '1.7.149',
    cacheVersion: 'v1.7.149',
    buildId: 'v1.7.149-calendar-select1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
