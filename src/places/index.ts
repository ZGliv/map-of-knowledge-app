// Every atlas place as one bundle (places/contract.ts), hand-written or generated, so each is
// validated the same way. Hand-written places are assembled from where their parts live; the
// generator's places are single files under places/generated/.

import { BANKS } from '../checks/banks';
import { LEGACY_CASES } from '../cases/content';
import { EXPEDITIONS } from '../expeditions/registry';
import { REELS } from '../explore/deck';
import { TRANSFER_ONLY_SOURCES } from '../explore/validate';
import { PLACE_SCHEMA, type PlaceBundle, type PlaceRule } from './contract';
import { GENERATED_PLACES } from './generated';

const generatedIds = new Set(GENERATED_PLACES.map(place => place.pack.id));

/** The 15 hand-written places, assembled from the registry, the deck and the banks. They carry
 * no source URLs or licence snapshots: those are the waivers below. */
const LEGACY: readonly PlaceBundle[] = EXPEDITIONS.filter(e => !generatedIds.has(e.pack.id)).map(({ pack, nodeId }) => ({
  schema: PLACE_SCHEMA,
  id: pack.id,
  nodeId,
  pack,
  reels: REELS.filter(reel => reel.packId === pack.id),
  bank: BANKS.find(bank => bank.pack === pack.id)!,
  cases: LEGACY_CASES[pack.id] ?? [],
  transferOnlySources: TRANSFER_ONLY_SOURCES[pack.id] ?? [],
  sources: [],
  mediaChecks: [],
}));

export const PLACES: readonly PlaceBundle[] = [...LEGACY, ...GENERATED_PLACES];
export const getPlace = (id: string) => PLACES.find(place => place.id === id);

/** Why a hand-written place may miss a rule, and by exactly how many problems. A test holds the
 * count exact, so a fix must lower it (the list only shrinks) and a new problem of the same kind
 * still fails. Generated places get no waivers. */
export interface Waiver { count: number; reason: string }

const FEEDBACK = 'Written before every wrong option needed feedback (sources, sim questions); add it on the next content pass.';
const KEYS = 'Key-placement debt from before the 1-in-4 longest-key rule applied to every moment.';
export const LEGACY_WAIVERS: Readonly<Record<string, Partial<Record<PlaceRule, Waiver>>>> = {
  'evolution-e01': { 'cases.transfer': { count: 2, reason: 'Cross-atlas transfer, added 2026-10-26: the two-pandas case sets the striped skunk beside the meerkat, as evolution-e07’s hyena case does, and the tuatara item names lizards beside snakes, which the e07 turtle case lists. Reword one side of each.' } },
  'evolution-e04': { 'pack.keys': { count: 1, reason: KEYS } },
  'evolution-e05': { 'pack.feedback': { count: 2, reason: FEEDBACK }, 'pack.keys': { count: 2, reason: KEYS }, 'bank.supply': { count: 1, reason: '11 items; the how-to asks for 12.' } },
  'evolution-e06': { 'pack.keys': { count: 1, reason: KEYS }, 'reels.noPreteach': { count: 1, reason: 'A real catch: the six-seconds reel words the day-clock transfer item the same way. Reword one of them.' } },
  'evolution-e07': { 'pack.feedback': { count: 3, reason: FEEDBACK }, 'pack.keys': { count: 2, reason: KEYS }, 'pack.formats': { count: 1, reason: 'Has no sim; its hands-on beats are a spot timeline and a match.' }, 'pack.orderLabels': { count: 1, reason: 'The marsupial order prints “1982”; check whether the year gives the order away.' }, 'cases.transfer': { count: 5, reason: 'Cross-atlas transfer, added 2026-10-26: the turtle case lists the generic lizard, snakes and crocodiles, which items in e01, e08 and e12 and e08’s beat 8 name together; the hyena case shares the striped skunk and the meerkat with e01’s two-pandas case. Give the turtle case species names, not groups.' } },
  'evolution-e08': { 'pack.feedback': { count: 4, reason: FEEDBACK }, 'pack.keys': { count: 1, reason: KEYS }, 'cases.transfer': { count: 3, reason: 'Cross-atlas transfer, added 2026-10-26: the plankton case and evolution-e12’s stings case both name sea urchins and starfish (a chart and a grouping, so likely harmless); beat 8 and the who-survived item name lizards and snakes, which the e07 turtle case lists.' } },
  'evolution-e09': { 'pack.feedback': { count: 10, reason: FEEDBACK }, 'pack.keys': { count: 1, reason: KEYS } },
  'evolution-e10': { 'pack.feedback': { count: 4, reason: FEEDBACK }, 'pack.keys': { count: 2, reason: KEYS }, 'pack.formats': { count: 1, reason: 'Has no sim; the MEGA-plate film and a doubling number carry it.' } },
  'evolution-e11': { 'pack.feedback': { count: 5, reason: FEEDBACK }, 'pack.keys': { count: 2, reason: KEYS } },
  'evolution-e12': { 'pack.feedback': { count: 6, reason: FEEDBACK }, 'pack.keys': { count: 1, reason: KEYS }, 'cases.transfer': { count: 2, reason: 'Cross-atlas transfer, added 2026-10-26: the stings case shares sea urchins and starfish with evolution-e08’s plankton case; the nesting item names lizards and snakes, which the e07 turtle case lists.' } },
  physics: { 'pack.feedback': { count: 13, reason: FEEDBACK }, 'pack.keys': { count: 2, reason: KEYS }, 'pack.formats': { count: 2, reason: 'Lab pack: footage, documentary and dialogue are three story beats.' }, 'pack.media': { count: 6, reason: 'Lab pack: media carry no licence field yet.' }, 'pack.provenance': { count: 1, reason: 'Lab pack: 4 provenance entries.' } },
  music: { 'pack.budget': { count: 1, reason: 'Lab pack: 4 graded moments.' }, 'pack.feedback': { count: 3, reason: FEEDBACK }, 'pack.formats': { count: 1, reason: 'Lab pack: two sims in a row.' }, 'pack.media': { count: 4, reason: 'Lab pack: media carry no licence field yet.' }, 'pack.provenance': { count: 1, reason: 'Lab pack: 4 provenance entries.' }, 'reels.count': { count: 1, reason: 'One music reel; physics and music share a three-reel file.' } },
  history: { 'pack.feedback': { count: 7, reason: FEEDBACK }, 'pack.keys': { count: 1, reason: KEYS }, 'pack.formats': { count: 2, reason: 'Lab pack: two map sims and two diagnose beats back to back.' }, 'pack.provenance': { count: 1, reason: 'Lab pack: 6 provenance entries.' }, 'pack.transfer': { count: 2, reason: 'Lab pack: built before transfer checks; its check bank carries transfer instead.' } },
};

/** Waived for every hand-written place, whatever the count: they predate the generator's records. */
export const LEGACY_COMMON_WAIVERS: Partial<Record<PlaceRule, string>> = {
  'sources.complete': 'Hand-written provenance cites sources by name, without URLs or retrieval dates.',
  'sources.quotes': 'Quotes were checked by hand against Gutenberg; the editions were not cached, so code can’t re-check them.',
  'sources.cleanRoom': 'Written before Wikipedia extracts were cached, so there is nothing to compare against.',
  'media.checked': 'Licences were checked by hand on 2026-10-16; no machine snapshot was stored.',
};

export const isGenerated = (id: string) => generatedIds.has(id);
