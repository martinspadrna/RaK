(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.117',
    technicalVersion: '1.7.117',
    moduleCacheVersion: '1.7.117',
    cacheVersion: 'v1.7.117',
    buildId: 'v1.7.117-tpkw02-four-absence1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
