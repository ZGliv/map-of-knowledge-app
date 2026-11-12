import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { YTPlayer } from '../feed/youtube';

// Explore's one sound preference, the shared narration element and the unlock (sound.ts).

class FakeAudio {
  paused = true; muted = false; volume = 1; src = ''; currentSrc = ''; preload = ''; loop = false;
  dataset: Record<string, string> = {};
  calls: string[] = [];
  refuse = false;
  getAttribute(name: string) { return name === 'src' && this.src ? this.src : null; }
  play() {
    this.calls.push(this.muted ? 'play muted' : 'play');
    if (this.refuse && !this.muted) return Promise.reject(Object.assign(new Error('no tap yet'), { name: 'NotAllowedError' }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.calls.push('pause'); this.paused = true; }
}
const fakePlayer = () => {
  const calls: string[] = [];
  let muted = true;
  const player = {
    calls,
    playVideo: () => calls.push('playVideo'), pauseVideo: () => calls.push('pauseVideo'),
    mute: () => { muted = true; calls.push('mute'); }, unMute: () => { muted = false; calls.push('unMute'); },
    isMuted: () => muted, setVolume: (v: number) => calls.push(`setVolume ${v}`), getVolume: () => 100,
    getCurrentTime: () => 0, getDuration: () => 60, getPlayerState: () => 1,
    seekTo: () => {}, loadVideoById: () => {}, cueVideoById: () => {}, destroy: () => {},
  };
  return player as typeof player & YTPlayer;
};
const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (key: string) => data[key] ?? null, setItem: (key: string, value: string) => { data[key] = value; } };
};
/** A fresh module, as on a fresh page load, with this device's storage. */
async function load(saved: Record<string, string> = {}) {
  vi.resetModules();
  const local = store(saved);
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('Audio', FakeAudio);
  return { sound: await import('./sound'), local };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => { vi.unstubAllGlobals(); });

describe('the preference', () => {
  it('is on by default, and anything but an explicit off reads as on', async () => {
    const { sound } = await load();
    expect(sound.getSound()).toEqual({ on: true, blocked: false });
    expect(sound.parseSoundPref(null)).toBe(true);
    expect(sound.parseSoundPref('nonsense')).toBe(true);
    expect(sound.parseSoundPref('{"version":1,"on":true}')).toBe(true);
    expect(sound.parseSoundPref('{"version":1,"on":false}')).toBe(false);
  });

  it('is remembered: turned off, it stays off on the next visit; turned on, on', async () => {
    const first = await load();
    first.sound.setSound(false);
    expect(first.local.data[first.sound.SOUND_KEY]).toBe('{"version":1,"on":false}');
    const second = await load(first.local.data);
    expect(second.sound.getSound().on).toBe(false);
    second.sound.setSound(true);
    expect((await load(second.local.data)).sound.getSound().on).toBe(true);
  });

  it('a refusal asks for a tap only while sound is wanted, and a sound button clears it', async () => {
    const { sound } = await load();
    sound.refuseSound();
    expect(sound.getSound()).toEqual({ on: true, blocked: true });
    expect(sound.audible(sound.getSound())).toBe(false);
    sound.setSound(true);
    expect(sound.getSound()).toEqual({ on: true, blocked: false });
    sound.setSound(false);
    sound.refuseSound();
    expect(sound.getSound()).toEqual({ on: false, blocked: false });
  });

  it('follows YouTube’s own unmute button: sound chosen there turns the preference on', async () => {
    const { sound, local } = await load({ 'mok-sound-v1': '{"version":1,"on":false}' });
    sound.soundChosenInPlayer();
    expect(sound.getSound()).toEqual({ on: true, blocked: false });
    expect(local.data['mok-sound-v1']).toBe('{"version":1,"on":true}');
  });
});

describe('the narration element', () => {
  it('is one element, shared by every reel', async () => {
    const { sound } = await load();
    expect(sound.narration()).toBe(sound.narration());
    expect(sound.score('/a.mp3')).toBe(sound.score('/a.mp3'));
  });

  it('a play the browser refuses without a tap turns into "Tap for sound", never a silent "on"', async () => {
    const { sound } = await load();
    const element = sound.narration() as unknown as FakeAudio;
    element.refuse = true;
    sound.playWithSound(element as unknown as HTMLAudioElement);
    await flush();
    expect(sound.getSound()).toEqual({ on: true, blocked: true });
  });
});

describe('the unlock', () => {
  it('the first tap anywhere primes the narration element and unmutes the player', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.attachYouTube(player, () => true);
    const handlers: Record<string, (event: Event) => void> = {};
    sound.installSoundUnlock({ addEventListener: (type: string, handler: (event: Event) => void) => { handlers[type] = handler; }, removeEventListener: () => {} } as unknown as Window);
    handlers.pointerup({ type: 'pointerup', pointerType: 'touch', isTrusted: true, target: { closest: () => null } } as unknown as Event);
    const element = sound.narration() as unknown as FakeAudio;
    expect(element.calls).toEqual(['play muted', 'pause']);
    expect(element.muted).toBe(false);
    expect(player.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
    expect(player.isMuted()).toBe(false);
    // Later taps leave everything alone while sound is heard.
    handlers.pointerup({ type: 'pointerup', pointerType: 'touch', isTrusted: true, target: { closest: () => null } } as unknown as Event);
    expect(player.calls).toHaveLength(3);
  });

  it('a tap while sound is refused unmutes again and clears "Tap for sound"', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.attachYouTube(player, () => true);
    sound.unlock();
    sound.refuseSound();
    sound.applySound(player);
    expect(player.isMuted()).toBe(true);
    player.calls.length = 0;
    sound.unlock();
    expect(player.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
    expect(sound.getSound().blocked).toBe(false);
  });

  it('leaves the sound buttons to themselves, and ignores modifier keys and synthetic clicks', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.attachYouTube(player, () => false);
    const handlers: Record<string, (event: Event) => void> = {};
    sound.installSoundUnlock({ addEventListener: (type: string, handler: (event: Event) => void) => { handlers[type] = handler; }, removeEventListener: () => {} } as unknown as Window);
    handlers.click({ type: 'click', isTrusted: true, target: { closest: (selector: string) => selector === '[data-sound-control]' ? {} : null } } as unknown as Event);
    handlers.keydown({ type: 'keydown', isTrusted: true, key: 'Shift', target: { closest: () => null } } as unknown as Event);
    // A script's synthetic click is not a tap.
    handlers.click({ type: 'click', isTrusted: false, target: { closest: () => null } } as unknown as Event);
    expect(player.calls).toEqual([]);
  });

  it('a finger going down is not the tap yet: the same tap’s lift unlocks', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.attachYouTube(player, () => true);
    const handlers: Record<string, (event: Event) => void> = {};
    sound.installSoundUnlock({ addEventListener: (type: string, handler: (event: Event) => void) => { handlers[type] = handler; }, removeEventListener: () => {} } as unknown as Window);
    handlers.pointerdown({ type: 'pointerdown', pointerType: 'touch', isTrusted: true, target: { closest: () => null } } as unknown as Event);
    expect(player.calls).toEqual([]);
    expect((sound.narration() as unknown as FakeAudio).calls).toEqual([]);
    handlers.pointerup({ type: 'pointerup', pointerType: 'touch', isTrusted: true, target: { closest: () => null } } as unknown as Event);
    expect(player.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
    // A mouse button going down already is the tap.
    const next = await load();
    const other = fakePlayer();
    next.sound.attachYouTube(other, () => true);
    const more: Record<string, (event: Event) => void> = {};
    next.sound.installSoundUnlock({ addEventListener: (type: string, handler: (event: Event) => void) => { more[type] = handler; }, removeEventListener: () => {} } as unknown as Window);
    more.pointerdown({ type: 'pointerdown', pointerType: 'mouse', isTrusted: true, target: { closest: () => null } } as unknown as Event);
    expect(other.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
  });

  it('says when the unlock made a playing video heard (Watch’s tap layer then does not also pause it)', async () => {
    // Muted and meant to play: this tap was for sound.
    const muted = await load();
    const player = fakePlayer();
    muted.sound.attachYouTube(player, () => true);
    expect(muted.sound.unlock()).toBe(true);
    expect(player.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
    // Unlocked and heard: later taps are the learner’s own (pause and play).
    expect(muted.sound.unlock()).toBe(false);
    // Refused, then a tap: for sound, even if the player’s own isMuted() has not caught up.
    muted.sound.refuseSound();
    expect(muted.sound.unlock()).toBe(true);
    // Already heard at the first tap (an app that lets media play with sound): a pause, not for sound.
    const heard = await load();
    const loud = fakePlayer();
    loud.unMute();
    heard.sound.attachYouTube(loud, () => true);
    expect(heard.sound.unlock()).toBe(false);
    // Held (the learner paused it): the unlock unmutes but never plays it, and the tap is a play.
    const held = await load();
    const paused = fakePlayer();
    held.sound.attachYouTube(paused, () => false);
    expect(held.sound.unlock()).toBe(false);
    expect(paused.calls).toEqual(['unMute', 'setVolume 100']);
    // Sound off: nothing to make heard.
    const off = await load({ [muted.sound.SOUND_KEY]: JSON.stringify({ version: 1, on: false }) });
    const quiet = fakePlayer();
    off.sound.attachYouTube(quiet, () => true);
    expect(off.sound.unlock()).toBe(false);
    expect(quiet.calls).toEqual([]);
  });

  it('a tap on a video that has not started plays it inside the tap: with sound when on, muted when off', async () => {
    // Sound on, even after the first tap: unmuted and told to play, inside this tap.
    const on = await load();
    const player = fakePlayer();
    on.sound.attachYouTube(player, () => true);
    on.sound.unlock();
    player.calls.length = 0;
    on.sound.playInTap();
    expect(player.calls).toEqual(['unMute', 'setVolume 100', 'playVideo']);
    // Sound off: told to play, still muted (nothing unmutes it).
    const off = await load({ [on.sound.SOUND_KEY]: JSON.stringify({ version: 1, on: false }) });
    const quiet = fakePlayer();
    off.sound.attachYouTube(quiet, () => true);
    off.sound.playInTap();
    expect(quiet.calls).toEqual(['playVideo']);
    // Not meant to play (held, or Watch out of sight): nothing is played.
    const held = await load({ [on.sound.SOUND_KEY]: JSON.stringify({ version: 1, on: false }) });
    const still = fakePlayer();
    held.sound.attachYouTube(still, () => false);
    held.sound.playInTap();
    expect(still.calls).toEqual([]);
    // No player yet: the unlock alone (the narration primed), and nothing throws.
    const early = await load();
    early.sound.playInTap();
    expect((early.sound.narration() as unknown as FakeAudio).calls).toEqual(['play muted', 'pause']);
  });

  it('knows the gesture whose unlock made the video heard by its event, for handlers further along it', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.attachYouTube(player, () => true);
    const handlers: Record<string, (event: Event) => void> = {};
    sound.installSoundUnlock({ addEventListener: (type: string, handler: (event: Event) => void) => { handlers[type] = handler; }, removeEventListener: () => {} } as unknown as Window);
    const space = { type: 'keydown', key: ' ', isTrusted: true, target: { closest: () => null } } as unknown as Event;
    handlers.keydown(space);
    expect(sound.heardBy(space)).toBe(true);
    // The next key finds sound heard: the unlock leaves it alone, and the key is the learner’s.
    const again = { type: 'keydown', key: ' ', isTrusted: true, target: { closest: () => null } } as unknown as Event;
    handlers.keydown(again);
    expect(sound.heardBy(again)).toBe(false);
    // A tap on a sound control (the tap layer) is left to that control.
    sound.refuseSound();
    const onControl = { type: 'click', isTrusted: true, target: { closest: (selector: string) => selector === '[data-sound-control]' ? {} : null } } as unknown as Event;
    handlers.click(onControl);
    expect(sound.heardBy(onControl)).toBe(false);
    expect(sound.getSound().blocked).toBe(true);
  });

  it('only a change from muted counts as an unmute, so a pause soon after a heard video starts is the learner’s', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.applySound(player);
    expect(sound.justUnmuted()).toBe(true);
    // Later loads of a player already heard: nothing for the browser to refuse.
    vi.useFakeTimers({ now: Date.now() + 5000 });
    try {
      sound.applySound(player);
      expect(player.isMuted()).toBe(false);
      expect(sound.justUnmuted()).toBe(false);
      // Muted by the app (its own isMuted() may not have caught up yet): the next unmute counts.
      sound.mutePlayer(player);
      player.unMute();
      sound.applySound(player);
      expect(sound.justUnmuted()).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('applies the preference after every load: unmuted at full volume when on, muted when off or refused', async () => {
    const { sound } = await load();
    const player = fakePlayer();
    sound.applySound(player);
    expect(player.calls).toEqual(['unMute', 'setVolume 100']);
    expect(sound.justUnmuted()).toBe(true);
    sound.attachYouTube(player, () => true);
    sound.setSound(false);
    expect(player.isMuted()).toBe(true);
    player.calls.length = 0;
    sound.applySound(player);
    expect(player.calls).toEqual(['mute']);
  });
});
