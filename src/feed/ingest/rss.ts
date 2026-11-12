// YouTube's public Atom feeds (https://www.youtube.com/feeds/videos.xml?channel_id=… or
// ?playlist_id=…): the latest ~15 uploads of a channel or playlist, no key needed. A small,
// forgiving reader: one bad entry is skipped, never the whole feed. Pure, no DOM, no imports,
// so the ingest script (Node) and the tests (vitest) share it.

export interface FeedEntry {
  videoId: string;
  /** Always the full UC… form. */
  channelId: string | null;
  title: string;
  description: string;
  /** ISO 8601, or null when the feed's date is unreadable. */
  published: string | null;
  updated: string | null;
  /** The feed links Shorts as /shorts/ID and everything else as /watch?v=ID. */
  short: boolean;
  views: number | null;
}

export interface ParsedFeed {
  channelId: string | null;
  /** The channel's name ("Veritasium"); for a playlist feed, the playlist's author. */
  author: string;
  /** The feed's own title: the channel name, or "Short videos" / "Videos" for upload playlists. */
  title: string;
  playlistId: string | null;
  entries: FeedEntry[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** XML text to plain text: named and numeric character references. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

/** The text of the first <tag>…</tag> (namespace prefix included in `tag`), or null. */
function text(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${escaped}>)`));
  if (!match) return null;
  return decodeEntities((match[1] ?? '').trim());
}

function attr(xml: string, tag: string, name: string, where?: (element: string) => boolean): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [element] of xml.matchAll(new RegExp(`<${escaped}\\s[^>]*>`, 'g'))) {
    if (where && !where(element)) continue;
    const value = element.match(new RegExp(`\\s${name}="([^"]*)"`));
    if (value) return decodeEntities(value[1]);
  }
  return null;
}

/** A feed's bare 22-character channel ID gains its UC prefix. */
export const fullChannelId = (id: string | null): string | null => !id ? null : /^UC[\w-]{22}$/.test(id) ? id : /^[\w-]{22}$/.test(id) ? `UC${id}` : null;

const isoOrNull = (value: string | null): string | null => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
export const VIDEO_ID = /^[\w-]{11}$/;

export function parseYouTubeFeed(xml: string): ParsedFeed {
  const start = xml.indexOf('<entry>');
  const head = start < 0 ? xml : xml.slice(0, start);
  const entries: FeedEntry[] = [];
  for (const [, body] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const videoId = text(body, 'yt:videoId');
    if (!videoId || !VIDEO_ID.test(videoId)) continue;
    const link = attr(body, 'link', 'href', element => /rel="alternate"/.test(element)) ?? '';
    const views = attr(body, 'media:statistics', 'views');
    entries.push({
      videoId,
      channelId: fullChannelId(text(body, 'yt:channelId')),
      title: text(body, 'title') ?? text(body, 'media:title') ?? '',
      description: text(body, 'media:description') ?? '',
      published: isoOrNull(text(body, 'published')),
      updated: isoOrNull(text(body, 'updated')),
      short: /\/shorts\//.test(link),
      views: views !== null && /^\d+$/.test(views) ? Number(views) : null,
    });
  }
  const author = head.match(/<author>([\s\S]*?)<\/author>/)?.[1];
  return {
    channelId: fullChannelId(text(head, 'yt:channelId')),
    title: text(head, 'title') ?? '',
    author: (author && text(author, 'name')) ?? text(head, 'title') ?? '',
    playlistId: text(head, 'yt:playlistId'),
    entries,
  };
}

/** The three free feeds for a channel: its latest uploads, its latest Shorts, its latest long-form. */
export function channelFeedUrls(channelId: string): { uploads: string; shorts: string; videos: string } {
  const tail = channelId.slice(2);
  const base = 'https://www.youtube.com/feeds/videos.xml';
  return { uploads: `${base}?channel_id=${channelId}`, shorts: `${base}?playlist_id=UUSH${tail}`, videos: `${base}?playlist_id=UULF${tail}` };
}
