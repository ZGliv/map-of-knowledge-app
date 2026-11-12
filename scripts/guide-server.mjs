import { createServer } from 'node:http';
import { createGuideHandler } from '../server/guide-http.mjs';

// No dotenv loading: no ambient provider credentials or other projects' settings
// are consumed. Local Ollama is the default and needs no secret at all.
const handler = createGuideHandler();
const server = createServer((req, res) => {
  if (new URL(req.url || '/', 'http://127.0.0.1').pathname !== '/api/guide') { res.statusCode = 404; res.end('Not found'); return; }
  void handler(req, res);
});
server.requestTimeout = 100000;
server.headersTimeout = 10000;
server.listen(5189, '127.0.0.1', () => process.stdout.write('Map of Knowledge guide listening at http://127.0.0.1:5189 (local Ollama by default)\n'));
server.on('error', error => { process.stderr.write(`The guide server could not start (${error.code || 'server error'}).\n`); process.exitCode = 1; });
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
