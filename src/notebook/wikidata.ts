import { findShelfWork, titleKey } from './importCsv';
import { shelfEntry, type ItemKind, type ItemStatus, type LibraryEntry } from './libraryStore';
import { createLimiter, getJson, type Limiter } from './openLibrary';
import { mapPlaces } from './placeMap';

/*
 * Wikidata (CC0): films, documentaries, television series, podcasts and lecture courses for the + sheet.
 * A full-text search restricted to those kinds of thing, then one SPARQL query for the few fields an
 * entry keeps (title, kind, creator, year, main subject, genre). No images: posters are not CC0, so
 * screen items take the typographic cover. Browsers can't set User-Agent; Wikimedia reads
 * Api-User-Agent instead, which names the app (never a person's email).
 */

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
export const API_USER_AGENT = 'MapOfKnowledge/0.1 (+https://map-of-knowledge.vercel.app)';
export const WIKIDATA_LIMITER = createLimiter(250);
export const itemUrl = (qid: string) => `https://www.wikidata.org/wiki/${qid}`;

/** "Instance of" (P31) values searched for, with what each becomes. */
const TYPES: Readonly<Record<string, { kind: ItemKind; format: string; rank: number }>> = {
  Q93204: { kind: 'documentary', format: 'Documentary', rank: 1 },
  Q24634210: { kind: 'podcast', format: 'Podcast', rank: 2 },
  Q1555508: { kind: 'podcast', format: 'Radio series', rank: 3 },
  Q600134: { kind: 'course', format: 'Course', rank: 2 },
  Q21358050: { kind: 'course', format: 'Lecture series', rank: 2 },
  Q967853: { kind: 'course', format: 'Online course', rank: 2 },
  Q11900959: { kind: 'course', format: 'Online course', rank: 3 },
  Q5398426: { kind: 'series', format: 'TV series', rank: 4 },
  Q1259759: { kind: 'series', format: 'Miniseries', rank: 4 },
  Q15416: { kind: 'series', format: 'TV programme', rank: 5 },
  Q11424: { kind: 'film', format: 'Film', rank: 6 },
  Q506240: { kind: 'film', format: 'TV film', rank: 6 },
  Q202866: { kind: 'film', format: 'Animated film', rank: 7 },
  Q24862: { kind: 'film', format: 'Short film', rank: 7 },
};

export interface ScreenResult {
  readonly source: 'wd';
  readonly qid: string;
  readonly title: string;
  readonly description: string;
  readonly creator: string;
  readonly year: number | null;
  readonly kind: ItemKind;
  readonly format: string;
  readonly mainSubjects: readonly string[];
  readonly genres: readonly string[];
}

/** The search text: the learner's words, restricted to films, series, podcasts and courses. */
export const searchText = (words: string) => `${words.replace(/[|"\\]/g, ' ').trim()} haswbstatement:${Object.keys(TYPES).map(type => `P31=${type}`).join('|')}`;

/** One query for every result's kind, presenters, directors, creators or authors, first date, main
 * subjects and genres. Each role is its own OPTIONAL: a UNION inside one makes the query service time out. */
export function detailsQuery(qids: readonly string[]): string {
  return `SELECT ?item ?itemLabel ?itemDescription
 (GROUP_CONCAT(DISTINCT STRAFTER(STR(?type), "entity/"); separator="|") AS ?types)
 (GROUP_CONCAT(DISTINCT ?presenterLabel; separator="|") AS ?presenters)
 (GROUP_CONCAT(DISTINCT ?directorLabel; separator="|") AS ?directors)
 (GROUP_CONCAT(DISTINCT ?creatorLabel; separator="|") AS ?creators)
 (MIN(?date) AS ?first)
 (GROUP_CONCAT(DISTINCT ?subjectLabel; separator="|") AS ?subjects)
 (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
WHERE {
 VALUES ?item { ${qids.map(qid => `wd:${qid}`).join(' ')} }
 OPTIONAL { ?item wdt:P31 ?type. }
 OPTIONAL { ?item wdt:P371 ?presenter. ?presenter rdfs:label ?presenterLabel. FILTER(LANG(?presenterLabel) = "en") }
 OPTIONAL { ?item wdt:P57 ?director. ?director rdfs:label ?directorLabel. FILTER(LANG(?directorLabel) = "en") }
 OPTIONAL { ?item wdt:P170|wdt:P50 ?creator. ?creator rdfs:label ?creatorLabel. FILTER(LANG(?creatorLabel) = "en") }
 OPTIONAL { ?item wdt:P577|wdt:P580 ?date. }
 OPTIONAL { ?item wdt:P921 ?subject. ?subject rdfs:label ?subjectLabel. FILTER(LANG(?subjectLabel) = "en") }
 OPTIONAL { ?item wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel) = "en") }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?item ?itemLabel ?itemDescription`;
}

const split = (value: string | undefined) => (value ?? '').split('|').map(s => s.trim()).filter(Boolean);

/** The search's QIDs, in its order of relevance, filled in from the details query. */
export function screenResultsFrom(search: unknown, details: unknown): ScreenResult[] {
  const hits = (search as { query?: { search?: { title?: unknown }[] } } | null)?.query?.search ?? [];
  const order = hits.map(hit => typeof hit.title === 'string' ? hit.title : '').filter(qid => /^Q\d+$/.test(qid));
  const bindings = (details as { results?: { bindings?: Record<string, { value?: string }>[] } } | null)?.results?.bindings ?? [];
  const byQid = new Map<string, ScreenResult>();
  for (const row of bindings) {
    const get = (key: string) => row[key]?.value ?? '';
    const qid = get('item').split('/').pop() ?? '';
    const title = get('itemLabel');
    if (!/^Q\d+$/.test(qid) || !title || title === qid) continue;
    const types = split(get('types')).map(type => TYPES[type]).filter(Boolean).sort((a, b) => a.rank - b.rank);
    if (!types.length) continue;
    const genres = split(get('genres')).slice(0, 8);
    const documentary = genres.some(genre => /documentary/i.test(genre));
    let { kind, format } = types[0];
    if (kind === 'film' && documentary) { kind = 'documentary'; format = 'Documentary'; }
    if (kind === 'series' && documentary) format = 'Documentary series';
    // Who to name: the presenter of a series or podcast, the director of a film, else its creator.
    const first = (key: string) => split(get(key)).sort((a, b) => a.localeCompare(b))[0];
    const film = kind === 'film' || kind === 'documentary';
    const creator = first('presenters') ?? (film ? first('directors') ?? first('creators') : first('creators') ?? first('directors')) ?? '';
    const year = Number(get('first').slice(0, get('first').startsWith('-') ? 5 : 4));
    byQid.set(qid, {
      source: 'wd', qid, title: title.slice(0, 300), description: get('itemDescription').slice(0, 200), creator: creator.slice(0, 200),
      year: get('first') && Number.isInteger(year) && year !== 0 ? year : null, kind, format,
      mainSubjects: split(get('subjects')).slice(0, 8), genres,
    });
  }
  return order.map(qid => byQid.get(qid)).filter((result): result is ScreenResult => !!result);
}

/** Films, documentaries, series, podcasts and courses matching the learner's words. */
export async function searchScreen(query: string, { signal, fetchImpl, limiter = WIKIDATA_LIMITER }: { signal?: AbortSignal; fetchImpl?: typeof fetch; limiter?: Limiter } = {}): Promise<ScreenResult[]> {
  const words = query.trim().replace(/\s+/g, ' ');
  if (words.length < 2) return [];
  const headers = { 'Api-User-Agent': API_USER_AGENT };
  const params = new URLSearchParams({ action: 'query', list: 'search', srsearch: searchText(words), srlimit: '8', srprop: '', format: 'json', origin: '*' });
  const search = await limiter.schedule(() => getJson(`${WIKIDATA_API}?${params}`, { signal, fetchImpl, headers }), { first: true, signal });
  const qids = ((search as { query?: { search?: { title: string }[] } }).query?.search ?? []).map(hit => hit.title).filter(qid => /^Q\d+$/.test(qid));
  if (!qids.length) return [];
  const sparql = new URLSearchParams({ query: detailsQuery(qids), format: 'json' });
  const details = await limiter.schedule(() => getJson(`${WIKIDATA_SPARQL}?${sparql}`, { signal, fetchImpl, headers: { ...headers, Accept: 'application/sparql-results+json' } }), { first: true, signal });
  return screenResultsFrom(search, details);
}

/** A result as an entry: placed from its main subjects and genres (and its own description, lightly). */
export function entryFromScreen(result: ScreenResult, status: ItemStatus, now: string): LibraryEntry {
  const shelf = findShelfWork(result.title, result.creator);
  if (shelf) return { ...shelfEntry(shelf, status, now, status === 'finished' ? { finishedAt: now } : status === 'started' ? { startedAt: now } : {}), ids: { shelf: shelf.id, wd: result.qid }, enrich: 'done', enrichedAt: now };
  return {
    id: `wd-${result.qid}`, kind: result.kind, format: result.format, title: result.title, creator: result.creator, year: result.year, cover: null,
    ids: { wd: result.qid }, subjects: [...result.mainSubjects, ...result.genres].slice(0, 8), tags: [],
    places: mapPlaces({ title: result.title, mainSubjects: result.mainSubjects, genres: result.genres, pageText: result.description }), placesBy: 'auto',
    status, addedAt: now, ...(status === 'started' ? { startedAt: now } : {}), ...(status === 'finished' ? { finishedAt: now } : {}),
    source: 'search', createdAt: now, updatedAt: now,
  };
}

export const sameScreen = (entry: Pick<LibraryEntry, 'ids' | 'title' | 'creator'>, result: ScreenResult) =>
  entry.ids.wd === result.qid || titleKey(entry.title, entry.creator) === titleKey(result.title, result.creator);
