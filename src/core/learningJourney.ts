import { DISCOVERIES, getDiscovery } from './discoveries';
import type { Discovery, LearnerState } from './guideTypes';

/** A small connected path through existing authored content, not a new curriculum. */
export const STARTER_TRAIL = ['rhythm-between-beats', 'fractions-past-one', 'motion-as-slope'] as const;

export function discoveryJourney(discovery: Discovery, learner: LearnerState) {
  const events = learner.attempts.filter(event => event.discoveryId === discovery.id);
  const earned = events.some(event => event.phase === 'transfer' && event.passed && !event.assisted);
  const explored = events.some(event => event.phase === 'transfer' && event.passed);
  const freshIndex = discovery.challenges.findIndex((challenge, index) => index > 0 && !events.some(event => event.challengeId === challenge.id));
  let resumeIndex: number | null = null;
  if (!earned && events.length) {
    const last = events.at(-1)!;
    const lastIndex = discovery.challenges.findIndex(challenge => challenge.id === last.challengeId);
    // Resume an unfinished example with its original assistance history intact.
    // A solved probe or supported transfer advances to an unseen example.
    resumeIndex = !last.passed ? lastIndex : freshIndex > 0 ? freshIndex : null;
  }
  return { earned, explored, started: learner.visitedIds.includes(discovery.id) || events.length > 0, resumeIndex };
}

export function continueDiscovery(learner: LearnerState): Discovery | undefined {
  const recentIds = [...new Set(learner.attempts.slice().reverse().map(event => event.discoveryId))];
  return recentIds.map(getDiscovery).find(discovery => discovery && discoveryJourney(discovery, learner).resumeIndex !== null);
}

export function starterTrail(learner: LearnerState) {
  return STARTER_TRAIL.map(id => DISCOVERIES.find(discovery => discovery.id === id)!).map(discovery => ({ discovery, ...discoveryJourney(discovery, learner) }));
}
