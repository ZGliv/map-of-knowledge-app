// Mint opaque IDs for new check items: `node scripts/mint-check-ids.mjs 12`
// prints 12 lines of "i_… f_…" (an item ID and a fresh family ID); `--cases 6` prints 6 case IDs (c_…). Plan §8.2's format:
// a family letter, an underscore and 10 lowercase Crockford base32 characters (no i, l, o, u).
// Paste them into a bank once and never change them; the bank tests reject duplicates.
import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const mint = letter => `${letter}_${Array.from(randomBytes(10), byte => ALPHABET[byte & 31]).join('')}`;
const count = Math.max(1, Math.min(200, Number(process.argv[2]) || 10));
const cases = process.argv[2] === '--cases';
const n = cases ? Math.max(1, Math.min(200, Number(process.argv[3]) || 10)) : count;
for (let i = 0; i < n; i++) console.log(cases ? mint('c') : `${mint('i')} ${mint('f')}`);
