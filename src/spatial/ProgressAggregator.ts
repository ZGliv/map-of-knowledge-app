import type { NodeStore } from './NodeStore';
import type { KnowledgeNode } from './types';

const isDescendantOrSelf = (candidateId: string, ancestorId: string): boolean => (
  candidateId === ancestorId || candidateId.startsWith(`${ancestorId}.`)
);

export class ProgressAggregator {
  private readonly completed = new Set<string>();

  constructor(private readonly store: NodeStore) {}

  toggle(node: KnowledgeNode): boolean {
    if (this.completed.has(node.id)) {
      this.completed.delete(node.id);
      return false;
    }

    for (const completedId of this.completed) {
      if (isDescendantOrSelf(node.id, completedId)) {
        this.completed.delete(completedId);
      }
    }
    for (const completedId of this.completed) {
      if (isDescendantOrSelf(completedId, node.id)) this.completed.delete(completedId);
    }
    this.completed.add(node.id);
    return true;
  }

  clear(): void {
    this.completed.clear();
  }

  isExact(node: KnowledgeNode): boolean {
    return this.completed.has(node.id);
  }

  isCovered(node: KnowledgeNode): boolean {
    for (const completedId of this.completed) {
      if (isDescendantOrSelf(node.id, completedId)) return true;
    }
    return false;
  }

  progress(node: KnowledgeNode): number {
    if (this.completed.has(node.id)) return 1;
    let total = 0;
    for (const completedId of this.completed) {
      if (!completedId.startsWith(`${node.id}.`)) continue;
      const route = completedId.slice(node.id.length + 1).split('.').map(Number);
      let cursor = node;
      let contribution = 1;
      for (const childIndex of route) {
        const children = this.store.getChildren(cursor);
        contribution /= children.length;
        cursor = children[childIndex];
        if (!cursor) {
          contribution = 0;
          break;
        }
      }
      total += contribution;
    }
    return Math.min(1, total);
  }

  descendantsOf(node: KnowledgeNode): readonly string[] {
    return [...this.completed].filter((id) => id.startsWith(`${node.id}.`));
  }

  completionsWithin(node: KnowledgeNode): readonly string[] {
    return [...this.completed].filter((id) => isDescendantOrSelf(id, node.id));
  }

  snapshot(): readonly string[] {
    return [...this.completed].sort();
  }

  get size(): number {
    return this.completed.size;
  }
}
