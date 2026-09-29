(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.153',
    technicalVersion: '1.7.153',
    moduleCacheVersion: '1.7.153',
    cacheVersion: 'v1.7.153',
    buildId: 'v1.7.153-calendar-account-sync1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
