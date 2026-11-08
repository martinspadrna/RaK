(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.47',
    visibleTestVersion: '2.0.47',
    technicalVersion: '2.0.47',
    moduleCacheVersion: '2.0.47',
    cacheVersion: 'v2.0.47',
    buildId: 'v2.0.47-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
