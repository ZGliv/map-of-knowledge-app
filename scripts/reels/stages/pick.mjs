// Stage 2: pick and map. Every candidate gets an atlas place (or is skipped), its images are
// licence-checked on Commons, it is deduplicated against existing reels and recent decks, and it is
// scored. The best, in a varied mix, become the shortlist; their sources are pinned by revision.
//   → content/reels/<date>/shortlist.json   the stories to draft from, with media and sources
//   → content/reels/<date>/sources/*.json   pinned source text (Wikipedia extracts, file descriptions)
//   → content/reels/<date>/media.json       a Commons licence snapshot of every usable file
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { filesInfo, snapshotOf, usable } from '../commons.mjs';
import { addDays, APP_EXPORTS, dayDir, dayNumber, loadTs, logStage, readJson, ROOT, safeName, writeJson } from '../lib.mjs';
import { collectGraph, descriptionPlace, expeditionPlace, matchPlace } from '../match.mjs';
import { heroScore, scoreStory, shortlist } from '../score.mjs';
import { isBackdrop } from '../sources/common.mjs';
import { overlap } from '../sources/evergreen.mjs';
import { entities, mediaList, pageInfo, pinArticle } from '../wiki.mjs';
import { titleVariants, wikipediaTitles } from '../../../src/explore/sourceTitles.ts';

const HERO_SIDE = 640;
const RECENT_DAYS = 60;

/** What the days before `date` (the last RECENT_DAYS) already tell, for dedupe and place coverage:
 * each day's reels once drafted (content/reels/<day>/reels.json), or, for a day still being drafted,
 * its whole shortlist, so days made side by side never overlap. */
export function recentReels(date) {
  const dir = path.join(ROOT, 'content/reels');
  let days = [];
  try { days = readdirSync(dir).filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)); } catch { /* none yet */ }
  return days.filter(day => day < date && dayNumber(date) - dayNumber(day) <= RECENT_DAYS).flatMap(day => {
    const made = readJson(path.join(dir, day, 'reels.json'), null);
    if (made?.reels?.length) return made.reels;
    const list = readJson(path.join(dir, day, 'shortlist.json'), { stories: [] });
    return list.stories.map(s => ({ story: s.id, subject: s.subject, nodeId: s.place.node, hero: 'm1', media: { m1: { page: s.media[0]?.page } }, told: `${s.headline} ${s.claim ?? ''}` }));
  });
}
/** What a recent reel (or a still-pending shortlisted story) says, for "told already?". */
const toldText = reel => reel.told ?? [reel.title, reel.takeaway, ...(reel.sources ?? []).map(s => s.claim)].join(' ');

/** The subject a story is about, for "told recently?": its place claim, or its main page. */
const subjectOf = story => story.subject ?? `page:${story.pages?.[0]?.title ?? story.id}`;

export async function pick(date, { count = 7, keep = false } = {}) {
  const started = Date.now();
  const dir = dayDir(date);
  const candidates = readJson(path.join(dir, 'candidates.json'));
  if (!candidates) throw new Error(`No candidates for ${date}: run gather first`);
  const app = await loadTs(APP_EXPORTS, 'reels-pick');
  const dropped = [];
  const drop = (story, reason) => dropped.push({ id: story.id, kind: story.kind, headline: String(story.headline).slice(0, 140), reason });

  // 1. Wikidata items for every page that came without one.
  const titles = candidates.stories.flatMap(s => s.pages.map(p => p.title));
  const info = await pageInfo(titles);
  for (const story of candidates.stories) for (const page of story.pages) {
    const found = info.get(page.title);
    if (found) Object.assign(page, { title: found.title, qid: page.qid ?? found.qid, description: page.description || found.description });
  }

  // 2. Places: evergreen stories have one; the rest are matched through Wikidata.
  const qids = [...new Set(candidates.stories.filter(s => s.kind !== 'place').flatMap(s => s.pages.filter(p => !isBackdrop(p.title)).slice(0, 3).map(p => p.qid)).filter(Boolean))];
  const graph = await collectGraph(qids, entities);
  const lookup = id => graph.get(id);
  const placeOf = node => {
    const n = app.catalog.get(node);
    const trail = n ? app.catalog.getPath(n).slice(1) : [];
    return { node, name: n?.name ?? node, path: trail.map(step => step.name).join(' › '), provable: app.proveItRoute(node).kind !== 'hub', pack: app.EXPEDITIONS.find(e => e.nodeId === node)?.pack.id ?? '' };
  };
  const mapped = [];
  for (const story of candidates.stories) {
    if (story.kind === 'place') { mapped.push({ ...story, place: { ...placeOf(story.place), via: [{ qid: 'expedition', label: story.packId }] } }); continue; }
    const pages = story.pages.filter(p => !isBackdrop(p.title) && p.qid).slice(0, 3);
    let hit = null;
    // A picture is about what it shows: its own description, when that names a field, comes first.
    const shown = story.kind === 'picture' ? descriptionPlace(story.headline) : null;
    if (shown && app.catalog.get(shown.node)) { mapped.push({ ...story, subject: `file:${story.images[0]}`, place: { ...placeOf(shown.node), via: shown.via } }); continue; }
    for (const [i, page] of pages.entries()) {
      const match = matchPlace(page.qid, lookup, { description: page.description });
      if (match.node) { hit = { match, page }; break; }
      // The story's own subject is something the engine never covers: drop it, don't drift to a side page.
      if (i === 0 && !/no atlas place|no Wikidata/.test(match.skip)) { hit = { skip: match.skip }; break; }
    }
    if (hit?.skip) { drop(story, `skipped: ${hit.skip}`); continue; }
    // A story whose own words name an expedition's idea goes there, where a case can follow it.
    const named = expeditionPlace(`${story.headline} ${pages[0]?.description ?? ''} ${(pages[0]?.extract ?? '').split(/(?<=\.)\s/)[0]}`);
    if (named && app.catalog.get(named.node) && (hit?.page ?? pages[0])) hit = { match: named, page: hit?.page ?? pages[0] };
    if (!hit?.match) { drop(story, 'unmappable: no atlas place fits'); continue; }
    if (!app.catalog.get(hit.match.node)) { drop(story, `place ${hit.match.node} is not in the atlas`); continue; }
    // Most-read people who died this year or last are news (an obituary), not a reel.
    const person = lookup(hit.page.qid);
    if (story.kind === 'mostread' && person?.died && person.died >= Number(date.slice(0, 4)) - 1) { drop(story, 'skipped: an obituary (most read after a recent death)'); continue; }
    mapped.push({ ...story, subject: `page:${hit.page.title}`, place: { ...placeOf(hit.match.node), via: hit.match.via } });
  }

  // 3. Dedupe: not a subject an existing reel or a recent deck already told, once per day.
  const recent = recentReels(date);
  const toldStories = new Set(recent.map(r => r.story));
  const toldSubjects = new Set(recent.map(r => r.subject).filter(Boolean));
  const usedHeroes = new Set([...app.REELS.map(r => r.media[r.hero]?.page), ...recent.map(r => r.media?.[r.hero]?.page)].filter(Boolean));
  const fresh = [];
  const bySubject = new Map();
  const toldTexts = recent.map(toldText);
  for (const story of mapped) {
    if (toldStories.has(story.id)) { drop(story, 'told in a recent deck'); continue; }
    // The same fact can sit in two places' provenance ("survival of the fittest" in E03 and E11).
    if (story.kind === 'place' && toldTexts.some(text => overlap(story.claim, text) >= 0.5)) { drop(story, 'its claim was told in a recent deck'); continue; }
    const subject = subjectOf(story);
    if (toldSubjects.has(subject)) { drop(story, `subject told in a recent deck (${subject})`); continue; }
    if (bySubject.has(subject)) { drop(story, `same subject as ${bySubject.get(subject).id}`); continue; }
    bySubject.set(subject, story);
    fresh.push({ ...story, subjectKey: subject });
  }

  // 4. Images: an evergreen story leads with its own articles' pictures (the pack's media, often
  //    already a reel's hero, come after); then Commons licences, then each story's best hero.
  for (const story of fresh.filter(s => s.kind === 'place')) {
    const listed = [];
    for (const page of story.pages.slice(0, 3)) listed.push(...(await mediaList(page.title).catch(() => [])).slice(0, 4).map(item => item.title));
    story.images = [...new Set([...listed, ...story.images])];
  }
  const files = await filesInfo(fresh.flatMap(s => s.images));
  // The story's own lead picture when it qualifies; otherwise its strongest other picture.
  const heroOf = story => {
    const ok = story.images.map(title => files.get(title)).filter(d => usable(d) && Math.max(d.width, d.height) >= HERO_SIDE && !usedHeroes.has(d.page) && (story.kind !== 'apod' || (d.license === 'Public domain' && /NASA/i.test(`${d.author} ${d.credit} ${d.description}`))));
    if (!ok.length) return undefined;
    return ok[0].title === files.get(story.images[0])?.title ? ok[0] : [...ok].sort((a, b) => heroScore(b) - heroScore(a))[0];
  };
  // Stories still without a usable hero borrow from their main article's own images.
  for (const story of fresh.filter(s => !heroOf(s) && s.pages[0] && s.kind !== 'apod').slice(0, 160)) {
    const listed = await mediaList(story.pages[0].title).catch(() => []);
    story.images = [...new Set([...story.images, ...listed.slice(0, 8).map(item => item.title)])];
  }
  const more = await filesInfo(fresh.flatMap(s => s.images).filter(title => !files.has(title)));
  for (const [title, d] of more) files.set(title, d);
  const scored = [];
  for (const story of fresh) {
    const hero = heroOf(story);
    if (!hero) { drop(story, 'no usable hero image (allowlisted licence, no restrictions, not AI-made, ≥ 640 px, not already a reel’s hero)'); continue; }
    scored.push({ ...story, hero: hero.title, score: scoreStory(story, { day: date, hero, place: story.place }) });
  }

  // 5. The shortlist: twice the reels wanted, mixed, the evergreen places taken in turn.
  const coverage = {};
  for (const reel of [...app.REELS, ...recent]) coverage[reel.nodeId] = (coverage[reel.nodeId] ?? 0) + 1;
  // --keep: once drafting has started, refresh the same stories (media, licences, sources) without
  // choosing again, so the drafts' story ids stay valid.
  const kept = keep ? readJson(path.join(dir, 'shortlist.json'), { stories: [] }).stories.map(s => s.id) : null;
  const picked = kept ? kept.map(id => scored.find(s => s.id === id)).filter(Boolean) : shortlist(scored, { count, day: date, coverage });
  if (kept) for (const id of kept.filter(id => !picked.some(s => s.id === id))) console.log(`  KEPT STORY LOST: ${id} (${dropped.find(d => d.id === id)?.reason ?? 'not scored'})`);

  // 6. Pin: full article text for each picked story, its file descriptions, its extra texts; and
  //    more images from its main article, so a reel has two or three to move between.
  const sourcesDir = path.join(dir, 'sources');
  rmSync(sourcesDir, { recursive: true, force: true }); // a rerun pins afresh, leaving nothing stale
  const pinned = new Map();
  const pin = record => { pinned.set(record.id, record); writeJson(path.join(sourcesDir, `${safeName(record.id)}.json`), record); return record; };
  const media = {};
  const out = [];
  for (const story of picked) {
    const sources = [];
    for (const page of story.pages.filter(p => !isBackdrop(p.title)).slice(0, story.kind === 'place' ? 6 : 3)) {
      const record = pinned.get(`Wikipedia: ${page.title}`) ?? await pinArticle(titleVariants(page.title));
      if (record) sources.push(pinned.has(record.id) ? record : pin(record));
    }
    for (const extra of story.text ?? []) if (extra.text) sources.push(pin({ id: extra.cite, kind: 'text', url: extra.url, retrieved: new Date().toISOString().slice(0, 10), licence: extra.licence, usage: ['ai_input'], text: extra.text }));
    // A day's story that lands on an expedition's place also gets that place's own key source (the
    // article its claim rests on), so the reel can say how the story connects to the idea.
    if (story.kind !== 'place' && story.place.pack) {
      const expedition = app.EXPEDITIONS.find(e => e.pack.id === story.place.pack);
      const reserved = new Set(app.TRANSFER_ONLY_SOURCES[story.place.pack] ?? []);
      const claim = `${app.catalog.get(story.place.node)?.description ?? ''} ${story.headline}`.toLowerCase();
      const keys = new Set(claim.match(/[a-z0-9]{4,}/g) ?? []);
      // The provenance claim closest to the place's own claim (as a share of its words), then the title.
      const share = text => { const ws = new Set(String(text).toLowerCase().match(/[a-z0-9]{4,}/g) ?? []); return ws.size ? [...ws].filter(w => keys.has(w)).length / ws.size : 0; };
      const options = (expedition?.pack.provenance ?? []).filter(p => !reserved.has(p.source)).flatMap(p => wikipediaTitles(p.source).map((title, k) => ({ title, hits: share(p.claim) + share(title) * 0.5 - k * 0.01 })));
      const best = options.sort((a, b) => b.hits - a.hits)[0];
      if (best?.hits) {
        const record = pinned.get(`Wikipedia: ${best.title}`) ?? await pinArticle(titleVariants(best.title));
        if (record && !sources.some(s => s.id === record.id)) {
          sources.push(pinned.has(record.id) ? record : pin(record));
          // …and its pictures, after the story's own.
          story.placeImages = (await mediaList(record.title).catch(() => [])).slice(0, 3).map(item => item.title);
        }
      }
    }
    if (!sources.length) { drop(story, 'no source text could be pinned'); continue; }
    // A birth or death "on this day" must be on this day in the article too (the feed sometimes
    // files a person under the wrong date).
    if (story.group === 'births' || story.group === 'deaths') {
      const [, mm, dd] = date.split('-').map(Number);
      const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mm - 1];
      if (!new RegExp(`\\b(${dd} ${month}|${month} ${dd}\\b)`).test(sources[0].text.slice(0, 4000))) { drop(story, `the article does not give ${dd} ${month} for this ${story.group === 'births' ? 'birth' : 'death'}`); continue; }
    }
    // An evergreen claim cites several articles: lead with the ones that say most about it.
    if (story.kind === 'place' && sources.length > 1) {
      const keys = new Set(String(story.claim).toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
      const weight = s => (s.text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).filter(w => keys.has(w)).length / Math.sqrt(1 + s.text.length / 1000);
      sources.sort((a, b) => (b.kind === 'wikipedia') - (a.kind === 'wikipedia') || weight(b) - weight(a));
      sources.splice(3);
    }
    if (story.kind !== 'place' && story.pages[0]) {
      const listed = await mediaList(story.pages[0].title).catch(() => []);
      story.images = [...new Set([...story.images, ...listed.slice(0, 10).map(item => item.title)])];
    }
    const extra = story.placeImages ?? [];
    const info2 = await filesInfo([...story.images, ...extra].filter(title => !files.has(title)));
    for (const [title, d] of info2) files.set(title, d);
    // Never offer a picture of what one of the place's own checks relies on (its title or description names it).
    const reservedHere = app.editionSpoilers().filter(s => s.node === story.place.node).flatMap(s => s.entities);
    const shows = d => reservedHere.find(entity => new RegExp(`(^|[^\\p{L}])${entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?(?![\\p{L}])`, 'iu').test(`${d.title} ${d.description}`));
    const own = [story.hero, ...story.images.filter(t => t !== story.hero)].map(t => files.get(t)).filter(d => usable(d) && Math.max(d.width, d.height) >= 480 && !shows(d));
    const placed = extra.map(t => files.get(t)).filter(d => usable(d) && Math.max(d.width, d.height) >= 480 && !own.includes(d) && !shows(d));
    const usableFiles = [...own.slice(0, placed.length ? 5 : 6), ...placed.slice(0, 2)].slice(0, 7);
    const list = usableFiles.map((d, i) => {
      media[d.page] = snapshotOf(d);
      // The file's own description is pinned too, so "this picture shows…" can be quoted.
      if (d.description) pin({ id: d.page, kind: 'commons', url: d.page, retrieved: new Date().toISOString().slice(0, 10), licence: d.license, usage: ['ai_input'], text: d.description });
      return { key: `m${i + 1}`, file: d.title, page: d.page, src: d.src, license: d.license, credit: d.credit, author: d.author, width: d.width, height: d.height, mime: d.mime, date: d.date, description: d.description.slice(0, 400), mustContain: d.license.startsWith('CC BY-SA'), mayMove: !d.license.startsWith('CC BY-SA'), featured: d.featured };
    });
    out.push({
      id: story.id, kind: story.kind, dateBound: story.dateBound, year: story.year, headline: story.headline, subject: story.subjectKey,
      claim: story.claim, place: story.place, score: story.score,
      sources: sources.map((s, i) => ({ key: `S${i + 1}`, cite: s.id, url: s.url, revision: s.revision, licence: s.licence, file: `sources/${safeName(s.id)}.json`, chars: s.text.length })),
      media: list,
      expires: story.dateBound ? addDays(date, 1) : undefined,
    });
  }
  const considered = [...scored].sort((a, b) => b.score.total - a.score.total).map(s => ({ id: s.id, kind: s.kind, place: s.place.node, score: s.score, hero: s.hero, headline: String(s.headline).slice(0, 140), picked: picked.includes(s) }));
  writeJson(path.join(dir, 'shortlist.json'), { date, count, pickedAt: new Date().toISOString(), stories: out, considered, dropped });
  writeJson(path.join(dir, 'media.json'), media);
  const minutes = logStage(date, 'pick', 'script', started, { candidates: candidates.stories.length, mapped: mapped.length, scored: scored.length, shortlisted: out.length, dropped: dropped.length });
  const reasons = dropped.reduce((acc, d) => { const key = d.reason.replace(/\(.*$/, '').replace(/: .*/, '').trim(); return { ...acc, [key]: (acc[key] ?? 0) + 1 }; }, {});
  console.log(`${candidates.stories.length} candidates → ${mapped.length} placed → ${scored.length} with a hero → shortlist of ${out.length} (${minutes} min)`);
  console.log(`  dropped: ${Object.entries(reasons).map(([k, v]) => `${v} ${k}`).join('; ')}`);
  for (const s of out) console.log(`  ${s.score.total.toFixed(2).padStart(5)}  ${s.kind.padEnd(8)} ${s.place.name.padEnd(26)} ${String(s.headline).slice(0, 90)}`);
  return out;
}
