// The place matcher: a story's Wikidata item → one atlas place, deterministically.
//
//   1. The item itself, if the curated table names it (Black Death → The Black Death).
//   2. A person: dead people only (no reels about the living), by occupation and field of work;
//      skipped if they are known only for an entertainment or sports occupation.
//   3. A living thing: up its parent-taxon chain until a curated taxon (a moth → insect → Animals).
//   4. Anything else: a breadth-first walk up "instance of", "subclass of", "part of", "main
//      subject" and "field of work" until curated classes are met (Hurricane Patricia →
//      Category 5 Pacific hurricane → … → tropical cyclone → Climate).
//   5. Nothing found: the page's short description, read by fixed rules (the "categories" step).
// The closest hit wins; ties go to the deeper (more specific) place, then alphabetical order.
// Kinds of thing the engine never covers (films, sport, companies, lists…) are skipped outright.
// `lookup` is synchronous over a graph fetched beforehand (collectGraph), so matching is pure.
import { DESCRIPTION_RULES, EXCLUDED_CLASSES, EXCLUDED_DESCRIPTIONS, EXCLUDED_OCCUPATIONS, EXPEDITION_RULES, HUMAN, PLACES, TAXON } from './placeTable.mjs';

const MAX_DEPTH = 4;
/** Occupations too broad to vouch for someone otherwise known for entertainment or sport. */
const LOOSE_OCCUPATIONS = new Set(['Q639669', 'Q36180', 'Q82955', 'Q49757', 'Q6625963', 'Q33231']);
const MAX_TAXON = 45;
const nodeDepth = node => node.split('.').length;

/** The statements a walk follows from an entity, by the role it plays in the walk. */
export function steps(entity, role) {
  const c = entity.claims ?? {};
  const as = (ids, next) => (ids ?? []).map(id => [id, next]);
  switch (role) {
    case 'item': return [...as(c.P31, 'class'), ...as(c.P279, 'class'), ...as(c.P361, 'part'), ...as(c.P921, 'class'), ...as(c.P101, 'class'), ...as(c.P2579, 'class'), ...as(c.P136, 'class'), ...as(c.P1269, 'class')];
    case 'part': return [...as(c.P31, 'class'), ...as(c.P279, 'class'), ...as(c.P361, 'part')];
    case 'class': return as(c.P279, 'class');
    case 'occupation': return [...as(c.P279, 'occupation'), ...as(c.P101, 'class')];
    case 'taxon': return as(c.P171, 'taxon');
    default: return [];
  }
}

const isHuman = entity => (entity.claims?.P31 ?? []).includes(HUMAN);
const isTaxon = entity => (entity.claims?.P31 ?? []).includes(TAXON) || (entity.claims?.P171 ?? []).length > 0;

/** Where a walk starts: the item and the role each first step plays. */
function starts(entity) {
  if (isHuman(entity)) return [...(entity.claims.P106 ?? []).map(id => [id, 'occupation']), ...(entity.claims.P101 ?? []).map(id => [id, 'class'])];
  if (isTaxon(entity)) return (entity.claims.P171 ?? []).map(id => [id, 'taxon']);
  return steps(entity, 'item');
}

/** Match one item. Returns { node, via, depth } or { skip }. */
export function matchPlace(qid, lookup, { description = '' } = {}) {
  const item = lookup(qid);
  if (!item) return { skip: 'no Wikidata item' };
  if (PLACES[qid]) return { node: PLACES[qid].node, via: [{ qid, label: PLACES[qid].label }], depth: 0 };

  const classes = item.claims?.P31 ?? [];
  const banned = classes.find(id => EXCLUDED_CLASSES[id]);
  if (banned) return { skip: `a ${EXCLUDED_CLASSES[banned]}` };
  const said = `${description} ${item.description ?? ''}`.match(EXCLUDED_DESCRIPTIONS);
  if (said) return { skip: `described as entertainment or sport ("${said[0]}")` };
  if (isHuman(item)) {
    if (!item.died) return { skip: 'a living person' };
    // An actor who was also an astronaut stays; a singer who was also a "musician", a "writer" or
    // a politician does not: those say nothing the entertainment press doesn't.
    const jobs = item.claims.P106 ?? [];
    const known = jobs.find(id => EXCLUDED_OCCUPATIONS[id]);
    if (known && !jobs.some(id => PLACES[id] && !LOOSE_OCCUPATIONS.has(id))) return { skip: `known as a ${EXCLUDED_OCCUPATIONS[known]}` };
  }

  const limit = isTaxon(item) ? MAX_TAXON : MAX_DEPTH;
  const hits = [];
  const seen = new Set([qid]);
  // Only what the item is (its classes, and theirs) can rule it out, never what it is part of.
  let frontier = starts(item).map(([id, role], order) => ({ id, role, path: [], kind: classes.includes(id) ? 'is' : 'about', order }));
  for (let depth = 1; depth <= limit && frontier.length && !hits.length; depth++) {
    const next = [];
    for (const step of frontier) {
      if (seen.has(step.id)) continue;
      seen.add(step.id);
      const path = [...step.path, step.id];
      if (EXCLUDED_CLASSES[step.id] && depth <= 2 && step.kind === 'is') return { skip: `a ${EXCLUDED_CLASSES[step.id]}` };
      if (PLACES[step.id]) { hits.push({ node: PLACES[step.id].node, depth, order: step.order, via: path.map(id => ({ qid: id, label: PLACES[id]?.label ?? lookup(id)?.label ?? id })) }); continue; }
      const entity = lookup(step.id);
      if (entity && step.id !== HUMAN) for (const [id, role] of steps(entity, step.role)) next.push({ id, role, path, kind: step.kind, order: step.order });
    }
    // Deterministic order whatever order the API returned statements in.
    frontier = next.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'en', { numeric: true }));
  }
  if (hits.length) {
    // Closest first; then, for a person, the occupation Wikidata lists first (usually what they
    // are known for); then the more specific place.
    const person = isHuman(item);
    hits.sort((a, b) => a.depth - b.depth || (person ? a.order - b.order : 0) || nodeDepth(b.node) - nodeDepth(a.node) || a.node.localeCompare(b.node));
    const { order, ...best } = hits[0];
    return best;
  }
  const text = `${description} ${item.description ?? ''}`;
  for (const [pattern, node] of DESCRIPTION_RULES) if (pattern.test(text)) return { node, via: [{ qid: 'description', label: text.match(pattern)[0] }], depth: MAX_DEPTH + 1 };
  return { skip: 'no atlas place fits' };
}

/** A place with an expedition, when the story's own words name its idea (EXPEDITION_RULES). */
export function expeditionPlace(text) {
  for (const [pattern, node] of EXPEDITION_RULES) { const m = String(text ?? '').match(pattern); if (m) return { node, via: [{ qid: 'words', label: m[0] }], depth: 0 }; }
  return null;
}

/** The "categories" step on its own, for a picture whose description names its subject. */
export function descriptionPlace(text) {
  const first = String(text ?? '').split(/(?<=\.)\s/)[0];
  for (const [pattern, node] of DESCRIPTION_RULES) if (pattern.test(first)) return { node, via: [{ qid: 'description', label: first.match(pattern)[0] }], depth: MAX_DEPTH + 1 };
  return null;
}

/** Fetch every entity a walk from these items could visit, level by level, with the same steps
 * the matcher takes. `fetchEntities(ids)` resolves to a Map of id → entity (wiki.mjs entities). */
export async function collectGraph(qids, fetchEntities) {
  const graph = new Map();
  const lookup = id => graph.get(id);
  const add = async ids => { const missing = [...new Set(ids)].filter(id => !graph.has(id) && id !== HUMAN); if (missing.length) for (const [id, e] of await fetchEntities(missing)) graph.set(id, e); };
  await add(qids);
  let frontier = qids.flatMap(id => { const e = lookup(id); return e && !PLACES[id] ? starts(e).map(([next, role]) => ({ id: next, role, depth: 1, taxon: isTaxon(e) })) : []; });
  const seen = new Set(qids);
  while (frontier.length) {
    frontier = frontier.filter(step => !seen.has(`${step.id}:${step.role}`) && (seen.add(`${step.id}:${step.role}`), true));
    const expand = frontier.filter(step => !PLACES[step.id] && !EXCLUDED_CLASSES[step.id] && step.id !== HUMAN && step.depth < (step.taxon ? MAX_TAXON : MAX_DEPTH));
    await add(frontier.map(step => step.id));
    frontier = expand.flatMap(step => { const e = lookup(step.id); return e ? steps(e, step.role).map(([id, role]) => ({ id, role, depth: step.depth + 1, taxon: step.taxon })) : []; });
  }
  return graph;
}
