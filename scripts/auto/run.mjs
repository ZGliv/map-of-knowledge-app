// Generate places under one area of the map, in stages, each cached so a rerun never pays twice:
//   node scripts/auto/run.mjs fetch|draft|check|publish|all <nodeId>
// Sources are Wikipedia only. A place reaches public/auto/ only if it passes the deterministic gate
// (src/auto/validate.ts) and a second checker (the `check` model, or an independent agent through
// quiz/claims/record) both solves its questions blind and finds every claim in the cited sentences.
// Anything that fails is dropped, never shown.
// A place can also carry a compiled read and links out (agent-written, see briefs/reader.md):
//   lintread <id> | readclaims <id> | readrecord <id> <file> | links <id> (live check) | unread <scope> | shelf
// publish adds them only once checked, and rebuilds public/auto/shelf.json every time.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { numbered, PACK_SCHEMA, PLACE_SCHEMA, RULES } from './prompts.mjs';
import { writeShelfIndex } from './shelf.mjs';
import { writeVideoIndex } from './videos.mjs';
import { articleFor, askJson, mentions, CHECK_MODEL, DRAFT_MODEL, PUBLISH, pictureFor, readJson, ROOT, workPath, writeJson } from './lib.mjs';

const [stage = 'all', scope = 'knowledge.science.physics.mechanics'] = process.argv.slice(2);
const PARALLEL = Number(process.env.AUTO_PARALLEL ?? 6);
const server = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
const { catalog } = await server.ssrLoadModule('/src/core/catalog.ts');
const { hostAllowed, itemProblems, linkProblems, oneLinkProblems, packProblems, paragraphProblems, placeProblems, readMinutes, readProblems } = await server.ssrLoadModule('/src/auto/validate.ts');
const { territoryHueRange } = await server.ssrLoadModule('/src/core/territoryTheme.ts');

const root = catalog.get(scope);
if (!root) throw new Error(`No such place: ${scope}`);
const subjectWord = catalog.get(root.parentId)?.name ?? root.name;
const places = [];
const walk = node => { const kids = catalog.getChildren(node); if (node !== root) places.push(node); kids.forEach(walk); };
walk(root);
// AUTO_SELF=1 works on the scope's own place alone (a subject page, say), not the places inside it.
if (process.env.AUTO_SELF) places.splice(0, places.length, root);
// Every area (a place with places inside it) gets a 5-minute lesson as well as a page.
const isArea = node => catalog.getChildren(node).length > 0;

const shuffledBy = (list, seed) => [...list]
  .map((value, index) => ({ value, rank: createHash('sha1').update(`${seed}:${index}`).digest().readUInt32BE(0) }))
  .sort((a, b) => a.rank - b.rank).map(({ value }) => value);

/** Turn the model's small pack shape into the app's Pack data, minting every ID. */
function toPack(node, draft, image) {
  const id = `auto-${node.id.split('.').slice(-2).join('-')}`;
  const letters = 'abcdefgh';
  let grade = 0;
  const beats = draft.beats.map(beat => {
    grade += 1;
    const gradeId = `${id}:${grade}`;
    // The last two answers are the ones that have to hold for the place to count as understood.
    const transfer = grade >= draft.beats.length - 1;
    switch (beat.kind) {
      // Drafters tend to put the right choice first; a fixed shuffle per beat spreads it.
      case 'predict': return { kind: 'predict', gradeId, transfer, prompt: beat.prompt, explain: beat.explain, parts: [{ id: 'p', label: 'What happens?', choices: shuffledBy(beat.choices, gradeId), answer: beat.answer }] };
      case 'order': { const items = beat.items.map((label, index) => ({ id: letters[index], label })); return { kind: 'order', gradeId, transfer, prompt: beat.prompt, items, answer: items.map(item => item.id), ends: beat.ends, explain: beat.explain }; }
      case 'match': { const left = beat.pairs.map(([label], index) => ({ id: `l${index}`, label })); const right = beat.pairs.map(([, label], index) => ({ id: `r${index}`, label })); return { kind: 'match', gradeId, transfer, prompt: beat.prompt, left, right: shuffledBy(right, gradeId), pairs: Object.fromEntries(left.map((item, index) => [item.id, right[index].id])), explain: beat.explain }; }
      case 'sort': { const right = beat.groups.map((label, index) => ({ id: `g${index}`, label })); const left = beat.items.map(([label], index) => ({ id: `i${index}`, label })); return { kind: 'match', gradeId, transfer, buckets: true, prompt: beat.prompt, left, right, pairs: Object.fromEntries(beat.items.map(([, group], index) => [`i${index}`, `g${beat.groups.indexOf(group)}`])), explain: beat.explain }; }
      case 'flaw': { const steps = beat.steps.map((text, index) => ({ id: letters[index], text })); return { kind: 'flaw', gradeId, transfer, prompt: beat.prompt, steps, answer: letters[beat.wrong], explain: beat.explain }; }
      default: throw new Error(`Unknown beat kind ${beat.kind}`);
    }
  });
  const [low, high] = territoryHueRange(node.id);
  const path = []; for (let at = node; at?.depth; at = catalog.get(at.parentId)) path.unshift(at.name);
  return {
    id, title: draft.title, question: draft.question, path, hue: Math.round((low + high) / 2), minutes: 5,
    media: { hero: { src: image.src, alt: image.alt, credit: `${image.credit} · ${image.license}`, page: image.page, license: image.license } },
    beats: [{ kind: 'cover', media: 'hero', title: draft.title, hook: draft.hook }, ...beats, { kind: 'payoff', idea: draft.idea, connections: catalog.getChildren(node).slice(0, 4).map(kid => ({ title: kid.name, place: node.name, node: kid.id })) }],
    provenance: draft.beats.map(beat => ({ claim: beat.explain, source: `Wikipedia sentences ${(beat.cites ?? []).join(', ')}` })),
  };
}

const TITLES = existsSync(join(ROOT, 'scripts', 'auto', 'titles.json')) ? readJson(join(ROOT, 'scripts', 'auto', 'titles.json')) : {};

async function fetchStage(node) {
  const path = workPath(node.id, 'source.json');
  if (existsSync(path)) return;
  // The subject's own words (Mathematics, Probability...), any of which an on-topic article mentions early.
  const subjectWords = [...new Set(catalog.getPath(node).filter(step => step.depth >= 1 && step.depth <= 2).flatMap(step => step.name.toLowerCase().match(/[a-z]+/g) ?? []).map(word => word.replace(/(ics|ic|s)$/, '')))];
  // A place whose right article the search cannot find on its own ("Star" for Stars) names it in titles.json.
  let article = TITLES[node.id] ? await articleFor(TITLES[node.id], []) : await articleFor(node.name, [catalog.get(node.parentId).name, subjectWord], subjectWords);
  // No article of its own: its parent's article, when that really talks about it, written as this
  // place within the parent (the draft is told so).
  let within = null;
  if (!article || article.sentences.length < 6) {
    const parentSource = existsSync(workPath(node.parentId, 'source.json')) ? readJson(workPath(node.parentId, 'source.json')) : null;
    if (parentSource && !parentSource.failed && mentions(parentSource.sentences, node.name) >= 2) { article = parentSource; within = catalog.get(node.parentId).name; }
  }
  if (!article || article.sentences.length < 6) { writeJson(path, { failed: 'no usable article', name: node.name }); console.log(`  no article: ${node.name}`); return; }
  if (within) { writeJson(path, { ...article, within }); console.log(`  ${node.name} → within ${within} (${article.title})`); return; }
  writeJson(path, { ...article, image: await pictureFor(article.imageName, node.name) });
  console.log(`  ${node.name} → ${article.title} (${article.sentences.length} sentences${article.imageName ? '' : ', no picture'})`);
}

async function draftStage(node) {
  if (!existsSync(workPath(node.id, 'source.json'))) return;
  const source = readJson(workPath(node.id, 'source.json'));
  if (source.failed) return;
  const path = workPath(node.id, 'draft.json');
  if (!existsSync(path)) {
    writeJson(path, await askJson(DRAFT_MODEL, `${RULES}\nAnswer with one JSON object in exactly this shape:\n${PLACE_SCHEMA}`, `Place: ${node.name}${source.within ? ` (a part of ${source.within}: write only about ${node.name})` : ''}\nSource sentences:\n${numbered(source)}`));
    console.log(`  drafted ${node.name}`);
  }
  const packPath = workPath(node.id, 'pack-draft.json');
  if (isArea(node) && source.image && !existsSync(packPath)) {
    const inside = catalog.getChildren(node).map(kid => kid.name).join(', ');
    writeJson(packPath, await askJson(DRAFT_MODEL, `${RULES}\nYou write one 5-minute interactive lesson. Answer with one JSON object in exactly this shape:\n${PACK_SCHEMA}`, `Area: ${node.name} (it holds: ${inside})\nSource sentences:\n${numbered(source)}`));
    console.log(`  drafted pack ${node.name}`);
  }
}

const BLIND = `You are taking a quiz. Answer each question from your own knowledge with the option id you believe is right. Reply with one JSON object: {"answers":{"<question id>":"<option id>"}}`;
const SUPPORT = `You check claims against numbered source sentences. A claim is supported only if the sentences it cites really say it; a reasonable paraphrase is fine, an added fact is not. A question may set its idea in an everyday situation the sentences never mention (a skater, a kitchen, a car): that is allowed. Judge whether the idea the right answer depends on is stated in the cited sentences and whether the answer follows from it; reject only an answer that needs a fact the sentences do not give, or one the sentences contradict. Reply with one JSON object: {"results":{"<claim id>":{"supported":true,"why":"short"}}}`;
// A fixed order per place and question, so a checker cannot read the right answer off a drafter's letter habit.
const shuffle = (list, seed) => shuffledBy(list, seed);

/** What a check judges for one place: the quiz (questions only) and the claims with their source. */
function checkInputs(node) {
  if (!existsSync(workPath(node.id, 'source.json'))) return null;
  const source = readJson(workPath(node.id, 'source.json'));
  const draftPath = workPath(node.id, 'draft.json');
  if (source.failed || !existsSync(draftPath)) return null;
  const draft = readJson(draftPath);
  const sentences = source.sentences.length;
  const items = (draft.items ?? []).map((item, index) => ({ ...item, id: `q${index + 1}` }));
  const sound = items.filter(item => itemProblems(item, sentences).length === 0);
  const quiz = sound.map(item => ({ id: item.id, question: item.prompt, options: shuffle(item.options, `${node.id}:${item.id}`) }));
  const packDraft = existsSync(workPath(node.id, 'pack-draft.json')) ? readJson(workPath(node.id, 'pack-draft.json')) : null;
  const claims = [
    ...(draft.summary ?? []).map((line, index) => ({ id: `s${index}`, claim: line.text, cites: line.cites })),
    ...(draft.facts ?? []).map((fact, index) => ({ id: `f${index}`, claim: `${fact.label}: ${fact.value}`, cites: fact.cites })),
    ...sound.map(item => ({ id: item.id, claim: `${item.prompt} Answer: ${item.options.find(option => option.id === item.answer).label}. ${item.explain}`, cites: item.cites })),
    ...(packDraft?.beats ?? []).map((beat, index) => ({ id: `b${index}`, claim: JSON.stringify(beat), cites: beat.cites })),
  ];
  return { hash: draftHash(node), quiz, claims, sourceText: numbered(source) };
}

async function checkStage(node) {
  const inputs = checkInputs(node);
  if (!inputs) return;
  const path = workPath(node.id, 'check.json');
  if (existsSync(path) && readJson(path).draftHash === inputs.hash) return;
  const blind = inputs.quiz.length ? await askJson(CHECK_MODEL, BLIND, JSON.stringify(inputs.quiz)) : { answers: {} };
  const support = await askJson(CHECK_MODEL, SUPPORT, `Source sentences:\n${inputs.sourceText}\n\nClaims:\n${JSON.stringify(inputs.claims)}`);
  writeJson(path, { draftHash: inputs.hash, checker: CHECK_MODEL, blind: blind.answers ?? {}, support: support.results ?? {} });
  console.log(`  checked ${node.name}`);
}

/** Which drafts a check judged: a draft rewritten since is checked again and never published on an old verdict. */
const draftHash = node => createHash('sha1').update([BLIND, SUPPORT, ...['draft.json', 'pack-draft.json'].map(file => existsSync(workPath(node.id, file)) ? readFileSync(workPath(node.id, file), 'utf8') : '')].join('\n')).digest('hex');

// The compiled read is checked on its own (read-check.json), so a rewritten read never touches the page's check.
const READ_SUPPORT = `You check the paragraphs of a compiled read against numbered source sentences. A paragraph is supported only if EVERY factual statement in it is stated in, or follows directly from, the sentences it cites; a reasonable paraphrase is fine, and so are plain connecting words and an everyday comparison that adds no fact. Reject a paragraph that adds any fact, number, date, name, cause or qualifier its cited sentences do not give, that contradicts them, or that leans on a sentence it does not cite. Reply with one JSON object: {"token":"<token>","results":{"<claim id>":{"supported":true,"why":"short"}}}`;
const readHash = node => createHash('sha1').update([READ_SUPPORT, readFileSync(workPath(node.id, 'read-draft.json'), 'utf8')].join('\n')).digest('hex');
const LINK_HOSTS = readJson(join(ROOT, 'scripts', 'auto', 'link-hosts.json')).hosts;

/** The read a place publishes: only paragraphs its read check supports, and at least 3 of them, or none. */
function readFor(node, source) {
  if (!existsSync(workPath(node.id, 'read-draft.json'))) return null;
  const checkPath = workPath(node.id, 'read-check.json');
  if (!existsSync(checkPath)) { report.readsHeld.push(`${node.name}: read not checked`); return null; }
  const check = readJson(checkPath);
  if (check.readHash !== readHash(node)) { report.readsHeld.push(`${node.name}: read changed since its check`); return null; }
  const paragraphs = readJson(workPath(node.id, 'read-draft.json')).paragraphs ?? [];
  const kept = paragraphs
    .filter((paragraph, index) => check.support?.[`r${index}`]?.supported === true && paragraphProblems(paragraph, source.sentences).length === 0)
    .map(({ heading, text, cites }) => ({ ...(heading?.trim() ? { heading: heading.trim() } : {}), text: text.trim(), cites }));
  if (kept.length < 3) { report.readsHeld.push(`${node.name}: only ${kept.length} of ${paragraphs.length} paragraphs supported (needs 3)`); return null; }
  report.reads += 1;
  return { minutes: readMinutes(kept), paragraphs: kept };
}

/** The links a place publishes: only those the live check verified at their current URL. */
function linksFor(node) {
  if (!existsSync(workPath(node.id, 'links.json'))) return null;
  const links = readJson(workPath(node.id, 'links.json')).links ?? [];
  const ids = new Set(), urls = new Set();
  const kept = links.filter(link => {
    const ok = link?.verified === true && link.verifiedUrl === link.url && oneLinkProblems(link, LINK_HOSTS).length === 0 && !ids.has(link.id) && !urls.has(link.url);
    if (ok) { ids.add(link.id); urls.add(link.url); }
    return ok;
  }).map(({ id, kind, title, by, url, minutes, note, license }) => ({ id, kind, title, by, url, ...(minutes ? { minutes } : {}), note, ...(license ? { license } : {}) }));
  if (kept.length < links.length) report.linksHeld.push(`${node.name}: ${links.length - kept.length} of ${links.length} links not verified or failing the gate`);
  if (!kept.length) return null;
  report.links += kept.length;
  return kept;
}

const report = { published: 0, heldBack: [], packs: 0, packsHeld: [], itemsDrafted: 0, itemsKept: 0, dropped: { gate: 0, blind: 0, support: 0 }, checkedBy: {}, reads: 0, readsHeld: [], links: 0, linksHeld: [] };
function publishStage(node) {
  if (!existsSync(workPath(node.id, 'source.json'))) { report.heldBack.push(`${node.name}: not fetched`); return; }
  const source = readJson(workPath(node.id, 'source.json'));
  const out = join(PUBLISH, `${node.id}.json`);
  rmSync(out, { force: true });
  if (source.failed) { report.heldBack.push(`${node.name}: ${source.failed}`); return; }
  if (!existsSync(workPath(node.id, 'check.json'))) { report.heldBack.push(`${node.name}: not checked`); return; }
  const draft = readJson(workPath(node.id, 'draft.json'));
  const check = readJson(workPath(node.id, 'check.json'));
  if (check.draftHash !== draftHash(node)) { report.heldBack.push(`${node.name}: draft changed since its check`); return; }
  const sentences = source.sentences.length;
  const ok = id => check.support[id]?.supported === true;
  const items = [];
  (draft.items ?? []).forEach((item, index) => {
    const id = `q${index + 1}`;
    report.itemsDrafted += 1;
    if (itemProblems({ ...item, id }, sentences).length) { report.dropped.gate += 1; return; }
    if (check.blind[id] !== item.answer) { report.dropped.blind += 1; return; }
    if (!ok(id)) { report.dropped.support += 1; return; }
    items.push({ ...item, id: `${node.id}:${id}` });
  });
  report.itemsKept += items.length;
  const citesOk = cites => Array.isArray(cites) && cites.length > 0 && cites.every(n => Number.isInteger(n) && n >= 1 && n <= sentences);
  // The explainer keeps only the sentences the check found supported; two of three still make a page.
  const summary = (draft.summary ?? []).filter((_, index) => ok(`s${index}`)), facts = (draft.facts ?? []).filter((fact, index) => ok(`f${index}`) && citesOk(fact.cites));
  const place = { schema: 'mok.auto/1', nodeId: node.id, name: node.name, summary, facts, items, ...(source.image ? { image: source.image } : {}), source: { title: source.title, url: source.url, revision: source.revision } };
  const problems = placeProblems(place, sentences);
  if (problems.length) { report.heldBack.push(`${node.name}: ${problems.join('; ')}`); return; }
  const packPath = workPath(node.id, 'pack-draft.json');
  if (existsSync(packPath)) {
    const packDraft = readJson(packPath);
    const kept = { ...packDraft, beats: (packDraft.beats ?? []).filter((_, index) => ok(`b${index}`)) };
    // An area with no licensed picture of its own borrows the first one among the places inside it.
    const cover = source.image ?? catalog.getChildren(node).map(kid => existsSync(workPath(kid.id, 'source.json')) ? readJson(workPath(kid.id, 'source.json')).image : null).find(Boolean);
    try {
      if (!cover) throw new Error('no picture for the cover');
      const pack = toPack(node, kept, cover);
      const packIssues = packProblems(pack);
      if (packIssues.length) report.packsHeld.push(`${node.name}: ${packIssues.join('; ')}`); else { place.pack = pack; report.packs += 1; }
    } catch (error) { report.packsHeld.push(`${node.name}: ${error.message}`); }
  }
  // Added after every other field, and only when present, so a place without them publishes as before.
  const read = readFor(node, source), links = linksFor(node);
  if (read) place.read = read;
  if (links) place.links = links;
  writeJson(out, place);
  report.published += 1;
  report.checkedBy[check.checker ?? CHECK_MODEL] = (report.checkedBy[check.checker ?? CHECK_MODEL] ?? 0) + 1;
}

// `adopt <scope>` moves places onto a refetched source (source.v2.json, written by a refetch with a newer
// extractor). Old sentences are matched to new ones by their letters alone, so 2⁸ = 256 matches the old
// "28 = 256". A place whose cited sentences all still exist has its cites renumbered; a check made
// before a pure renumbering stays valid and is re-bound to the new hash. Prints one JSON line per place
// that needs an agent: `formula` (a cited sentence now reads differently, so a claim may copy the old
// flattened formula; its check is no longer trusted) or `lost` (a cited sentence is gone: redraft,
// source left as it was). AUTO_APPLY=1 writes; without it this only reports.
if (stage === 'adopt') {
  // NFKD turns ² and ₂ back into 2, and strips accents; what is left is compared letters and digits only.
  const letters = text => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const apply = Boolean(process.env.AUTO_APPLY);
  const counts = { same: 0, renumbered: 0, formula: 0, lost: 0 };
  for (const node of places) {
    const sourcePath = workPath(node.id, 'source.json');
    if (!existsSync(sourcePath)) continue;
    const source = readJson(sourcePath);
    if (source.failed || source.extractor === 2) continue;
    let next = existsSync(workPath(node.id, 'source.v2.json')) ? readJson(workPath(node.id, 'source.v2.json')) : null;
    if (source.within) {
      const parentV2 = workPath(node.parentId, 'source.v2.json'), parent = readJson(workPath(node.parentId, 'source.json'));
      const parentNext = existsSync(parentV2) ? readJson(parentV2) : parent.extractor === 2 ? parent : null;
      if (parentNext) next = { ...source, sentences: parentNext.sentences, revision: parentNext.revision, extractor: 2 };
    }
    if (!next) continue;
    // Match each old sentence to the first unused new sentence with the same letters, in order.
    const pool = new Map();
    next.sentences.forEach((sentence, index) => { const key = letters(sentence); pool.set(key, [...(pool.get(key) ?? []), index]); });
    const moved = source.sentences.map(sentence => pool.get(letters(sentence))?.shift());
    const files = ['draft.json', 'pack-draft.json'].filter(file => existsSync(workPath(node.id, file)));
    const docs = Object.fromEntries(files.map(file => [file, readJson(workPath(node.id, file))]));
    const claims = [...(docs['draft.json']?.summary ?? []), ...(docs['draft.json']?.facts ?? []), ...(docs['draft.json']?.items ?? []), ...(docs['pack-draft.json']?.beats ?? [])];
    const cited = [...new Set(claims.flatMap(claim => claim.cites ?? []))];
    const lost = cited.filter(number => moved[number - 1] === undefined);
    const reworded = cited.filter(number => moved[number - 1] !== undefined && next.sentences[moved[number - 1]].trim() !== source.sentences[number - 1].trim());
    const renumber = cited.some(number => moved[number - 1] !== undefined && moved[number - 1] !== number - 1);
    const kind = lost.length ? 'lost' : reworded.length ? 'formula' : renumber ? 'renumbered' : 'same';
    counts[kind] += 1;
    if (kind === 'lost' || kind === 'formula') console.log(JSON.stringify({ id: node.id, kind, lost, reworded: reworded.map(number => ({ old: number, now: moved[number - 1] + 1, was: source.sentences[number - 1], is: next.sentences[moved[number - 1]] })) }));
    if (!apply || kind === 'lost') continue;
    const checkPath = workPath(node.id, 'check.json');
    const wasValid = existsSync(checkPath) && readJson(checkPath).draftHash === draftHash(node);
    if (renumber) {
      for (const claim of claims) if (claim.cites) claim.cites = claim.cites.map(number => moved[number - 1] + 1);
      for (const file of files) writeJson(workPath(node.id, file), docs[file]);
    }
    writeJson(sourcePath, { ...next, ...(source.within ? { within: source.within } : {}), image: source.image ?? next.image ?? null });
    if (kind === 'formula') { if (existsSync(checkPath)) rmSync(checkPath); }
    else if (renumber && wasValid) writeJson(checkPath, { ...readJson(checkPath), draftHash: draftHash(node), renumberedFrom: 'extractor 1' });
  }
  console.error(JSON.stringify(counts));
  await server.close();
  process.exit(0);
}

// `tidy <scope>` writes leftover script notation (C_n, 2^k, f (x)) the way the extractor now writes it, in a
// place's source sentences and drafts alike. The change is the same mechanical rewrite on both sides, so a
// check that was valid before is re-bound to the new draft hash rather than thrown away.
if (stage === 'tidy') {
  const { tidyNotation } = await import('./wikitext.mjs');
  const KEEP = new Set(['id', 'answer', 'kind', 'gradeId', 'cites', 'wrong']);
  const walk = (value, key) => typeof value === 'string' && !KEEP.has(key) ? tidyNotation(value)
    : Array.isArray(value) ? value.map(entry => walk(entry, key))
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]))
    : value;
  let touched = 0;
  for (const node of places) {
    const sourcePath = workPath(node.id, 'source.json');
    if (!existsSync(sourcePath)) continue;
    const source = readJson(sourcePath);
    if (source.failed) continue;
    const checkPath = workPath(node.id, 'check.json');
    const wasValid = existsSync(checkPath) && readJson(checkPath).draftHash === draftHash(node);
    let changed = false;
    const sentences = source.sentences.map(tidyNotation);
    if (sentences.some((sentence, index) => sentence !== source.sentences[index])) { writeJson(sourcePath, { ...source, sentences }); changed = true; }
    for (const file of ['draft.json', 'pack-draft.json']) {
      const path = workPath(node.id, file);
      if (!existsSync(path)) continue;
      const before = readJson(path), after = walk(before, '');
      if (JSON.stringify(after) !== JSON.stringify(before)) { writeJson(path, after); changed = true; }
    }
    if (!changed) continue;
    touched += 1;
    if (wasValid) writeJson(checkPath, { ...readJson(checkPath), draftHash: draftHash(node), notation: 'tidy-1' });
    console.log(node.id);
  }
  console.error(`tidied ${touched}`);
  await server.close();
  process.exit(0);
}

// `unchecked <scope>` lists the places whose drafts have no check yet, or only a stale one.
if (stage === 'unchecked') {
  for (const node of places) {
    const inputs = checkInputs(node);
    if (inputs && !(existsSync(workPath(node.id, 'check.json')) && readJson(workPath(node.id, 'check.json')).draftHash === inputs.hash)) console.log(node.id);
  }
  await server.close();
  process.exit(0);
}
// An agent can stand in for the checking model, in two steps it must take in order:
//   `quiz <nodeId>`   the questions alone (no answers, no source): answer them blind;
//   `claims <nodeId>` the source and every claim, with the rule a claim is judged by;
//   `record <nodeId> <file>` saves {"answers":{...},"results":{...}} as the place's check.
if (stage === 'quiz' || stage === 'claims' || stage === 'record') {
  const inputs = checkInputs(root);
  if (!inputs) { console.log('nothing to check: no source or no draft'); await server.close(); process.exit(1); }
  if (stage === 'quiz') console.log(`${BLIND}\n\n${JSON.stringify(inputs.quiz, null, 1)}`);
  // The token ties a verdict to the very drafts its checker read: a verdict written for older drafts
  // carries an older token and is refused.
  if (stage === 'claims') console.log(`${SUPPORT}\n\nPut "token": "${inputs.hash.slice(0, 12)}" in your verdict file.\n\nSource sentences:\n${inputs.sourceText}\n\nClaims:\n${JSON.stringify(inputs.claims, null, 1)}`);
  if (stage === 'record') {
    const verdict = readJson(process.argv[4]);
    if (verdict.token !== inputs.hash.slice(0, 12)) { console.log('refused: this verdict was written for other drafts (its token does not match; run claims again)'); await server.close(); process.exit(1); }
    const missing = [...inputs.quiz.filter(q => !verdict.answers?.[q.id]).map(q => `answer ${q.id}`), ...inputs.claims.filter(c => typeof verdict.results?.[c.id]?.supported !== 'boolean').map(c => `verdict ${c.id}`)];
    if (missing.length) { console.log(`missing: ${missing.join(', ')}`); await server.close(); process.exit(1); }
    writeJson(workPath(root.id, 'check.json'), { draftHash: inputs.hash, checker: 'claude-agent', blind: verdict.answers, support: verdict.results });
    console.log('recorded');
  }
  await server.close();
  process.exit(0);
}
/** Every gate problem with a place's drafts (none = ready to check). */
function lintProblems(node) {
  const source = readJson(workPath(node.id, 'source.json'));
  const problems = [];
  const draft = existsSync(workPath(node.id, 'draft.json')) ? readJson(workPath(node.id, 'draft.json')) : null;
  if (!draft) problems.push('no draft.json');
  else {
    const n = source.sentences.length;
    problems.push(...placeProblems({ ...draft, nodeId: node.id, name: node.name, source: {} }, n));
    if ((draft.items ?? []).length !== 6) problems.push('needs exactly 6 items');
    if ((draft.summary ?? []).length !== 3) problems.push('summary must be 3 sentences');
    (draft.items ?? []).forEach((item, index) => problems.push(...itemProblems({ ...item, id: `q${index + 1}` }, n).map(p => `item ${index + 1}: ${p}`)));
  }
  if (existsSync(workPath(node.id, 'pack-draft.json'))) {
    try { problems.push(...packProblems(toPack(node, readJson(workPath(node.id, 'pack-draft.json')), source.image ?? { src: 'x', alt: 'x', credit: 'x', license: 'x', page: 'x' })).map(p => `pack: ${p}`)); }
    catch (error) { problems.push(`pack: ${error.message}`); }
  }
  return problems;
}
// `lint <nodeId>` checks one place's drafts against the gate and prints every problem (for a drafter's own loop).
if (stage === 'lint') {
  const problems = lintProblems(root);
  console.log(problems.length ? problems.join('\n') : 'OK');
  await server.close();
  process.exit(0);
}
// `lintall <scope>` lists every drafted place under the scope whose drafts fail the gate.
if (stage === 'lintall') {
  for (const node of places) {
    const source = existsSync(workPath(node.id, 'source.json')) ? readJson(workPath(node.id, 'source.json')) : null;
    if (!source || source.failed) continue;
    let problems;
    try { problems = lintProblems(node); } catch (error) { problems = [`unreadable: ${error.message}`]; }
    if (problems.length) console.log(`${node.id}\t${problems.slice(0, 3).join(' | ')}`);
  }
  await server.close();
  process.exit(0);
}
// The compiled read, for an agent (briefs/reader.md, briefs/read-checker.md):
//   `lintread <nodeId>`   every gate problem with read-draft.json (none = OK);
//   `readclaims <nodeId>` the rule, the numbered source and each paragraph as a claim r0..rN, with a token;
//   `readrecord <nodeId> <file>` saves {"token","results":{...}} as read-check.json.
if (stage === 'lintread' || stage === 'readclaims' || stage === 'readrecord') {
  const sourcePath = workPath(root.id, 'source.json'), draftPath = workPath(root.id, 'read-draft.json');
  const source = existsSync(sourcePath) ? readJson(sourcePath) : null;
  if (!source || source.failed || !existsSync(draftPath)) { console.log('nothing to do: no usable source.json or no read-draft.json'); await server.close(); process.exit(1); }
  let draft;
  try { draft = readJson(draftPath); } catch (error) { console.log(`read-draft.json is not JSON: ${error.message}`); await server.close(); process.exit(1); }
  const problems = readProblems(draft, source.sentences);
  if (stage === 'lintread') { console.log(problems.length ? problems.join('\n') : 'OK'); await server.close(); process.exit(problems.length ? 1 : 0); }
  if (problems.length) { console.log(`the read fails its gate; run lintread ${root.id} and fix it first`); await server.close(); process.exit(1); }
  const token = readHash(root).slice(0, 12);
  const claims = draft.paragraphs.map((paragraph, index) => ({ id: `r${index}`, ...(paragraph.heading ? { heading: paragraph.heading } : {}), claim: paragraph.text, cites: paragraph.cites }));
  if (stage === 'readclaims') console.log(`${READ_SUPPORT}\n\nPut "token": "${token}" in your verdict file.\n\nSource sentences:\n${numbered(source)}\n\nClaims:\n${JSON.stringify(claims, null, 1)}`);
  if (stage === 'readrecord') {
    const verdict = readJson(process.argv[4]);
    if (verdict.token !== token) { console.log('refused: this verdict was written for another read (its token does not match; run readclaims again)'); await server.close(); process.exit(1); }
    const missing = claims.filter(claim => typeof verdict.results?.[claim.id]?.supported !== 'boolean').map(claim => `verdict ${claim.id}`);
    if (missing.length) { console.log(`missing: ${missing.join(', ')}`); await server.close(); process.exit(1); }
    const support = Object.fromEntries(claims.map(claim => [claim.id, { supported: verdict.results[claim.id].supported, why: String(verdict.results[claim.id].why ?? '') }]));
    writeJson(workPath(root.id, 'read-check.json'), { readHash: readHash(root), checker: 'claude-agent', support });
    console.log(`recorded (${Object.values(support).filter(result => result.supported).length} of ${claims.length} paragraphs supported)`);
  }
  await server.close();
  process.exit(0);
}

// `links <nodeId>` gates links.json, then opens every link live and writes the result back into it:
// verified, checkedAt, fetchedTitle (and verifiedUrl, so a link edited afterwards is unverified again).
// A YouTube link is checked through its oEmbed answer, which also says who posted it.
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const YOUTUBE = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']);
const entities = text => text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
async function verifyLink(link) {
  const signal = AbortSignal.timeout(12000);
  try {
    if (YOUTUBE.has(new URL(link.url).hostname)) {
      const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`, { headers: { 'User-Agent': BROWSER_UA }, signal });
      if (response.status !== 200) return { why: `YouTube oEmbed answered ${response.status} (missing, private or not embeddable)` };
      const body = await response.json();
      return { title: String(body.title ?? '').trim(), ...(body.author_name && body.author_name !== link.by ? { by: body.author_name } : {}) };
    }
    const response = await fetch(link.url, { redirect: 'follow', headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en' }, signal });
    const landed = new URL(response.url || link.url);
    const host = landed.hostname;
    if (response.status !== 200) { await response.body?.cancel(); return { why: `answered ${response.status}` }; }
    if (landed.protocol !== 'https:') { await response.body?.cancel(); return { why: `redirected to a non-https URL (${landed.href})` }; }
    if (!hostAllowed(host, LINK_HOSTS)) { await response.body?.cancel(); return { why: `redirected off the allowlist, to ${host}` }; }
    const html = /html|xml/.test(response.headers.get('content-type') ?? '') ? await response.text() : '';
    if (!html) await response.body?.cancel();
    return { title: entities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) };
  } catch (error) { return { why: error.name === 'TimeoutError' ? 'no answer within 12 s' : error.message }; }
}
if (stage === 'links') {
  const path = workPath(root.id, 'links.json');
  let doc;
  try { doc = readJson(path); } catch (error) { console.log(existsSync(path) ? `links.json is not JSON: ${error.message}` : 'nothing to do: no links.json'); await server.close(); process.exit(1); }
  const problems = linkProblems(doc.links, LINK_HOSTS);
  if (problems.length) { console.log(problems.join('\n')); await server.close(); process.exit(1); }
  const failed = [];
  for (const [index, link] of doc.links.entries()) {
    if (index) await new Promise(resolve => setTimeout(resolve, 500));
    const result = await verifyLink(link);
    const { verified, verifiedUrl, checkedAt, fetchedTitle, failure, ...rest } = link;
    if (result.why) { doc.links[index] = { ...rest, verified: false, checkedAt: new Date().toISOString(), failure: result.why }; failed.push(`${link.id}: ${result.why}`); continue; }
    doc.links[index] = { ...rest, ...(result.by ? { by: result.by } : {}), verified: true, verifiedUrl: link.url, checkedAt: new Date().toISOString(), fetchedTitle: result.title };
    console.log(`  ${link.id}: 200${result.by ? `, by set to ${result.by}` : ''} (${result.title || 'no title'})`);
  }
  writeJson(path, doc);
  // A `by` taken from YouTube still has to pass the gate.
  const after = linkProblems(doc.links, LINK_HOSTS);
  console.log(failed.length || after.length ? [...failed, ...after].join('\n') : 'OK');
  await server.close();
  process.exit(failed.length || after.length ? 1 : 0);
}

// `unread <scope>` lists the published places in scope with no published read, then those with no links.
if (stage === 'unread') {
  const noRead = [], noLinks = [];
  for (const node of process.env.AUTO_SELF ? [root] : [root, ...places]) {
    const path = join(PUBLISH, `${node.id}.json`);
    if (!existsSync(path)) continue;
    const page = readJson(path);
    if (!page.read) noRead.push(node.id);
    if (!page.links?.length) noLinks.push(node.id);
  }
  console.log(`no read (${noRead.length}):\n${noRead.join('\n')}\n\nno links (${noLinks.length}):\n${noLinks.join('\n')}`);
  await server.close();
  process.exit(0);
}

// `shelf` rebuilds public/auto/shelf.json from what is published (publish does this too).
if (stage === 'shelf') {
  const shelf = writeShelfIndex(PUBLISH);
  const minutes = Object.values(shelf.core);
  console.log(`shelf.json: ${minutes.length} places, ${minutes.filter(m => m[1]).length} with a read, ${minutes.filter(m => m[2]).length} with a pack`);
  await server.close();
  process.exit(0);
}
const stages = stage === 'all' ? ['fetch', 'draft', 'check', 'publish'] : [stage];
console.log(`${places.length} places under ${root.name}; drafter ${DRAFT_MODEL}, checker ${CHECK_MODEL} (free tier, $0)`);
try {
  for (const name of stages) {
    console.log(`\n${name}`);
    if (name === 'fetch') for (const node of places) await fetchStage(node);
    if (name === 'publish') for (const node of places) publishStage(node);
    if (name === 'draft' || name === 'check') {
      // Model stages run several places at once; one place's failure is logged and the rest go on.
      const queue = [...places];
      const worker = async () => {
        for (let node = queue.shift(); node; node = queue.shift()) {
          try { await (name === 'draft' ? draftStage(node) : checkStage(node)); } catch (error) { console.log(`  ${name} failed for ${node.name}: ${error.message.slice(0, 160)}`); }
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
    }
  }
  if (stages.includes('publish')) {
    writeJson(join(ROOT, 'content', 'auto', 'report.json'), report);
    // The list of every published place, whatever scope published it: what the app counts as charted.
    const published = readdirSync(PUBLISH).filter(file => file.startsWith('knowledge.') && file.endsWith('.json')).map(file => file.slice(0, -5)).sort();
    writeJson(join(PUBLISH, 'index.json'), { schema: 'mok.auto-index/1', places: published });
    const shelf = writeShelfIndex(PUBLISH);
    writeVideoIndex(PUBLISH);
    console.log(`shelf.json: ${Object.keys(shelf.core).length} places`);
    console.log(JSON.stringify(report, null, 1));
  }
} finally {
  await server.close();
}
