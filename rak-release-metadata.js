(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.121',
    technicalVersion: '1.7.121',
    moduleCacheVersion: '1.7.121',
    cacheVersion: 'v1.7.121',
    buildId: 'v1.7.121-unplanned-options1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
