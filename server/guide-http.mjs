import { createGuideRuntime, GuideError, GUIDE_LIMITS } from './guide-runtime.mjs';
import { BudgetError } from './guide-budget.mjs';

const LOCAL_ORIGINS = new Set(['http://127.0.0.1:4178', 'http://localhost:4178', 'http://127.0.0.1:5178', 'http://localhost:5178', 'http://127.0.0.1:5189']);
export function createGuideHandler({ env = process.env, runtime = createGuideRuntime({ env }) } = {}) {
  const hosted = env.VERCEL === '1';
  const origins = hosted ? new Set((env.MOK_GUIDE_ORIGINS || 'https://map-of-knowledge.vercel.app').split(',').map(s => s.trim())) : LOCAL_ORIGINS;
  return async function guideHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    const respond = (status, body) => { if (!res.destroyed && !res.writableEnded) { res.statusCode = status; res.end(JSON.stringify(body)); } };
    if (origin && !origins.has(origin)) { respond(403, { error: 'This origin cannot use the personal guide.', code: 'origin_denied' }); return; }
    if (!hosted) {
      // Binding the listener is not enough: reject DNS-rebinding Host headers.
      const host = String(req.headers.host || '').split(':')[0];
      if (!['127.0.0.1', 'localhost'].includes(host)) { respond(403, { error: 'The guide is available only on this computer.', code: 'host_denied' }); return; }
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-MOK-Access');
      res.statusCode = 204; res.end(); return;
    }
    const accessToken = typeof req.headers['x-mok-access'] === 'string' ? req.headers['x-mok-access'] : '';
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', disconnect);
    req.once('aborted', disconnect);
    try {
      if (req.method === 'GET') { respond(200, await runtime.status(accessToken)); return; }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, OPTIONS'); respond(405, { error: 'Use GET or POST.', code: 'method_not_allowed' }); return; }
      if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new GuideError('Send this question as JSON.', 'invalid_content_type', 415);
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > GUIDE_LIMITS.bodyBytes) throw new GuideError('This question has too much context.', 'request_too_large', 413);
      let value;
      if (req.body !== undefined) {
        // Vercel may parse JSON before invoking the handler. Apply the same size
        // and shape validation again; do not trust its parser's larger default.
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > GUIDE_LIMITS.bodyBytes) throw new GuideError('This question has too much context.', 'request_too_large', 413);
        try { value = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
        catch { throw new GuideError('The question could not be read.', 'invalid_json', 400); }
      } else {
        const chunks = []; let bytes = 0;
        for await (const chunk of req) {
          bytes += Buffer.byteLength(chunk);
          if (bytes > GUIDE_LIMITS.bodyBytes) throw new GuideError('This question has too much context.', 'request_too_large', 413);
          chunks.push(chunk);
        }
        try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { throw new GuideError('The question could not be read.', 'invalid_json', 400); }
      }
      respond(200, await runtime.ask(value, { signal: controller.signal, accessToken }));
    } catch (error) {
      if (error instanceof GuideError || error instanceof BudgetError) respond(error.status, { error: error.message, code: error.code });
      else respond(503, { error: 'The guide is unavailable. Your learning progress is unchanged.', code: 'guide_unavailable' });
    } finally { res.removeListener('close', disconnect); req.removeListener('aborted', disconnect); }
  };
}
