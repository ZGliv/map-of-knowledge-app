import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { checkPlaces, fieldOf, isWithin, nearestPlace, placeDistance, taggablePlaces, territoryOf } from './places';
import { buildPool, displayTitle, isTooLong, type FeedPool } from './pool';
import poolJson from './pool.json';
import type { StoredVideo } from './ingest/catalog';

describe('place IDs', () => {
  it('keeps real places, lifts missing ones to their nearest ancestor and drops the rest', () => {
    const result = checkPlaces([
      'knowledge.science.chemistry',
      'knowledge.science.physics.mechanics.motion.no-such-place',
      'knowledge.nowhere.at-all',
      'not-even-knowledge',
    ], catalog);
    expect(result.places).toEqual(['knowledge.science.chemistry', 'knowledge.science.physics.mechanics.motion']);
    expect(result.moved).toEqual([{ from: 'knowledge.science.physics.mechanics.motion.no-such-place', to: 'knowledge.science.physics.mechanics.motion' }]);
    expect(result.dropped).toEqual(['knowledge.nowhere.at-all', 'not-even-knowledge']);
  });

  it('drops an ancestor when its descendant is also tagged, and keeps at most three', () => {
    expect(checkPlaces(['knowledge.science.biology', 'knowledge.science.biology.evolution.deep-time'], catalog).places).toEqual(['knowledge.science.biology.evolution.deep-time']);
    expect(checkPlaces(['knowledge.arts.music', 'knowledge.earth.oceans', 'knowledge.economics.money', 'knowledge.society.politics'], catalog).places).toHaveLength(3);
    expect(checkPlaces(['knowledge.arts.music', 'knowledge.arts.music'], catalog).places).toEqual(['knowledge.arts.music']);
  });

  it('never resolves to the bare root', () => {
    expect(nearestPlace('knowledge', catalog)).toBeNull();
    expect(nearestPlace('knowledge.unknown', catalog)).toBeNull();
    expect(nearestPlace('knowledge.earth.unknown', catalog)).toBe('knowledge.earth');
  });

  it('offers taggers real topics only: no root, no encounter nodes, no illustrative worked steps', () => {
    const ids = new Set(taggablePlaces(catalog).map(node => node.id));
    expect(ids.has('knowledge')).toBe(false);
    expect(ids.has('knowledge.science.biology.evolution.natural-selection')).toBe(true);
    expect(ids.has('knowledge.technology.computing.programming.algorithms.sorting')).toBe(true);
    expect([...ids].some(id => id.endsWith('.demonstration'))).toBe(false);
    expect(taggablePlaces(catalog).every(node => !node.sample || node.depth <= 7)).toBe(true);
  });

  it('measures territory, field, containment and distance on the tree', () => {
    const id = 'knowledge.science.biology.evolution.deep-time';
    expect(territoryOf(id)).toBe('knowledge.science');
    expect(fieldOf(id)).toBe('knowledge.science.biology');
    expect(isWithin(id, 'knowledge.science.biology')).toBe(true);
    expect(isWithin('knowledge.science.biology', id)).toBe(false);
    expect(placeDistance(id, id)).toBe(0);
    expect(placeDistance('knowledge.science.biology', 'knowledge.science.biology.evolution')).toBe(1);
    expect(placeDistance('knowledge.science.biology', 'knowledge.science.physics')).toBe(1);
    expect(placeDistance(id, 'knowledge.science.physics')).toBe(3);
  });
});

const pool = poolJson as unknown as FeedPool;

describe('the shipped pool', () => {
  it('names only places that exist in the atlas, one to three per video', () => {
    const missing = pool.videos.flatMap(video => video.places.filter(place => !catalog.get(place)).map(place => `${video.id} → ${place}`));
    expect(missing).toEqual([]);
    expect(pool.videos.every(video => video.places.length >= 1 && video.places.length <= 3)).toBe(true);
  });

  it('has a learn line, a known channel and a unique ID for every video', () => {
    expect(pool.videos.every(video => video.learn.length > 0 && (pool.channels as Record<string, unknown>)[video.channel])).toBe(true);
    expect(new Set(pool.videos.map(video => video.id)).size).toBe(pool.videos.length);
  });
});

describe('buildPool', () => {
  const stored = (id: string, extra: Partial<StoredVideo> = {}): StoredVideo => ({
    id, channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', title: `Video ${id}`, description: '', publishedAt: '2026-10-01T00:00:00.000Z', short: true, views: 1,
    firstSeenAt: '2026-10-01T00:00:00.000Z', refreshedAt: '2026-10-20T00:00:00.000Z', checkedAt: '2026-10-20T00:00:00.000Z', checkedBy: 'oembed',
    embeddable: true, aspect: 0.565, durationSec: null, madeForKids: null, ...extra,
  });
  const base = {
    channels: [{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: 'A channel' }],
    lookup: catalog,
    playable: (video: StoredVideo) => video.embeddable === true,
    now: '2026-10-23T00:00:00.000Z',
  };

  it('keeps educational, tagged, playable videos; overrides win; places are checked', () => {
    const report = buildPool({
      ...base,
      videos: [stored('aaaaaaaaaaa'), stored('bbbbbbbbbbb'), stored('ccccccccccc', { embeddable: false }), stored('ddddddddddd'), stored('eeeeeeeeeee')],
      tags: {
        aaaaaaaaaaa: { educational: true, places: ['knowledge.science.chemistry.gone-place'], learn: 'How catalysts lower the energy a reaction needs.' },
        bbbbbbbbbbb: { educational: false, reason: 'channel announcement' },
        ccccccccccc: { educational: true, places: ['knowledge.earth.oceans'], learn: 'x' },
        eeeeeeeeeee: { educational: true, places: ['knowledge.arts.music'], learn: 'Wrong place.' },
      },
      overrides: { eeeeeeeeeee: { places: ['knowledge.arts.theatre'], learn: 'How a stage is lit for a scene.' } },
    });
    expect(report.pool.videos.map(v => [v.id, v.places, v.learn])).toEqual([
      ['aaaaaaaaaaa', ['knowledge.science.chemistry'], 'How catalysts lower the energy a reaction needs.'],
      ['eeeeeeeeeee', ['knowledge.arts.theatre'], 'How a stage is lit for a scene.'],
    ]);
    expect(report.moved).toEqual([{ id: 'aaaaaaaaaaa', from: 'knowledge.science.chemistry.gone-place', to: 'knowledge.science.chemistry' }]);
    expect(report).toMatchObject({ rejected: 1, untagged: 1, unplayable: 1 });
    expect(report.pool.channels).toEqual({ UCaaaaaaaaaaaaaaaaaaaaaa: { name: 'A channel' } });
  });

  it('lets an override hide a video the tagger kept', () => {
    const report = buildPool({ ...base, videos: [stored('aaaaaaaaaaa')], tags: { aaaaaaaaaaa: { educational: true, places: ['knowledge.earth'], learn: 'Something.' } }, overrides: { aaaaaaaaaaa: { educational: false, note: 'sponsor read' } } });
    expect(report.pool.videos).toEqual([]);
  });
});

describe('displayTitle', () => {
  it('drops hashtags, emoji and a trailing channel name, and keeps the words', () => {
    expect(displayTitle('Protecting the pollinators 🐝 #BBCEarth #FixingThePlanet #Nature', 'BBC Earth')).toBe('Protecting the pollinators');
    expect(displayTitle('How Image Watermarking Works - Computerphile', 'Computerphile')).toBe('How Image Watermarking Works');
    expect(displayTitle('Matisse: The Red Studio: Great Art Explained ', 'Great Art Explained')).toBe('Matisse: The Red Studio');
    expect(displayTitle('These Bioluminescent Worms Turn Dark Caves Into a Planetarium | #DeepLook #Shorts', 'Deep Look')).toBe('These Bioluminescent Worms Turn Dark Caves Into a Planetarium');
    expect(displayTitle('A miraculous moment suspended in time ✨| #SHORTS | National Gallery', 'The National Gallery')).toBe('A miraculous moment suspended in time');
    expect(displayTitle('Spider-Man and the X-59', 'Anyone')).toBe('Spider-Man and the X-59');
    expect(displayTitle('#shorts', 'Anyone')).toBe('#shorts');
  });
});

describe('isTooLong', () => {
  const v = (title: string, durationSec: number | null = null, short = false) => ({ title, durationSec, short });
  it('keeps feed-length videos and drops full-length ones', () => {
    expect(isTooLong(v('Tiger Island: Part One | PBS Nature | Full Documentary'))).toBe(true);
    expect(isTooLong(v('Two Hours of Nature’s Majestic Creatures Narrated by Sir David Attenborough'))).toBe(true);
    expect(isTooLong(v('Cinema Psychology | Compilation'))).toBe(true);
    expect(isTooLong(v('The Plane Crash That Gave Us Cataract Surgery'))).toBe(false);
    expect(isTooLong(v('Why 24 hours in a day', null))).toBe(false);
    expect(isTooLong(v('Anything', 41 * 60))).toBe(true);
    expect(isTooLong(v('Full Documentary but known short', 600))).toBe(false);
    expect(isTooLong(v('Compilation', null, true))).toBe(false);
  });
});
