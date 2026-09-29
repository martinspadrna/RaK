(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.165',
    technicalVersion: '1.7.165',
    moduleCacheVersion: '1.7.165',
    cacheVersion: 'v1.7.165',
    buildId: 'v1.7.165-sign-frezky-parity1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
