import { describe, expect, it } from 'vitest';
import { mergeLinkVideos, NO_LINK_VIDEOS, parseLinkVideos, type FeedPool, type FeedVideo } from './pool';

const PLACE = 'knowledge.science.astronomy.cosmology.expanding-universe';
const curated: FeedVideo = { id: 'aaaaaaaaaaa', channel: 'UCspace', title: 'Curated', learn: 'Picked by hand.', places: ['knowledge.science.astronomy'], short: false, aspect: 1.77, duration: null, published: '2026-01-02' };
const pool: FeedPool = { version: 1, builtAt: '2026-10-24T00:00:00.000Z', channels: { UCspace: { name: 'PBS Space Time' } }, videos: [curated] };
const file = (videos: unknown[], channels: Record<string, unknown> = { 'by:NASA Goddard': { name: 'NASA Goddard' }, 'by:PBS Space Time': { name: 'PBS Space Time' } }) => ({ schema: 'mok.videos/1', channels, videos });
const link = (id: string, extra: Record<string, unknown> = {}) => ({ id, channel: 'by:NASA Goddard', title: 'Hubble Constant: An Expanding Universe', learn: 'How the expansion rate is measured.', places: [`${PLACE}.hubble-s-law`, PLACE], short: false, aspect: 1.77, duration: null, published: null, ...extra });

describe('link videos (public/auto/videos.json)', () => {
  it('reads the file as the script writes it', () => {
    const parsed = parseLinkVideos(file([link('G03N5_13Os0', { duration: 240 })]));
    expect(parsed.channels['by:NASA Goddard']).toEqual({ name: 'NASA Goddard' });
    expect(parsed.videos).toEqual([link('G03N5_13Os0', { duration: 240 })]);
  });

  it('reads anything else as no videos, and drops malformed entries', () => {
    for (const value of [null, 'nope', [], { schema: 'mok.shelf/1', videos: [link('G03N5_13Os0')] }]) expect(parseLinkVideos(value)).toBe(NO_LINK_VIDEOS);
    const parsed = parseLinkVideos(file([
      link('short-id'), link('G03N5_13Os0', { places: [] }), link('G03N5_13Os0', { title: ' ' }), link('G03N5_13Os0', { channel: 'by:Nobody' }),
      link('zukBXehGHas', { aspect: 'wide', duration: -3, places: [PLACE, 7, `${PLACE}.a`, `${PLACE}.b`, `${PLACE}.c`] }),
    ]));
    expect(parsed.videos.map(video => video.id)).toEqual(['zukBXehGHas']);
    expect(parsed.videos[0]).toMatchObject({ aspect: 16 / 9, duration: null, short: false, places: [PLACE, `${PLACE}.a`, `${PLACE}.b`] });
  });

  it('adds the videos the pool lacks, after its own, as ordinary wide videos', () => {
    const merged = mergeLinkVideos(pool, parseLinkVideos(file([link('G03N5_13Os0')])));
    expect(merged.videos.map(video => video.id)).toEqual(['aaaaaaaaaaa', 'G03N5_13Os0']);
    expect(merged.videos[1]).toMatchObject({ channel: 'by:NASA Goddard', short: false, aspect: 1.77, places: [`${PLACE}.hubble-s-law`, PLACE] });
    expect(merged.channels['by:NASA Goddard']).toEqual({ name: 'NASA Goddard' });
    expect(merged.version).toBe(1);
    expect(pool.videos).toHaveLength(1);
  });

  it('keeps the curated entry for a video in both, and the pool itself when nothing is new', () => {
    const extra = parseLinkVideos(file([link('aaaaaaaaaaa', { title: 'From a link' })]));
    expect(mergeLinkVideos(pool, extra)).toBe(pool);
    expect(mergeLinkVideos(pool, NO_LINK_VIDEOS)).toBe(pool);
    const twice = parseLinkVideos(file([link('G03N5_13Os0'), link('G03N5_13Os0', { title: 'Again' })]));
    expect(mergeLinkVideos(pool, twice).videos.filter(video => video.id === 'G03N5_13Os0').map(video => video.title)).toEqual(['Hubble Constant: An Expanding Universe']);
  });

  it('files a video under the pool’s channel of the same name', () => {
    const merged = mergeLinkVideos(pool, parseLinkVideos(file([link('3tCMd1ytvWg', { channel: 'by:PBS Space Time', title: 'Cosmic Microwave Background Explained | PBS Space Time' })])));
    expect(merged.videos[1]).toMatchObject({ channel: 'UCspace', title: 'Cosmic Microwave Background Explained' });
    expect(Object.keys(merged.channels)).toEqual(['UCspace']);
  });

  it('leaves a video too long for a feed as a link', () => {
    const extra = parseLinkVideos(file([link('Fn-3G_N0hy4', { duration: 3720 }), link('PM9CQDlQI0A', { duration: 300 }), link('V0Z7i8Mm7Ow', { title: 'The full lecture: dark matter' })]));
    expect(mergeLinkVideos(pool, extra).videos.map(video => video.id)).toEqual(['aaaaaaaaaaa', 'PM9CQDlQI0A']);
  });
});
