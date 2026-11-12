import { createServer } from 'node:http';
import { createUnfurlHandler } from '../server/unfurl.mjs';

// The rich-link reader on this computer, for the dev server's /api/unfurl proxy (vite.config.ts).
const handler = createUnfurlHandler();
const server = createServer((req, res) => {
  if (new URL(req.url || '/', 'http://127.0.0.1').pathname !== '/api/unfurl') { res.statusCode = 404; res.end('Not found'); return; }
  void handler(req, res);
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(5191, '127.0.0.1', () => process.stdout.write('Map of Knowledge link reader listening at http://127.0.0.1:5191/api/unfurl\n'));
server.on('error', error => { process.stderr.write(`The link reader could not start (${error.code || 'server error'}).\n`); process.exitCode = 1; });
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
