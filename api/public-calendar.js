'use strict';

const GOOGLE_CALENDAR_HOST = 'calendar.google.com';
const MAX_ICS_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const { PUBLISHABLE_KEY, supabaseRequest } = require('./_admin-auth');

const PRIVATE_CALENDAR_SOURCE_IDS = new Set([
  'd5be95a22ab9eaad50fbe177a127966aa6cf9542c8d7060f109f8b007d1e22ee@group.calendar.google.com',
  '510fa715a70e00fa40b555ae624f3da8d61dccda4fd9450e73a0798927bcb7bb@group.calendar.google.com',
  'dadcfb3ad2302f9f7819b4a668c0bb72d001b8bf5bcd71f98ef7b85e39a55ae3@group.calendar.google.com',
  '28220cf74cf3681b41feb5c0efa76ef348e52e9a90a9b5300e1dfffbcc96cd62@group.calendar.google.com'
]);

function normalizeCalendarSourceId(value) {
  let raw = String(value || '').trim();
  if (!raw || raw.length > 512 || /[\x00-\x20]/.test(raw)) return '';

  if (!raw.includes('@')) {
    if (!/^[A-Za-z0-9+/_=-]+$/.test(raw)) return '';
    try {
      const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8').trim();
      if (!decoded.includes('@')) return '';
      raw = decoded;
    } catch (_) {
      return '';
    }
  }

  if (raw.length < 3 || raw.length > 320) return '';
  if (raw.includes('/') || raw.includes('\\')) return '';
  if (!/^[A-Za-z0-9._%+@=-]+$/.test(raw) || !raw.includes('@')) return '';
  return raw;
}

function calendarUrl(sourceId) {
  return 'https://' + GOOGLE_CALENDAR_HOST + '/calendar/ical/' + encodeURIComponent(sourceId) + '/public/basic.ics';
}

function validRedirect(value, expectedSourceId) {
  try {
    const parsed = new URL(value);
    const expected = new URL(calendarUrl(expectedSourceId));
    return parsed.protocol === 'https:' &&
      parsed.hostname === GOOGLE_CALENDAR_HOST &&
      parsed.pathname === expected.pathname &&
      !parsed.search &&
      !parsed.hash;
  } catch (_) {
    return false;
  }
}

async function fetchPrivateCalendar(sourceId) {
  if (!PRIVATE_CALENDAR_SOURCE_IDS.has(sourceId)) throw new Error('private_calendar_not_allowed');
  if (!PUBLISHABLE_KEY) throw new Error('private_calendar_backend_not_configured');
  const response = await supabaseRequest('/rest/v1/rpc/rak_calendar_private_feed', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ p_source_id: sourceId })
  });
  if (!response.ok) throw new Error('private_calendar_backend_' + String(response.status));
  const payload = await response.json();
  const text = typeof payload === 'string' ? payload : '';
  if (!text || text.length > MAX_ICS_BYTES || !text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) {
    throw new Error('invalid_private_calendar');
  }
  return text;
}

async function fetchPublicCalendar(sourceId, redirectCount = 0) {
  const target = calendarUrl(sourceId);
  const response = await fetch(target, {
    redirect: 'manual',
    headers: {
      accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
      'user-agent': 'RaK public calendar renderer'
    },
    signal: AbortSignal.timeout(12000)
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) throw new Error('redirect_limit');
    const location = String(response.headers.get('location') || '');
    if (!validRedirect(location, sourceId)) throw new Error('redirect_not_allowed');
    return fetchPublicCalendar(sourceId, redirectCount + 1);
  }
  if (!response.ok) throw new Error('upstream_' + String(response.status));

  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_ICS_BYTES) throw new Error('calendar_too_large');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ICS_BYTES) throw new Error('calendar_too_large');
  const text = new TextDecoder().decode(bytes);
  if (!text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) throw new Error('invalid_calendar');
  return text;
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

module.exports = async function publicCalendar(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    noStore(res);
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const raw = Array.isArray(req.query && req.query.src) ? req.query.src[0] : req.query && req.query.src;
  const sourceId = normalizeCalendarSourceId(raw);
  if (!sourceId) {
    noStore(res);
    return res.status(400).json({ ok: false, error: 'invalid_calendar_source' });
  }

  try {
    const text = PRIVATE_CALENDAR_SOURCE_IDS.has(sourceId)
      ? await fetchPrivateCalendar(sourceId)
      : await fetchPublicCalendar(sourceId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(req.method === 'HEAD' ? '' : text);
  } catch (_) {
    noStore(res);
    return res.status(502).json({ ok: false, error: 'calendar_unavailable' });
  }
};

module.exports._test = { normalizeCalendarSourceId, calendarUrl, validRedirect, PRIVATE_CALENDAR_SOURCE_IDS };
