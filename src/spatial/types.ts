export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export interface KnowledgeNode {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly depth: number;
  readonly index: number;
  readonly weight: number;
}

export interface RegionLayout {
  readonly node: KnowledgeNode;
  readonly site: Point;
  readonly polygon: Polygon;
  readonly centroid: Point;
  readonly area: number;
  /** How hard the cell pushes its borders out, relative to how spread out its family's sites are
   * (absent when every child of the family has an equal share). */
  readonly weight?: number;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface CompletionMark {
  readonly nodeId: string;
  readonly depth: number;
  readonly polygon: Polygon;
  readonly centroid: Point;
}
