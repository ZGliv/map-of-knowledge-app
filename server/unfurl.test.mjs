import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { checkUrl, createUnfurlHandler, isBlockedAddress, isBlockedIPv4, isBlockedIPv6, parseHtml, requestOnce, unfurl, UnfurlError, USER_AGENT, withoutSiteName } from './unfurl.mjs';

const PUBLIC_V4 = '93.184.215.14';
const page = (html, headers = {}) => ({
  status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...headers }, discard: vi.fn(),
  read: vi.fn(async max => Buffer.from(html).subarray(0, max)),
});
const redirect = (location, status = 302) => ({ status, headers: { location }, discard: vi.fn(), read: vi.fn() });
const resolveTo = map => vi.fn(async host => {
  const value = map[host];
  if (!value) throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
  return (Array.isArray(value) ? value : [value]).map(address => ({ address, family: address.includes(':') ? 6 : 4 }));
});
const code = async promise => { try { await promise; return 'ok'; } catch (error) { return error instanceof UnfurlError ? error.code : `unexpected: ${error}`; } };

describe('addresses that are never fetched', () => {
  it.each([
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '100.127.255.254', '127.0.0.1', '127.255.255.255', '169.254.169.254', '169.254.0.1',
    '172.16.0.1', '172.31.255.255', '192.0.0.192', '192.0.2.5', '192.168.1.1', '198.18.0.1', '198.51.100.7', '203.0.113.9',
    '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
  ])('IPv4 %s (private, loopback, link-local, metadata, shared, reserved, multicast)', ip => {
    expect(isBlockedIPv4(ip)).toBe(true);
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', PUBLIC_V4, '172.32.0.1', '100.128.0.1', '192.169.0.1', '11.0.0.1'])('IPv4 %s is public', ip => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it.each([
    '::', '::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '::ffff:7f00:1', '::127.0.0.1',
    '64:ff9b::a9fe:a9fe', '64:ff9b:1::1', 'fc00::1', 'fd00:ec2::254', 'fe80::1', 'fec0::1', 'ff02::1', '2001:db8::1',
    '2002:7f00:1::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '100::1', '3fff::1', '4000::1',
  ])('IPv6 %s (loopback, IPv4 inside IPv6, unique-local, link-local, multicast, documentation, 6to4, Teredo, outside global unicast)', ip => {
    expect(isBlockedIPv6(ip)).toBe(true);
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['2606:4700:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8', '64:ff9b::808:808'])('IPv6 %s is public', ip => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  it('treats anything that is not an address as blocked', () => {
    expect(isBlockedAddress('example.org')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('addresses the learner pastes', () => {
  it.each([
    ['ftp://example.org/file', 'unsupported_scheme'], ['file:///etc/passwd', 'unsupported_scheme'], ['javascript:alert(1)', 'unsupported_scheme'],
    ['data:text/html,<b>x</b>', 'unsupported_scheme'], ['gopher://example.org/', 'unsupported_scheme'],
    ['http://user:pass@example.org/', 'credentials'], ['http://example.org:8080/', 'unsupported_port'], ['https://example.org:22/', 'unsupported_port'],
    ['https://localhost/', 'blocked_address'], ['http://dev.localhost/', 'blocked_address'], ['http://127.0.0.1/', 'blocked_address'],
    ['http://[::1]/', 'blocked_address'], ['http://[::ffff:127.0.0.1]/', 'blocked_address'], ['http://2130706433/', 'blocked_address'],
    ['http://0x7f.0.0.1/', 'blocked_address'], ['http://0177.0.0.1/', 'blocked_address'], ['http://169.254.169.254/latest/meta-data/', 'blocked_address'],
    ['http://metadata.google.internal/computeMetadata/v1/', 'blocked_address'], ['http://printer.local/', 'blocked_address'],
    ['http://intranet/', 'blocked_address'], ['http://[fd00::1]/', 'blocked_address'], ['not a url', 'invalid_url'], [`https://example.org/${'a'.repeat(2100)}`, 'invalid_url'],
  ])('refuses %s', async (input, expected) => {
    expect(await code((async () => checkUrl(input))())).toBe(expected);
  });

  it('accepts public web pages and drops the fragment', () => {
    expect(checkUrl('https://en.wikipedia.org/wiki/Peppered_moth_evolution#History').href).toBe('https://en.wikipedia.org/wiki/Peppered_moth_evolution');
    expect(checkUrl('http://example.org').href).toBe('http://example.org/');
    expect(checkUrl(`http://${PUBLIC_V4}/`).hostname).toBe(PUBLIC_V4);
  });
});

describe('resolving before connecting', () => {
  it('refuses a public-looking name that resolves to a private address, without connecting', async () => {
    const request = vi.fn();
    expect(await code(unfurl('https://evil.example/', { lookup: resolveTo({ 'evil.example': '10.0.0.7' }), request }))).toBe('blocked_address');
    expect(await code(unfurl('https://meta.example/', { lookup: resolveTo({ 'meta.example': '169.254.169.254' }), request }))).toBe('blocked_address');
    expect(await code(unfurl('https://six.example/', { lookup: resolveTo({ 'six.example': '::ffff:127.0.0.1' }), request }))).toBe('blocked_address');
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a name with any private address among its answers', async () => {
    const request = vi.fn();
    expect(await code(unfurl('https://mixed.example/', { lookup: resolveTo({ 'mixed.example': [PUBLIC_V4, '127.0.0.1'] }), request }))).toBe('blocked_address');
    expect(request).not.toHaveBeenCalled();
  });

  it('connects to the very address it checked (no second lookup can change it)', async () => {
    const request = vi.fn(async () => page('<title>Pinned</title>'));
    const result = await unfurl('https://pinned.example/a', { lookup: resolveTo({ 'pinned.example': PUBLIC_V4 }), request });
    expect(result.title).toBe('Pinned');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({ address: PUBLIC_V4, family: 4 });
    expect(request.mock.calls[0][0].url.href).toBe('https://pinned.example/a');
  });

  it('reports a name that does not resolve', async () => {
    expect(await code(unfurl('https://nowhere.example/', { lookup: resolveTo({}), request: vi.fn() }))).toBe('dns_failed');
  });
});

describe('redirects', () => {
  const lookup = resolveTo({ 'a.example': PUBLIC_V4, 'b.example': PUBLIC_V4, 'c.example': PUBLIC_V4, 'd.example': PUBLIC_V4, 'e.example': PUBLIC_V4, 'inside.example': '192.168.0.10' });

  it('re-checks every hop: a redirect to the metadata address is refused', async () => {
    const request = vi.fn(async ({ url }) => url.hostname === 'a.example' ? redirect('http://169.254.169.254/latest/meta-data/iam') : page('<title>x</title>'));
    expect(await code(unfurl('https://a.example/', { lookup, request }))).toBe('blocked_address');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('re-resolves every hop: a redirect to a name that resolves privately is refused', async () => {
    const request = vi.fn(async ({ url }) => url.hostname === 'a.example' ? redirect('https://inside.example/admin', 301) : page('<title>x</title>'));
    expect(await code(unfurl('https://a.example/', { lookup, request }))).toBe('blocked_address');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to another scheme, port or loopback', async () => {
    for (const location of ['ftp://b.example/x', 'https://b.example:8443/', 'http://[::1]/', 'http://localhost/']) {
      const request = vi.fn(async () => redirect(location));
      expect(await code(unfurl('https://a.example/', { lookup, request }))).not.toBe('ok');
    }
  });

  it('follows at most three', async () => {
    const chain = { 'a.example': 'https://b.example/', 'b.example': 'https://c.example/', 'c.example': 'https://d.example/', 'd.example': 'https://e.example/' };
    const request = vi.fn(async ({ url }) => chain[url.hostname] ? redirect(chain[url.hostname], 307) : page('<title>End</title>'));
    expect(await code(unfurl('https://a.example/', { lookup, request }))).toBe('too_many_redirects');
    expect(request).toHaveBeenCalledTimes(4);
    const three = vi.fn(async ({ url }) => url.hostname !== 'd.example' ? redirect(chain[url.hostname], 308) : page('<title>Three hops</title>'));
    expect(await unfurl('https://a.example/', { lookup, request: three })).toMatchObject({ title: 'Three hops', url: 'https://d.example/' });
  });

  it('resolves a relative redirect against the page that sent it', async () => {
    const request = vi.fn(async ({ url }) => url.pathname === '/old' ? redirect('/new?x=1') : page('<title>New</title>'));
    expect(await unfurl('https://a.example/old', { lookup, request })).toMatchObject({ url: 'https://a.example/new?x=1', title: 'New' });
  });
});

describe('reading the answer', () => {
  const lookup = resolveTo({ 'site.example': PUBLIC_V4 });

  it('gives up after the time limit', async () => {
    const request = vi.fn(() => new Promise(() => {}));
    const started = Date.now();
    expect(await code(unfurl('https://site.example/', { lookup, request, timeoutMs: 60 }))).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('counts slow DNS against the same limit', async () => {
    const slow = vi.fn(() => new Promise(() => {}));
    expect(await code(unfurl('https://site.example/', { lookup: slow, request: vi.fn(), timeoutMs: 60 }))).toBe('timeout');
  });

  it('reads at most the byte cap', async () => {
    const huge = `<html><head><title>Big page</title></head><body>${'x'.repeat(2_000_000)}</body></html>`;
    const response = page(huge);
    expect(await unfurl('https://site.example/', { lookup, request: async () => response, maxBytes: 1_000_000 })).toMatchObject({ title: 'Big page' });
    expect(response.read).toHaveBeenCalledWith(1_000_000);
  });

  it('parses HTML only', async () => {
    for (const type of ['image/png', 'application/json', 'application/pdf', 'text/plain', '']) {
      const response = page('<title>x</title>', { 'content-type': type });
      expect(await code(unfurl('https://site.example/', { lookup, request: async () => response }))).toBe('not_html');
      expect(response.read).not.toHaveBeenCalled();
    }
    expect(await unfurl('https://site.example/', { lookup, request: async () => page('<title>XHTML</title>', { 'content-type': 'application/xhtml+xml' }) })).toMatchObject({ title: 'XHTML' });
  });

  it('reports a page that does not answer 2xx', async () => {
    expect(await code(unfurl('https://site.example/', { lookup, request: async () => ({ ...page(''), status: 404 }) }))).toBe('upstream_status');
    expect(await code(unfurl('https://site.example/', { lookup, request: async () => { throw new Error('ECONNRESET'); } }))).toBe('fetch_failed');
  });

  it('sends no cookies and keeps none', async () => {
    const request = vi.fn(async () => page('<title>Cookie jar</title>', { 'set-cookie': ['session=secret; HttpOnly'] }));
    const result = await unfurl('https://site.example/', { lookup, request });
    const headers = request.mock.calls[0][0].headers;
    expect(Object.keys(headers).map(h => h.toLowerCase())).not.toContain('cookie');
    expect(headers['User-Agent']).toBe(USER_AGENT);
    expect(JSON.stringify(result)).not.toContain('secret');
    const second = vi.fn(async () => page('<title>Again</title>'));
    await unfurl('https://site.example/', { lookup, request: second });
    expect(Object.keys(second.mock.calls[0][0].headers).map(h => h.toLowerCase())).not.toContain('cookie');
  });
});

describe('what a page says about itself', () => {
  const base = new URL('https://www.example.org/articles/moth');
  it('prefers Open Graph, then Twitter, then the title and description tags', () => {
    expect(parseHtml(`<head><title>Fallback</title><meta property="og:title" content="The &quot;peppered&quot; moth &amp; its kin">
      <meta name="description" content="Plain description"><meta property="og:site_name" content="Example Science">
      <meta property="og:image" content="/img/moth.jpg"></head>`, base)).toEqual({
      title: 'The "peppered" moth & its kin', description: 'Plain description', siteName: 'Example Science', image: 'https://www.example.org/img/moth.jpg',
    });
    expect(parseHtml('<head><title> A   title\n</title></head>', base)).toEqual({ title: 'A title', description: '', siteName: 'example.org', image: null });
    expect(parseHtml(`<head><meta content='Single quoted' name='twitter:title'><meta name="twitter:image" content="https://cdn.example.org/a.png"></head>`, base))
      .toMatchObject({ title: 'Single quoted', image: 'https://cdn.example.org/a.png' });
  });

  it('drops a trailing site name from the title, and only that', () => {
    expect(withoutSiteName('Peppered moth evolution - Wikipedia', 'en.wikipedia.org', 'en.wikipedia.org')).toBe('Peppered moth evolution');
    expect(withoutSiteName('Galapagos Finch Evolution — HHMI BioInteractive Video', 'YouTube', 'www.youtube.com')).toBe('Galapagos Finch Evolution — HHMI BioInteractive Video');
    expect(withoutSiteName('Why we sleep | Example Science', 'Example Science', 'www.example.org')).toBe('Why we sleep');
    expect(withoutSiteName('Wikipedia', 'Wikipedia', 'en.wikipedia.org')).toBe('Wikipedia');
  });

  it('keeps only https images and trims long text', () => {
    expect(parseHtml('<head><meta property="og:image" content="http://insecure.example/a.jpg"></head>', base).image).toBeNull();
    expect(parseHtml('<head><meta property="og:image" content="javascript:alert(1)"></head>', base).image).toBeNull();
    expect(parseHtml(`<head><meta property="og:description" content="${'word '.repeat(300)}"></head>`, base).description.length).toBeLessThanOrEqual(500);
  });

  it('decodes the page’s own encoding', async () => {
    const bytes = Buffer.from('<head><meta charset="windows-1252"><title>Caf\xe9 \x93quoted\x94</title></head>', 'latin1');
    const response = { status: 200, headers: { 'content-type': 'text/html' }, discard: vi.fn(), read: async () => bytes };
    expect((await unfurl('https://site.example/', { lookup: resolveTo({ 'site.example': PUBLIC_V4 }), request: async () => response })).title).toBe('Café “quoted”');
  });
});

describe('the real transport', () => {
  const servers = [];
  afterEach(async () => { for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } });
  const listen = handler => new Promise(resolve => { const server = createServer(handler); servers.push(server); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); });

  it('connects to the pinned address while naming the host, and stops reading at the cap', async () => {
    let seen;
    let wrote = 0;
    const port = await listen((req, res) => {
      seen = { host: req.headers.host, cookie: req.headers.cookie, agent: req.headers['user-agent'] };
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const chunk = Buffer.alloc(64 * 1024, 'a');
      const pump = () => { while (wrote < 3_000_000) { wrote += chunk.length; if (!res.write(chunk)) { res.once('drain', pump); return; } } res.end(); };
      res.on('error', () => {});
      pump();
    });
    // "pinned.invalid" never resolves: the socket can only reach the server through the pinned address.
    const response = await requestOnce({ url: new URL(`http://pinned.invalid:${port}/page`), address: '127.0.0.1', family: 4, headers: { 'User-Agent': USER_AGENT } });
    const body = await response.read(100_000);
    expect(body.length).toBe(100_000);
    expect(seen).toEqual({ host: `pinned.invalid:${port}`, cookie: undefined, agent: USER_AGENT });
  });

  it('aborts on the signal', async () => {
    const port = await listen(() => { /* never answers */ });
    const controller = new AbortController();
    const pending = requestOnce({ url: new URL(`http://pinned.invalid:${port}/`), address: '127.0.0.1', family: 4, signal: controller.signal, headers: {} });
    setTimeout(() => controller.abort(), 30);
    await expect(pending).rejects.toThrow();
  });
});

describe('the endpoint', () => {
  const call = async (handler, { method = 'GET', url = '/api/unfurl?url=https%3A%2F%2Fexample.org%2F', headers = { host: '127.0.0.1:5191' } } = {}) => {
    const res = { headers: {}, statusCode: 0, body: '', writableEnded: false, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(body = '') { this.body = body; this.writableEnded = true; } };
    await handler({ method, url, headers }, res);
    return { status: res.statusCode, headers: res.headers, json: res.body ? JSON.parse(res.body) : null };
  };
  const ok = async () => ({ url: 'https://example.org/', title: 'Example', description: '', siteName: 'example.org', image: null });

  it('answers a page, cacheable, with no cookies', async () => {
    const response = await call(createUnfurlHandler({ env: {}, unfurlPage: ok }));
    expect(response).toMatchObject({ status: 200, json: { ok: true, title: 'Example' } });
    expect(response.headers['cache-control']).toMatch(/s-maxage/);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('answers a refused or failed page quietly, uncached', async () => {
    const refuse = async () => { throw new UnfurlError('no', 'blocked_address'); };
    const response = await call(createUnfurlHandler({ env: {}, unfurlPage: refuse }));
    expect(response).toMatchObject({ status: 200, json: { ok: false, error: 'blocked_address' } });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('refuses other sites, other hosts locally, other methods and a missing address', async () => {
    const handler = createUnfurlHandler({ env: {}, unfurlPage: ok });
    expect((await call(handler, { headers: { host: '127.0.0.1:5191', origin: 'https://evil.example' } })).status).toBe(403);
    expect((await call(handler, { headers: { host: 'rebind.evil.example:5191' } })).status).toBe(403);
    expect((await call(handler, { method: 'POST' })).status).toBe(405);
    expect((await call(handler, { url: '/api/unfurl' })).status).toBe(400);
    expect((await call(handler, { method: 'OPTIONS', headers: { host: '127.0.0.1:5191', origin: 'http://127.0.0.1:5228' } })).status).toBe(204);
    const hosted = createUnfurlHandler({ env: { VERCEL: '1' }, unfurlPage: ok });
    expect((await call(hosted, { headers: { host: 'map-of-knowledge.vercel.app', origin: 'https://map-of-knowledge.vercel.app' } })).status).toBe(200);
    expect((await call(hosted, { headers: { host: 'map-of-knowledge.vercel.app', origin: 'http://127.0.0.1:5228' } })).status).toBe(403);
  });
});
