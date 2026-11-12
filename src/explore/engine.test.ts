import { describe, expect, it } from 'vitest';
import { REELS } from './deck';
import { engineContext, editionSpoilers, transferOnlyCites } from './engineContext';
import { parseDeck } from './today';
import type { EngineReel } from './types';
import { spoils, validateEngineDeck, validateEngineReel, type EngineMediaCheck, type EngineReelContext } from './validate';

// The reel engine's rules (validateEngineReel), on the real dated decks and on broken copies of them.

type DayRecord = { date: string; reels: EngineReel[] };
type Pinned = { id: string; text: string };
const records = import.meta.glob<DayRecord>('../../content/reels/*/reels.json', { eager: true, import: 'default' });
const pinned = import.meta.glob<Pinned>('../../content/reels/*/sources/*.json', { eager: true, import: 'default' });
const snapshots = import.meta.glob<Record<string, EngineMediaCheck>>('../../content/reels/*/media.json', { eager: true, import: 'default' });
const published = import.meta.glob('../../public/explore/decks/*.json', { eager: true, import: 'default' });
const audio = Object.keys(import.meta.glob('../../public/explore/decks/*/*.mp3', { query: '?url', import: 'default' }));

const dayOf = (path: string) => path.match(/(\d{4}-\d{2}-\d{2})/)![1];
const days = Object.keys(records).map(dayOf).sort();
function contextFor(day: string): EngineReelContext {
  const texts: Record<string, string> = {};
  for (const [path, source] of Object.entries(pinned)) if (dayOf(path) === day) texts[source.id] = source.text;
  const media = Object.entries(snapshots).find(([path]) => dayOf(path) === day)?.[1] ?? {};
  return engineContext(texts, media);
}
const recordOf = (day: string) => Object.entries(records).find(([path]) => dayOf(path) === day)![1];
const ctx = contextFor(days[0]);
const base = recordOf(days[0]).reels[0];
const clone = (reel: EngineReel = base): EngineReel => structuredClone(reel);
const expectError = (reel: EngineReel, pattern: RegExp, context = ctx) => expect(validateEngineReel(reel, context).join('\n')).toMatch(pattern);

describe('the dated decks', () => {
  it('exist for three days, each with 6–8 new reels', () => {
    expect(days.length).toBeGreaterThanOrEqual(3);
    for (const day of days) expect(recordOf(day).reels.length, day).toBeGreaterThanOrEqual(6);
  });

  it('pass every engine rule, with their pinned sources and licence snapshots', () => {
    for (const day of days) {
      const deck = Object.entries(published).find(([path]) => dayOf(path) === day)![1] as { evergreen: string[] };
      expect(validateEngineDeck({ date: day, reels: recordOf(day).reels, evergreen: deck.evergreen }, contextFor(day), REELS.map(r => r.id)), day).toEqual([]);
    }
  });

  it('publish exactly the checked reels, without their quotes, and every narration file', () => {
    for (const day of days) {
      const deck = parseDeck(Object.entries(published).find(([path]) => dayOf(path) === day)![1]);
      expect(deck, day).not.toBeNull();
      const record = recordOf(day).reels;
      expect(deck!.reels.map(r => r.id)).toEqual(record.map(r => r.id));
      for (const [i, reel] of deck!.reels.entries()) {
        expect(reel.sources.every(s => s.quote === undefined), reel.id).toBe(true);
        expect({ ...reel, sources: undefined }).toEqual({ ...record[i], sources: undefined });
        expect(audio, reel.id).toContain(`../../public/${reel.narration.src}`);
        expect(reel.narration.bytes).toBeLessThan(400_000);
      }
    }
  });

  it('use at least three templates a day and send at least two reels to a place with something to prove', () => {
    for (const day of days) {
      const reels = recordOf(day).reels;
      expect(new Set(reels.map(r => r.template)).size, day).toBeGreaterThanOrEqual(3);
      expect(reels.filter(r => r.packId).length, day).toBeGreaterThanOrEqual(2);
      expect(new Set(reels.map(r => r.nodeId)).size, day).toBe(reels.length);
    }
  });
});

describe('the engine validator catches', () => {
  it('a quote that is not in its pinned source, or no quote at all', () => {
    const reel = clone(); reel.sources[0].quote = 'words the source never said, made up for this test';
    expectError(reel, /quote is not in/);
    const bare = clone(); delete bare.sources[0].quote;
    expectError(bare, /has no quote/);
  });

  it('a claim that cites something not pinned for the day', () => {
    const reel = clone(); reel.sources[0].cite = 'Wikipedia: Some Unpinned Article';
    expectError(reel, /not a pinned source/);
  });

  it('prose copied from a source, eight words in a row', () => {
    const reel = clone(); reel.frames[1].text = reel.sources[0].quote!.split(' ').slice(0, 12).join(' ');
    expectError(reel, /copies 8 words in a row/);
  });

  it('a licence that does not match its Commons snapshot, restrictions, AI-made files and NC licences', () => {
    const page = base.media[base.hero].page;
    const swapped = (change: Partial<EngineMediaCheck>) => ({ ...ctx, mediaChecks: { ...ctx.mediaChecks, [page]: { ...ctx.mediaChecks[page], ...change } } });
    expectError(clone(), /but Commons says "CC BY-SA 4.0"/, swapped({ license: 'CC BY-SA 4.0' }));
    expectError(clone(), /carries Commons restrictions/, swapped({ restrictions: ['trademarked'] }));
    expectError(clone(), /is AI-generated/, swapped({ aiGenerated: true }));
    expectError(clone(), /hero is 300×200/, swapped({ width: 300, height: 200 }));
    const nc = clone(); (nc.media[nc.hero] as { license: string }).license = 'CC BY-NC 4.0';
    expectError(nc, /not on the allowlist/);
    expectError(clone(), /no Commons licence snapshot/, { ...ctx, mediaChecks: {} });
  });

  it('a cropped CC BY file whose credit does not say so', () => {
    const reel = clone(); const media = reel.media[reel.hero];
    (media as { license: string }).license = 'CC BY 2.0'; media.fit = undefined; media.credit = 'Someone, 2015';
    const page = media.page;
    expectError(reel, /CC BY and cropped/, { ...ctx, mediaChecks: { ...ctx.mediaChecks, [page]: { ...ctx.mediaChecks[page], license: 'CC BY 2.0' } } });
  });

  it('dark line art on a transparent background unless inked, and inking anything but PD or CC0', () => {
    const reel = clone(); const media = reel.media[reel.hero]; const page = media.page;
    const vanishing = { ...ctx, mediaChecks: { ...ctx.mediaChecks, [page]: { ...ctx.mediaChecks[page], vanishes: true } } };
    media.tone = undefined;
    expectError(reel, /would vanish on the reel/, vanishing);
    media.tone = 'ink';
    expect(validateEngineReel(reel, vanishing).filter(e => /vanish|inked/.test(e))).toEqual([]);
    (media as { license: string }).license = 'CC BY 4.0'; media.credit = 'Someone, 2015, cropped';
    expectError(reel, /is inked, which alters the picture/, { ...ctx, mediaChecks: { ...ctx.mediaChecks, [page]: { ...ctx.mediaChecks[page], license: 'CC BY 4.0' } } });
  });

  it('a picture that already leads an evergreen reel', () => {
    const reel = clone();
    expectError(reel, /already leads an evergreen reel/, { ...ctx, evergreenHeroes: new Set([reel.media[reel.hero].page]) });
  });

  it('a date-bound reel with no expiry, an expiry past a week, a this-day reel that outlives its day', () => {
    const today = clone(); today.template = 'number'; delete today.expires; today.frames[1].text = 'Today the storm is back.';
    expectError(today, /says "Today", so it is date-bound and needs an expiry/);
    const thisDay = clone(); thisDay.template = 'this-day'; delete thisDay.expires;
    expectError(thisDay, /is a this-day reel, so it is date-bound/);
    const long = clone(); long.template = 'number'; long.expires = '2026-11-20';
    expectError(long, /expires within 7/);
    const twoDays = clone(); twoDays.template = 'this-day'; twoDays.expires = '2026-10-25';
    expectError(twoDays, /expires the day after its day/);
    const early = clone(); early.expires = early.from;
    expectError(early, /expires before it starts/);
  });

  it('hype and the tells of mass-produced content', () => {
    const reel = clone(); reel.frames[0].text = 'An incredible storm, let’s dive in.';
    expectError(reel, /mass-produced content \("incredible"\)/);
    const hype = clone(); hype.title = 'Did you know this storm';
    expectError(hype, /reads like hype/);
  });

  it('a title that gives the prediction away', () => {
    const reel = clone(); reel.title = `${reel.prediction.choices.find(c => c.id === reel.prediction.answer)!.label}`;
    expectError(reel, /title gives the prediction away/);
  });

  it('a place that does not exist, or a pack that is not the one placed there', () => {
    const lost = clone(); lost.nodeId = 'knowledge.nowhere';
    expectError(lost, /not in the catalog/);
    const wrong = clone(); wrong.packId = 'physics';
    expectError(wrong, /is not the expedition at/);
  });

  it('narration missing, or not under its deck', () => {
    const reel = clone(); reel.narration = { ...reel.narration, src: 'explore/narration/x.mp3' };
    expectError(reel, /narration file must match/);
  });

  it('an id that does not start with its day, and a story it never names', () => {
    const reel = clone(); reel.id = 'no-day-here'; reel.story = '';
    const errors = validateEngineReel(reel, ctx).join('\n');
    expect(errors).toMatch(/id must start with its day/);
    expect(errors).toMatch(/names no story/);
  });

  it('a reel that cites a source reserved for a transfer check', () => {
    const cite = [...transferOnlyCites()][0];
    const reel = clone(); reel.sources[0].cite = cite;
    expectError(reel, /reserved for a transfer check/, { ...ctx, sourceTexts: { ...ctx.sourceTexts, [cite]: reel.sources[0].quote! } });
  });

  it('a deck that repeats a story, leads twice with one picture, or names a missing evergreen reel', () => {
    const reels = recordOf(days[0]).reels;
    const twin = { ...structuredClone(reels[1]), story: reels[0].story, hero: reels[0].hero, media: { ...reels[1].media, [reels[0].hero]: reels[0].media[reels[0].hero] } };
    const errors = validateEngineDeck({ date: days[0], reels: [reels[0], twin], evergreen: ['no-such-reel'] }, ctx, REELS.map(r => r.id)).join('\n');
    expect(errors).toMatch(/is told twice/);
    expect(errors).toMatch(/lead with the same image/);
    expect(errors).toMatch(/evergreen reel "no-such-reel" does not exist/);
  });
});

describe('spoilers', () => {
  const spoiler = { id: 'case c_test', node: 'knowledge.science.biology.evolution.new-species', text: 'A ring of salamanders around a valley in California.', entities: ['Ensatina', 'Central Valley', 'England', 'salamanders'] };
  const reel = (nodeId: string, text: string) => ({ ...clone(), nodeId, title: 'A title', takeaway: 'A takeaway.', prediction: { ...base.prediction, prompt: 'A question?', choices: [{ id: 'a', label: 'Yes' }, { id: 'b', label: 'No' }] }, frames: base.frames.map(f => ({ ...f, text })) }) as EngineReel;

  it('at the reel’s own place, any entity a case or transfer item relies on', () => {
    expect(spoils(reel('knowledge.science.biology.evolution.new-species', 'Kings of England once hunted here.'), spoiler)).toMatch(/at this reel's own place/);
  });

  it('elsewhere, only a many-word entity, or two of one item’s', () => {
    expect(spoils(reel('knowledge.earth.climate', 'A storm crossed England.'), spoiler)).toBeNull();
    expect(spoils(reel('knowledge.earth.climate', 'Floods in the Central Valley.'), spoiler)).toMatch(/"Central Valley"/);
    expect(spoils(reel('knowledge.earth.climate', 'Salamanders in England.'), spoiler)).toMatch(/names "England" and "salamanders"/);
  });

  it('anywhere, eight words in a row from an item', () => {
    expect(spoils(reel('knowledge.earth.climate', 'Picture a ring of salamanders around a valley in California today.'), spoiler)).toMatch(/shares 8 words/);
  });

  it('come from every bank and case in the edition, each with its place', () => {
    const all = editionSpoilers();
    expect(all.length).toBeGreaterThan(200);
    expect(all.every(s => s.node.startsWith('knowledge.'))).toBe(true);
    expect(all.some(s => s.id.startsWith('case ') && s.entities.length)).toBe(true);
  });
});
