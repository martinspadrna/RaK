(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.116',
    technicalVersion: '1.7.116',
    moduleCacheVersion: '1.7.116',
    cacheVersion: 'v1.7.116',
    buildId: 'v1.7.116-kalirna-reflow1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
