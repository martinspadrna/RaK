(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '2.0.16',
    visibleTestVersion: '2.0.16',
    technicalVersion: '2.0.16',
    moduleCacheVersion: '2.0.16',
    cacheVersion: 'v2.0.16',
    buildId: 'v2.0.16-release1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
