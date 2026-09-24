(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.87',
    technicalVersion: '1.7.87',
    moduleCacheVersion: '1.7.87',
    cacheVersion: 'v1.7.87',
    buildId: 'v1.7.87-public-ics1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);