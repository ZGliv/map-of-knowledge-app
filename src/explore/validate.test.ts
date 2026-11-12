import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { EXPEDITIONS } from '../expeditions/registry';
import { NARRATION, REELS } from './deck';
import { checksOf, sharesRun, TRANSFER_ONLY_SOURCES, validateDeck, validateReel, type ReelContext } from './validate';
import type { Reel } from './types';

const ctx: ReelContext = {
  nodeExists: id => !!catalog.get(id),
  expedition: packId => {
    const found = EXPEDITIONS.find(expedition => expedition.pack.id === packId);
    return found ? { pack: found.pack, nodeId: found.nodeId } : undefined;
  },
  checks: EXPEDITIONS.flatMap(expedition => checksOf(expedition.pack)),
  narration: NARRATION,
};
const clone = (reel: Reel): Reel => structuredClone(reel);
const first = REELS[0];

describe('the reel deck', () => {
  it('passes every rule', () => {
    expect(validateDeck(REELS, ctx)).toEqual([]);
  });

  it('holds two or three reels per pack it covers, and three from physics and music', () => {
    const count = (packId: string) => REELS.filter(reel => reel.packId === packId).length;
    expect([count('evolution-e05'), count('evolution-e07'), count('evolution-e10')]).toEqual([3, 3, 3]);
    expect(count('physics') + count('music')).toBe(3);
    for (const packId of new Set(REELS.map(reel => reel.packId))) if (packId !== 'physics' && packId !== 'music') expect([2, 3], packId).toContain(count(packId));
  });

  it('ships a small narration file for every reel', () => {
    const files = Object.keys(import.meta.glob('../../public/explore/narration/*.mp3', { query: '?url', import: 'default' }));
    for (const reel of REELS) {
      const { src, bytes } = NARRATION.reels[reel.id];
      expect(files, src).toContain(`../../public/${src}`);
      expect(bytes).toBeLessThan(400_000);
    }
    expect(files).toHaveLength(REELS.length);
  });

  it('knows a check prompt for every graded moment in every pack', () => {
    for (const expedition of EXPEDITIONS) {
      const checks = checksOf(expedition.pack);
      expect(checks.length).toBeGreaterThan(3);
      for (const check of checks) expect(check.prompt.trim(), `${expedition.pack.id} ${check.gradeId}`).not.toBe('');
    }
  });

  it('lists only real provenance sources as transfer-only', () => {
    for (const [packId, sources] of Object.entries(TRANSFER_ONLY_SOURCES)) {
      const pack = ctx.expedition(packId)!.pack;
      for (const source of sources) expect(pack.provenance.map(entry => entry.source), `${packId}: ${source}`).toContain(source);
    }
  });
});

describe('the reel validator catches', () => {
  const expectError = (reel: Reel, pattern: RegExp) => expect(validateReel(reel, ctx).join('\n')).toMatch(pattern);

  it('too few and too many frames', () => {
    const short = clone(first); short.frames = short.frames.slice(0, 3);
    expectError(short, /frames; a reel has 4–7/);
    const long = clone(first); long.frames = [...long.frames, ...long.frames];
    expectError(long, /frames; a reel has 4–7/);
  });

  it('a frame with no claim, or a claim with no source', () => {
    const bare = clone(first); bare.frames[1].claims = [];
    expectError(bare, /frame 2 has no claim/);
    const unknown = clone(first); unknown.frames[1].claims = ['made-up'];
    expectError(unknown, /cites unknown claim "made-up"/);
  });

  it('a claim traced to anything but the pack’s provenance', () => {
    const reel = clone(first); reel.sources[0].cite = 'A blog post';
    expectError(reel, /not in physics's provenance/);
  });

  it('a claim that leans on a transfer check’s source', () => {
    const reel = clone(REELS.find(item => item.packId === 'evolution-e10')!);
    reel.sources[0].cite = 'Wikipedia: Herbicide (Resistance section)';
    expectError(reel, /reserved for a transfer check/);
  });

  it('a non-commercial licence, or media without attribution', () => {
    const nc = clone(first); (nc.media[nc.hero] as { license: string }).license = 'CC BY-NC 4.0';
    expectError(nc, /not on the allowlist/);
    const anonymous = clone(first); anonymous.media[anonymous.hero].credit = ' ';
    expectError(anonymous, /no attribution/);
  });

  it('a ShareAlike file that is zoomed, cropped or filtered', () => {
    const reel = clone(REELS.find(item => item.id === 'physics-who-checked')!);
    const pisa = reel.frames.findIndex(frame => frame.media === 'pisa');
    (reel.frames[pisa] as { zoom: number }).zoom = 1.3;
    expectError(reel, /must be shown whole and unmoved/);
    const covered = clone(REELS.find(item => item.id === 'physics-who-checked')!);
    covered.media.pisa.fit = 'cover';
    expectError(covered, /ShareAlike, so it must be shown whole/);
    const inked = clone(REELS.find(item => item.id === 'physics-who-checked')!);
    inked.media.pisa.tone = 'ink';
    expectError(inked, /may not be ink-filtered/);
  });

  it('a tag that is not on the map, or not where the pack’s check lives', () => {
    const lost = clone(first); lost.nodeId = 'knowledge.nowhere';
    expectError(lost, /not in the catalog/);
    const elsewhere = clone(first); elsewhere.nodeId = 'knowledge.arts.music.harmony';
    expectError(elsewhere, /is not where physics lives/);
  });

  it('a missing prediction answer, or a prediction that reuses a check', () => {
    const noAnswer = clone(first); noAnswer.prediction.answer = 'nope';
    expectError(noAnswer, /answer is not one of its choices/);
    const reused = clone(first); reused.prediction.id = 'pre:drop-predict';
    expectError(reused, /reuses check "drop-predict"/);
    const copied = clone(first); copied.prediction.prompt = 'A geologist’s hammer and a falcon feather, released together from shoulder height.';
    expectError(copied, /shares 8 words in a row with check "drop-predict"/);
  });

  it('a caption edited after its narration was made, or a story outside 20–50 seconds', () => {
    const edited = clone(first); edited.frames[2].text = `${edited.frames[2].text} And then some.`;
    expectError(edited, /caption changed since its narration was made/);
    const narration = structuredClone(NARRATION);
    narration.reels[first.id].duration = 64;
    expect(validateReel(first, { ...ctx, narration }).join('\n')).toMatch(/story runs 64\.0 s/);
  });

  it('hype, emoji and bare exclamation marks', () => {
    const reel = clone(first);
    reel.frames[0].text = 'Did you know the Moon is wild!';
    reel.prediction.prompt = 'Guess 🚀';
    const errors = validateReel(reel, ctx).join('\n');
    expect(errors).toMatch(/reads like hype/);
    expect(errors).toMatch(/exclamation mark outside a quotation/);
    expect(errors).toMatch(/contains an emoji/);
  });

  it('runs of shared words, but not loose overlap', () => {
    expect(sharesRun('one two three four five six seven eight nine', 'zero two three four five six seven eight nine ten')).toBe(true);
    expect(sharesRun('the hammer and the feather fall', 'the feather and the hammer fall')).toBe(false);
  });
});
