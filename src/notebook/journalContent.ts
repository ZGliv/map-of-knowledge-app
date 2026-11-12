import { checkSessions, checkStatus } from '../checks/progress';
import { caseById, nextCase } from '../cases';
import { answerWords, judgeCase } from '../cases/engines';
import { describe } from '../checks/grade';
import type { Beat } from '../expeditions/content/types';
import { EXPEDITIONS, getExpedition } from '../expeditions/registry';
import { REELS } from '../explore/deck';
import { commonsAtWidth } from '../explore/media';
import type { Reel } from '../explore/types';
import type { JournalContent, ReelLite } from './journal';

/** The journal's view of the content chunk: packs, banks and reels (loaded after the first paint). */

const MAX_KEY = 200;
const short = (text: string | undefined) => (text && text.length <= MAX_KEY ? text : undefined);

/** The right answer to one graded moment of a pack, in words, or undefined. */
export function answerKey(packId: string, gradeId: string): string | undefined {
  const pack = getExpedition(packId)?.pack;
  if (!pack) return undefined;
  const label = (choices: { id: string; label: string }[], id: string) => choices.find(c => c.id === id)?.label;
  for (const beat of pack.beats as Beat[]) {
    if (beat.kind === 'dialogue') {
      for (const line of beat.script) if ('gradeId' in line && line.gradeId === gradeId) return short(label(line.choices, line.answer));
      continue;
    }
    if (!('gradeId' in beat) || beat.gradeId !== gradeId) continue;
    switch (beat.kind) {
      case 'source': return short(label(beat.question.choices, beat.question.answer));
      case 'flaw': return short(beat.steps.find(s => s.id === beat.answer)?.text);
      case 'spot': return short(beat.options.find(o => o.id === beat.answer)?.label);
      case 'predict': return short(beat.parts.map(p => (beat.parts.length > 1 ? `${p.label}: ` : '') + (label(p.choices, p.answer) ?? '')).join(' · '));
      case 'order': return short(beat.answer.map(id => beat.items.find(i => i.id === id)?.label ?? id).join(' → '));
      default: return undefined;
    }
  }
  return undefined;
}

/** The Library's view of a reel: its title, place, cover and words to search. */
export function reelLite(reel: Reel): ReelLite {
  const hero = reel.media[reel.hero];
  const first = reel.frames[0];
  return {
    id: reel.id, title: reel.title, nodeId: reel.nodeId,
    image: hero ? commonsAtWidth(hero.src) : undefined,
    position: first?.media ? `${first.x}% ${first.y}%` : undefined,
    contain: hero?.fit === 'contain', ink: hero?.tone === 'ink',
    about: [reel.takeaway, ...Object.values(reel.media).map(m => m.alt)].join(' '),
  };
}

const reels: ReelLite[] = REELS.map(reelLite);

export const journalContent: JournalContent = {
  checkSessions,
  describe,
  packTitle: packId => getExpedition(packId)?.pack.title,
  answerKey,
  caseWords: (caseId, answer) => {
    const c = caseById(caseId, answer)?.case;
    if (!c) return undefined;
    return { prompt: c.ask, given: answerWords(c, answer), right: judgeCase(c, answer).right };
  },
  caseOffer: (nodeIds, checks) => {
    for (const nodeId of nodeIds) {
      if (nextCase(nodeId, checks)) return nodeId;
      // A field or a subject: its charted places, in route order, no more than two levels down.
      const depth = nodeId.split('.').length;
      const inside = EXPEDITIONS.find(e => e.nodeId.startsWith(`${nodeId}.`) && e.nodeId.split('.').length - depth <= 2 && nextCase(e.nodeId, checks));
      if (inside) return inside.nodeId;
    }
    return undefined;
  },
  reels,
  refreshReady: (nodeId, exp, checks, now, sessions) => {
    const status = checkStatus(nodeId, exp, checks, now, sessions);
    return status.kind === 'ready' && status.purpose !== 'prove';
  },
};
