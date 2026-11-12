import { useSyncExternalStore } from 'react';
import type { YTPlayer } from '../feed/youtube';

// Explore's sound, in one place for Watch (the YouTube player) and Reels (the narration):
//   - one preference, on by default and remembered on this device (mok-sound-v1);
//   - one narration element and one score element shared by every reel, so a phone unlocks each once;
//   - one unlock on the first tap anywhere in the app, which primes those elements and unmutes the
//     YouTube player, and again on any tap while the browser is refusing sound.
// When a browser refuses sound without a tap, everything plays muted and the sound buttons say
// "Tap for sound": the preference never reads on while nothing can be heard.

export const SOUND_KEY = 'mok-sound-v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface SoundState {
  /** The learner's choice: on unless they turned it off. */
  readonly on: boolean;
  /** The browser refused sound since the last tap: playing muted, asking for a tap. */
  readonly blocked: boolean;
}

/** Sound reaches the speaker: chosen, and not refused. */
export const audible = (state: SoundState) => state.on && !state.blocked;

/** A saved choice: anything but an explicit "off" is on. */
export function parseSoundPref(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const value = JSON.parse(raw) as { version?: unknown; on?: unknown } | null;
    return !(value && value.version === 1 && value.on === false);
  } catch { return true; }
}
function storage(target?: StorageLike): StorageLike | null {
  if (target) return target;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
export function loadSoundPref(target?: StorageLike): boolean {
  try { return parseSoundPref(storage(target)?.getItem(SOUND_KEY) ?? null); } catch { return true; }
}
export function saveSoundPref(on: boolean, target?: StorageLike): boolean {
  try { storage(target)?.setItem(SOUND_KEY, JSON.stringify({ version: 1, on })); return true; } catch { return false; }
}

// --- The state, for React and for the players ----------------------------------------------------
let state: SoundState = { on: loadSoundPref(), blocked: false };
const listeners = new Set<() => void>();
function emit(next: SoundState) {
  if (next.on === state.on && next.blocked === state.blocked) return;
  state = next;
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getSound = (): SoundState => state;
export const useSound = (): SoundState => useSyncExternalStore(subscribe, getSound, getSound);

/** The sound buttons. Called inside their tap, which is what lets a phone play at once. */
export function setSound(on: boolean): void {
  saveSoundPref(on);
  emit({ on, blocked: false });
  if (on) unlock(true);
  else if (youtube) { try { mutePlayer(youtube.player); } catch { /* gone */ } }
}

/** The browser refused sound: play muted and ask for a tap. Only while sound is wanted. */
export function refuseSound(): void {
  if (state.on && !state.blocked) emit({ ...state, blocked: true });
}
/** Sound reached the speaker after all (the learner unmuted inside YouTube's own player). */
export function soundAllowed(): void {
  if (state.blocked) emit({ ...state, blocked: false });
}
/** The learner unmuted inside YouTube's own player while sound was off: that is their choice now. */
export function soundChosenInPlayer(): void {
  if (state.on) return;
  saveSoundPref(true);
  emit({ on: true, blocked: false });
}

// --- One narration element and one score element ---------------------------------------------------
let narrationElement: HTMLAudioElement | null = null;
let scoreElement: HTMLAudioElement | null = null;
const SCORE_VOLUME = 0.16;
/** The narration element every reel shares. */
export function narration(): HTMLAudioElement | null {
  if (!narrationElement && typeof Audio !== 'undefined') {
    narrationElement = new Audio();
    narrationElement.preload = 'auto';
  }
  return narrationElement;
}
/** The score element every reel with music shares, holding `src`. */
export function score(src: string): HTMLAudioElement | null {
  if (!scoreElement && typeof Audio !== 'undefined') {
    scoreElement = new Audio();
    scoreElement.loop = true;
    scoreElement.volume = SCORE_VOLUME;
  }
  if (scoreElement && scoreElement.dataset.src !== src) { scoreElement.src = src; scoreElement.dataset.src = src; }
  return scoreElement;
}
export const pauseScore = () => scoreElement?.pause();

/** Play a narration or score element with sound; a refusal (no tap yet) becomes "Tap for sound". */
export function playWithSound(element: HTMLMediaElement): void {
  element.muted = false;
  if (element.volume === 0) element.volume = element === scoreElement ? SCORE_VOLUME : 1;
  const playing = element.play();
  void playing?.catch((error: unknown) => { if ((error as { name?: string } | null)?.name === 'NotAllowedError') refuseSound(); });
}

/** A one-sample silent WAV: what an idle element plays to be unlocked inside a tap. */
const SILENT = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';

/** Inside a tap: play the element for an instant, muted, so the browser lets it play later. */
function prime(element: HTMLMediaElement | null) {
  if (!element || !element.paused) return;
  const idle = !element.currentSrc && !element.getAttribute('src');
  if (idle) element.src = SILENT;
  const wasMuted = element.muted;
  element.muted = true;
  const attempt = element.play();
  element.pause();
  element.muted = wasMuted;
  void attempt?.catch(() => { /* an interrupted play: the tap has done its work */ });
}

// --- The one YouTube player ------------------------------------------------------------------------
let youtube: { player: YTPlayer; wantsPlay: () => boolean } | null = null;
let unmutedAt = 0;
/** Muted by this app since its last unmute. The player's own isMuted() lags a command by a message. */
let mutedByUs = false;
export function attachYouTube(player: YTPlayer, wantsPlay: () => boolean): void { youtube = { player, wantsPlay }; mutedByUs = false; }
export function detachYouTube(player: YTPlayer): void { if (youtube?.player === player) youtube = null; }
/** Mute the player (a sound button, a refusal). */
export function mutePlayer(player: YTPlayer): void {
  mutedByUs = true;
  player.mute();
}
/** Unmute the player; true when it was muted. */
function unmute(player: YTPlayer): boolean {
  // Only a change from muted counts as an unmute: a player already heard cannot be refused, so a
  // pause soon after (the learner's own) is never taken for a refusal.
  let wasMuted = mutedByUs;
  try { wasMuted ||= player.isMuted(); } catch { /* not ready: as before */ }
  mutedByUs = false;
  player.unMute();
  player.setVolume(100);
  if (wasMuted) unmutedAt = Date.now();
  return wasMuted;
}
/** After every load or play: the learner's sound, or muted while the browser refuses it. */
export function applySound(player: YTPlayer): void {
  try { if (audible(state)) unmute(player); else mutePlayer(player); } catch { /* the player is going */ }
}
/** Was the player taken from muted to unmuted in the last `ms`? iOS refuses such an unmute outside
 * a tap by pausing the video, so a pause in that moment is the browser refusing it. */
export const justUnmuted = (ms = 1500) => Date.now() - unmutedAt < ms;

// --- The unlock --------------------------------------------------------------------------------------
let unlocked = false;
/** Inside a tap: prime the shared elements and, when sound is wanted, unmute the player. The first
 * tap does all of it; later taps only while the browser is refusing sound (or when `force`d).
 * True when it made a video meant to be playing heard that was not (muted, or refused): that tap
 * was for sound, so Watch's full-screen tap layer does not also pause it. */
export function unlock(force = false): boolean {
  const first = !unlocked;
  if (!first && !force && !state.blocked) return false;
  unlocked = true;
  const refused = state.blocked;
  prime(narration());
  prime(scoreElement);
  let madeHeard = false;
  if (state.on && youtube) {
    const { player, wantsPlay } = youtube;
    try {
      const wasMuted = unmute(player);
      if (wantsPlay()) { player.playVideo(); madeHeard = wasMuted || refused; }
    } catch { /* the player is going */ }
  }
  soundAllowed();
  return madeHeard;
}
/** Inside a tap on Watch's video before it has started (its poster still up): the unlock, and the
 * player told to play inside the tap, muted while sound is off, so a phone that holds every video
 * back for a tap (iOS in Low Power Mode) starts this one. With sound on, the unlock plays it. */
export function playInTap(): void {
  unlock(true);
  if (state.on || !youtube?.wantsPlay()) return;
  try { youtube.player.playVideo(); } catch { /* the player is going */ }
}

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
const NOT_A_GESTURE = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape', 'CapsLock']);
/** Gestures whose unlock made the playing video heard: that tap or key was for sound, and a handler
 * further along the same event (Watch's Space) leaves the video alone. */
const madeHeardBy = new WeakSet<Event>();
export const heardBy = (event: Event): boolean => madeHeardBy.has(event);
/** Listen for the first tap anywhere (and any tap while sound is refused). The sound buttons are
 * left out: they set the preference themselves, and a state change between their press and their
 * click must not turn sound off again. */
export function installSoundUnlock(target: Window = window): () => void {
  const onGesture = (event: Event) => {
    if (unlocked && !state.blocked) return;
    // A real tap or key only: a script's synthetic click carries no leave to play anything.
    if (!event.isTrusted) return;
    if (event.type === 'keydown' && NOT_A_GESTURE.has((event as KeyboardEvent).key)) return;
    if ((event.target as Element | null)?.closest?.('[data-sound-control]')) return;
    // A finger (or pen) going down is not a tap to the browser yet (only its lift is): what it
    // unmuted would be refused, and the unlock would count as done. The same tap's lift does it.
    if (event.type === 'pointerdown' && (event as PointerEvent).pointerType !== 'mouse') return;
    if (unlock()) madeHeardBy.add(event);
  };
  for (const type of GESTURES) target.addEventListener(type, onGesture, { capture: true, passive: true });
  return () => { for (const type of GESTURES) target.removeEventListener(type, onGesture, { capture: true }); };
}

/** What can be heard right now, for checks (render_game_to_text). */
export function soundStatus() {
  const element = narrationElement;
  let player: { muted: boolean; volume: number; state: number } | null = null;
  try { if (youtube) player = { muted: youtube.player.isMuted(), volume: youtube.player.getVolume(), state: youtube.player.getPlayerState() }; } catch { player = null; }
  return {
    on: state.on,
    blocked: state.blocked,
    narration: element ? { reel: element.dataset.reel ?? null, paused: element.paused, muted: element.muted, volume: element.volume, time: element.currentTime } : null,
    youtube: player,
  };
}
