import { catalog } from '../../core/catalog';
import { PACK_PLACES } from '../../expeditions/manifest';
import { videoIdFromUrl } from '../../feed/youtube';
import { isMine, within, type Journal, type LibraryItem, type PlaceState, type PlaceStatus } from '../../notebook/journal';
import { liveNotes, type ItemNote, type LibraryStore } from '../../notebook/libraryStore';
import { coverUrl } from '../../notebook/openLibrary';
import { liveExhibitions, type ExhibitionStore, type StoredExhibition } from './exhibitionStore';

/*
 * The Library as exhibitions. Pure: the journal (every record the learner has), the library, their own
 * exhibitions and what Watch and Reels remember go in; the pieces, the exhibitions (theirs, and the ones
 * MoK suggests from what they have) and the map strip come out.
 *
 * Nothing here defaults to a field. An exhibition exists only because the learner made it, or because
 * their own things gather in a field or around a place. An empty library gives an empty gallery.
 */

export type PieceKind = 'video' | 'reel' | 'book' | 'screen' | 'link' | 'idea' | 'question';
export type Step = 'saved' | 'started' | 'finished' | 'proved';
export const STEPS: readonly Step[] = ['saved', 'started', 'finished', 'proved'];
export interface PathMark { readonly step: Step; readonly done: boolean; readonly at: string | null }

/** One thing the learner keeps, as an exhibition hangs it. */
export interface Piece {
  /** Its library key: work:…, entry:…, link:…, reel:…, note:… */
  readonly key: string;
  readonly kind: PieceKind;
  readonly title: string;
  readonly byline: string;
  readonly image: string | null;
  readonly nodeIds: readonly string[];
  /** When it was saved, added or written. */
  readonly at: string;
  /** Its latest step, for what is freshest. */
  readonly latest: string;
  /** Saved → Started → Finished → Proved. Empty for notes. */
  readonly path: readonly PathMark[];
  /** The place that proves it (its own, or one inside it), when there is one. */
  readonly provedIn: string | null;
  /** Passages and thoughts kept from it. */
  readonly kept: readonly ItemNote[];
  readonly item: LibraryItem;
  /** A video Watch can play. */
  readonly videoId?: string;
}

export interface Lesson { readonly packId: string; readonly nodeId: string; readonly title: string; readonly minutes: number | null; readonly image: string | null; readonly state: PlaceState; readonly ran: boolean }
export interface ProofStop { readonly nodeId: string; readonly state: PlaceState; readonly litAt: string | null; readonly lastingAt: string | null; readonly ready: boolean; readonly packId: string | null }
export type SectionId = 'video' | 'work' | 'reel' | 'link' | 'note';
export interface Section { readonly id: SectionId; readonly title: string; readonly pieces: readonly Piece[] }
export type ExhibitionSource = 'mine' | 'field' | 'around';

export interface Exhibition {
  /** mine:<id>, field:<node> or around:<node>. */
  readonly id: string;
  readonly source: ExhibitionSource;
  readonly title: string;
  readonly intro: string;
  /** The places it is about, for its map mark and its proof. */
  readonly places: readonly string[];
  readonly pieces: readonly Piece[];
  readonly sections: readonly Section[];
  readonly lessons: readonly Lesson[];
  readonly proof: readonly ProofStop[];
  /** The places its page links to the Atlas: its own, less one that only repeats its title, or for a
   * field the busiest places inside it. */
  readonly links: readonly string[];
  /** Whether its line already says when it was begun. */
  readonly introDated: boolean;
  /** Up to four panels for its cover on the index, none shown by another cover there. */
  readonly images: readonly Plate[];
  /** Its own page's cover: the strongest four, whatever the index shows. */
  readonly hero: readonly Plate[];
  readonly since: string;
  readonly latest: string;
  readonly stored?: StoredExhibition;
}

export interface PackInfo { readonly packId: string; readonly title: string; readonly question?: string; readonly minutes?: number; readonly image?: string | null }

export interface GalleryInput {
  readonly journal: Journal;
  readonly library: LibraryStore;
  readonly exhibitions: ExhibitionStore;
  /** Watch: video ID → when it was watched through, and the videos that were on screen. */
  readonly watchedVideos?: Readonly<Record<string, string>>;
  readonly seenVideos?: readonly string[];
  /** Reels watched to the end. */
  readonly watchedReels?: readonly string[];
  /** Whether Watch can play a video (it is in the pool). Without it every YouTube link counts. */
  readonly isWatchVideo?: (videoId: string) => boolean;
  /** A place's lesson, once the packs have loaded. */
  readonly packAt?: (nodeId: string) => PackInfo | undefined;
  /** Every moment a place was proved (an Understood lesson, a passed check), oldest first. Without it,
   * its first proof and its Lasting check. */
  readonly provedTimes?: (nodeId: string) => readonly string[];
  /** Places where a lesson ran or a check was taken: the map strip's underway places. */
  readonly tried?: ReadonlySet<string>;
}

export interface Gallery {
  readonly pieces: readonly Piece[];
  readonly byKey: ReadonlyMap<string, Piece>;
  readonly mine: readonly Exhibition[];
  readonly suggested: readonly Exhibition[];
  /** The freshest exhibition, shown first. */
  readonly lead: Exhibition | null;
  /** What was saved last, wherever it was saved. */
  readonly lately: readonly Piece[];
  /** Your map: proved places (ready to refresh first), then places where a lesson or a check is underway. */
  readonly map: readonly ProofStop[];
}

export const FIELD_MIN = 4;
export const AROUND_MIN = 3;
const AROUND_DEPTH = 4;
/** A field whose one busy branch holds this share of its things is named by the branch. */
const BRANCH_SHARE = 0.8;
const MAX_AROUND = 3;

const nameOf = (id: string) => catalog.get(id)?.name ?? id;
const depthOf = (id: string) => catalog.get(id)?.depth ?? 0;
const parentOf = (id: string) => catalog.get(id)?.parentId ?? null;
const ancestorAt = (id: string, depth: number): string | null => { const node = catalog.get(id); return node ? catalog.getPath(node)[depth]?.id ?? null : null; };
const lit = (s: PlaceState | undefined) => s === 'lit' || s === 'lasting';
const max = (...times: (string | null | undefined)[]) => times.filter((t): t is string => !!t).sort().at(-1) ?? '';
const youtubePoster = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

// --- pieces ------------------------------------------------------------------------------

const firstProofs = (status: ReadonlyMap<string, PlaceStatus>) => (nodeId: string): readonly string[] => {
  const s = status.get(nodeId);
  return [s?.litAt, s?.lastingAt].filter((t): t is string => !!t).sort();
};

/** The place that proves an item, and when: its own place, else a proved place inside it, proved (or
 * refreshed) on or after `since`. A place proved before the item was saved or begun proves nothing about it. */
export function provedPlace(status: ReadonlyMap<string, PlaceStatus>, nodeIds: readonly string[], since = '', times = firstProofs(status)): { nodeId: string; at: string } | null {
  const when = (s: PlaceStatus | undefined) => s && lit(s.state) ? times(s.nodeId).find(t => t >= since) ?? null : null;
  for (const id of nodeIds) { const at = when(status.get(id)); if (at) return { nodeId: id, at }; }
  return [...status.values()].filter(s => nodeIds.some(id => s.nodeId !== id && within(s.nodeId, id)))
    .map(s => ({ nodeId: s.nodeId, at: when(s) })).filter((p): p is { nodeId: string; at: string } => !!p.at)
    .sort((a, b) => a.at.localeCompare(b.at) || a.nodeId.localeCompare(b.nodeId))[0] ?? null;
}

const mark = (step: Step, at: string | null | boolean): PathMark => ({ step, done: !!at, at: typeof at === 'string' ? at : null });

export function buildPieces(input: GalleryInput): Piece[] {
  const { journal } = input;
  const kept = new Map<string, ItemNote[]>();
  for (const note of liveNotes(input.library)) kept.set(note.target, [...(kept.get(note.target) ?? []), note]);
  const watched = input.watchedVideos ?? {};
  const seen = new Set(input.seenVideos ?? []);
  const reelsWatched = new Set(input.watchedReels ?? []);
  const times = input.provedTimes ?? firstProofs(journal.status);
  const out: Piece[] = [];
  for (const item of journal.items) {
    if (!isMine(item) || item.kind === 'place' || item.kind === 'changed') continue;
    // Proof belongs to a thing once it was begun: a book never opened is not proved by its place.
    const begun = item.kind === 'work' ? !!item.work.entry && item.work.entry.status !== 'want'
      : item.kind === 'link' ? (() => { const id = videoIdFromUrl(item.link.url); return !id || !(input.isWatchVideo?.(id) ?? true) || seen.has(id) || !!watched[id]; })()
        : item.kind === 'reel' ? reelsWatched.has(item.reel.id) : false;
    // From when it was saved, or begun when that came first (a book read before it was kept here).
    const since = item.kind === 'work' ? [item.work.entry?.addedAt, item.work.entry?.startedAt].filter((t): t is string => !!t).sort()[0] ?? ''
      : item.kind === 'link' ? item.link.createdAt : item.kind === 'reel' ? item.pinnedAt ?? '' : '';
    const proof = begun ? provedPlace(journal.status, item.nodeIds, since, times) : null;
    const proved = mark('proved', proof?.at ?? null);
    const base = { key: item.key, nodeIds: item.nodeIds, provedIn: proof?.nodeId ?? null, item };
    if (item.kind === 'work') {
      const { work } = item;
      const entry = work.entry!;
      const started = entry.status !== 'want' ? entry.startedAt ?? (entry.status === 'finished' ? entry.finishedAt ?? true : true) : null;
      const finished = entry.status === 'finished' ? entry.finishedAt ?? true : null;
      out.push({
        ...base, kind: work.kind === 'book' ? 'book' : 'screen', title: work.title,
        byline: [work.creator, work.year].filter(Boolean).join(', ') || work.format,
        image: work.cover ? coverUrl(work.cover, 'M') : null, at: entry.addedAt,
        latest: max(entry.addedAt, entry.startedAt, entry.finishedAt),
        path: [mark('saved', entry.addedAt), mark('started', started), mark('finished', finished), proved], kept: kept.get(work.key) ?? [],
      });
    } else if (item.kind === 'link') {
      const { link } = item;
      const id = videoIdFromUrl(link.url);
      const video = !!id && (input.isWatchVideo?.(id) ?? true);
      const done = video ? watched[id!] ?? null : null;
      out.push({
        ...base, kind: video ? 'video' : 'link', title: item.title,
        byline: link.preview?.siteName || item.domain,
        image: link.preview?.image ?? (video ? youtubePoster(id!) : null), at: link.createdAt, latest: max(link.createdAt, done),
        path: [mark('saved', link.createdAt), mark('started', video && (seen.has(id!) || !!done) ? done ?? true : null), mark('finished', done), proved],
        kept: kept.get(`link:${link.id}`) ?? [], ...(video ? { videoId: id! } : {}),
      });
    } else if (item.kind === 'reel') {
      const done = reelsWatched.has(item.reel.id);
      out.push({
        ...base, kind: 'reel', title: item.title, byline: item.nodeIds.map(nameOf).join(', '), image: item.reel.image ?? null,
        at: item.pinnedAt!, latest: item.pinnedAt!, path: [mark('saved', item.pinnedAt), mark('started', done), mark('finished', done), proved], kept: [],
      });
    } else if (item.kind === 'idea' || item.kind === 'question') {
      const { entry } = item;
      out.push({
        ...base, kind: item.kind, title: entry.title, byline: entry.sourceLabel || item.nodeIds.map(nameOf).join(', '),
        image: null, at: entry.createdAt, latest: entry.updatedAt, path: [], kept: [],
      });
    }
  }
  return out.sort((a, b) => b.latest.localeCompare(a.latest) || a.key.localeCompare(b.key));
}

// --- suggestions ------------------------------------------------------------------------------

export interface Group { readonly nodeId: string; readonly keys: readonly string[] }

/**
 * Fields the learner is active in, from where their things sit: a field like Physics or Music, or,
 * where one field holds two busy branches (Evolution and Genetics inside Biology), each branch on its
 * own, with what is left of the field beside them when there is enough of it.
 */
export function fieldGroups(pieces: readonly Pick<Piece, 'key' | 'nodeIds'>[], min = FIELD_MIN): Group[] {
  const at = new Map<string, Set<string>>();
  const add = (id: string | null, key: string) => { if (id) at.set(id, (at.get(id) ?? new Set()).add(key)); };
  for (const piece of pieces) for (const id of piece.nodeIds) {
    const depth = depthOf(id);
    if (depth >= 2) { add(ancestorAt(id, 2), piece.key); add(ancestorAt(id, 3), piece.key); } else if (depth === 1) add(id, piece.key);
  }
  const out: Group[] = [];
  for (const [id, keys] of at) {
    const depth = depthOf(id);
    if (depth === 1 && keys.size >= min) out.push({ nodeId: id, keys: [...keys] });
    if (depth !== 2) continue;
    const branches = [...at].filter(([child, inner]) => parentOf(child) === id && depthOf(child) === 3 && inner.size >= min);
    // Two busy branches split the field; so does one branch holding nearly all of it (Genetics, not Biology).
    if (branches.length >= 2 || (branches.length === 1 && branches[0][1].size >= keys.size * BRANCH_SHARE)) {
      for (const [child, inner] of branches) out.push({ nodeId: child, keys: [...inner] });
      const rest = [...keys].filter(key => !branches.some(([, inner]) => inner.has(key)));
      if (rest.length >= min) out.push({ nodeId: id, keys: rest });
    } else if (keys.size >= min) out.push({ nodeId: id, keys: [...keys] });
  }
  return out.sort((a, b) => b.keys.length - a.keys.length || a.nodeId.localeCompare(b.nodeId));
}

/** Places where saves cluster inside a field: three or more things, and clearly fewer than the field. */
export function aroundGroups(pieces: readonly Pick<Piece, 'key' | 'nodeIds' | 'latest'>[], fields: readonly Group[], min = AROUND_MIN, limit = MAX_AROUND): Group[] {
  const at = new Map<string, Set<string>>();
  for (const piece of pieces) for (const id of piece.nodeIds) {
    const node = catalog.get(id);
    if (!node) continue;
    // A cluster is around a particular place (depth 4 and in: the Black Death, Natural selection), never a field's branch.
    for (const step of catalog.getPath(node).filter(n => n.depth >= AROUND_DEPTH)) at.set(step.id, (at.get(step.id) ?? new Set()).add(piece.key));
  }
  const latest = new Map(pieces.map(p => [p.key, p.latest]));
  const candidates = [...at].filter(([id, keys]) => {
    if (keys.size < min || fields.some(f => f.nodeId === id)) return false;
    const field = fields.find(f => within(id, f.nodeId));
    return !!field && field.keys.length >= keys.size + 2;
  }).sort((a, b) => b[1].size - a[1].size || depthOf(b[0]) - depthOf(a[0]) || max(...[...b[1]].map(k => latest.get(k))).localeCompare(max(...[...a[1]].map(k => latest.get(k)))));
  const out: Group[] = [];
  for (const [broad, broadKeys] of candidates) {
    // Nearly the same things gathered one level down: the deeper, more particular place speaks for them.
    const [id, keys] = candidates.filter(([inner, innerKeys]) => inner !== broad && within(inner, broad) && innerKeys.size >= broadKeys.size * BRANCH_SHARE)
      .sort((a, b) => depthOf(b[0]) - depthOf(a[0]) || b[1].size - a[1].size)[0] ?? [broad, broadKeys];
    if (out.some(group => within(id, group.nodeId) || within(group.nodeId, id))) continue;
    out.push({ nodeId: id, keys: [...keys] });
    if (out.length >= limit) break;
  }
  return out;
}

// --- exhibitions --------------------------------------------------------------------------

const SECTIONS: readonly [SectionId, string, readonly PieceKind[]][] = [
  ['video', 'Videos', ['video']],
  ['work', 'Books and films', ['book', 'screen']],
  ['reel', 'Reels', ['reel']],
  ['link', 'Links', ['link']],
  ['note', 'Notes', ['idea', 'question']],
];

/** The pieces in their designed order: videos, books and films, reels, links, notes; each in the order gathered. */
export function sectionsOf(pieces: readonly Piece[]): Section[] {
  return SECTIONS.map(([id, title, kinds]) => ({ id, title, pieces: pieces.filter(p => kinds.includes(p.kind)).sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key)) }))
    .filter(section => section.pieces.length > 0);
}

/** One panel of an exhibition's cover: a photograph (a reel still, a page's picture, a lesson's art), a
 * book or film cover shown as an object, a typographic cover for a book without one, or, only when there
 * is nothing else, a video frame shown whole. */
export type Plate =
  | { readonly kind: 'photo'; readonly src: string }
  | { readonly kind: 'cover'; readonly src: string; readonly title: string }
  | { readonly kind: 'type'; readonly title: string; readonly creator: string; readonly tone: string }
  | { readonly kind: 'frame'; readonly src: string };

const YOUTUBE_IMAGE = /^https:\/\/i\d?\.ytimg\.com\//;
/** The picture an address shows, whatever size it is asked at: a Commons file by its name, a YouTube
 * video by its ID, an Open Library cover by its number. */
export function pictureKey(src: string): string {
  const commons = src.match(/\/wikipedia\/[\w-]+\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  if (commons) return `commons:${decodeURIComponent(commons[1])}`;
  const youtube = src.match(/ytimg\.com\/vi(?:_webp)?\/([\w-]{11})\//);
  if (youtube) return `youtube:${youtube[1]}`;
  const book = src.match(/covers\.openlibrary\.org\/b\/id\/(\d+)-/);
  return book ? `ol:${book[1]}` : src;
}
/** What a plate shows, for telling two covers apart: its picture, or a book's title. */
export const plateKey = (plate: Plate) => plate.kind === 'type' ? `type:${plate.title}` : pictureKey(plate.src);

const plateOf = (piece: Piece): Plate | null => {
  if (piece.kind === 'book' || piece.kind === 'screen') {
    if (piece.image) return { kind: 'cover', src: piece.image, title: piece.title };
    return { kind: 'type', title: piece.title, creator: piece.byline, tone: piece.key };
  }
  if (!piece.image) return null;
  // Video frames carry their own lettering: they are never cropped into a panel.
  return piece.kind === 'video' || YOUTUBE_IMAGE.test(piece.image) ? { kind: 'frame', src: piece.image } : { kind: 'photo', src: piece.image };
};

/**
 * Up to four panels: a picture or a book leads, then one of each other kind (a cover, a reel still, a
 * lesson's art, a page's picture), the freshest first; typographic covers only when there are too few
 * pictures, and video frames only when there is nothing else. Nothing in `avoid` (what another cover
 * already shows) is used again.
 */
export function coverImages(pieces: readonly Piece[], count = 4, avoid: ReadonlySet<string> = new Set(), art: readonly string[] = []): Plate[] {
  const fresh = [...pieces].sort((a, b) => b.latest.localeCompare(a.latest));
  const seen = new Set(avoid);
  const take = (plate: Plate | null) => { if (!plate || seen.has(plateKey(plate))) return null; seen.add(plateKey(plate)); return plate; };
  const all = fresh.map(piece => ({ piece, plate: plateOf(piece) }));
  const pool = (test: (x: { piece: Piece; plate: Plate | null }) => boolean) => all.filter(test).map(x => x.plate!);
  const stills = pool(x => x.plate?.kind === 'photo' && x.piece.kind === 'reel');
  const covers = pool(x => x.plate?.kind === 'cover');
  const photos = pool(x => x.plate?.kind === 'photo' && x.piece.kind !== 'reel');
  const arts: Plate[] = art.map(src => ({ kind: 'photo', src }));
  const pictures = [stills, covers, arts, photos];
  const chosen: Plate[] = [];
  const add = (plate: Plate | null) => { const kept = chosen.length < count ? take(plate) : null; if (kept) chosen.push(kept); return !!kept; };
  for (const list of pictures) for (const plate of list) if (add(plate)) break;
  for (const plate of fresh.map(p => plateOf(p)).concat(arts)) if (plate && plate.kind !== 'frame' && plate.kind !== 'type') add(plate);
  if (!chosen.length) for (const plate of pool(x => x.plate?.kind === 'frame').slice(0, 2)) add(plate);
  if (chosen.length < Math.min(3, count)) for (const plate of pool(x => x.plate?.kind === 'type')) { if (chosen.length >= Math.min(3, count)) break; add(plate); }
  return chosen;
}

const STATE_RANK: Record<NonNullable<PlaceState>, number> = { lasting: 4, lit: 3, underway: 2, read: 1 };

/**
 * The places an exhibition can be proved in: places with a lesson at or under its own places (a field or
 * narrower) or the places its pieces sit in (a branch or narrower), never widened to a field or a subject
 * nobody named, so an exhibition about chemistry never ends in evolution. Ready to refresh first, then
 * places with pieces but no proof yet, then proved ones. With no lesson anywhere near, its own places,
 * where it can still be proved in words.
 */
export function proofStops(journal: Journal, places: readonly string[], pieces: readonly Piece[], limit = 3, own: readonly string[] = places): ProofStop[] {
  const count = (nodeId: string) => pieces.filter(p => p.nodeIds.some(id => within(id, nodeId) || within(nodeId, id))).length;
  const held = [...new Set(pieces.flatMap(p => p.nodeIds))];
  const under = (packNode: string, scope: readonly string[], depth: number) => scope.some(id => packNode === id || (depthOf(id) >= depth && within(packNode, id)));
  const candidates = PACK_PLACES.filter(pack => under(pack.nodeId, [...places, ...own], 2) || under(pack.nodeId, held, 3));
  const stopOf = (nodeId: string, packId: string | null) => {
    const s = journal.status.get(nodeId);
    return { nodeId, state: s?.state ?? null, litAt: s?.litAt ?? null, lastingAt: s?.lastingAt ?? null, ready: !!s?.ready, packId };
  };
  if (!candidates.length) {
    const home = (own.length ? own : places.length ? places : topPlaces(pieces, 1)).filter(id => catalog.get(id) && depthOf(id) > 0);
    return [...new Set(home)].slice(0, Math.min(2, limit)).map(id => stopOf(id, null));
  }
  const stops = candidates.map(pack => ({ ...stopOf(pack.nodeId, pack.packId), weight: count(pack.nodeId) }));
  // The exhibition's own places first, then the places its pieces sit in.
  const mine = (nodeId: string) => own.some(id => within(nodeId, id)) ? 0 : 1;
  const rank = (s: typeof stops[number]) => s.ready ? 0 : !lit(s.state) && s.weight > 0 ? 1 : lit(s.state) ? 2 : 3;
  return stops.sort((a, b) => mine(a.nodeId) - mine(b.nodeId) || rank(a) - rank(b) || b.weight - a.weight || (b.state ? STATE_RANK[b.state] : 0) - (a.state ? STATE_RANK[a.state] : 0))
    .slice(0, limit).map(({ weight: _weight, ...stop }) => stop);
}

function lessonsFor(journal: Journal, places: readonly string[], pieces: readonly Piece[], packAt: GalleryInput['packAt'], limit = 4): Lesson[] {
  const scope = places.length ? places : [...new Set(pieces.flatMap(p => p.nodeIds))];
  const held = new Set(pieces.flatMap(p => p.nodeIds));
  const packs = PACK_PLACES.filter(pack => scope.some(id => within(pack.nodeId, id)) || held.has(pack.nodeId));
  // A field with many lessons shows the ones the learner has touched or holds things at, else the first.
  const touched = packs.filter(pack => journal.status.has(pack.nodeId) || held.has(pack.nodeId));
  return (touched.length ? touched : packs.slice(0, 1)).slice(0, limit).map(pack => {
    const info = packAt?.(pack.nodeId);
    const state = journal.status.get(pack.nodeId)?.state ?? null;
    return { packId: pack.packId, nodeId: pack.nodeId, title: info?.title ?? nameOf(pack.nodeId), minutes: info?.minutes ?? null, image: info?.image ?? null, state, ran: !!state && state !== 'read' };
  });
}

function make(input: GalleryInput, base: { id: string; source: ExhibitionSource; title: string; intro: string; places: readonly string[]; stored?: StoredExhibition }, pieces: readonly Piece[]): Exhibition {
  const placeScope = base.places.length ? base.places : topPlaces(pieces);
  const intro = base.intro || gatheredLine(pieces, placeScope);
  const lessons = lessonsFor(input.journal, placeScope, pieces, input.packAt);
  const art = lessons.map(lesson => lesson.image).filter((src): src is string => !!src);
  return {
    ...base, intro, introDated: !base.stored?.intro && intro.startsWith('Gathered since'), places: placeScope, links: placeLinks(base.source, base.title, placeScope, pieces), pieces, sections: sectionsOf(pieces),
    lessons,
    proof: proofStops(input.journal, placeScope, pieces, 3, base.places.length ? base.places : placeScope),
    images: coverImages(pieces, 4, new Set(), art), hero: coverImages(pieces, 4, new Set(), art),
    since: pieces.map(p => p.at).sort()[0] ?? base.stored?.createdAt ?? '',
    latest: max(...pieces.map(p => p.latest), base.stored?.updatedAt),
  };
}

/** The places an exhibition's page links to: its own, less one whose name is only its title again; a
 * field (or a place that names it) links instead to the busiest places inside it. */
function placeLinks(source: ExhibitionSource, title: string, places: readonly string[], pieces: readonly Piece[]): string[] {
  const named = places.filter(id => nameOf(id).toLocaleLowerCase() !== title.trim().toLocaleLowerCase());
  if (named.length && source !== 'field') return [...named];
  const tally = new Map<string, number>();
  for (const piece of pieces) for (const id of new Set(piece.nodeIds)) if (places.some(place => id !== place && within(id, place))) tally.set(id, (tally.get(id) ?? 0) + 1);
  const busiest = [...tally].sort((a, b) => b[1] - a[1] || depthOf(a[0]) - depthOf(b[0]) || a[0].localeCompare(b[0])).map(([id]) => id)
    .filter((id, _i, list) => !list.some(other => other !== id && within(id, other) && tally.get(other)! >= tally.get(id)!)).slice(0, 3);
  return busiest.length ? busiest : named.length ? [...named] : [...places];
}

/** The places most of these pieces sit in, for an exhibition that names none. */
function topPlaces(pieces: readonly Piece[], count = 3): string[] {
  const tally = new Map<string, number>();
  for (const piece of pieces) for (const id of piece.nodeIds) tally.set(id, (tally.get(id) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(([id]) => id);
}

/** A field's line: its own description, else when it was begun and the places it gathers around. */
function fieldIntro(nodeId: string, pieces: readonly Piece[]): string {
  const description = (catalog.get(nodeId) as { description?: string } | undefined)?.description;
  // One line: the description's first sentence.
  const first = description?.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? description;
  if (first) return /[.!?]$/.test(first) ? first : `${first}.`;
  return gatheredLine(pieces, [nodeId]);
}

/** "Gathered since August 7, around DNA and Dominance.": when it began, and the places its pieces sit in
 * beyond the ones it is about. */
function gatheredLine(pieces: readonly Piece[], about: readonly string[]): string {
  // Only places that hold more than one piece, and at most two, so the line stays a line.
  const held = (id: string) => pieces.filter(p => p.nodeIds.includes(id)).length;
  const places = topPlaces(pieces, 6).filter(id => held(id) > 1 && !about.includes(id) && !about.some(place => within(place, id))).slice(0, 2).map(nameOf);
  const since = pieces.map(p => p.at).sort()[0];
  const around = places.length > 1 ? `${places.slice(0, -1).join(', ')} and ${places.at(-1)}` : places[0];
  const line = [since ? `Gathered since ${day(since)}` : '', around ? `around ${around}` : ''].filter(Boolean).join(', ');
  return line ? `${line}.` : '';
}

/** Your exhibition's pieces: hung by hand (in that order), then everything under its places, less what was taken down. */
export function piecesOf(stored: StoredExhibition, pieces: readonly Piece[], byKey: ReadonlyMap<string, Piece>): Piece[] {
  const hand = stored.items.map(key => byKey.get(key)).filter((p): p is Piece => !!p);
  const placed = stored.places.length ? pieces.filter(p => !stored.hidden.includes(p.key) && !stored.items.includes(p.key) && p.nodeIds.some(id => stored.places.some(place => within(id, place)))) : [];
  return [...hand, ...placed];
}

export function buildGallery(input: GalleryInput): Gallery {
  const pieces = buildPieces(input);
  const byKey = new Map(pieces.map(p => [p.key, p]));
  const stored = liveExhibitions(input.exhibitions);
  const mine = stored.map(ex => make(input, { id: `mine:${ex.id}`, source: 'mine', title: ex.title, intro: ex.intro, places: ex.places, stored: ex }, piecesOf(ex, pieces, byKey)))
    .sort((a, b) => b.stored!.createdAt.localeCompare(a.stored!.createdAt));

  // Suggestions step aside for an exhibition the learner kept, or one of theirs about the same place.
  const yours = new Set(stored.flatMap(ex => [...(ex.from ? [ex.from] : []), ...ex.places.flatMap(id => [`field:${id}`, `around:${id}`])]));
  // A small library still opens on an exhibition: with nothing of its own and no busy field yet, the
  // fields its few things sit in hang anyway.
  const busy = fieldGroups(pieces);
  const fields = busy.length || stored.length ? busy : fieldGroups(pieces, 1).slice(0, 2);
  const around = aroundGroups(pieces, fields);
  const pick = (keys: readonly string[]) => keys.map(key => byKey.get(key)!).filter(Boolean);
  const suggested = [
    ...fields.filter(group => !yours.has(`field:${group.nodeId}`)).map(group => make(input, { id: `field:${group.nodeId}`, source: 'field', title: nameOf(group.nodeId), intro: fieldIntro(group.nodeId, pick(group.keys)), places: [group.nodeId] }, pick(group.keys))),
    ...around.filter(group => !yours.has(`around:${group.nodeId}`)).map(group => {
      const node = catalog.get(group.nodeId) as { description?: string } | undefined;
      const question = input.packAt?.(group.nodeId)?.question;
      return make(input, { id: `around:${group.nodeId}`, source: 'around', title: question ?? nameOf(group.nodeId), intro: node?.description ?? '', places: [group.nodeId] }, pick(group.keys));
    }),
  ].sort((a, b) => b.latest.localeCompare(a.latest));

  const all = [...mine, ...suggested].filter(ex => ex.pieces.length > 0);
  const leadId = [...all].sort((a, b) => b.latest.localeCompare(a.latest))[0]?.id ?? null;
  // Covers in the order the index shows them: no picture or book on one cover is shown by another.
  const used = new Set<string>();
  const covered = new Map<string, Exhibition>();
  for (const ex of [...all.filter(ex => ex.id === leadId), ...mine, ...suggested]) {
    if (covered.has(ex.id)) continue;
    // As many panels as its card shows: the lead four, the rest three.
    const images = coverImages(ex.pieces, ex.id === leadId ? 4 : 3, used, ex.lessons.map(lesson => lesson.image).filter((src): src is string => !!src));
    for (const plate of images) used.add(plateKey(plate));
    covered.set(ex.id, { ...ex, images });
  }
  const recover = (list: readonly Exhibition[]) => list.map(ex => covered.get(ex.id) ?? ex);
  const lead = leadId ? covered.get(leadId)! : null;
  // Your map holds what was proved, and what a lesson or a check has begun; a save alone is not a step on it.
  const tried = input.tried ?? new Set<string>();
  const map = [...input.journal.status.values()]
    .filter(s => lit(s.state) || s.ready || (s.state === 'underway' && tried.has(s.nodeId)))
    .map(s => ({ nodeId: s.nodeId, state: s.state, litAt: s.litAt, lastingAt: s.lastingAt, ready: s.ready, packId: PACK_PLACES.find(p => p.nodeId === s.nodeId)?.packId ?? null }))
    .sort((a, b) => Number(b.ready) - Number(a.ready) || Number(lit(b.state)) - Number(lit(a.state)) || (b.litAt ?? '').localeCompare(a.litAt ?? '') || nameOf(a.nodeId).localeCompare(nameOf(b.nodeId)));
  const lately = pieces.filter(p => p.kind !== 'idea' && p.kind !== 'question').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  return { pieces, byKey, mine: recover(mine), suggested: recover(suggested), lead, lately, map };
}

// --- search ----------------------------------------------------------------------------------

export interface Found { readonly exhibitions: readonly Exhibition[]; readonly pieces: readonly Piece[]; readonly places: readonly string[] }

/** Every word must match: exhibitions by their title, line and places; pieces by everything the
 * journal knows of them (passages kept included); atlas places by name. */
export function searchGallery(gallery: Gallery, query: string): Found {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return { exhibitions: [], pieces: [], places: [] };
  const hit = (text: string) => { const hay = text.toLocaleLowerCase(); return terms.every(term => hay.includes(term)); };
  const exhibitions = [...gallery.mine, ...gallery.suggested].filter(ex => hit(`${ex.title} ${ex.intro} ${ex.places.map(nameOf).join(' ')}`));
  const pieces = gallery.pieces.filter(p => hit(`${p.title} ${p.byline} ${p.item.text} ${p.kept.map(n => n.text).join(' ')}`));
  const places = catalog.all().filter(node => node.depth > 0 && !(node as { sample?: boolean }).sample && hit(node.name)).sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name)).slice(0, 6).map(node => node.id);
  return { exhibitions, pieces, places };
}

/** Where a piece hangs: your exhibitions holding it. */
export const hangingIn = (gallery: Gallery, key: string): Exhibition[] => gallery.mine.filter(ex => ex.pieces.some(p => p.key === key));
