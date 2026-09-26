(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.113',
    technicalVersion: '1.7.113',
    moduleCacheVersion: '1.7.113',
    cacheVersion: 'v1.7.113',
    buildId: 'v1.7.113-unplanned-menu-stack1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
