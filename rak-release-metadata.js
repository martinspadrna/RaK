(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.118',
    technicalVersion: '1.7.118',
    moduleCacheVersion: '1.7.118',
    cacheVersion: 'v1.7.118',
    buildId: 'v1.7.118-three-absence-only1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
