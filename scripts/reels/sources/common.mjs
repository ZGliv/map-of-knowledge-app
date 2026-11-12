// What every story source returns: candidate stories with their source text and URLs pinned.
//
// Story = {
//   id:        '<source>:<key>', stable for the same story on the same day
//   source:    'wikimedia' | 'evergreen' | 'apod'
//   kind:      'this-day' | 'featured' | 'picture' | 'mostread' | 'dyk' | 'place' | 'apod'
//   date:      the deck day it was gathered for
//   dateBound: true when the story only makes sense on its day (needs an expiry)
//   year?:     the year an on-this-day event happened
//   headline:  the source's own one-line statement of the story (fact input, never copied)
//   pages:     [{ title, qid, description, extract, url }]  Wikipedia pages behind it, main page first
//   images:    ['File:…']  Commons files that could carry it, best first
//   text?:     [{ cite, url, licence, text }]  pinned text that is not a Wikipedia article (an image
//              description, an APOD explanation)
//   place?, packId?, claim?  evergreen stories only: the place and the provenance claim
// }

/** A short, stable key from text. */
export const slug = text => String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-+$/, '');

/** "File:Name.jpg" from an upload.wikimedia.org Commons URL (original or thumbnail); null for
 * anything not on Commons (en.wikipedia's own uploads are often non-free). */
export function commonsFileOf(url) {
  const m = String(url ?? '').match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  return m ? `File:${decodeURIComponent(m[1]).replace(/_/g, ' ')}` : null;
}

/** A Wikipedia page summary (REST) → the page record a story carries. */
export function pageOf(summary) {
  if (!summary?.title || summary.type === 'disambiguation') return null;
  const title = (summary.titles?.normalized ?? summary.title).replace(/_/g, ' ');
  return {
    title,
    qid: summary.wikibase_item ?? null,
    description: summary.description ?? '',
    extract: summary.extract ?? '',
    url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    revision: summary.revision ? String(summary.revision) : undefined,
    image: commonsFileOf(summary.originalimage?.source),
  };
}

/** Pages that never carry a story on their own: years, dates, centuries, countries' lists. */
export const isBackdrop = title => /^(\d{1,4}( BC)?|\d{1,2}(st|nd|rd|th) century|(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}|List of .+|Deaths in .+)$/i.test(title);
