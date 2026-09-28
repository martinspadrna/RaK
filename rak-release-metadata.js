(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.147',
    technicalVersion: '1.7.147',
    moduleCacheVersion: '1.7.147',
    cacheVersion: 'v1.7.147',
    buildId: 'v1.7.147-kalirna-evidence1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
