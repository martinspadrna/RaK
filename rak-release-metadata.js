(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.135',
    technicalVersion: '1.7.135',
    moduleCacheVersion: '1.7.135',
    cacheVersion: 'v1.7.135',
    buildId: 'v1.7.135-role-diagnostic1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
