import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export const HARD_LIMIT_MICRO_USD = 15_000_000;

export class BudgetError extends Error {
  constructor(message, code = 'budget_unavailable', status = 503) { super(message); this.code = code; this.status = status; }
}

function validReservation(id, hash, amount) {
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(id) || !/^[a-f0-9]{64}$/.test(hash) || !Number.isSafeInteger(amount) || amount < 0) throw new BudgetError('Invalid spending reservation.');
}
function interpret(row, hash) {
  if (row.hash !== hash) throw new BudgetError('This request ID was already used for a different question.', 'id_conflict', 409);
  if (row.state === 'complete' && row.reply) return { cached: JSON.parse(row.reply) };
  throw new BudgetError('This question is already running or its result is uncertain. It will not be charged twice.', 'already_reserved', 409);
}

// SQLite is only used on a persistent local disk. BEGIN IMMEDIATE makes the cap
// atomic across processes; a crash keeps its reservation charged, never refunded.
export async function createLocalBudget(path, limitMicroUsd = HARD_LIMIT_MICRO_USD) {
  const { DatabaseSync } = await import('node:sqlite');
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS guide_requests (
      id TEXT PRIMARY KEY, hash TEXT NOT NULL, amount INTEGER NOT NULL,
      state TEXT NOT NULL, reply TEXT, created_at INTEGER NOT NULL
    );`);
  const limit = Math.max(0, Math.min(HARD_LIMIT_MICRO_USD, limitMicroUsd));
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); db.exec('COMMIT'); return value; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return {
    async status() {
      const row = db.prepare('SELECT COALESCE(SUM(amount),0) AS spent, COUNT(*) AS requests FROM guide_requests').get();
      return { spentMicroUsd: row.spent, requests: row.requests, limitMicroUsd: limit };
    },
    async reserve(id, hash, amount) {
      validReservation(id, hash, amount);
      return transaction(() => {
        const previous = db.prepare('SELECT * FROM guide_requests WHERE id=?').get(id);
        if (previous) return interpret(previous, hash);
        const { spent } = db.prepare('SELECT COALESCE(SUM(amount),0) AS spent FROM guide_requests').get();
        if (spent + amount > limit) throw new BudgetError('The $15 demo budget has been reached. Local learning still works.', 'budget_exhausted', 402);
        db.prepare("INSERT INTO guide_requests (id,hash,amount,state,created_at) VALUES (?,?,?,'pending',?)").run(id, hash, amount, Date.now());
        return { reserved: amount };
      });
    },
    async settle(id, hash, actualMicroUsd, reply) {
      return transaction(() => {
        const previous = db.prepare('SELECT * FROM guide_requests WHERE id=?').get(id);
        if (!previous || previous.hash !== hash) throw new BudgetError('The spending reservation could not be verified.');
        if (previous.state === 'complete') return;
        // Only trustworthy usage can release a reservation. Missing usage stays
        // at the maximum; an unexpected overrun locks out later requests.
        const amount = Number.isSafeInteger(actualMicroUsd) && actualMicroUsd >= 0 ? actualMicroUsd : previous.amount;
        db.prepare("UPDATE guide_requests SET amount=?,state='complete',reply=? WHERE id=?").run(amount, JSON.stringify(reply), id);
      });
    },
    close() { db.close(); },
  };
}

const RESERVE_SCRIPT = `
local old = redis.call('HGET', KEYS[1], 'request:' .. ARGV[1])
if old then return old end
local spent = tonumber(redis.call('HGET', KEYS[1], 'spent') or '0')
local amount = tonumber(ARGV[3])
if spent + amount > tonumber(ARGV[4]) then return 'LIMIT' end
local row = cjson.encode({hash=ARGV[2], amount=amount, state='pending'})
redis.call('HSET', KEYS[1], 'request:' .. ARGV[1], row)
redis.call('HINCRBY', KEYS[1], 'spent', amount)
redis.call('HINCRBY', KEYS[1], 'requests', 1)
return 'RESERVED'
`;
const SETTLE_SCRIPT = `
local old = redis.call('HGET', KEYS[1], 'request:' .. ARGV[1])
if not old then return 'MISSING' end
local row = cjson.decode(old)
if row.hash ~= ARGV[2] then return 'MISSING' end
if row.state == 'complete' then return 'OK' end
local amount = tonumber(ARGV[3])
if amount < 0 then amount = row.amount end
redis.call('HINCRBY', KEYS[1], 'spent', amount - row.amount)
row.amount = amount; row.state = 'complete'; row.reply = ARGV[4]
redis.call('HSET', KEYS[1], 'request:' .. ARGV[1], cjson.encode(row))
return 'OK'
`;

// A single Redis hash is the durable global ledger: no TTL, browser state,
// per-instance counters, or non-atomic read/modify/write spending decisions.
export function createRedisBudget({ url, token, fetchImpl = fetch, limitMicroUsd = HARD_LIMIT_MICRO_USD }) {
  if (!/^https:\/\/[^/]+\/?$/.test(url) || !token) throw new BudgetError('A durable spending ledger must be configured first.');
  const key = 'mok:guide:demo-budget:v1';
  const limit = Math.max(0, Math.min(HARD_LIMIT_MICRO_USD, limitMicroUsd));
  async function command(args) {
    const response = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new BudgetError('The spending ledger is unavailable. No new AI request was sent.');
    const data = await response.json();
    if (data.error) throw new BudgetError('The spending ledger could not confirm this request.');
    return data.result;
  }
  return {
    async status() {
      const result = await command(['HMGET', key, 'spent', 'requests']);
      if (!Array.isArray(result) || result.length !== 2) throw new BudgetError('The spending ledger is unavailable.');
      const spent = Number(result[0] ?? 0), requests = Number(result[1] ?? 0);
      if (!Number.isSafeInteger(spent) || spent < 0 || !Number.isSafeInteger(requests) || requests < 0) throw new BudgetError('The spending ledger is invalid.');
      return { spentMicroUsd: spent, requests, limitMicroUsd: limit };
    },
    async reserve(id, hash, amount) {
      validReservation(id, hash, amount);
      const result = await command(['EVAL', RESERVE_SCRIPT, '1', key, id, hash, String(amount), String(limit)]);
      if (result === 'LIMIT') throw new BudgetError('The $15 demo budget has been reached. Local learning still works.', 'budget_exhausted', 402);
      if (result === 'RESERVED') return { reserved: amount };
      try { return interpret(JSON.parse(result), hash); }
      catch (error) { if (error instanceof BudgetError) throw error; throw new BudgetError('The spending reservation could not be verified.'); }
    },
    async settle(id, hash, actualMicroUsd, reply) {
      const amount = Number.isSafeInteger(actualMicroUsd) && actualMicroUsd >= 0 ? actualMicroUsd : -1;
      const result = await command(['EVAL', SETTLE_SCRIPT, '1', key, id, hash, String(amount), JSON.stringify(reply)]);
      if (result !== 'OK') throw new BudgetError('The spending reservation could not be settled.');
    },
  };
}
