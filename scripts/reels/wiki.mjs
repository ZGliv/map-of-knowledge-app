// Wikipedia and Wikidata, read politely. Wikipedia text is CC BY-SA 4.0: the engine pins each
// article's plain-text extract to its revision and uses it as fact input only (the drafter writes
// in its own words; the validator's 8-word clean-room check enforces it). Wikidata is CC0.
import { get, today } from './lib.mjs';

const WP = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2';

/** Pin one article: its full plain-text extract at the current revision, with its Wikidata item.
 * Tries each spelling in turn (a disambiguator, a redirect). Returns null when none exists. */
export async function pinArticle(spellings, { ttlHours = 24 } = {}) {
  for (const title of [spellings].flat()) {
    const url = `${WP}&action=query&prop=extracts|revisions|pageprops|description&explaintext=1&exsectionformat=plain&rvprop=ids|timestamp&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(title)}`;
    const data = await get(url, { ttlHours });
    const page = data?.query?.pages?.[0];
    if (!page || page.missing || page.invalid || !page.extract) continue;
    const revision = String(page.revisions?.[0]?.revid ?? '');
    return {
      id: `Wikipedia: ${page.title}`,
      kind: 'wikipedia',
      title: page.title,
      url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title.replaceAll(' ', '_'))}&oldid=${revision}`,
      revision,
      retrieved: today(),
      licence: 'CC BY-SA 4.0',
      usage: ['ai_input'],
      qid: page.pageprops?.wikibase_item ?? null,
      description: page.description ?? '',
      text: page.extract,
    };
  }
  return null;
}

/** QIDs and short descriptions for many titles at once (50 per request). */
export async function pageInfo(titles, { ttlHours = 24 } = {}) {
  const out = new Map();
  const wanted = [...new Set(titles.map(t => t.replace(/_/g, ' ')))];
  for (let i = 0; i < wanted.length; i += 50) {
    const batch = wanted.slice(i, i + 50);
    const data = await get(`${WP}&action=query&prop=pageprops|description&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`, { ttlHours });
    const from = new Map();
    for (const r of [...(data?.query?.normalized ?? []), ...(data?.query?.redirects ?? [])]) from.set(r.to, [...(from.get(r.to) ?? []), r.from]);
    for (const page of data?.query?.pages ?? []) {
      if (page.missing) continue;
      const info = { title: page.title, qid: page.pageprops?.wikibase_item ?? null, description: page.description ?? '' };
      out.set(page.title, info);
      const queue = [...(from.get(page.title) ?? [])];
      while (queue.length) { const alias = queue.shift(); out.set(alias, info); queue.push(...(from.get(alias) ?? [])); }
    }
  }
  return out;
}

/** The files an article shows, in page order, with their captions (REST media-list). */
export async function mediaList(title, { ttlHours = 24 } = {}) {
  const data = await get(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title.replaceAll(' ', '_'))}`, { ttlHours });
  return (data?.items ?? [])
    .filter(item => item.type === 'image' && /^File:/.test(item.title ?? ''))
    .map(item => ({ title: item.title.replace(/_/g, ' '), caption: item.caption?.text ?? '' }));
}

/** Wikidata items with just the statements the place matcher reads, 50 per request. */
export const MATCH_PROPS = ['P31', 'P279', 'P106', 'P101', 'P361', 'P171', 'P921', 'P2579', 'P136', 'P1269'];
export async function entities(qids, { ttlHours = 24 * 7 } = {}) {
  const out = new Map();
  const wanted = [...new Set(qids.filter(q => /^Q\d+$/.test(q)))];
  for (let i = 0; i < wanted.length; i += 50) {
    const batch = wanted.slice(i, i + 50);
    const data = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims&languages=en&ids=${batch.join('|')}`, { ttlHours });
    for (const [id, entity] of Object.entries(data?.entities ?? {})) {
      if (entity.missing !== undefined) continue;
      const values = p => (entity.claims?.[p] ?? []).filter(c => c.rank !== 'deprecated').map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
      const time = p => (entity.claims?.[p] ?? []).map(c => c.mainsnak?.datavalue?.value?.time).find(Boolean);
      const year = t => (t ? Number(t.replace(/^\+/, '').split('-')[0]) : null);
      out.set(id, {
        id,
        label: entity.labels?.en?.value ?? id,
        description: entity.descriptions?.en?.value ?? '',
        claims: Object.fromEntries(MATCH_PROPS.map(p => [p, values(p)])),
        born: year(time('P569')),
        died: year(time('P570')),
        // When it happened, for events: point in time, start time, or inception.
        year: year(time('P585') ?? time('P580') ?? time('P571')),
      });
    }
  }
  return out;
}
