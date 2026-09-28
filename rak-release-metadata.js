(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.141',
    technicalVersion: '1.7.141',
    moduleCacheVersion: '1.7.141',
    cacheVersion: 'v1.7.141',
    buildId: 'v1.7.141-local-drafts-panel1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
