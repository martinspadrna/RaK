(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.126',
    technicalVersion: '1.7.126',
    moduleCacheVersion: '1.7.126',
    cacheVersion: 'v1.7.126',
    buildId: 'v1.7.126-menu-role-ready1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
