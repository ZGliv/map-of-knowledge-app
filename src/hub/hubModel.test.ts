import { describe, expect, it } from 'vitest';
import { catalog } from '../core/catalog';
import { createCheckLedger } from '../checks/ledger';
import { DISCOVERIES } from '../core/discoveries';
import { BIOLOGY_ID, EVOLUTION_ID, EVOLUTION_ROUTE, EVOLUTION_TERRITORIES, evolutionTerritoryId } from '../core/evolution';
import { EVOLUTION_CORE } from '../core/evolutionLibrary';
import { createLearner, recordAttempt } from '../core/learner';
import { buildLearnables, leadFor } from '../discoveries/model';
import { createExpeditionLedger, getExpeditionEarnedIds, recordRun, type ExpeditionLedger } from '../expeditions/ledger';
import { EXPEDITIONS } from '../expeditions/registry';
import { buildHub, nextStepFor, type HubInput } from './hubModel';
import { parseRoute, routeHash } from './route';

const understood = { level: 'Understood' as const, firstTry: { right: 6, total: 6 }, transfer: { right: 2, total: 2 }, calibration: { sureRight: 6, sureWrong: 0, guessRight: 0, guessWrong: 0 }, confidentMisses: [], reviewOn: '' };
const input = (ledger = createExpeditionLedger()) => ({ learner: createLearner(), ledger, earnedIds: getExpeditionEarnedIds(ledger), entries: [] });

describe('Evolution in the catalog', () => {
  it('charts twelve headline territories under Science › Biology › Evolution with stable IDs', () => {
    expect(catalog.getChildren(catalog.get(BIOLOGY_ID)!).map(node => node.name)).toContain('Evolution');
    const territories = catalog.getChildren(catalog.get(EVOLUTION_ID)!);
    expect(territories.map(node => node.subtitle)).toEqual(EVOLUTION_TERRITORIES.map(territory => territory.code));
    expect(territories.map(node => node.id)).toEqual(EVOLUTION_TERRITORIES.map(territory => `knowledge.science.biology.evolution.${territory.key}`));
    expect(new Set(EVOLUTION_TERRITORIES.map(territory => territory.code))).toEqual(new Set(Array.from({ length: 12 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`)));
    for (const node of territories) expect(catalog.getChildren(node)).toHaveLength(0);
  });

  it('keeps the shelf to linked rows that name real territories', () => {
    const codes = new Set(EVOLUTION_TERRITORIES.map(territory => territory.code));
    for (const work of EVOLUTION_CORE) {
      expect(work.links.length, work.title).toBeGreaterThan(0);
      for (const link of work.links) expect(link.url).toMatch(/^https:\/\//);
      for (const code of work.covers ?? []) expect(codes.has(code)).toBe(true);
    }
  });
});

describe('hub model', () => {
  it('gives Evolution its territories, shelf, connections and the route’s first expedition', () => {
    const hub = buildHub(catalog.get(EVOLUTION_ID)!, input());
    expect(hub.children).toHaveLength(12);
    expect(hub.children.filter(child => child.expedition).map(child => child.territory!.code)).toEqual(EVOLUTION_TERRITORIES.map(t => t.code).filter(code => EXPEDITIONS.some(e => e.code === code)));
    expect(hub.progress).toMatchObject({ earned: 0, charted: EXPEDITIONS.filter(expedition => expedition.code).length });
    expect(hub.next?.kind === 'expedition' && hub.next.item.expedition.pack.id).toBe('evolution-e10');
    expect(hub.library).toHaveLength(EVOLUTION_CORE.length);
    expect(hub.connections.map(item => item.nodeId)).toContain('knowledge.earth.geology');
    expect(hub.charting).toBe(true);
  });

  it('moves the next step along the route once a piece is earned', () => {
    const ledger = recordRun(createExpeditionLedger(), { id: 'r', packId: 'evolution-e10', summary: understood });
    const hub = buildHub(catalog.get(EVOLUTION_ID)!, input(ledger));
    expect(hub.progress.earned).toBe(1);
    expect(hub.next?.kind === 'expedition' && hub.next.item.expedition.pack.id).toBe('evolution-e02');
    expect(buildHub(catalog.get('knowledge.science')!, input(ledger)).progress.earned).toBe(1);
  });

  it('names uncharted land honestly and offers its neighbours', () => {
    const deep = buildHub(catalog.get(evolutionTerritoryId('deep-time'))!, input());
    expect(deep.next?.kind === 'expedition' && deep.next.item.expedition.pack.id).toBe('evolution-e06');
    expect(deep.overview).toBe(EVOLUTION_TERRITORIES[5].claim);
    expect(deep.library.map(work => work.id)).toEqual(['origin', 'inner-fish']);
    expect(deep.siblings).toHaveLength(11);
    const tree = buildHub(catalog.get(evolutionTerritoryId('tree-thinking'))!, input());
    expect(tree.next?.kind === 'expedition' && tree.next.item.expedition.pack.id).toBe('evolution-e01');
    expect(tree.library.map(work => work.id)).toEqual(['origin', 'inner-fish', 'in-our-time-darwin']);
    const astronomy = buildHub(catalog.get('knowledge.science.astronomy')!, input());
    expect(astronomy).toMatchObject({ next: null, library: [], expeditions: [], discoveries: [] });
    expect(astronomy.progress.charted).toBe(0);
  });

  it('starts a new learner at the world on the route’s first expedition', () => {
    const world = buildHub(catalog.root, input());
    expect(world.next?.kind === 'expedition' && world.next.item.expedition.pack.id).toBe('evolution-e10');
    expect(world.children).toHaveLength(8);
    expect(world.expeditions).toHaveLength(EXPEDITIONS.length);
  });
});

describe('the world’s next step follows the Evolution route', () => {
  const routePacks = EVOLUTION_ROUTE.map(code => EXPEDITIONS.find(expedition => expedition.code === code)!.pack.id);
  const earn = (ledger: ExpeditionLedger, packId: string, at = '2026-10-01T10:00:00.000Z') => recordRun(ledger, { id: `run-${packId}`, packId, summary: understood, at });
  const worldNext = (state: HubInput) => {
    const next = nextStepFor(catalog.root, state);
    return next?.kind === 'expedition' ? next.item.expedition.pack.id : next?.kind === 'check' ? `check:${next.item.node.id}` : next?.kind === 'welcome' ? `welcome:${next.items.map(i => i.node.id).join(',')}` : next?.item.discovery.id ?? null;
  };

  it('walks the route one unearned expedition at a time, then the other packs', () => {
    let ledger = createExpeditionLedger();
    for (const packId of routePacks) {
      expect(worldNext(input(ledger))).toBe(packId);
      ledger = earn(ledger, packId);
    }
    const others = EXPEDITIONS.filter(expedition => !expedition.code).map(expedition => expedition.pack.id);
    expect(worldNext(input(ledger))).toBe(others[0]);
  });

  it('skips a piece earned out of order and stays on one started but not yet understood', () => {
    const skipped = earn(earn(createExpeditionLedger(), 'evolution-e10'), 'evolution-e03');
    expect(worldNext(input(skipped))).toBe('evolution-e02');
    const familiar = recordRun(skipped, { id: 'f', packId: 'evolution-e02', summary: { ...understood, level: 'Familiar' } });
    const step = nextStepFor(catalog.root, input(familiar));
    expect(step?.kind === 'expedition' && step.item.expedition.pack.id).toBe('evolution-e02');
    expect(step?.kind === 'expedition' && step.item.level).toBe('Familiar');
  });

  it('still resumes a discovery in progress first', () => {
    const rhythm = DISCOVERIES.find(discovery => discovery.id === 'rhythm-between-beats')!;
    const probe = rhythm.challenges[0];
    const learner = recordAttempt(createLearner(), { discoveryId: rhythm.id, challengeId: probe.id, answerId: probe.correctId, phase: 'probe', assisted: false });
    expect(worldNext({ ...input(earn(createExpeditionLedger(), 'evolution-e10')), learner })).toBe(rhythm.id);
  });

  it('still puts a due Lasting check ahead of the next new expedition', () => {
    const ledger = earn(createExpeditionLedger(), 'evolution-e10', '2026-10-01T10:00:00.000Z');
    const checks = createCheckLedger();
    const day = 24 * 60 * 60 * 1000;
    const when = (days: number) => Date.parse('2026-10-01T10:00:00.000Z') + days * day;
    expect(worldNext({ ...input(ledger), checks, now: when(6) })).toBe('evolution-e02');
    expect(worldNext({ ...input(ledger), checks, now: when(7) })).toBe(`check:${evolutionTerritoryId('evolution-now')}`);
  });

  it('gives the map, the world hub and the Lessons list one answer', () => {
    const states = [createExpeditionLedger(), earn(createExpeditionLedger(), 'evolution-e10'), earn(earn(createExpeditionLedger(), 'evolution-e10'), 'evolution-e02')];
    for (const ledger of states) {
      const state = input(ledger);
      const next = nextStepFor(catalog.root, state);
      expect(buildHub(catalog.root, state).next).toEqual(next);
      const lead = leadFor(buildLearnables(state.learner, ledger, state.earnedIds), next);
      expect(lead?.id).toBe(worldNext(state));
      expect(lead?.kind).toBe('expedition');
    }
  });
});

describe('hub routes', () => {
  it('round-trips hubs and expeditions through the address', () => {
    for (const route of [{ kind: 'map' as const }, { kind: 'hub' as const, nodeId: EVOLUTION_ID }, { kind: 'expedition' as const, packId: 'evolution-e10', beat: 3, from: EVOLUTION_ID }]) {
      expect(parseRoute(routeHash(route))).toEqual(route);
    }
    expect(parseRoute('#/expedition/evolution-e10')).toEqual({ kind: 'expedition', packId: 'evolution-e10', beat: 0, from: null });
    expect(parseRoute('#/somewhere')).toEqual({ kind: 'map' });
  });
});
