// NASA's Astronomy Picture of the Day, public domain only.
//
// The rule is "only items without a copyright field". The API cannot be trusted on its own, though:
// since APOD moved to science.nasa.gov (2025) the official API returns a broken scrape for every day
// (title "NASA Science", the NASA logo as the image) and drops the copyright field on pictures that
// are plainly copyrighted (2026-10-23, the Andromeda Galaxy over Mullion, is © Lucy Yunxi Hu). So a
// story survives only if:
//   1. the API entry is a real one (not the broken scrape) and has no copyright field,
//   2. it is an image, and
//   3. the same picture is on Wikimedia Commons as public domain (the reel validator serves media
//      from Commons only, with a licence snapshot), found by its exact title and credited to NASA.
// Anything else is dropped, with the reason kept in the day's candidates file.
import { get } from '../lib.mjs';
import { slug } from './common.mjs';

const API = 'https://api.nasa.gov/planetary/apod';

/** Why an API entry cannot become a story, or null if it can (pending the Commons match). */
export function apodProblem(entry) {
  if (!entry || typeof entry !== 'object') return 'no entry';
  if (entry.title === 'NASA Science' || /nasa-logo/.test(`${entry.url ?? ''} ${entry.hdurl ?? ''}`)) return 'the APOD API returned its broken scrape (title "NASA Science", NASA logo as the image), so its copyright field cannot be trusted';
  if (entry.copyright) return `copyright: ${String(entry.copyright).trim()}`;
  if (entry.media_type !== 'image') return `not an image (${entry.media_type})`;
  if (!entry.title || !entry.explanation) return 'no title or explanation';
  return null;
}

/** Pure: API entries → stories (still to be matched to a Commons file) and rejections. */
export function parseApod(entries, date) {
  const stories = [], rejected = [];
  for (const entry of [entries].flat()) {
    const problem = apodProblem(entry);
    if (problem) { rejected.push({ date: entry?.date, title: entry?.title, reason: problem }); continue; }
    stories.push({
      id: `apod:${entry.date}:${slug(entry.title)}`,
      source: 'apod', kind: 'apod', date, dateBound: false,
      headline: entry.title,
      pages: [],
      images: [],
      apod: { date: entry.date, title: entry.title, url: entry.hdurl ?? entry.url },
      text: [{ cite: `NASA APOD, ${entry.date}: ${entry.title}`, url: `https://apod.nasa.gov/apod/ap${entry.date.replace(/-/g, '').slice(2)}.html`, licence: 'Public domain (NASA)', text: entry.explanation }],
    });
  }
  return { stories, rejected };
}

/** The Commons copy of an APOD picture: a public-domain file found by its exact title, credited to NASA. */
export async function commonsCopy(story) {
  const q = `"${story.apod.title}" NASA`;
  const data = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=6&srlimit=5&srsearch=${encodeURIComponent(q)}`, { ttlHours: 24 });
  return (data?.query?.search ?? []).map(hit => hit.title);
}

/** The last week of APOD, newest first (the API's DEMO_KEY allows 30 requests an hour). */
export async function fetchApod(date, { days = 7, key = process.env.NASA_API_KEY || 'DEMO_KEY' } = {}) {
  // The API refuses days that have not happened yet: a future deck looks back from today.
  const now = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const end = new Date(Math.min(Date.parse(`${date}T00:00:00Z`), now.getTime()));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - (days - 1));
  const iso = d => d.toISOString().slice(0, 10);
  let entries;
  try {
    entries = await get(`${API}?api_key=${encodeURIComponent(key)}&start_date=${iso(start)}&end_date=${iso(end)}&thumbs=true`, { ttlHours: 6 });
  } catch (error) {
    return { stories: [], rejected: [{ reason: `APOD API unreachable: ${error.message}` }] };
  }
  const { stories, rejected } = parseApod(Array.isArray(entries) ? entries : [], date);
  for (const story of stories) story.images = await commonsCopy(story);
  return { stories: stories.filter(story => story.images.length), rejected: [...rejected, ...stories.filter(story => !story.images.length).map(story => ({ date: story.apod.date, title: story.apod.title, reason: 'no public-domain copy on Wikimedia Commons' }))] };
}
