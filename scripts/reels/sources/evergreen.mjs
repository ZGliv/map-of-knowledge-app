// Evergreen stories: the places that already have an expedition. Each provenance claim a pack makes
// (a reviewed, sourced fact in MoK's own words) is a story seed, backed by the Wikipedia articles its
// source names, which the engine pins by revision; the pack's own licence-checked media come with it.
// This source alone covers all 16 places. Never a claim whose source backs a transfer check (a reel
// must not teach what a check saves for later), never one an existing reel already tells, and never
// a code, plan or file-page citation: only claims an outside source states.
import { wikipediaTitles } from '../../../src/explore/sourceTitles.ts';
import { fileTitle } from '../commons.mjs';
import { slug } from './common.mjs';

const words = text => new Set(String(text).toLowerCase().replace(/[’']/g, '').match(/[a-z0-9.]+/g)?.filter(w => w.length > 3) ?? []);
/** Share of a claim's words already in a told claim. */
export function overlap(a, b) {
  const left = words(a), right = words(b);
  if (!left.size) return 0;
  let shared = 0;
  for (const w of left) if (right.has(w)) shared += 1;
  return shared / left.size;
}

/** Pure: every evergreen story, from the expeditions, the transfer-only lists, the existing reels
 * and the edition's check items and cases (a claim a check is built on is the check's to reveal). */
export function evergreenStories({ expeditions, transferOnly, reels, checks = [] }, date) {
  const stories = [];
  for (const { pack, nodeId } of expeditions) {
    const reserved = new Set(transferOnly[pack.id] ?? []);
    // What this place's reels already tell, each reel as one text: a claim mostly made of one reel's
    // words is that reel's story again.
    const told = reels.filter(reel => reel.packId === pack.id).map(reel => [reel.title, reel.takeaway, reel.prediction.prompt, ...reel.frames.map(f => f.text), ...reel.sources.map(s => s.claim)].join(' '));
    const images = [...new Set(Object.values(pack.media).map(media => media.page).filter(page => /commons\.wikimedia\.org\/wiki\/File:/.test(page ?? '')).map(fileTitle))];
    pack.provenance.forEach((entry, index) => {
      if (reserved.has(entry.source)) return;
      const titles = wikipediaTitles(entry.source);
      if (!titles.length) return;
      const already = Math.max(0, ...told.map(text => overlap(entry.claim, text)));
      if (already >= 0.5) return;
      if (checks.some(check => check.node === nodeId && overlap(entry.claim, check.text) >= 0.4)) return;
      stories.push({
        id: `place:${pack.id}:${index + 1}-${slug(entry.claim).slice(0, 32)}`,
        source: 'evergreen', kind: 'place', date, dateBound: false,
        headline: entry.claim,
        claim: entry.claim,
        place: nodeId,
        packId: pack.id,
        subject: `claim:${pack.id}:${index + 1}`,
        told: Math.round(already * 100) / 100,
        pages: titles.map(title => ({ title, qid: null, description: '', extract: '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` })),
        images,
      });
    });
  }
  return stories;
}
