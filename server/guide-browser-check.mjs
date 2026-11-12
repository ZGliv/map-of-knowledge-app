import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

// A real browser through Vite's proxy, with an explicit local-only guard before
// any inference. This script cannot consume paid provider credits.
const url = process.argv[2] || 'http://127.0.0.1:5178';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)) throw new Error('Run this check against a local preview only.');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const status = await page.evaluate(async () => { const response = await fetch('/api/guide'); return { http: response.status, body: await response.json() }; });
  if (status.http !== 200 || status.body.mode !== 'local' || !status.body.available) throw new Error('The local-only guide is not ready; no question was sent.');
  const started = Date.now();
  const answer = await page.evaluate(async () => {
    const payload = { requestId: crypto.randomUUID(), message: 'Use my interest in music to help me feel what a quarter means. Give me one small activity, then a question.', topicId: 'music', profile: { name: '', goal: 'Connect music and mathematics through experiments', interests: ['music', 'mathematics'], minutes: 5 }, evidenceSummary: 'No learning attempts completed yet. Readiness is unknown.', sources: [{ id: 'musictheory-duration', title: 'Note duration', url: 'https://www.musictheory.net/lessons/11', excerpt: 'One whole note lasts as long as two half notes or four quarter notes.' }], notes: [{ title: 'A question', body: 'I want to understand why dividing time evenly creates fractions.' }], history: [] };
    const response = await fetch('/api/guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return { http: response.status, body: await response.json() };
  });
  if (answer.http !== 200 || answer.body.mode !== 'local' || answer.body.usage?.costUsd !== 0 || answer.body.text.length < 20) throw new Error('The local guide response did not meet its contract.');
  if (answer.body.sourceIds.some(id => id !== 'musictheory-duration')) throw new Error('An unknown source escaped citation filtering.');
  const report = { checkedAt: new Date().toISOString(), status: status.body, reply: answer.body, elapsedMs: Date.now() - started, paidApiCostUsd: 0 };
  await mkdir('output/living-atlas-runtime', { recursive: true });
  await writeFile('output/living-atlas-runtime/browser-guide.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, model: report.reply.model, inputTokens: report.reply.usage.inputTokens, outputTokens: report.reply.usage.outputTokens, elapsedMs: report.elapsedMs, paidApiCostUsd: 0 }));
} finally { await browser.close(); }
