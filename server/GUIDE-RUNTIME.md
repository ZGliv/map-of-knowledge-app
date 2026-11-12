# Map of Knowledge guide runtime

The default engine is an installed **qwen3:8b** running through Ollama on this Mac. The app sends its bounded, relevant learner context to `127.0.0.1:5189`; that server calls `127.0.0.1:11434/api/chat`. No provider API key, cloud fallback, embeddings service, or Anthropic credit is used. It does not fine-tune the model or import unrelated conversations.

Start Ollama, then run `node scripts/guide-server.mjs`. Vite development and preview should proxy `/api/guide` to `http://127.0.0.1:5189`. The server binds only to loopback, checks Host and Origin, limits input, caps output at 350 tokens, and aborts generation when the browser cancels. The live Vercel deployment reports AI offline unless cloud mode has been explicitly configured; authored activities remain functional.

`GET /api/guide` returns status, model, request count, and budget totals. `POST /api/guide` receives a question, topic, learner profile, a summary of observed attempts, up to six source excerpts, four relevant note excerpts, and six recent conversation messages. It returns text, source IDs filtered to that request's supplied sources, and actual provider token usage. The model never writes learner evidence or map progress. Citation validation confirms IDs, not factual entailment: sources and answers still require evaluation.

## Optional paid mode

Paid mode is disabled unless **both** `MOK_GUIDE_MODE=cloud` and `MOK_GUIDE_ENABLE_PAID=yes` are explicitly set, with a **dedicated** `MOK_OPENAI_API_KEY`. The ambient `OPENAI_API_KEY` is never used. The only allowed cloud model is `gpt-5.6-luna`, with no tools and no automatic retries. Do not place these settings in frontend Vite variables.

On a local persistent server, the ledger is `.local-guide/budget.sqlite` (or `MOK_GUIDE_DATA_DIR/budget.sqlite`). On Vercel, paid mode additionally requires `MOK_BUDGET_REDIS_URL`, `MOK_BUDGET_REDIS_TOKEN`, and a `MOK_GUIDE_ACCESS_TOKEN` of at least 24 characters. These must be provisioned independently before enabling paid mode. A request supplies the private demo token in `X-MOK-Access`; the optional client value is held in the current tab's session storage under `mok-guide-access`. Allowed hosted browser origins default to `https://map-of-knowledge.vercel.app` and can be explicitly listed in `MOK_GUIDE_ORIGINS`.

The ledger has a **$15 total authorization**, including pending and uncertain reservations. SQLite uses `BEGIN IMMEDIATE`; Redis uses atomic Lua scripts over one durable, non-expiring ledger. Before a provider call, the runtime reserves the UTF-8 input byte upper bound plus framing overhead, capped output, the higher cache-write input price, and a 25% cushion. It refunds only confirmed valid usage. Cancellation, provider failure, missing usage, process crashes, or settlement failure keep the reservation charged. Reusing a request ID cannot trigger another paid call. This cap applies to this application's configured model calls, not other projects, hosting, taxes, or separately provisioned infrastructure. Keep the ledger and its backups; deleting it resets its history.

Pricing checked September 7, 2026: GPT-5.6 Luna standard short-context input **$0.20 / million tokens**, cached input **$0.02**, output **$1.20**, cache writes up to **$0.25**. Recheck prices before enabling a later public paid service. A hypothetical 3,000 input + 300 output token reply costs about **$0.00096** before cache savings; 1,000 such single-call replies cost about **$0.96**, excluding hosting and other services. Actual totals appear in status; local replies always report $0 API cost.

Primary documentation: [Ollama chat](https://docs.ollama.com/api/chat), [Ollama installed models](https://docs.ollama.com/api/tags), [OpenAI model and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [Upstash REST and atomic commands](https://upstash.com/docs/redis/features/restapi).

Run runtime verification with `node node_modules/vitest/vitest.mjs run --config server/guide-test.config.mjs --configLoader runner`. Tests use fake providers and temporary local ledgers; they do not spend API credits.

## Verification in this iteration

All **21 runtime tests passed**, covering deep catalog locations, the complete 24-interest profile, untrusted-context boundaries, citation filtering, truncated JSON, concurrent reservations, crash persistence, idempotency, known-usage refunds, uncertain-call retention, hosted authentication, request limits, and browser-disconnect cancellation. GET through both local Vite ports (5178 and 4178) returned an available local Qwen3 guide. Simulated Vercel with no guide configuration returned offline status without making any external request or opening SQLite.

A real local guide response returned HTTP 200 with **484 input tokens, 77 output tokens, and $0 API cost**. A separate warm local performance probe returned 26 output tokens in about 6.9 seconds; the first cold guide call took about 59.7 seconds. These are observations on this Mac, not latency guarantees. The browser experience verification also exercises the actual guide through the application. No paid cloud request was made, and no Anthropic or Parley credentials were used.

An optional standalone browser smoke check is available as `node server/guide-browser-check.mjs http://127.0.0.1:5178`; it refuses to send a question unless status first confirms local mode. It saves its public sample result to `output/living-atlas-runtime/browser-guide.json`.
