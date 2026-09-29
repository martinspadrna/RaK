(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.150',
    technicalVersion: '1.7.150',
    moduleCacheVersion: '1.7.150',
    cacheVersion: 'v1.7.150',
    buildId: 'v1.7.150-google-calendar-hybrid1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
