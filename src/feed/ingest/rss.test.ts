import { describe, expect, it } from 'vitest';
import veritasium from './fixtures/channel-veritasium.xml?raw';
import edgeCases from './fixtures/edge-cases.xml?raw';
import shorts from './fixtures/playlist-3blue1brown-shorts.xml?raw';
import { channelFeedUrls, decodeEntities, fullChannelId, parseYouTubeFeed } from './rss';

// Real feeds saved from youtube.com (trimmed), plus a hand-made one for the awkward cases.
// No network in tests.
const FIXTURES: Record<string, string> = { 'channel-veritasium.xml': veritasium, 'playlist-3blue1brown-shorts.xml': shorts, 'edge-cases.xml': edgeCases };
const fixture = (name: string) => FIXTURES[name];

describe('parseYouTubeFeed', () => {
  it('reads a channel feed: Shorts and long-form told apart by their link', () => {
    const feed = parseYouTubeFeed(fixture('channel-veritasium.xml'));
    expect(feed.channelId).toBe('UCHnyfMqiRRG1u-2MsSQLbXA');
    expect(feed.title).toBe('Veritasium');
    expect(feed.author).toBe('Veritasium');
    expect(feed.playlistId).toBeNull();
    expect(feed.entries).toHaveLength(4);
    const [first, , fiber] = feed.entries;
    expect(first).toMatchObject({ videoId: 'wxLc-gFORPQ', channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA', title: 'Is there something faster than light?', short: true });
    expect(first.description.startsWith('The experiment that broke relativity.')).toBe(true);
    expect(first.published).toBe('2026-10-22T13:00:17.000Z');
    expect(first.views).toBeGreaterThan(0);
    expect(fiber).toMatchObject({ videoId: 'NiCgcUTL9_Q', title: 'The Insane Engineering of Fiber Optics', short: false });
  });

  it('reads an upload-playlist feed (the channel’s Shorts) with its author', () => {
    const feed = parseYouTubeFeed(fixture('playlist-3blue1brown-shorts.xml'));
    expect(feed.playlistId).toBe('UUSHYO_jab_esuFRV4b17AJtAw');
    expect(feed.channelId).toBe('UCYO_jab_esuFRV4b17AJtAw');
    expect(feed.title).toBe('Short videos');
    expect(feed.author).toBe('3Blue1Brown');
    expect(feed.entries.length).toBe(3);
    expect(feed.entries.every(entry => entry.short)).toBe(true);
  });

  it('decodes entities, skips entries without a video ID and survives missing fields', () => {
    const feed = parseYouTubeFeed(fixture('edge-cases.xml'));
    expect(feed.channelId).toBe('UCabcdefghijklmnopqrstuv');
    expect(feed.title).toBe('Fish & Chips – "Science" <Lab>');
    expect(feed.entries.map(entry => entry.videoId)).toEqual(['AAAAAAAAAAA', 'BBBBBBBBBBB', 'CCCCCCCCCCC']);
    const [ice, bare, empty] = feed.entries;
    expect(ice.title).toBe('Why does ice float? It\'s weird & wonderful 🧊');
    expect(ice.description).toBe('Line one & two.\n\nLine three <b>bold</b>');
    expect(ice.short).toBe(false);
    expect(ice.views).toBeNull();
    expect(bare).toMatchObject({ title: '', channelId: null, published: null, short: true, views: null, description: '' });
    expect(empty).toMatchObject({ description: '', views: 0, updated: '2026-01-01T00:00:00.000Z' });
  });

  it('returns no entries for something that is not a feed', () => {
    expect(parseYouTubeFeed('<html><body>Consent</body></html>').entries).toEqual([]);
    expect(parseYouTubeFeed('').entries).toEqual([]);
  });
});

describe('helpers', () => {
  it('decodes numeric and named references, and leaves unknown ones alone', () => {
    expect(decodeEntities('&#65;&#x42;&amp;&unknown;&#0;')).toBe('AB&&unknown;&#0;');
  });
  it('normalises channel IDs', () => {
    expect(fullChannelId('HnyfMqiRRG1u-2MsSQLbXA')).toBe('UCHnyfMqiRRG1u-2MsSQLbXA');
    expect(fullChannelId('UCHnyfMqiRRG1u-2MsSQLbXA')).toBe('UCHnyfMqiRRG1u-2MsSQLbXA');
    expect(fullChannelId('short')).toBeNull();
  });
  it('names the three free feeds of a channel', () => {
    const urls = channelFeedUrls('UCHnyfMqiRRG1u-2MsSQLbXA');
    expect(urls.uploads).toBe('https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA');
    expect(urls.shorts).toBe('https://www.youtube.com/feeds/videos.xml?playlist_id=UUSHHnyfMqiRRG1u-2MsSQLbXA');
    expect(urls.videos).toBe('https://www.youtube.com/feeds/videos.xml?playlist_id=UULFHnyfMqiRRG1u-2MsSQLbXA');
  });
});
