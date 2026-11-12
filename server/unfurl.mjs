// Rich links: what a web page says about itself (title, description, site name, image), fetched
// on the server so the Library can show a saved link the way the page presents itself.
//
// The server fetches addresses the learner pastes, so every request is treated as hostile:
//   - http and https only, on their default ports, with no credentials in the address;
//   - the host is resolved first and every address it resolves to must be public (no private,
//     loopback, link-local, carrier-grade NAT, metadata, multicast, documentation or reserved
//     ranges, in IPv4 or IPv6, including IPv4 inside IPv6); the connection is then pinned to the
//     address that was checked, so DNS can't change its answer between the check and the connect;
//   - redirects are followed by hand, at most three, and each new address is checked again;
//   - four seconds for everything (DNS, connect, headers, body), and at most 1 MB is read;
//   - only HTML is parsed; no cookies are sent or kept.

import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export const UNFURL_LIMITS = Object.freeze({ timeoutMs: 4000, maxBytes: 1_000_000, maxRedirects: 3, url: 2048, title: 300, description: 500, siteName: 100 });
export const USER_AGENT = 'MapOfKnowledge/0.1 (+https://map-of-knowledge.vercel.app)';
const REQUEST_HEADERS = Object.freeze({ 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1', 'Accept-Language': 'en' });

export class UnfurlError extends Error {
  constructor(message, code) { super(message); this.name = 'UnfurlError'; this.code = code; }
}

// --- addresses -----------------------------------------------------------------------------

const ipv4Number = ip => ip.split('.').reduce((sum, part) => sum * 256 + Number(part), 0);
const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.31.196.0', 24], ['192.52.193.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['192.175.48.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => ({ base: ipv4Number(base), bits }));

/** Private, loopback, link-local (and the cloud metadata address in it), shared, reserved or multicast. */
export function isBlockedIPv4(ip) {
  if (net.isIPv4(ip) !== true) return true;
  const value = ipv4Number(ip);
  return V4_BLOCKED.some(({ base, bits }) => Math.floor(value / 2 ** (32 - bits)) === Math.floor(base / 2 ** (32 - bits)));
}

/** An IPv6 address as eight 16-bit groups (an embedded dotted IPv4 tail is folded in). */
function ipv6Groups(ip) {
  let text = ip.toLowerCase().split('%')[0];
  const tail = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const v4 = ipv4Number(tail[1]);
    text = `${text.slice(0, -tail[1].length)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const [head, rest] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = rest !== undefined && rest ? rest.split(':') : [];
  const fill = rest !== undefined ? new Array(8 - left.length - right.length).fill('0') : [];
  return [...left, ...fill, ...right].map(group => parseInt(group || '0', 16));
}
const bitsOf = groups => groups.map(group => group.toString(2).padStart(16, '0')).join('');
const V6_BLOCKED = [
  ['::', 96], // unspecified, loopback and IPv4-compatible
  ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
].map(([base, bits]) => ({ prefix: bitsOf(ipv6Groups(base)).slice(0, bits) }));

/** Anything outside global unicast (2000::/3), the special blocks inside it, and IPv4 inside IPv6
 * (mapped ::ffff:a.b.c.d and NAT64 64:ff9b::a.b.c.d) judged by the IPv4 address it carries. */
export function isBlockedIPv6(ip) {
  if (net.isIPv6(ip) !== true) return true;
  const groups = ipv6Groups(ip);
  if (groups.length !== 8 || groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)) return true;
  const embedded = () => `${groups[6] >>> 8}.${groups[6] & 0xff}.${groups[7] >>> 8}.${groups[7] & 0xff}`;
  const top96 = groups.slice(0, 6);
  if (top96.every((g, i) => g === (i === 5 ? 0xffff : 0))) return isBlockedIPv4(embedded()); // ::ffff:0:0/96
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every(g => g === 0)) return isBlockedIPv4(embedded()); // 64:ff9b::/96
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups[2] === 1) return true; // 64:ff9b:1::/48, local NAT64
  const bits = bitsOf(groups);
  if (!bits.startsWith('001')) return true; // outside 2000::/3
  return V6_BLOCKED.some(({ prefix }) => bits.startsWith(prefix));
}

export function isBlockedAddress(address) {
  const family = net.isIP(address);
  return family === 4 ? isBlockedIPv4(address) : family === 6 ? isBlockedIPv6(address) : true;
}

// --- addresses the learner pastes ------------------------------------------------------------

const LOCAL_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|home\.arpa|localdomain)$/i;

/** A URL that may be fetched at all, before any lookup: http(s), default port, no credentials, a public-looking host. */
export function checkUrl(input, isBlocked = isBlockedAddress) {
  if (typeof input !== 'string' || !input || input.length > UNFURL_LIMITS.url) throw new UnfurlError('That address cannot be read.', 'invalid_url');
  let url;
  try { url = new URL(input); } catch { throw new UnfurlError('That address cannot be read.', 'invalid_url'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnfurlError('Only web pages can be read.', 'unsupported_scheme');
  if (url.username || url.password) throw new UnfurlError('Addresses with a password are not read.', 'credentials');
  if (url.port) throw new UnfurlError('Only standard web ports are read.', 'unsupported_port');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) throw new UnfurlError('That address has no host.', 'invalid_url');
  if (net.isIP(host)) {
    if (isBlocked(host)) throw new UnfurlError('That address is not a public web page.', 'blocked_address');
  } else if (!host.includes('.') || LOCAL_NAMES.test(host.replace(/\.$/, ''))) {
    throw new UnfurlError('That address is not a public web page.', 'blocked_address');
  }
  url.hash = '';
  return url;
}

/** Every address the host resolves to must be public; the first is the one connected to. */
async function resolvePublic(url, lookup, isBlocked) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const family = net.isIP(host);
  if (family) return { address: host, family };
  let records;
  try { records = await lookup(host, { all: true, verbatim: true, order: 'verbatim' }); } catch { throw new UnfurlError('That site could not be found.', 'dns_failed'); }
  const list = (Array.isArray(records) ? records : [records]).filter(record => record && typeof record.address === 'string');
  if (!list.length) throw new UnfurlError('That site could not be found.', 'dns_failed');
  if (list.some(record => isBlocked(record.address))) throw new UnfurlError('That address is not a public web page.', 'blocked_address');
  return { address: list[0].address, family: net.isIP(list[0].address) };
}

// --- one request -----------------------------------------------------------------------------

/**
 * One GET to an address already checked: the socket connects to `address` (never a fresh lookup),
 * TLS still verifies the certificate for the URL's own host name. No agent, so no pooled sockets
 * and no cookies. Resolves with the status, headers and a capped body reader.
 */
export function requestOnce({ url, address, family, signal, headers }) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const pinned = (_host, options, callback) => {
      const done = typeof options === 'function' ? options : callback;
      if (options && typeof options === 'object' && options.all) done(null, [{ address, family }]);
      else done(null, address, family);
    };
    const request = client.request(url, { method: 'GET', headers, signal, agent: false, lookup: pinned }, response => {
      resolve({
        status: response.statusCode ?? 0,
        headers: response.headers,
        discard: () => response.destroy(),
        read: maxBytes => new Promise((done, fail) => {
          const chunks = [];
          let size = 0;
          let finished = false;
          const finish = () => { if (finished) return; finished = true; done(Buffer.concat(chunks, size)); };
          response.on('data', chunk => {
            if (finished) return;
            const room = maxBytes - size;
            if (chunk.length >= room) { chunks.push(chunk.subarray(0, room)); size += room; finish(); response.destroy(); return; }
            chunks.push(chunk); size += chunk.length;
          });
          response.on('end', finish);
          response.on('close', finish);
          response.on('error', error => { if (!finished) { finished = true; fail(error); } });
        }),
      });
    });
    request.on('error', reject);
    request.end();
  });
}

// --- reading the page ----------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', eacute: 'é', egrave: 'è', aacute: 'á', oacute: 'ó', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç', ntilde: 'ñ' };
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}
const clean = (text, max) => {
  const value = decodeEntities(String(text ?? '').replace(/<[^>]*>/g, ' ')).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

function attributes(tag) {
  const out = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) out[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? '';
  return out;
}

const CHARSET = /charset\s*=\s*["']?([a-z0-9_-]+)/i;
/** The page's own encoding (Content-Type first, then its meta tag), as TextDecoder names it, else UTF-8. */
export function charsetOf(contentType, bytes) {
  const declared = contentType.match(CHARSET)?.[1] ?? Buffer.from(bytes.subarray(0, 4096)).toString('latin1').match(/<meta[^>]+charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1];
  try { return new TextDecoder(declared || 'utf-8').encoding; } catch { return 'utf-8'; }
}

// Some Node builds decode windows-1252 as ISO-8859-1, leaving its curly quotes and dashes as C1 controls.
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
export function decodePage(bytes, encoding) {
  const text = new TextDecoder(encoding).decode(bytes);
  return encoding === 'windows-1252' ? text.replace(/[\u0080-\u009f]/g, c => CP1252[c.charCodeAt(0) - 0x80]) : text;
}

/** "Peppered moth evolution - Wikipedia" → "Peppered moth evolution": a trailing site name is not part of the title. */
export function withoutSiteName(title, siteName, hostname) {
  const names = new Set([siteName, ...hostname.replace(/^www\./, '').split('.').filter(part => part.length > 3)].map(name => name.toLowerCase()));
  const match = title.match(/^(.{8,}?)\s+[-–—|·:]\s+([^-–—|·:]{2,60})$/);
  return match && names.has(match[2].trim().toLowerCase()) ? match[1].trim() : title;
}

/** Title, description, site name and an https image, from the page's head. */
export function parseHtml(html, base) {
  const end = html.search(/<\/head\s*>/i);
  const head = end > 0 ? html.slice(0, end) : html.slice(0, 300_000);
  const meta = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) meta[key] = attrs.content;
  }
  let imageLink = null;
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    if ((attrs.rel || '').toLowerCase().split(/\s+/).includes('image_src') && attrs.href) { imageLink = attrs.href; break; }
  }
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  const siteName = clean(meta['og:site_name'] || meta['application-name'] || base.hostname.replace(/^www\./, ''), UNFURL_LIMITS.siteName);
  const title = withoutSiteName(clean(meta['og:title'] || meta['twitter:title'] || titleTag || '', UNFURL_LIMITS.title), siteName, base.hostname);
  const description = clean(meta['og:description'] || meta['twitter:description'] || meta.description || '', UNFURL_LIMITS.description);
  let image = null;
  for (const candidate of [meta['og:image:secure_url'], meta['og:image'], meta['og:image:url'], meta['twitter:image'], meta['twitter:image:src'], imageLink]) {
    if (!candidate) continue;
    try {
      const resolved = new URL(decodeEntities(candidate.trim()), base);
      if (resolved.protocol === 'https:' && resolved.href.length <= UNFURL_LIMITS.url && !resolved.username && !resolved.password) { image = resolved.href; break; }
    } catch { /* not an address */ }
  }
  return { title, description, siteName, image };
}

// --- unfurl --------------------------------------------------------------------------------

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/**
 * What a page says about itself. Throws UnfurlError with a code (invalid_url, unsupported_scheme,
 * credentials, unsupported_port, blocked_address, dns_failed, too_many_redirects, bad_redirect,
 * upstream_status, not_html, timeout, fetch_failed).
 * `lookup`, `request` and `isBlocked` are injectable for tests only.
 */
export async function unfurl(input, { lookup = dnsLookup, request = requestOnce, isBlocked = isBlockedAddress, timeoutMs = UNFURL_LIMITS.timeoutMs, maxBytes = UNFURL_LIMITS.maxBytes, maxRedirects = UNFURL_LIMITS.maxRedirects } = {}) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new UnfurlError('The page took too long to answer.', 'timeout')); }, timeoutMs); });
  const work = (async () => {
    let url = checkUrl(input, isBlocked);
    for (let hop = 0; ; hop += 1) {
      const { address, family } = await resolvePublic(url, lookup, isBlocked);
      if (controller.signal.aborted) throw new UnfurlError('The page took too long to answer.', 'timeout');
      let response;
      try { response = await request({ url, address, family, signal: controller.signal, headers: { ...REQUEST_HEADERS } }); } catch (error) {
        if (controller.signal.aborted) throw new UnfurlError('The page took too long to answer.', 'timeout');
        throw error instanceof UnfurlError ? error : new UnfurlError('The page could not be reached.', 'fetch_failed');
      }
      if (REDIRECTS.has(response.status)) {
        response.discard?.();
        if (hop >= maxRedirects) throw new UnfurlError('The page redirected too many times.', 'too_many_redirects');
        const location = response.headers?.location;
        if (!location || typeof location !== 'string') throw new UnfurlError('The page redirected nowhere.', 'bad_redirect');
        let next;
        try { next = new URL(location, url).href; } catch { throw new UnfurlError('The page redirected nowhere.', 'bad_redirect'); }
        url = checkUrl(next, isBlocked);
        continue;
      }
      if (response.status < 200 || response.status > 299) { response.discard?.(); throw new UnfurlError('The page did not answer.', 'upstream_status'); }
      const type = String(response.headers?.['content-type'] ?? '').toLowerCase();
      if (!/^\s*(text\/html|application\/xhtml\+xml)\b/.test(type)) { response.discard?.(); throw new UnfurlError('That address is not a web page.', 'not_html'); }
      const bytes = await response.read(maxBytes);
      const html = decodePage(bytes.subarray(0, maxBytes), charsetOf(type, bytes));
      return { url: url.href, ...parseHtml(html, url) };
    }
  })();
  work.catch(() => {}); // a late failure after the deadline has no listener left
  try { return await Promise.race([work, deadline]); }
  catch (error) {
    if (error instanceof UnfurlError) throw error;
    throw new UnfurlError('The page could not be read.', 'fetch_failed');
  } finally { clearTimeout(timer); controller.abort(); }
}

// --- the endpoint --------------------------------------------------------------------------

const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{2,5})?$/;

/** GET /api/unfurl?url=… → { ok: true, url, title, description, siteName, image } or { ok: false, error }.
 * A page that can't be read is an ordinary answer (200, ok: false), so the Library falls back quietly. */
export function createUnfurlHandler({ env = process.env, unfurlPage = unfurl } = {}) {
  const hosted = env.VERCEL === '1';
  const allowed = new Set((env.MOK_UNFURL_ORIGINS || 'https://map-of-knowledge.vercel.app').split(',').map(origin => origin.trim()).filter(Boolean));
  const originAllowed = origin => hosted ? allowed.has(origin) : LOCAL_ORIGIN.test(origin);
  return async function unfurlHandler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const respond = (status, body, cache = 'no-store') => { if (!res.writableEnded) { res.statusCode = status; res.setHeader('Cache-Control', cache); res.end(JSON.stringify(body)); } };
    const origin = req.headers.origin;
    if (origin && !originAllowed(origin)) { respond(403, { ok: false, error: 'origin_denied' }); return; }
    if (!hosted) {
      // The local runner answers this computer only: no DNS-rebinding Host headers.
      const host = String(req.headers.host || '').replace(/:\d+$/, '');
      if (!['127.0.0.1', 'localhost'].includes(host)) { respond(403, { ok: false, error: 'host_denied' }); return; }
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); res.setHeader('Cache-Control', 'no-store'); res.statusCode = 204; res.end(); return; }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET, OPTIONS'); respond(405, { ok: false, error: 'method_not_allowed' }); return; }
    const target = new URL(req.url || '/', 'http://unfurl.invalid').searchParams.get('url');
    if (!target || target.length > UNFURL_LIMITS.url) { respond(400, { ok: false, error: 'invalid_url' }); return; }
    try {
      const page = await unfurlPage(target);
      respond(200, { ok: true, ...page }, 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    } catch (error) {
      respond(200, { ok: false, error: error instanceof UnfurlError ? error.code : 'fetch_failed' });
    }
  };
}
