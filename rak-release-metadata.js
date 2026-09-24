(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.93',
    technicalVersion: '1.7.93',
    moduleCacheVersion: '1.7.93',
    cacheVersion: 'v1.7.93',
    buildId: 'v1.7.93-light-calendar-popup1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);