import { deterministicInt, hashString } from './deterministic';
import type { KnowledgeNode } from './types';

const ROOT_NAMES = [
  'Science',
  'Technology',
  'Humanities',
  'Society',
  'Mathematics',
  'Arts',
  'Earth',
  'Business',
];

const NAMED_CHILDREN: Readonly<Record<string, readonly string[]>> = {
  Science: ['Physics', 'Biology', 'Chemistry', 'Astronomy', 'Earth Science', 'Medicine'],
  Technology: ['Computing', 'Engineering', 'Materials', 'Energy', 'Networks', 'Robotics'],
  Humanities: ['History', 'Philosophy', 'Languages', 'Literature', 'Archaeology', 'Classics'],
  Society: ['Psychology', 'Sociology', 'Politics', 'Law', 'Anthropology', 'Education'],
  Mathematics: ['Algebra', 'Geometry', 'Analysis', 'Probability', 'Logic', 'Number Theory'],
  Arts: ['Music', 'Visual Arts', 'Architecture', 'Theatre', 'Design', 'Film'],
  Earth: ['Climate', 'Oceans', 'Geology', 'Ecology', 'Atmosphere', 'Geography'],
  Business: ['Economics', 'Strategy', 'Finance', 'Operations', 'Markets', 'Organizations'],
  Physics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Quantum Physics', 'Relativity', 'Optics'],
  Mechanics: ['Classical Mechanics', 'Continuum Mechanics', 'Dynamics', 'Statics', 'Fluid Mechanics'],
  'Classical Mechanics': ['Newtonian Mechanics', 'Lagrangian Mechanics', 'Hamiltonian Mechanics', 'Rigid Bodies'],
  'Newtonian Mechanics': ['Motion', 'Forces', 'Momentum', 'Energy', 'Gravitation', 'Oscillation'],
  Forces: ['Friction', 'Normal Force', 'Tension', 'Drag', 'Elastic Force'],
  Friction: ['Static Friction', 'Kinetic Friction', 'Rolling Resistance', 'Fluid Friction'],
};

const CONCEPTS = [
  'Foundations', 'Structures', 'Systems', 'Patterns', 'Methods', 'Dynamics', 'Models',
  'Principles', 'Processes', 'Relations', 'Mechanisms', 'Frontiers', 'Applications',
];

const QUALIFIERS = [
  'Elementary', 'Comparative', 'Applied', 'Theoretical', 'Experimental', 'Advanced',
  'Computational', 'Historical', 'Emergent', 'Integrated', 'Formal', 'Practical',
];

export class NodeStore {
  readonly root: KnowledgeNode = {
    id: 'knowledge',
    name: 'Knowledge',
    parentId: null,
    depth: 0,
    index: 0,
    weight: 1,
  };

  private readonly nodes = new Map<string, KnowledgeNode>([[this.root.id, this.root]]);
  private readonly childCache = new Map<string, readonly KnowledgeNode[]>();

  get(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getChildren(node: KnowledgeNode): readonly KnowledgeNode[] {
    const cached = this.childCache.get(node.id);
    if (cached) return cached;

    const explicit = node.id === this.root.id ? ROOT_NAMES : NAMED_CHILDREN[node.name];
    const count = explicit?.length ?? deterministicInt(`${node.id}:count`, 4, 8);
    const children = Array.from({ length: count }, (_, index) => {
      const id = `${node.id}.${index}`;
      const conceptIndex = hashString(`${id}:concept`) % CONCEPTS.length;
      const qualifierIndex = hashString(`${id}:qualifier`) % QUALIFIERS.length;
      const generatedName = node.depth < 5
        ? `${QUALIFIERS[qualifierIndex]} ${CONCEPTS[conceptIndex]}`
        : `${CONCEPTS[conceptIndex]} ${String(index + 1).padStart(2, '0')}`;
      const child: KnowledgeNode = {
        id,
        name: explicit?.[index] ?? generatedName,
        parentId: node.id,
        depth: node.depth + 1,
        index,
        weight: 0.82 + (hashString(`${id}:weight`) % 37) / 100,
      };
      this.nodes.set(id, child);
      return child;
    });
    this.childCache.set(node.id, children);
    return children;
  }

  getParent(node: KnowledgeNode): KnowledgeNode | null {
    if (!node.parentId) return null;
    const cached = this.nodes.get(node.parentId);
    if (cached) return cached;
    const parts = node.parentId.split('.');
    this.ensurePath(parts.length - 1);
    return this.nodes.get(node.parentId) ?? null;
  }

  getPath(node: KnowledgeNode): readonly KnowledgeNode[] {
    const path: KnowledgeNode[] = [];
    let cursor: KnowledgeNode | null = node;
    while (cursor) {
      path.unshift(cursor);
      cursor = this.getParent(cursor);
    }
    return path;
  }

  ensurePath(depth: number, routeSeed = 'stress-route'): KnowledgeNode {
    let cursor = this.root;
    while (cursor.depth < depth) {
      const children = this.getChildren(cursor);
      const index = hashString(`${routeSeed}:${cursor.depth}`) % children.length;
      cursor = children[index];
    }
    return cursor;
  }

  childCount(node: KnowledgeNode): number {
    return this.getChildren(node).length;
  }

  get generatedCount(): number {
    return this.nodes.size;
  }
}
