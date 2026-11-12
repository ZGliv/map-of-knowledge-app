import { describe, expect, it, vi } from 'vitest';
import { commandPlayer, EMBED_HOST, embedSrc, loopedToStart, WATCH_OVERLAY } from './youtube';

describe('embedSrc', () => {
  const origin = 'https://map-of-knowledge.vercel.app';
  it('starts by itself unless told not to (a player built after one that failed waits for the API)', () => {
    expect(new URL(embedSrc('abcdefghijk', { muted: false, origin })).searchParams.get('autoplay')).toBe('1');
    expect(new URL(embedSrc('abcdefghijk', { muted: false, origin, autoplay: false })).searchParams.get('autoplay')).toBe('0');
  });
  it('keeps the API switched on and the sound as asked', () => {
    const params = new URL(embedSrc('abcdefghijk', { muted: true, origin, start: 12.7 })).searchParams;
    expect(params.get('enablejsapi')).toBe('1');
    expect(params.get('mute')).toBe('1');
    expect(params.get('start')).toBe('12');
  });
  it('under Watch’s overlay hides YouTube’s own controls, for a rebuilt player (no autoplay) too', () => {
    for (const autoplay of [true, false]) {
      const params = new URL(embedSrc('abcdefghijk', { muted: false, origin, autoplay })).searchParams;
      expect(params.get('controls')).toBe(WATCH_OVERLAY ? '0' : null);
      expect(params.get('autoplay')).toBe(autoplay ? '1' : '0');
    }
  });
});

describe('commandPlayer', () => {
  it('sends the API’s own command message, to YouTube’s embed origin only', () => {
    const postMessage = vi.fn();
    commandPlayer({ contentWindow: { postMessage } } as unknown as HTMLIFrameElement, 'pauseVideo');
    expect(postMessage).toHaveBeenCalledWith(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), EMBED_HOST);
  });
  it('does nothing for a player that is gone', () => {
    expect(() => commandPlayer(null, 'mute')).not.toThrow();
    expect(() => commandPlayer({ contentWindow: null } as unknown as HTMLIFrameElement, 'mute')).not.toThrow();
    expect(() => commandPlayer({ contentWindow: { postMessage: () => { throw new Error('detached'); } } } as unknown as HTMLIFrameElement, 'mute')).not.toThrow();
  });
});

describe('loopedToStart', () => {
  // As YouTube loops a Short in the sessions where it does: last seen in its final seconds, now back at the start.
  const near = { videoId: 'short', time: 76.9, duration: 77.56 };
  it('reads a jump from a video’s last seconds back to its start as its end', () => {
    expect(loopedToStart(near, 'short', 0)).toBe(true);
    expect(loopedToStart(near, 'short', 0.9)).toBe(true);
    expect(loopedToStart({ videoId: 'short', time: 74.7, duration: 77.56 }, 'short', 0.2)).toBe(true);
  });
  it('is not a loop when the video was not near its end, or is not back near its start', () => {
    expect(loopedToStart({ videoId: 'short', time: 40, duration: 77.56 }, 'short', 0.2)).toBe(false);
    expect(loopedToStart(near, 'short', 12)).toBe(false);
    expect(loopedToStart(near, 'short', 77.2)).toBe(false);
  });
  it('compares one video with itself only, and needs a mark with a length', () => {
    expect(loopedToStart(near, 'next', 0)).toBe(false);
    expect(loopedToStart(null, 'short', 0)).toBe(false);
    expect(loopedToStart({ videoId: 'short', time: 0, duration: 0 }, 'short', 0)).toBe(false);
  });
  it('scales to a very short video: its last and first thirds', () => {
    expect(loopedToStart({ videoId: 'tiny', time: 5.2, duration: 6 }, 'tiny', 0.4)).toBe(true);
    expect(loopedToStart({ videoId: 'tiny', time: 3.5, duration: 6 }, 'tiny', 0.4)).toBe(false);
    expect(loopedToStart({ videoId: 'tiny', time: 5.2, duration: 6 }, 'tiny', 2.5)).toBe(false);
  });
});
