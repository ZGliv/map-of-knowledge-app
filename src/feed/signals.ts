// The learner's map, as the feed reads it: the place in view, places with recent progress or
// visits, saved things, lit places, and the learning actions (expeditions, cases, checks) that tell
// the interest model where the learner's attention went. Built from records the app already keeps;
// nothing new is stored.

import type { CheckLedger } from '../checks/ledger';
import type { NotebookEntry } from '../core/notebook';
import { getExpeditionEarnedIds, type ExpeditionLedger } from '../expeditions/ledger';
import { packPlace } from '../expeditions/manifest';
import type { LearningEvent } from './memory';
import type { FeedSignals } from './recommend';

export interface MapRecords {
  /** The atlas place in view. */
  location: string;
  ledger: ExpeditionLedger;
  checks: CheckLedger;
  entries: readonly NotebookEntry[];
  /** Places of saved links and videos (a saved video may sit under several). */
  savedPlaces: readonly string[];
  /** Places of pinned reels. */
  pinnedReelPlaces: readonly string[];
}

export function feedSignals(records: MapRecords): FeedSignals {
  const dated: { place: string; at: string }[] = [];
  for (const run of records.ledger.runs) { const place = packPlace(run.packId); if (place) dated.push({ place: place.nodeId, at: run.at }); }
  for (const event of records.checks.events) if (event.node) dated.push({ place: event.node, at: event.at });
  for (const entry of records.entries) for (const place of entry.nodeIds) dated.push({ place, at: entry.updatedAt });
  // Packs answered but never finished are underway: they count as recent too.
  for (const packId of Object.keys(records.ledger.seen)) { const place = packPlace(packId); if (place && !records.ledger.runs.some(run => run.packId === packId)) dated.push({ place: place.nodeId, at: '' }); }
  dated.sort((a, b) => b.at.localeCompare(a.at));
  const recent = [...new Set(dated.map(item => item.place))].slice(0, 12);
  const pinned = [...new Set([...records.pinnedReelPlaces, ...records.savedPlaces])];
  const lit = [...new Set([...getExpeditionEarnedIds(records.ledger), ...records.checks.events.flatMap(event => event.t === 'case' && event.success ? [event.node] : [])])];
  return { focus: records.location && records.location !== 'knowledge' ? records.location : null, recent, pinned, lit };
}

/** Every learning action with a time: an expedition run (proved when Understood), a case played
 * (proved when it held), and each check session (started). */
export function learningEvents(ledger: ExpeditionLedger, checks: CheckLedger): LearningEvent[] {
  const out: LearningEvent[] = [];
  for (const run of ledger.runs) { const place = packPlace(run.packId); if (place) out.push({ place: place.nodeId, at: run.at, kind: run.level === 'Understood' ? 'proved' : 'started' }); }
  const sessions = new Set<string>();
  for (const event of checks.events) {
    if (event.t === 'case') out.push({ place: event.node, at: event.at, kind: event.success ? 'proved' : 'started' });
    else if (event.t === 'attempt' && !sessions.has(event.session)) { sessions.add(event.session); out.push({ place: event.node, at: event.at, kind: 'started' }); }
  }
  return out;
}
