// Stage 4b: put a drafted place's reels into the feed and narrate them.
//
//   node scripts/generate/register.mjs <id>
//
// Adds each reel ID to the end of the deck order in src/explore/deck.ts (the hand-ordered feed
// the journeys read), then runs scripts/narrate-reels.mjs, which synthesises only reels whose
// captions changed (Piper, public-domain LJ Speech voice) and records the timing.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { args, bundleFile, logStage, ROOT } from './lib.mjs';

const started = Date.now();
const id = args()._[0];
if (!id) { console.error('usage: register.mjs <id>'); process.exit(2); }
const { place } = await import(`${pathToFileURL(bundleFile(id)).href}?t=${Date.now()}`);
const deckFile = path.join(ROOT, 'src/explore/deck.ts');
let deck = readFileSync(deckFile, 'utf8');
const end = deck.indexOf('].map(by);');
if (end < 0) throw new Error('deck.ts has no REELS list ending in ].map(by)');
const added = place.reels.map(r => r.id).filter(rid => !deck.includes(`'${rid}'`));
if (added.length) deck = `${deck.slice(0, end)}${added.map(rid => `  '${rid}',\n`).join('')}${deck.slice(end)}`;
writeFileSync(deckFile, deck);
console.log(added.length ? `Added to the feed: ${added.join(', ')}` : 'Reels already in the feed');
execFileSync(process.execPath, [path.join(ROOT, 'scripts/narrate-reels.mjs')], { stdio: 'inherit', cwd: ROOT });
const minutes = logStage(id, 'register', 'script', started, { reels: place.reels.length });
console.log(`Registered (${minutes} min)`);
