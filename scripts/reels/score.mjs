// How promising a story is, from what can be measured before anyone writes a word: a hint of
// surprise in its source, a strong hero image it can open on, and a place on the map it can land.
// The drafter makes the final call among the shortlist; this only orders it. Pure.

const SURPRISE = /\b(first|only|oldest|largest|biggest|smallest|longest|deepest|highest|fastest|earliest|record|never|accident(ally)?|mistak\w*|wrongly|myth|misconception|believed|thought to|turned out|instead|despite|although|surpris\w*|unexpected\w*|rediscover\w*|lost|hidden|predicted|disproved|overturned)\b/gi;
const NUMBER = /\b\d[\d,.]*\s*(million|billion|thousand|hundred|years|km|kilometres|kilometers|metres|meters|miles|degrees|°|per ?cent|%|times|tonnes|tons|kg)\b/i;
/** Stories about killing are never the point of a reel; recent ones are out entirely. */
export const GRIM = /\b(killed|killing|massacre\w*|murder\w*|terror\w*|bomb(ing|ings|ed)?|shot dead|shooting|genocide|executed|execution|airstrikes?|suicide|assassinat\w*|hostages?|riots?|lynch\w*|rape\w*|beheaded|tortur\w*)\b/i;

const KIND = { place: 1.2, 'this-day': 1.0, dyk: 0.9, picture: 0.8, apod: 0.8, featured: 0.6, mostread: 0.3 };

/** Hero quality: may it move (PD, CC0, CC BY), is it big, did Commons feature it? */
export function heroScore(file) {
  if (!file) return -9;
  let s = file.license === 'Public domain' || file.license === 'CC0' ? 1 : /^CC BY \d/.test(file.license) ? 0.8 : 0.45;
  if (file.featured) s += 0.5; else if (file.quality) s += 0.25;
  const side = Math.max(file.width ?? 0, file.height ?? 0);
  if (side >= 2400) s += 0.3; else if (side < 1000) s -= 0.3;
  if ((file.height ?? 0) >= (file.width ?? 1)) s += 0.15; // portrait or square fills a phone better
  if (/svg/.test(file.mime ?? '')) s -= 0.4;
  return Math.round(s * 100) / 100;
}

export function scoreStory(story, { day, hero, place }) {
  const parts = {};
  // Births and deaths are mostly a portrait and a list of posts; events chosen for Wikipedia's
  // front page ("selected") already passed an editor.
  parts.kind = (KIND[story.kind] ?? 0.5) + (story.group === 'births' || story.group === 'deaths' ? -0.4 : story.group === 'selected' ? 0.2 : 0);
  const text = `${story.headline ?? ''} ${(story.pages?.[0]?.extract ?? '').slice(0, 600)}`;
  parts.surprise = Math.min(2, 0.35 * (text.match(SURPRISE)?.length ?? 0)) + (NUMBER.test(text) ? 0.4 : 0);
  parts.hero = heroScore(hero);
  parts.place = place ? 0.4 + (place.node.split('.').length >= 4 ? 0.3 : 0) + (place.provable ? 0.5 : 0) : -9;
  const year = Number(day.slice(0, 4));
  if (story.kind === 'this-day' && typeof story.year === 'number') parts.age = story.year < 1900 ? 0.4 : story.year > year - 25 ? -1 : 0;
  if (GRIM.test(story.headline ?? '')) parts.grim = typeof story.year === 'number' && story.year > year - 100 ? -9 : -1;
  if (story.kind === 'place' && typeof story.told === 'number') parts.fresh = -story.told;
  const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * 100) / 100;
  return { total, parts };
}

/** A day-seeded order, so rotation differs day to day but reruns agree. */
export function seeded(key, day) {
  let h = 0x811c9dc5;
  for (const ch of `${day}|${key}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h / 0xffffffff;
}

/** The shortlist: best first, with a mix of kinds so the set never reads as one reel five times,
 * at most one story per place, and the evergreen places taken in turn (least covered first). */
export function shortlist(scored, { count, day, coverage = {} }) {
  const want = Math.max(4, count * 2);
  const quota = { place: Math.ceil(want * 0.4), 'this-day': Math.ceil(want * 0.35), picture: 1, apod: 1, featured: 1, mostread: 1, dyk: 2 };
  const live = scored.filter(s => s.score.total > 0);
  // Evergreen places in turn: the least covered first, then the strongest, with a day-seeded nudge.
  const turn = s => (coverage[s.place?.node] ?? 0) * 10 - s.score.total + seeded(s.id, day) * 0.75;
  const places = live.filter(s => s.kind === 'place').sort((a, b) => turn(a) - turn(b) || a.id.localeCompare(b.id));
  const others = live.filter(s => s.kind !== 'place').sort((a, b) => b.score.total - a.score.total || a.id.localeCompare(b.id));
  // One story per place in each pool: an evergreen claim and a day's story may share a place (the
  // drafter keeps one), so a strong "this day" is never crowded out by the place's own facts.
  const out = [], used = {}, taken = new Set();
  const slot = story => `${story.kind === 'place' ? 'place' : 'day'}:${story.place?.node}`;
  const take = (story, respectQuota) => {
    if (out.length >= want || out.includes(story) || taken.has(slot(story))) return;
    if (respectQuota && (used[story.kind] ?? 0) >= (quota[story.kind] ?? 1)) return;
    out.push(story);
    used[story.kind] = (used[story.kind] ?? 0) + 1;
    taken.add(slot(story));
  };
  for (const story of places) take(story, true);
  for (const story of others) take(story, true);
  // Still short (a thin day): the best of what is left, still one per place.
  for (const story of [...others, ...places]) take(story, false);
  return out;
}
