// Generic, renderer-agnostic visualization model.
//
// The framework's core contract: an *algorithm* produces an immutable sequence
// of `Frame`s; a *renderer* only renders them. Nothing in this file imports
// React — the model is pure data so it can be built, tested, and validated
// without a DOM.
//
//   Algorithm  ->  Frame[]  ->  Renderer
//
// A `Frame` is a discriminated union keyed by `kind`. Every frame shares the
// educational fields (`caption`, `operation`, `invariant`, `annotations`) that
// answer "what is happening right now?" — see §9 of the framework goals.

/**
 * Semantic highlight roles. Renderers map these to colors, so algorithm code
 * never hard-codes hex values. This keeps the color vocabulary consistent
 * across every visualizer (arrays, graphs, trees, matrices).
 */
export const HIGHLIGHT_ROLES = [
  'active', // the element currently being operated on
  'compare', // an element being compared against
  'done', // finalized / settled
  'window', // inside the current window/range
  'frontier', // discovered but not yet processed (BFS/Dijkstra frontier)
  'visited', // already processed
  'path', // on the highlighted result path (shortest path, etc.)
  'default', // no special role
] as const;

export type HighlightRole = (typeof HIGHLIGHT_ROLES)[number];

/** Fields common to every frame regardless of data kind. */
export type FrameMeta = {
  /** One-line explanation shown under the stage. */
  caption?: string;
  /** The current operation, e.g. "compare", "swap", "relax edge". */
  operation?: string;
  /** The invariant that holds at this step, e.g. "left half is sorted". */
  invariant?: string;
  /** Free-form callouts rendered near the stage (kept short). */
  annotations?: string[];
};

// ---------------------------------------------------------------------------
// Array frames
// ---------------------------------------------------------------------------

export type ArrayFrame = FrameMeta & {
  kind: 'array';
  /** The values to draw as bars. */
  array: number[];
  /** index -> highlight role. */
  highlights?: Record<number, HighlightRole>;
  /** label -> index (drawn as a pointer above the bar). */
  pointers?: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Graph frames
// ---------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  label?: string; // defaults to id
  x: number; // 0..1 normalized coordinates (renderer scales to viewport)
  y: number;
  role?: HighlightRole;
  /** Optional value shown under the node (e.g. Dijkstra distance). */
  value?: string | number;
};

export type GraphEdge = {
  from: string;
  to: string;
  weight?: number;
  directed?: boolean;
  role?: HighlightRole; // e.g. 'active' current edge, 'path' shortest-path edge
};

export type GraphFrame = FrameMeta & {
  kind: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
};

// ---------------------------------------------------------------------------
// Tree frames (a rooted tree = graph with parent links; kept separate so the
// renderer can lay it out top-down without a physics simulation).
// ---------------------------------------------------------------------------

export type TreeNode = {
  id: string;
  label?: string;
  /** depth from root (0 = root); used for vertical placement. */
  depth: number;
  /** parent id, or null for the root. */
  parent: string | null;
  role?: HighlightRole;
  /** traversal order index, shown as a small badge when present. */
  order?: number;
};

export type TreeFrame = FrameMeta & {
  kind: 'tree';
  nodes: TreeNode[];
};

// ---------------------------------------------------------------------------
// Matrix frames
// ---------------------------------------------------------------------------

export type MatrixFrame = FrameMeta & {
  kind: 'matrix';
  /** row-major values. */
  cells: number[][];
  /** highlighted individual cells: {row, col, role}. */
  highlights?: Array<{row: number; col: number; role: HighlightRole}>;
  /** whole rows to highlight. */
  rowHighlights?: Record<number, HighlightRole>;
  /** whole columns to highlight. */
  colHighlights?: Record<number, HighlightRole>;
  /**
   * When true, cells are shaded by value intensity (heatmap) in addition to
   * any role highlights. Useful for attention / DP tables.
   */
  heatmap?: boolean;
};

// ---------------------------------------------------------------------------
// The union
// ---------------------------------------------------------------------------

export type Frame = ArrayFrame | GraphFrame | TreeFrame | MatrixFrame;
export type FrameKind = Frame['kind'];

/** A complete, self-describing visualization: metadata + immutable frames. */
export type Visualization = {
  title?: string;
  frames: readonly Frame[];
};
