// Wikimedia's feed API: a day's on-this-day events, births and deaths; the featured article; the
// picture of the day; the most-read articles; and Did-you-know hooks. All of it is Wikipedia or
// Commons, so licence-safe: article text is CC BY-SA fact input (never copied), and every image's
// licence is read from Commons extmetadata later (commons.mjs), never trusted from the feed.
//   https://api.wikimedia.org/feed/v1/wikipedia/en/featured/YYYY/MM/DD
//   https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/MM/DD
// Wikipedia's "In the news" is left out: current events are not what a reel is for.
import { dayParts, get } from '../lib.mjs';
import { commonsFileOf, isBackdrop, pageOf, slug } from './common.mjs';

const FEED = 'https://api.wikimedia.org/feed/v1/wikipedia/en';

/** People whose birth or death day is worth a reel: their description names a field the atlas has. */
const FIELD_PEOPLE = /\b(astronomer|astrophysicist|physicist|chemist|mathematician|naturalist|biologist|botanist|zoologist|geologist|palaeontologist|paleontologist|geneticist|microbiologist|physician|surgeon|anatomist|inventor|engineer|explorer|navigator|cartographer|architect|composer|painter|sculptor|engraver|printmaker|photographer|philosopher|economist|linguist|archaeologist|anthropologist|psychologist|historian|polymath|scientist|astronaut|aviator|meteorologist|oceanographer|ornithologist|entomologist|computer scientist|statistician|poet|novelist|playwright)\b/i;

/** The pages an on-this-day entry is about, backdrops (years, dates) left out. */
const subjectPages = entry => (entry.pages ?? []).map(pageOf).filter(page => page && !isBackdrop(page.title));

function onThisDay(entries, date, group) {
  const out = [];
  for (const entry of entries ?? []) {
    const pages = subjectPages(entry);
    if (!pages.length || typeof entry.year !== 'number') continue;
    if ((group === 'births' || group === 'deaths') && !FIELD_PEOPLE.test(pages[0].description)) continue;
    out.push({
      id: `onthisday:${date}:${entry.year}-${slug(pages[0].title)}`,
      source: 'wikimedia',
      kind: 'this-day',
      group,
      date,
      dateBound: true,
      year: entry.year,
      headline: entry.text,
      pages,
      images: [...new Set(pages.map(page => page.image).filter(Boolean))],
    });
  }
  return out;
}

/** Article titles linked from a bit of feed HTML; bold links (a DYK hook's subject) first. */
export function linkedTitles(html) {
  const bold = [...String(html ?? '').matchAll(/<b[^>]*>\s*<a[^>]+href="(?:https:\/\/en\.wikipedia\.org\/wiki\/|\.\/)([^"#?]+)"/g)].map(m => m[1]);
  const all = [...String(html ?? '').matchAll(/<a[^>]+href="(?:https:\/\/en\.wikipedia\.org\/wiki\/|\.\/)([^"#?]+)"/g)].map(m => m[1]);
  return [...new Set([...bold, ...all].map(t => decodeURIComponent(t).replace(/_/g, ' ')).filter(t => !/^(File|Template|Help|Wikipedia|Category|Special):/.test(t)))];
}

/** Every candidate story in one day's feeds. Pure: `featured` and `otd` are the two API responses. */
export function parseWikimedia(featured, otd, date, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const stories = [];
  // On this day: the curated selection, then the wider events list, then field people.
  const seen = new Set();
  for (const group of ['selected', 'events', 'births', 'deaths']) {
    const entries = group === 'selected' ? (featured?.onthisday ?? otd?.selected) : otd?.[group];
    for (const story of onThisDay(entries, date, group)) if (!seen.has(story.id)) { seen.add(story.id); stories.push(story); }
  }
  // The featured article.
  const tfa = pageOf(featured?.tfa);
  if (tfa) stories.push({ id: `featured:${date}:${slug(tfa.title)}`, source: 'wikimedia', kind: 'featured', date, dateBound: false, headline: tfa.extract.split(/(?<=\.)\s/)[0] ?? '', pages: [tfa], images: tfa.image ? [tfa.image] : [] });
  // The picture of the day: the file is the story, its description and linked articles the facts.
  const image = featured?.image;
  if (image?.title) {
    const file = image.title.startsWith('File:') ? image.title.replace(/_/g, ' ') : `File:${image.title}`;
    const linked = linkedTitles(image.description?.html);
    stories.push({
      id: `picture:${date}:${slug(file.replace(/^File:|\.\w+$/g, ''))}`,
      source: 'wikimedia', kind: 'picture', date, dateBound: false,
      headline: image.description?.text ?? '',
      pages: linked.map(title => ({ title, qid: null, description: '', extract: '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` })),
      images: [file],
      text: [{ cite: image.file_page ?? `https://commons.wikimedia.org/wiki/${file.replace(/ /g, '_')}`, url: image.file_page, licence: 'Commons file description', text: image.description?.text ?? '' }],
    });
  }
  // Most read yesterday: trending, so date-bound.
  for (const article of (featured?.mostread?.articles ?? []).slice(0, 25)) {
    const page = pageOf(article);
    if (!page || isBackdrop(page.title) || /^(Main Page|Special:)/.test(page.title)) continue;
    stories.push({ id: `mostread:${date}:${slug(page.title)}`, source: 'wikimedia', kind: 'mostread', date, dateBound: true, headline: page.extract.split(/(?<=\.)\s/)[0] ?? '', pages: [page], images: page.image ? [page.image] : [], views: article.views });
  }
  // Did you know: hooks Wikipedia's editors already chose for surprise. The feed serves the current
  // hooks for any future day, so they count only on the day itself (or before).
  const current = date <= today;
  for (const hook of current ? featured?.dyk ?? [] : []) {
    const titles = linkedTitles(hook.html);
    if (!titles.length) continue;
    stories.push({
      id: `dyk:${date}:${slug(titles[0])}`, source: 'wikimedia', kind: 'dyk', date, dateBound: false,
      headline: String(hook.text ?? '').replace(/^\.\.\.\s*that\s*/i, '').replace(/\?\s*$/, ''),
      pages: titles.map(title => ({ title, qid: null, description: '', extract: '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` })),
      images: [],
    });
  }
  return stories;
}

export async function fetchWikimedia(date) {
  const { y, m, d } = dayParts(date);
  const featured = await get(`${FEED}/featured/${y}/${m}/${d}`, { ttlHours: 6 });
  const otd = await get(`${FEED}/onthisday/all/${m}/${d}`, { ttlHours: 24 * 7 });
  return { raw: { featured, otd }, stories: parseWikimedia(featured, otd, date) };
}

export { commonsFileOf };
