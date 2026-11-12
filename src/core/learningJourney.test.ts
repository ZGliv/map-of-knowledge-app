import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from './discoveries';
import { createLearner, exportLearner, parseLearner, recordAttempt, visitDiscovery } from './learner';
import { continueDiscovery, discoveryJourney, starterTrail } from './learningJourney';
import type { LearnerState } from './guideTypes';

const discovery = DISCOVERIES[0];
function answer(state: LearnerState, index: number, correct = true, assisted = false, target = discovery) {
  const challenge = target.challenges[index];
  return recordAttempt(state, { discoveryId: target.id, challengeId: challenge.id, answerId: correct ? challenge.correctId : challenge.choices.find(choice => choice.id !== challenge.correctId)!.id, phase: index ? 'transfer' : 'probe', assisted });
}

describe('returning to a learning journey', () => {
  it('does not invent progress from a visit and offers a connected starter path', () => {
    const learner = visitDiscovery(createLearner(), discovery.id);
    expect(continueDiscovery(learner)).toBeUndefined();
    expect(discoveryJourney(discovery, learner)).toMatchObject({ started: true, earned: false, explored: false, resumeIndex: null });
    expect(starterTrail(learner).map(step => step.discovery.id)).toEqual(['rhythm-between-beats', 'fractions-past-one', 'motion-as-slope']);
  });

  it('resumes a fresh transfer after a solved probe survives export and reload', () => {
    const learner = parseLearner(exportLearner(answer(createLearner(), 0)));
    expect(continueDiscovery(learner)?.id).toBe(discovery.id);
    expect(discoveryJourney(discovery, learner).resumeIndex).toBe(1);
  });

  it('keeps a wrong or hinted example as supported practice when resuming', () => {
    let learner = answer(createLearner(), 1, false);
    expect(discoveryJourney(discovery, learner).resumeIndex).toBe(1);
    learner = answer(learner, 1);
    expect(learner.attempts.at(-1)?.assisted).toBe(true);
    expect(discoveryJourney(discovery, learner)).toMatchObject({ earned: false, explored: true, resumeIndex: 2 });
  });

  it('does not promise fresh examples when the authored variants are exhausted', () => {
    const learner = answer(answer(createLearner(), 1, true, true), 2, true, true);
    expect(discoveryJourney(discovery, learner)).toMatchObject({ earned: false, explored: true, resumeIndex: null });
    expect(continueDiscovery(learner)).toBeUndefined();
  });

  it('continues the most recently unfinished discovery and leaves earned evidence alone', () => {
    let learner = answer(answer(createLearner(), 0), 0, true, false, DISCOVERIES[1]);
    expect(continueDiscovery(learner)?.id).toBe(DISCOVERIES[1].id);
    learner = answer(learner, 1, true, false, DISCOVERIES[1]);
    expect(continueDiscovery(learner)?.id).toBe(discovery.id);
    expect(discoveryJourney(DISCOVERIES[1], learner)).toMatchObject({ earned: true, resumeIndex: null });
  });
});
