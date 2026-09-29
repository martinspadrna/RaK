(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.152',
    technicalVersion: '1.7.152',
    moduleCacheVersion: '1.7.152',
    cacheVersion: 'v1.7.152',
    buildId: 'v1.7.152-calendar-nav-dismiss1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
