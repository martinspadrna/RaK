(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.86',
    technicalVersion: '1.7.86',
    moduleCacheVersion: '1.7.86',
    cacheVersion: 'v1.7.86',
    buildId: 'v1.7.86-shift-calendars1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);