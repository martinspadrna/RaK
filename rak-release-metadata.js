(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.156',
    technicalVersion: '1.7.156',
    moduleCacheVersion: '1.7.156',
    cacheVersion: 'v1.7.156',
    buildId: 'v1.7.156-calendar-empty-state1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
