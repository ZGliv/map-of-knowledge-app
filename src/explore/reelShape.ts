import { isEngineReel, type EngineReel, type Reel } from './types';

// The shape a dated deck's reel must have to play, light enough for the first chunk: a fetched deck
// (today.ts) and a saved copy on this device (keptReels.ts) are both checked with it.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A calendar day, YYYY-MM-DD. */
export const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Just enough shape to play: anything less is dropped, never shown half-built. */
export function isPlayableReel(value: unknown): value is EngineReel {
  const reel = value as Partial<EngineReel> | null;
  if (!reel || typeof reel.id !== 'string' || typeof reel.title !== 'string' || typeof reel.nodeId !== 'string' || !isDay(reel.from)) return false;
  if (reel.expires !== undefined && !isDay(reel.expires)) return false;
  if (!Array.isArray(reel.frames) || !reel.frames.length || !reel.media || typeof reel.hero !== 'string' || !reel.media[reel.hero]) return false;
  if (!reel.prediction || !Array.isArray(reel.prediction.choices) || !reel.narration || !Array.isArray(reel.narration.frames)) return false;
  return isEngineReel(reel as Reel) && reel.frames.every(frame => typeof frame.text === 'string' && (frame.media === undefined || !!reel.media![frame.media]));
}
