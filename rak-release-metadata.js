(function installRakReleaseMetadata(root) {
  const metadata = Object.freeze({
    displayVersion: '1.7.106',
    technicalVersion: '1.7.106',
    moduleCacheVersion: '1.7.106',
    cacheVersion: 'v1.7.106',
    buildId: 'v1.7.106-single-handoff1'
  });
  if (root) root.RAK_RELEASE_METADATA = metadata;
  if (typeof module !== 'undefined' && module.exports) module.exports = metadata;
})(typeof globalThis !== 'undefined' ? globalThis : this);
