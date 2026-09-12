// RaK 1.6.06 – development service-worker wrapper pro správné číslo testovací aktualizace.
const RAK_TEST_DISPLAY_VERSION = '1.6.06';

self.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : {};
  if (data.type !== 'GET_VERSION' || !event.source) return;
  try { event.stopImmediatePropagation(); } catch (_) {}
  try {
    event.source.postMessage({
      type: 'sw-version',
      version: 'v1.6.0',
      appVersion: '1.6.0',
      testDisplayVersion: RAK_TEST_DISPLAY_VERSION
    });
  } catch (_) {}
});

// Zachováme ověřený PWA lifecycle z 1.6.05; wrapper mění jen identitu test buildu
// a tím vynutí nový waiting worker bez zásahu do potvrzovaného skipWaiting flow.
importScripts('./sw.js?v=1.6.05-base');
