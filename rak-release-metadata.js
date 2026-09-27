(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.129',
    technicalVersion: '1.7.129',
    moduleCacheVersion: '1.7.129',
    cacheVersion: 'v1.7.129',
    buildId: 'v1.7.129-menu-local-root1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
