import { getExpedition } from '../../expeditions/registry';
import { checkVariant } from '../generators';
import { guessP, isOpenResponse } from '../grade';
import type { CheckBank, CheckItem } from '../types';
import { evolutionE01Bank } from './evolution-e01';
import { evolutionE02Bank } from './evolution-e02';
import { evolutionE03Bank } from './evolution-e03';
import { evolutionE04Bank } from './evolution-e04';
import { evolutionE05Bank } from './evolution-e05';
import { evolutionE06Bank } from './evolution-e06';
import { evolutionE07Bank } from './evolution-e07';
import { evolutionE08Bank } from './evolution-e08';
import { evolutionE09Bank } from './evolution-e09';
import { evolutionE11Bank } from './evolution-e11';
import { evolutionE12Bank } from './evolution-e12';
import { blackDeathBank } from './black-death';
import { evolutionE10Bank } from './evolution-e10';
import { musicBank } from './music';
import { physicsBank } from './physics';
import { GENERATED_PLACES } from '../../places/generated';

/** Every bank, one per node. Add new banks here. */
export const BANKS: readonly CheckBank[] = [evolutionE10Bank, evolutionE07Bank, evolutionE05Bank, physicsBank, musicBank, evolutionE01Bank, evolutionE02Bank, evolutionE03Bank, evolutionE04Bank, evolutionE06Bank, evolutionE08Bank, evolutionE09Bank, evolutionE11Bank, evolutionE12Bank, blackDeathBank, ...GENERATED_PLACES.map(place => place.bank)];

/** An item with the facts the draw and the rule need, all computed from the data. */
export interface BankItem {
  item: CheckItem;
  node: string;
  /** A situation the expedition never shows: the item names at least one entity, and none of
   * them appears in the expedition's text (plan §2.1: transfer is computed, not declared). */
  transfer: boolean;
  openResponse: boolean;
  guessP: number;
  /** Normalised entities, for keeping two items about the same thing out of one check. */
  keys: string[];
}

export interface PreparedBank extends CheckBank { prepared: readonly BankItem[] }

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word, case-insensitive, with an optional plural. */
export const mentions = (text: string, entity: string) => new RegExp(`(^|[^\\p{L}])${escape(entity)}(s|es)?(?![\\p{L}])`, 'iu').test(text);
const normal = (entity: string) => entity.toLowerCase().replace(/’s$|'s$/, '').replace(/(es|s)$/, '');

/** Everything a learner reads in an expedition: its title, question and every beat. */
export function packText(packId: string): string {
  const expedition = getExpedition(packId);
  if (!expedition) return '';
  const { title, question, beats } = expedition.pack;
  return [title, question, JSON.stringify(beats)].join('\n');
}

/** Everything a learner reads in an item, with numeric items rendered at their first variant. */
export function itemText(item: CheckItem): string {
  switch (item.kind) {
    case 'choice': return [item.prompt, ...item.options.map(o => o.label)].join('\n');
    case 'flaw': return [item.prompt, ...item.steps.map(s => s.text)].join('\n');
    case 'order': return [item.prompt, ...item.items.map(i => i.label)].join('\n');
    case 'match': return [item.prompt, ...item.left.map(l => l.label), ...item.right.map(r => r.label)].join('\n');
    case 'number': return checkVariant(item, 0).prompt;
  }
}

export function prepare(bank: CheckBank): PreparedBank {
  const text = packText(bank.pack);
  const prepared = bank.items.map((item): BankItem => ({
    item,
    node: bank.node,
    transfer: item.entities.length > 0 && !item.entities.some(entity => mentions(text, entity)),
    openResponse: isOpenResponse(item),
    guessP: guessP(item),
    keys: [...item.entities.map(normal), ...(item.logic ? [`logic:${item.logic}`] : [])],
  }));
  return { ...bank, prepared };
}

const PREPARED = new Map(BANKS.map(bank => [bank.node, prepare(bank)]));
const BY_ITEM = new Map([...PREPARED.values()].flatMap(bank => bank.prepared.map(entry => [entry.item.id, entry] as const)));

export const bankFor = (nodeId: string): PreparedBank | undefined => PREPARED.get(nodeId);
export const bankItem = (itemId: string): BankItem | undefined => BY_ITEM.get(itemId);
export const preparedBanks = (): PreparedBank[] => [...PREPARED.values()];
