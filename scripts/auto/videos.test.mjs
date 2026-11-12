import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildLinkVideos, buildVideoIndex, formatVideoIndex, writeVideoIndex, youtubeId } from './videos.mjs';

const P = 'knowledge.science.astronomy.cosmology';
const link = (id, url, extra = {}) => ({ id, kind: 'video', title: `Title ${id}`, by: 'NASA Goddard', url, note: `Note ${id}`, ...extra });

describe('youtubeId', () => {
  it('reads watch, youtu.be, shorts and embed addresses', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=G03N5_13Os0')).toBe('G03N5_13Os0');
    expect(youtubeId('https://youtube.com/watch?feature=share&v=G03N5_13Os0&t=10')).toBe('G03N5_13Os0');
    expect(youtubeId('https://m.youtube.com/watch?v=G03N5_13Os0')).toBe('G03N5_13Os0');
    expect(youtubeId('https://youtu.be/LPvfeOiKbm8')).toBe('LPvfeOiKbm8');
    expect(youtubeId('https://www.youtube.com/shorts/LPvfeOiKbm8')).toBe('LPvfeOiKbm8');
    expect(youtubeId('https://www.youtube-nocookie.com/embed/LPvfeOiKbm8')).toBe('LPvfeOiKbm8');
  });

  it('reads nothing else as a video', () => {
    for (const url of ['https://www.youtube.com/playlist?list=PL123', 'https://www.youtube.com/@nasa', 'http://www.youtube.com/watch?v=G03N5_13Os0', 'https://notyoutube.com/watch?v=G03N5_13Os0', 'https://youtu.be/short', 'not a url', ''])
      expect(youtubeId(url)).toBeNull();
  });
});

describe('buildLinkVideos', () => {
  it('turns each YouTube link into a wide feed video pinned to its place', () => {
    const index = buildLinkVideos([{ nodeId: `${P}.expanding-universe`, links: [
      link('hubble', 'https://www.youtube.com/watch?v=G03N5_13Os0', { minutes: 4 }),
      link('book', 'https://example.org/book', { kind: 'book' }),
    ] }]);
    expect(index).toEqual({ schema: 'mok.videos/1', channels: { 'by:NASA Goddard': { name: 'NASA Goddard' } }, videos: [
      { id: 'G03N5_13Os0', channel: 'by:NASA Goddard', title: 'Title hubble', learn: 'Note hubble', places: [`${P}.expanding-universe`], short: false, aspect: 1.77, duration: 240, published: null },
    ] });
  });

  it('makes one video of a link on several places, deepest place first, at most three', () => {
    const url = 'https://youtu.be/G03N5_13Os0';
    const index = buildLinkVideos([
      { nodeId: P, links: [link('top', url, { minutes: 3 })] },
      { nodeId: `${P}.expanding-universe.hubble-s-law`, links: [link('deep', url)] },
      { nodeId: `${P}.expanding-universe`, links: [link('mid', url), link('again', url)] },
      { nodeId: `${P}.big-bang`, links: [link('side', url)] },
    ]);
    expect(index.videos).toHaveLength(1);
    expect(index.videos[0].places).toEqual([`${P}.expanding-universe.hubble-s-law`, `${P}.big-bang`, `${P}.expanding-universe`]);
    expect(index.videos[0]).toMatchObject({ title: 'Title deep', learn: 'Note deep', duration: 180 });
  });

  it('skips links without a title or channel, and places without links', () => {
    const index = buildLinkVideos([{ nodeId: P }, { nodeId: `${P}.a`, links: [link('x', 'https://youtu.be/G03N5_13Os0', { title: ' ' }), link('y', 'https://youtu.be/LPvfeOiKbm8', { by: '' })] }, null]);
    expect(index).toEqual({ schema: 'mok.videos/1', channels: {}, videos: [] });
  });

  it('is the same whatever order the places come in, sorted by id', () => {
    const places = [
      { nodeId: `${P}.b`, links: [link('z', 'https://youtu.be/zukBXehGHas', { by: 'NASA' })] },
      { nodeId: `${P}.a`, links: [link('g', 'https://youtu.be/G03N5_13Os0')] },
    ];
    const one = buildLinkVideos(places), two = buildLinkVideos([...places].reverse());
    expect(formatVideoIndex(one)).toBe(formatVideoIndex(two));
    expect(one.videos.map(video => video.id)).toEqual(['G03N5_13Os0', 'zukBXehGHas']);
    expect(Object.keys(one.channels)).toEqual(['by:NASA', 'by:NASA Goddard']);
  });
});

describe('the file', () => {
  it('is plain JSON with one video per line', () => {
    const index = buildLinkVideos([{ nodeId: P, links: [link('g', 'https://youtu.be/G03N5_13Os0'), link('z', 'https://youtu.be/zukBXehGHas')] }]);
    const text = formatVideoIndex(index);
    expect(JSON.parse(text)).toEqual(index);
    expect(text.split('\n').filter(line => line.startsWith('  {"id":'))).toHaveLength(2);
    expect(JSON.parse(formatVideoIndex(buildLinkVideos([])))).toEqual({ schema: 'mok.videos/1', channels: {}, videos: [] });
  });

  it('reads only published places in the directory, never its own output', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mok-videos-'));
    writeFileSync(join(dir, `${P}.json`), JSON.stringify({ schema: 'mok.auto/1', nodeId: P, links: [link('g', 'https://youtu.be/G03N5_13Os0')] }));
    writeFileSync(join(dir, 'draft.json'), JSON.stringify({ schema: 'other', nodeId: `${P}.x`, links: [link('z', 'https://youtu.be/zukBXehGHas')] }));
    writeFileSync(join(dir, 'broken.json'), '{');
    const written = writeVideoIndex(dir);
    expect(written.videos.map(video => video.id)).toEqual(['G03N5_13Os0']);
    expect(readFileSync(join(dir, 'videos.json'), 'utf8')).toBe(formatVideoIndex(written));
    expect(buildVideoIndex(dir)).toEqual(written);
  });
});
