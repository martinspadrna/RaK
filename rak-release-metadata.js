(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.136',
    technicalVersion: '1.7.136',
    moduleCacheVersion: '1.7.136',
    cacheVersion: 'v1.7.136',
    buildId: 'v1.7.136-conflict-diagnostic1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
