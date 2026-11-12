export type SpectrumPreviewMode = 'off' | 'sample' | 'all';

// A broad territory alongside smaller fields makes the scale of progress visible.
// These IDs are paint masks only; they never enter the demo completion store.
export const SPECTRUM_SAMPLE_IDS: readonly string[] = [
  'knowledge.science',
  'knowledge.technology.computing',
  'knowledge.arts.music',
  'knowledge.earth.oceans',
  'knowledge.mathematics.geometry',
];

export const includesTerritory = (ancestor: string, nodeId: string): boolean => (
  ancestor === nodeId || nodeId.startsWith(`${ancestor}.`)
);
