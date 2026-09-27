(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.132',
    technicalVersion: '1.7.132',
    moduleCacheVersion: '1.7.132',
    cacheVersion: 'v1.7.132',
    buildId: 'v1.7.132-local-first-startup1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
