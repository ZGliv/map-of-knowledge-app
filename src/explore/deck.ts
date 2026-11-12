import { isWithinTerritory } from '../core/explorationContext';
import narrationManifest from './narration.json';
import { frameHash, splitLines } from './narrationText';
import { E05_REELS } from './reels/evolution-e05';
import { E01_REELS } from './reels/evolution-e01';
import { E02_REELS } from './reels/evolution-e02';
import { E03_REELS } from './reels/evolution-e03';
import { E04_REELS } from './reels/evolution-e04';
import { E06_REELS } from './reels/evolution-e06';
import { E07_REELS } from './reels/evolution-e07';
import { E10_REELS } from './reels/evolution-e10';
import { PHYSICS_MUSIC_REELS } from './reels/physics-music';
import { E08_REELS } from './reels/evolution-e08';
import { E09_REELS } from './reels/evolution-e09';
import { E11_REELS } from './reels/evolution-e11';
import { E12_REELS } from './reels/evolution-e12';
import { PLAGUE_REELS } from './reels/history';
import { isEngineReel, type Reel, type ReelNarration } from './types';
import { GENERATED_PLACES } from '../places/generated';

export type { NarrationFrame, ReelNarration } from './types';
export interface NarrationManifest { voice: string; reels: Record<string, ReelNarration> }
export const NARRATION = narrationManifest as unknown as NarrationManifest;

const ALL = [...E05_REELS, ...E01_REELS, ...E02_REELS, ...E03_REELS, ...E04_REELS, ...E06_REELS, ...E07_REELS, ...E10_REELS, ...PHYSICS_MUSIC_REELS, ...E08_REELS, ...E09_REELS, ...E11_REELS, ...E12_REELS, ...PLAGUE_REELS, ...GENERATED_PLACES.flatMap(place => place.reels)];
const by = (id: string) => {
  const reel = ALL.find(item => item.id === id);
  if (!reel) throw new Error(`Unknown reel ${id}`);
  return reel;
};

/** The whole deck, in the order the feed plays it: subjects interleaved, a strong opener first.
 * Finite on purpose: when it ends, the feed says so. */
export const REELS: readonly Reel[] = [
  'physics-hammer-and-feather',
  'e10-four-feet-of-poison',
  'e06-six-seconds-to-midnight',
  'e03-ninety-eight-in-a-hundred',
  'e05-around-the-valley',
  'e01-the-whales-cousin',
  'e07-found-on-purpose',
  'music-legend-of-the-hammers',
  'e04-the-jackpot-flasks',
  'e10-every-fan-is-a-family',
  'e02-hidden-not-lost',
  'e07-the-wrong-continent',
  'e01-the-fish-with-lungs',
  'e05-the-one-that-crossed',
  'e06-the-abyss-of-time',
  'physics-who-checked',
  'e03-the-way-back',
  'e10-nobody-taught-them',
  'e04-twenty-to-forty-seals',
  'e02-the-paint-pot',
  'e01-two-words',
  'e07-most-life-leaves-no-trace',
  'e05-where-to-draw-the-line',
  'e08-a-centimetre-of-clay',
  'e09-why-still-chimpanzees',
  'e08-the-great-dying',
  'e09-lucy-stood-up-first',
  'e08-the-buried-crater',
  'e09-out-of-africa',
  'plague-ships-beat-roads',
  'e11-glued-on-tails',
  'e12-what-would-break-it',
  'plague-the-doctor-came-late',
  'e11-what-colour-costs',
  'e12-groups-inside-groups',
  'dominance-blue-wont-breed-true',
  'dominance-rare-but-dominant',
  'dna-half-old-half-new',
  'dna-four-letters',
  'gene-regulation-dolly',
  'gene-regulation-four-genes',
  'meiosis-doubling-problem',
  'meiosis-new-hand',
  'sex-linked-daltons-eye',
  'sex-linked-white-eyed-fly',
  'gene-to-protein-first-word',
  'gene-to-protein-read-in-threes',
  'genomes-falcon-kin',
  'genomes-onion',
].map(by);

export const getReel = (id: string) => REELS.find(reel => reel.id === id);
export const reelIndex = (id: string) => REELS.findIndex(reel => reel.id === id);

/** Reels tagged to this place or anywhere inside it, in deck order. */
export const reelsWithin = (nodeId: string) => REELS.filter(reel => isWithinTerritory(reel.nodeId, nodeId));

export interface ReelTimeline {
  /** Milliseconds. */
  duration: number;
  frames: { start: number; end: number; lines: { start: number; end: number }[] }[];
  /** The narration file, when one matches the captions. */
  audio: string | null;
}

/** When each frame and spoken line begins and ends: the narration's real timing, or (without
 * matching audio) the same pace estimated from caption length. */
export function timelineFor(reel: Reel, manifest: NarrationManifest = NARRATION): ReelTimeline {
  // A dated deck's reel carries its own narration; the evergreen deck's live in narration.json.
  const saved = isEngineReel(reel) ? reel.narration : manifest.reels[reel.id];
  if (saved && saved.frames.length === reel.frames.length && saved.frames.every((frame, i) => frame.hash === frameHash(reel.frames[i]))) {
    return {
      duration: saved.duration * 1000,
      audio: saved.src,
      frames: saved.frames.map(frame => ({ start: frame.start * 1000, end: frame.end * 1000, lines: frame.lines.map(([start, end]) => ({ start: start * 1000, end: end * 1000 })) })),
    };
  }
  let cursor = 250;
  const frames = reel.frames.map((frame, index) => {
    const start = index ? cursor - 120 : 0;
    const lines = splitLines(frame.text).map(line => {
      const span = { start: cursor, end: cursor + Math.max(1200, line.length * 66) };
      cursor = span.end + 300;
      return span;
    });
    cursor += 400;
    return { start, end: 0, lines };
  });
  frames.forEach((frame, index) => { frame.end = index < frames.length - 1 ? frames[index + 1].start : cursor + 800; });
  return { duration: cursor + 800, frames, audio: null };
}
