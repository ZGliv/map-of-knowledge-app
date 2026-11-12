// Offline evaluation of Watch's recommender over the real pool (src/feed/pool.json): simulated
// learners, each with true interests that drive how long they stay on a video and whether they skip,
// finish, replay or save it (with noise), fed by version 2 (src/feed/recommend.ts) and by version 1
// as it shipped before (scripts/feed/baseline, frozen), each planning exactly as the app does.
//
//   node scripts/feed/eval.mjs               every persona, 8 seeds each, prints the tables
//   node scripts/feed/eval.mjs --seeds 20    more seeds
//   node scripts/feed/eval.mjs --json        the numbers as JSON
//
// Personas: "loves space, skips history", "math-only", "broad explorer" (likes most things, its own
// mild taste per field and channel, bored by the same territory twice running), "just started
// Evolution" (its map says so: place in view and recent places), and "fickle" (arts, then from the
// 60th video economics and technology). Each run is four sessions of 40 videos, a day apart.
//
// Two harder checks follow the main table:
//   switch     strict learners who finish every arts video and quick-skip everything else for 25
//              videos, then like only one field (chemistry, oceans, music or mathematics) and
//              quick-skip the rest, arts included, never touching the map: the buttons are gone, so a
//              skip is their only way to say no. Reported: videos to recover (as shift), how many
//              runs never recover within 55 videos, and arts cards in videos 10-30 after the switch.
//   horizon    the two focused learners (space, math-only) over ten sessions with version 2: hit rate
//              per session, and how many videos they would like are still unseen at its start. A judged
//              video never comes round again, so a focused learner's hit rate falls once their corner
//              of the pool runs out: the pool's size is the limit there, not the planner.
// Gates (the script exits 1 when one fails; --no-gate to skip): version 2 beats version 1 and version
// 1 with its buttons on hit@100 and shift; after a strict switch it recovers within 55 videos in at
// least 9 runs in 10, with a median of at most 40 videos and at most 5 arts cards in 20.
//
// Metrics:
//   hit@k      share of the first k videos the persona would watch to the end (true chance ≥ 0.5)
//   shift      fickle only: videos after the change until 5 of the last 8 are hits again
//   entropy    territory entropy of the first 100 videos, in bits (3 = all eight territories evenly)
//   repeats    share of served videos served before in the same run
//   coverage   share of the pool served at least once, across every persona and seed
//   new/100    fields served for the first time after the 20th video, per 100 videos
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, args, loadTs } from './lib.mjs';

const opts = args();
const SEEDS = Number(opts.seeds ?? 8);
const SESSIONS = [40, 40, 40, 40];
const SWITCH_AT = 25, SWITCH_LEN = 80, HORIZON = 10;
const AHEAD = 6;
const NOW = Date.parse('2026-10-24T12:00:00Z');
const DAY = 86_400_000;

const m = await loadTs(`
export * as v2 from '@/feed/recommend';
export * as mem2 from '@/feed/memory';
export * as engage from '@/feed/engagement';
export { TUNING } from '@/feed/interest';
export * as interestFns from '@/feed/interest';
export { rng, unit } from '@/feed/rng';
export * as v1 from '${path.join(ROOT, 'scripts/feed/baseline/v1-recommend')}';
export * as mem1 from '${path.join(ROOT, 'scripts/feed/baseline/v1-memory')}';
`, 'eval');
const { v1, v2, mem1, mem2, rng, unit } = m;
// --set plan.sharpness=8,tuning.weights.words=0.2: try other dials (version 2 only).
for (const pair of String(opts.set ?? '').split(',').filter(Boolean)) {
  const [where, value] = pair.split('=');
  const path = where.split('.');
  let target = path.shift() === 'plan' ? v2.PLAN : m.TUNING;
  while (path.length > 1) target = target[path.shift()];
  target[path[0]] = Number(value);
}

const poolFile = JSON.parse(readFileSync(path.join(ROOT, 'src/feed/pool.json'), 'utf8'));
const VIDEOS = poolFile.videos.filter(video => poolFile.channels[video.channel]);
const territoryOf = id => id.split('.').slice(0, 2).join('.');
const fieldOf = id => id.split('.').slice(0, 3).join('.');
const within = (video, scope) => video.places.some(place => place === scope || place.startsWith(`${scope}.`));
const says = (video, pattern) => pattern.test(`${video.title} ${video.learn}`);
const clamp = n => Math.max(0.01, Math.min(0.99, n));

// --- Personas -------------------------------------------------------------------------------------
const NO_MAP = { focus: null, recent: [], pinned: [], lit: [] };
const SPACE = /\b(space|planets?|galax\w*|stars?|nasa|moons?|mars|cosmo\w*|universe|black holes?|orbits?|telescopes?|solar|astronaut\w*|rockets?|jupiter|saturn)\b/i;
const MATHS = /\b(math\w*|equations?|proofs?|theorems?|geometry|probabilit\w*|statistic\w*|calculus|algebra|primes?)\b/i;
const PERSONAS = [
  {
    name: 'loves space, skips history', map: NO_MAP,
    taste: video => within(video, 'knowledge.science.astronomy') || says(video, SPACE) ? 0.9
      : within(video, 'knowledge.humanities.history') || within(video, 'knowledge.humanities.archaeology') ? 0.03
        : within(video, 'knowledge.science.physics') ? 0.5 : 0.14,
  },
  {
    name: 'math-only', map: NO_MAP,
    taste: video => within(video, 'knowledge.mathematics') ? 0.9 : says(video, MATHS) ? 0.6 : 0.06,
  },
  {
    name: 'broad explorer', map: NO_MAP, bored: true,
    taste: (video, _t, seed) => 0.4 + 0.3 * unit(`${seed}|field`, fieldOf(video.places[0])) + 0.12 * (unit(`${seed}|channel`, video.channel) - 0.5),
  },
  {
    name: 'just started Evolution',
    map: { focus: 'knowledge.science.biology.evolution', recent: ['knowledge.science.biology.evolution.natural-selection', 'knowledge.science.biology.evolution.deep-time'], pinned: [], lit: [] },
    taste: video => within(video, 'knowledge.science.biology.evolution') ? 0.9 : within(video, 'knowledge.science.biology') ? 0.6
      : within(video, 'knowledge.science') || within(video, 'knowledge.earth') ? 0.32 : 0.12,
  },
  {
    name: 'fickle', map: NO_MAP, shiftAt: 60,
    taste: (video, t) => t < 60 ? (within(video, 'knowledge.arts') ? 0.9 : 0.1)
      : (within(video, 'knowledge.economics') || within(video, 'knowledge.technology') ? 0.9 : 0.1),
  },
];

/** Strict learners: arts (not music) for SWITCH_AT videos, then only `target`; every like finished,
 * every dislike a quick skip. Their chance is their taste alone. */
const SWITCHES = [['chemistry', 'knowledge.science.chemistry'], ['oceans', 'knowledge.earth.oceans'], ['music', 'knowledge.arts.music'], ['mathematics', 'knowledge.mathematics']].map(([label, target]) => {
  const likes = (video, t) => t < SWITCH_AT ? within(video, 'knowledge.arts') && !within(video, 'knowledge.arts.music') : within(video, target);
  return { name: `arts, then only ${label}`, map: NO_MAP, strict: true, shiftAt: SWITCH_AT, taste: (video, t) => likes(video, t) ? 0.95 : 0.03 };
});

/** The persona's true chance of watching this video to the end, at its t-th video: taste, the
 * video's own quality (the same for everyone), a little personal noise, and boredom for the broad explorer. */
function chance(persona, video, t, seed, previous) {
  if (persona.strict) return persona.taste(video, t, seed);
  let p = persona.taste(video, t, seed);
  p += 0.16 * (unit('quality', video.id) - 0.5) + 0.1 * (unit('channel-quality', video.channel) - 0.5);
  p += 0.14 * (unit(`${seed}|${persona.name}`, video.id) - 0.5);
  if (persona.bored && previous && territoryOf(previous.places[0]) === territoryOf(video.places[0])) p -= 0.15;
  return clamp(p);
}

const lengthOf = video => video.short ? 20 + Math.round(40 * unit('length', video.id)) : 240 + Math.round(660 * unit('length', video.id));

/** What the persona does with a video: finishes it with chance p (sometimes replaying or saving it),
 * otherwise skips quickly when it is clearly not for them, else watches part of it. */
function behave(p, video, rand, strict = false) {
  const length = lengthOf(video);
  const imp = m.engage.emptyImpression(video.short);
  imp.durationS = length;
  imp.heard = true;
  if (strict) {
    if (p >= 0.5) { imp.ended = true; imp.playedS = length; imp.dwellMs = length * 1000 + 400; }
    else { imp.dwellMs = 900 + 1200 * rand(); imp.playedS = imp.dwellMs / 1000 * 0.7; }
    return imp;
  }
  if (rand() < p) {
    imp.ended = true; imp.playedS = length; imp.dwellMs = length * 1000 + 400;
    if (p > 0.8 && rand() < 0.08) imp.replays = 1;
    if (p > 0.75 && rand() < 0.1) imp.saved = true;
  } else if (p < 0.35 && rand() < 0.75) {
    imp.dwellMs = 900 + 1500 * rand(); imp.playedS = imp.dwellMs / 1000 * 0.8;
  } else {
    imp.playedS = length * (0.05 + 0.55 * rand()); imp.dwellMs = imp.playedS * 1000 + 400;
  }
  if (p > 0.8 && rand() < 0.04) imp.openedPlace = true;
  if (p < 0.3 && rand() < 0.03) { imp.muted = true; imp.heard = false; }
  return imp;
}

// --- Runs -----------------------------------------------------------------------------------------
/** One persona through every session with one recommender. Returns the videos served, in order, with
 * their true chance (and, with `unseen`, how many videos it would like are still unseen as each session starts). */
function run(kind, persona, seedBase, sessions = SESSIONS, unseen = null) {
  const served = [];
  const rand = rng(`${seedBase}|${persona.name}|behaviour`);
  let memory = kind === 'v2' ? m.mem2.createFeedMemory() : m.mem1.createFeedMemory();
  sessions.forEach((count, session) => {
    if (unseen) { const gone = new Set([...memory.seen ?? [], ...Object.keys(memory.watched)]); unseen.push(VIDEOS.filter(video => !gone.has(video.id) && persona.taste(video, served.length, seedBase) >= 0.5).length); }
    const now = NOW + session * DAY;
    const seed = `${seedBase}-${session}`;
    if (kind === 'v2') memory = mem2.startSession(memory, now);
    const lib = kind === 'v2' ? v2 : v1;
    const ctx = () => kind === 'v2' ? { pool: VIDEOS, signals: persona.map, memory, seed } : { pool: VIDEOS, signals: { focus: persona.map.focus, recent: persona.map.recent, pinned: persona.map.pinned }, memory, seed };
    let state = lib.extendPlan(ctx(), lib.createPlan(), AHEAD, now);
    let shown = 0;
    for (let visible = 0; shown < count; visible++) {
      // The app keeps a few cards ahead of the one on screen.
      if (visible >= state.items.length - 3 && state.items.at(-1)?.kind !== 'end') state = lib.extendPlan(ctx(), state, AHEAD, now);
      const item = state.items[visible];
      if (!item || item.kind === 'end') break;
      if (item.kind !== 'video') continue;
      const { video } = item;
      const t = served.length;
      const p = chance(persona, video, t, seedBase, served.at(-1)?.video);
      const imp = behave(p, video, rand, persona.strict);
      const at = new Date(now + t * 60_000).toISOString();
      if (kind === 'v2' && opts['debug-at'] !== undefined && Number(opts['debug-at']) === t && session === 0) debugPick(ctx(), state, visible, now);
      if (kind === 'v2') {
        memory = mem2.recordImpression(memory, video, imp, at);
        // Each card left: the model has learned; plan again after the one now on screen.
        state = v2.extendPlan(ctx(), v2.replanAfter(state, visible + 1), AHEAD, now);
      } else {
        const watched = imp.ended || imp.playedS >= Math.min(imp.durationS * 0.6, 180);
        if (watched) memory = mem1.markWatched(memory, video, at);
        else if (imp.dwellMs >= 1500) memory = mem1.markPassed(memory, video.id);
        if (kind === 'v1+buttons') {
          if (imp.ended && p >= 0.75 && rand() < 0.15) { memory = mem1.moreLikeThis(memory, video); state = v1.extendPlan(ctx(), v1.replanAfter(state, visible, { places: video.places, left: 2 }), AHEAD, now); }
          else if (!watched && p < 0.2 && rand() < 0.15) { memory = mem1.notForMe(memory, video); state = v1.extendPlan(ctx(), v1.replanAfter(state, visible, null), AHEAD, now); }
        }
      }
      served.push({ video, p, hit: p >= 0.5, lane: item.lane });
      shown++;
    }
  });
  return served;
}

function debugPick(ctx, state, visible, now) {
  const { posterior, keysOf, interestIn, wordsScore, videoWords } = m.interestFns;
  const post = posterior(ctx.memory.model, v2.pseudoCounts(ctx.signals, state.asked));
  const show = key => { const c = post.counts(key); return `${key.replace('p:knowledge.', '')} m=${post.mean(key).toFixed(2)} (${c.a.toFixed(1)}/${c.b.toFixed(1)})`; };
  const card = state.items[visible];
  console.log(`card ${visible}: ${card.video.title} [${card.lane}]`);
  for (const key of ['g', ...new Set(VIDEOS.map(v => `p:${territoryOf(v.places[0])}`))]) console.log('   ', show(key));
  const scored = VIDEOS.map(video => ({ video, i: interestIn(keysOf(video), wordsScore(videoWords(video), post), post.mean) })).sort((a, b) => b.i - a.i).slice(0, 8);
  for (const { video, i } of scored) console.log(`   ${i.toFixed(3)} ${video.places[0].replace('knowledge.', '')} ${video.title.slice(0, 40)} | ${show(`p:${fieldOf(video.places[0])}`)} | ${show(`c:${video.channel}`)}`);
}

// --- Metrics --------------------------------------------------------------------------------------
const mean = list => list.length ? list.reduce((s, n) => s + n, 0) / list.length : NaN;
const hitAt = (served, k) => mean(served.slice(0, k).map(item => item.hit ? 1 : 0));
function entropy(served) {
  const counts = new Map();
  for (const { video } of served.slice(0, 100)) counts.set(territoryOf(video.places[0]), (counts.get(territoryOf(video.places[0])) ?? 0) + 1);
  const n = Math.min(100, served.length);
  return [...counts.values()].reduce((h, c) => h - (c / n) * Math.log2(c / n), 0);
}
const repeats = served => (served.length - new Set(served.map(item => item.video.id)).size) / served.length;
function newFields(served) {
  const seen = new Set();
  let fresh = 0;
  served.forEach(({ video }, i) => { const f = fieldOf(video.places[0]); if (!seen.has(f)) { seen.add(f); if (i >= 20) fresh++; } });
  return served.length > 20 ? fresh / (served.length - 20) * 100 : 0;
}
function shift(served, at) {
  for (let j = at + 7; j < served.length; j++) if (served.slice(j - 7, j + 1).filter(item => item.hit).length >= 5) return j - at + 1;
  return served.length - at + 1;
}

if (opts.trace) {
  const persona = PERSONAS.find(p => p.name.includes(String(opts.trace)));
  const kind = String(opts.kind ?? 'v2');
  const served = run(kind, persona, String(opts.seed ?? 'seed0'));
  served.slice(0, Number(opts.n ?? 60)).forEach((item, i) => console.log(`${String(i).padStart(3)} ${item.hit ? 'HIT ' : '    '}${item.p.toFixed(2)} ${(item.lane ?? '').padEnd(8)} ${item.video.places[0].replace('knowledge.', '').padEnd(48)} ${item.video.title.slice(0, 50)}`));
  console.log(`hit@10 ${hitAt(served, 10).toFixed(2)} hit@30 ${hitAt(served, 30).toFixed(2)} hit@100 ${hitAt(served, 100).toFixed(2)}`);
  process.exit(0);
}

const KINDS = opts.only ? String(opts.only).split(',') : ['v1', 'v1+buttons', 'v2'];
const results = {};
for (const kind of KINDS) {
  const rows = [];
  const covered = new Set();
  for (const persona of PERSONAS) {
    for (let s = 0; s < SEEDS; s++) {
      const served = run(kind, persona, `seed${s}`);
      served.forEach(item => covered.add(item.video.id));
      rows.push({ persona: persona.name, hit10: hitAt(served, 10), hit30: hitAt(served, 30), hit100: hitAt(served, 100), entropy: entropy(served), repeats: repeats(served), fresh: newFields(served), shift: persona.shiftAt ? shift(served, persona.shiftAt) : null, length: served.length });
    }
  }
  results[kind] = { rows, coverage: covered.size / VIDEOS.length, covered: covered.size };
}

// The strict switch: recovery, runs that never recover within SWITCH_LEN, arts cards 10-30 videos after.
const switched = {};
for (const kind of KINDS) {
  const rows = [];
  for (const persona of SWITCHES) for (let s = 0; s < SEEDS; s++) {
    const served = run(kind, persona, `seed${s}`, [SWITCH_LEN]);
    const recovery = shift(served, SWITCH_AT);
    rows.push({ persona: persona.name, recovery, never: recovery > served.length - SWITCH_AT, arts: served.slice(SWITCH_AT + 10, SWITCH_AT + 30).filter(item => within(item.video, 'knowledge.arts') && !within(item.video, 'knowledge.arts.music')).length });
  }
  const sorted = rows.map(row => row.recovery).sort((a, b) => a - b);
  switched[kind] = { rows, median: sorted[Math.floor(sorted.length / 2)], recovered: rows.filter(row => !row.never).length / rows.length, arts: mean(rows.map(row => row.arts)) };
}
// The long horizon: version 2 only, the two focused learners.
const horizon = KINDS.includes('v2') ? PERSONAS.slice(0, 2).map(persona => {
  const perSession = Array.from({ length: HORIZON }, () => []), left = Array.from({ length: HORIZON }, () => []);
  for (let s = 0; s < SEEDS; s++) {
    const unseen = [];
    const served = run('v2', persona, `seed${s}`, Array(HORIZON).fill(40), unseen);
    for (let i = 0; i < HORIZON; i++) { perSession[i].push(mean(served.slice(i * 40, i * 40 + 40).map(item => item.hit ? 1 : 0))); left[i].push(unseen[i]); }
  }
  return { persona: persona.name, hits: perSession.map(mean), left: left.map(mean) };
}) : [];

const summary = kind => {
  const { rows, coverage } = results[kind];
  const shifts = rows.filter(row => row.shift !== null).map(row => row.shift).sort((a, b) => a - b);
  return { hit10: mean(rows.map(r => r.hit10)), hit30: mean(rows.map(r => r.hit30)), hit100: mean(rows.map(r => r.hit100)), shift: shifts[Math.floor(shifts.length / 2)], entropy: mean(rows.map(r => r.entropy)), repeats: mean(rows.map(r => r.repeats)), coverage, fresh: mean(rows.map(r => r.fresh)) };
};

const switchOf = (kind, name) => { const rows = switched[kind].rows.filter(row => row.persona === name); const sorted = rows.map(row => row.recovery).sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length / 2)], never: rows.filter(row => row.never).length, runs: rows.length, arts: mean(rows.map(row => row.arts)) }; };

// Gates.
const gates = [];
if (KINDS.includes('v2')) {
  const v2 = summary('v2');
  for (const other of KINDS.filter(kind => kind !== 'v2')) {
    const o = summary(other);
    gates.push({ name: `version 2 beats ${other} on hit@100`, ok: v2.hit100 > o.hit100, value: `${(v2.hit100 * 100).toFixed(1)}% vs ${(o.hit100 * 100).toFixed(1)}%` });
    gates.push({ name: `version 2 recovers from a shift no slower than ${other}`, ok: v2.shift <= o.shift, value: `${v2.shift} vs ${o.shift} videos` });
  }
  const sw = switched.v2;
  gates.push({ name: 'after a strict switch, version 2 recovers within 55 videos in 9 runs in 10', ok: sw.recovered >= 0.9, value: `${(sw.recovered * 100).toFixed(0)}%` });
  gates.push({ name: 'after a strict switch, version 2 recovers in at most 40 videos (median)', ok: sw.median <= 40, value: `${sw.median} videos` });
  gates.push({ name: 'after a strict switch, at most 5 of 20 cards are still arts', ok: sw.arts <= 5, value: `${sw.arts.toFixed(1)} of 20` });
}

if (opts.json) {
  console.log(JSON.stringify({ ...Object.fromEntries(KINDS.map(kind => [kind, { summary: summary(kind), personas: Object.fromEntries(PERSONAS.map(p => [p.name, perPersona(kind, p.name)])), switch: Object.fromEntries(SWITCHES.map(p => [p.name, switchOf(kind, p.name)])) }])), horizon, gates }, null, 2));
} else {
  const pct = n => `${(n * 100).toFixed(1)}%`;
  const pad = (text, n) => String(text).padEnd(n);
  console.log(`Watch recommender, offline: ${VIDEOS.length} videos, ${PERSONAS.length} personas × ${SEEDS} seeds, ${SESSIONS.length} sessions of ${SESSIONS[0]} videos.\n`);
  console.log(`${pad('', 12)}${['hit@10', 'hit@30', 'hit@100', 'shift', 'entropy', 'repeats', 'coverage', 'new/100'].map(h => pad(h, 10)).join('')}`);
  for (const kind of KINDS) {
    const s = summary(kind);
    console.log(`${pad(kind, 12)}${[pct(s.hit10), pct(s.hit30), pct(s.hit100), `${s.shift} vids`, `${s.entropy.toFixed(2)} b`, pct(s.repeats), pct(s.coverage), s.fresh.toFixed(1)].map(v => pad(v, 10)).join('')}  (${results[kind].covered} videos served)`);
  }
  console.log('\nBy persona: hit@10 / hit@30 / hit@100, territory entropy');
  console.log(`${pad('', 28)}${KINDS.map(k => pad(k, 30)).join('')}`);
  for (const persona of PERSONAS) {
    console.log(`${pad(persona.name, 28)}${KINDS.map(kind => { const r = perPersona(kind, persona.name); return pad(`${[r.hit10, r.hit30, r.hit100].map(n => (n * 100).toFixed(0).padStart(3)).join(' /')}%  ${r.entropy.toFixed(2)} b`, 30); }).join('')}`);
  }
  console.log(`\nStrict switch at video ${SWITCH_AT} (no map): videos to recover (median), runs that never recover within ${SWITCH_LEN - SWITCH_AT}, arts cards in videos 10-30 after`);
  console.log(`${pad('', 28)}${KINDS.map(k => pad(k, 30)).join('')}`);
  for (const persona of SWITCHES) console.log(`${pad(persona.name, 28)}${KINDS.map(kind => { const r = switchOf(kind, persona.name); return pad(`${String(r.median).padStart(3)} vids  ${r.never}/${r.runs} never  ${r.arts.toFixed(1)} arts`, 30); }).join('')}`);
  console.log(`${pad('all', 28)}${KINDS.map(kind => pad(`${String(switched[kind].median).padStart(3)} vids  ${(100 - switched[kind].recovered * 100).toFixed(0)}% never  ${switched[kind].arts.toFixed(1)} arts`, 30)).join('')}`);
  if (horizon.length) {
    console.log(`\nTen sessions, version 2: hit rate per session (videos they would like still unseen as it starts)`);
    for (const row of horizon) console.log(`${pad(row.persona, 28)}${row.hits.map((h, i) => `${(h * 100).toFixed(0)}% (${Math.round(row.left[i])})`).join('  ')}`);
  }
  if (gates.length) {
    console.log('\nGates');
    for (const gate of gates) console.log(`  ${gate.ok ? 'pass' : 'FAIL'}  ${gate.name}: ${gate.value}`);
  }
}
if (!opts['no-gate'] && gates.some(gate => !gate.ok)) process.exit(1);

function perPersona(kind, name) {
  const rows = results[kind].rows.filter(row => row.persona === name);
  return { hit10: mean(rows.map(r => r.hit10)), hit30: mean(rows.map(r => r.hit30)), hit100: mean(rows.map(r => r.hit100)), entropy: mean(rows.map(r => r.entropy)), fresh: mean(rows.map(r => r.fresh)) };
}
