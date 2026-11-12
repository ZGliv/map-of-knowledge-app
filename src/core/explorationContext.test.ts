import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { DISCOVERIES, getDiscovery } from './discoveries';
import { getExplorationContext, isWithinTerritory } from './explorationContext';
import { createLearner, getFrontier, recordAttempt } from './learner';
import { createNotebook, upsertNotebookEntry } from './notebook';

const area = (id: string) => catalog.get(id)!;
const music = getDiscovery('rhythm-between-beats')!;

describe('exploration context', () => {
  it('keeps a global frontier at the world and identifies every footprint as inside', () => {
    const learner = createLearner();
    const context = getExplorationContext(catalog.root, learner);
    expect(context.suggestions.map(item => item.discovery.id)).toEqual(getFrontier(learner).map(item => item.discovery.id));
    expect(context.suggestions.every(item => item.proximity === 'inside')).toBe(true);
    expect(context.children).toHaveLength(8);
    expect(context.parent).toBeNull();
  });

  it('keeps earned local discoveries relevant when a global beginner scores higher', () => {
    const challenge = music.challenges[1];
    const learner = recordAttempt(createLearner(), { discoveryId: music.id, challengeId: challenge.id, answerId: challenge.correctId, phase: 'transfer', assisted: false });
    expect(getFrontier(learner, 'knowledge.arts')[0].discovery.id).not.toBe(music.id);
    const context = getExplorationContext(area('knowledge.arts'), learner);
    expect(context.suggestions[0].discovery.id).toBe(music.id);
    expect(context.suggestions[0].proximity).toBe('inside');
    expect(context.suggestions[0].kind).toBe('revisit');
    expect(context.earnedCount).toBe(1);
    expect(context.children.find(branch => branch.node.id === 'knowledge.arts.music')?.earnedCount).toBe(1);
    expect(context.children.find(branch => branch.node.id === 'knowledge.arts.design')?.earnedCount).toBe(0);
  });

  it('never describes the Music footprint as inside Design', () => {
    const context = getExplorationContext(area('knowledge.arts.design'), createLearner());
    const suggestion = context.suggestions.find(item => item.discovery.id === music.id)!;
    expect(context.children.some(child => child.node.id.startsWith('knowledge.arts.music'))).toBe(false);
    expect(suggestion.proximity).toBe('elsewhere');
    expect(suggestion.scopeLabel).toBe('Elsewhere in Arts');
    expect(context.suggestions.every(item => item.proximity === 'elsewhere')).toBe(true);
  });

  it('labels an adjacent deep footprint nearby without crediting its sibling area', () => {
    const topic = area(music.topicId);
    const sibling = catalog.getChildren(topic).find(node => node.id !== music.footprintId)!;
    const challenge = music.challenges[1];
    const learner = recordAttempt(createLearner(), { discoveryId: music.id, challengeId: challenge.id, answerId: challenge.correctId, phase: 'transfer', assisted: false });
    const context = getExplorationContext(sibling, learner);
    expect(context.suggestions[0].discovery.id).toBe(music.id);
    expect(context.suggestions[0].proximity).toBe('nearby');
    expect(context.suggestions[0].scopeLabel).toBe(`Nearby in ${topic.name}`);
    expect(context.earnedCount).toBe(0);
    const unearned = getExplorationContext(sibling, createLearner());
    expect(unearned.suggestions[0].reason).not.toContain('inside the territory');
  });

  it('counts each notebook entry once per scope and does not inherit broad parent notes downward', () => {
    let notebook = createNotebook();
    for (const input of [
      { title: 'A note in two arts branches', nodeIds: ['knowledge.arts.music', 'knowledge.arts.design'] },
      { title: 'A music note at two depths', nodeIds: ['knowledge.arts.music', music.footprintId] },
      { title: 'A broad arts question', nodeIds: ['knowledge.arts'] },
      { title: 'Elsewhere', nodeIds: ['knowledge.science'] },
    ]) notebook = upsertNotebookEntry(notebook, { ...input, body: '', kind: 'idea', evidence: 'encountered', sourceUrl: '', sourceLabel: '' });
    const entries = [...notebook.entries, notebook.entries[0]];
    const arts = getExplorationContext(area('knowledge.arts'), createLearner(), entries);
    expect(arts.noteCount).toBe(3);
    expect(arts.children.find(branch => branch.node.id === 'knowledge.arts.music')?.noteCount).toBe(2);
    expect(arts.children.find(branch => branch.node.id === 'knowledge.arts.design')?.noteCount).toBe(1);
    expect(getExplorationContext(area(music.footprintId), createLearner(), entries).noteCount).toBe(1);
  });

  it('recognizes only actual catalog membership, including exact terminal matches', () => {
    expect(isWithinTerritory(music.footprintId, music.footprintId)).toBe(true);
    expect(isWithinTerritory('knowledge.arts.music.fake', 'knowledge.arts.music')).toBe(false);
    expect(isWithinTerritory('knowledge.arts.music', 'knowledge.arts.music.fake')).toBe(false);
    expect(isWithinTerritory('knowledge.arts.music', 'knowledge.arts.design')).toBe(false);
    expect(isWithinTerritory('knowledge.arts', 'knowledge.arts.music')).toBe(false);
    expect(DISCOVERIES.every(discovery => isWithinTerritory(discovery.footprintId, discovery.topicId))).toBe(true);
  });

  it('returns at most three unique scoped notes newest first with stable ties', () => {
    const entry = (id: string, updatedAt: string, nodeIds = ['knowledge.arts.music']) => ({
      id, title: id, body: '', sourceUrl: '', sourceLabel: '', kind: 'question' as const, evidence: 'encountered' as const,
      nodeIds, createdAt: '2026-09-01T12:00:00.000Z', updatedAt,
    });
    const entries = [
      entry('oldest', '2026-09-02T12:00:00.000Z'),
      entry('tie-b', '2026-09-05T12:00:00.000Z'),
      entry('newest', '2026-09-07T12:00:00.000Z', [music.footprintId, 'knowledge.arts.music']),
      entry('newest', '2026-09-07T12:00:00.000Z', [music.footprintId, 'knowledge.arts.music']),
      entry('tie-a', '2026-09-05T12:00:00.000Z'),
      entry('unrelated-new', '2026-09-10T12:00:00.000Z', ['knowledge.science']),
      entry('broad-new', '2026-09-10T12:00:00.000Z', ['knowledge.arts']),
    ];
    const originalOrder = entries.map(note => note.id);
    const context = getExplorationContext(area('knowledge.arts.music'), createLearner(), entries);
    expect(context.noteCount).toBe(4);
    expect(context.scopedNotebookEntries.map(note => note.id)).toEqual(['newest', 'tie-a', 'tie-b']);
    expect(entries.map(note => note.id)).toEqual(originalOrder);
  });
});
