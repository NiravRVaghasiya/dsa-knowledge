// Demo registry: maps a demo id to a function that produces frames from the
// shared, reusable builders. The demos page and any MDX <VizDemo> both consume
// this — there are NO one-off per-demo renderers; every demo flows through the
// same Visualizer + frame model.

import type {Frame} from './model';
import {binarySearchFrames, bubbleSortFrames} from './algorithms/arrays';
import {bfsFrames, dijkstraFrames, type GraphInput} from './algorithms/graphs';
import {inorderTraversalFrames, heapInsertFrames} from './algorithms/trees';
import {matMulFrames} from './algorithms/matrix';
import {hnswGreedySearchFrames, SAMPLE_HNSW_GRAPH} from './algorithms/hnsw';
import {kvCacheGrowthFrames} from './algorithms/kvcache';

/** A small sample graph with hand-placed coordinates (0..1 space). */
const SAMPLE_GRAPH: GraphInput = {
  nodes: [
    {id: 'A', x: 0.1, y: 0.5},
    {id: 'B', x: 0.35, y: 0.2},
    {id: 'C', x: 0.35, y: 0.8},
    {id: 'D', x: 0.62, y: 0.5},
    {id: 'E', x: 0.88, y: 0.25},
    {id: 'F', x: 0.88, y: 0.75},
  ],
  edges: [
    {from: 'A', to: 'B', weight: 2},
    {from: 'A', to: 'C', weight: 4},
    {from: 'B', to: 'D', weight: 3},
    {from: 'C', to: 'D', weight: 1},
    {from: 'D', to: 'E', weight: 5},
    {from: 'D', to: 'F', weight: 2},
    {from: 'E', to: 'F', weight: 1},
  ],
};

export type DemoDef = {
  id: string;
  title: string;
  description: string;
  build: () => Frame[];
};

export const DEMOS: DemoDef[] = [
  {
    id: 'binary-search',
    title: 'Binary Search',
    description: 'Search a sorted array by repeatedly halving the [lo, hi] window.',
    build: () => binarySearchFrames([1, 3, 5, 8, 11, 15, 21, 28, 34], 15),
  },
  {
    id: 'sorting',
    title: 'Bubble Sort',
    description: 'Adjacent compare-and-swap; the largest value bubbles to the end each pass.',
    build: () => bubbleSortFrames([5, 2, 8, 1, 4, 7]),
  },
  {
    id: 'bfs',
    title: 'Breadth-First Search',
    description: 'Expand the frontier layer by layer from the source node.',
    build: () => bfsFrames(SAMPLE_GRAPH, 'A'),
  },
  {
    id: 'dijkstra',
    title: "Dijkstra's Shortest Path",
    description: 'Settle the closest unsettled node, then relax its edges. Weights ≥ 0.',
    build: () => dijkstraFrames(SAMPLE_GRAPH, 'A'),
  },
  {
    id: 'tree-traversal',
    title: 'BST In-order Traversal',
    description: 'Left → Node → Right visits keys in sorted order.',
    build: () => inorderTraversalFrames([8, 3, 10, 1, 6, null, 14, null, null, 4, 7]),
  },
  {
    id: 'heap-insert',
    title: 'Min-Heap Insertion',
    description: 'Append at the end, then sift up while smaller than the parent.',
    build: () => heapInsertFrames([1, 3, 6, 5, 9, 8], 2),
  },
  {
    id: 'matmul',
    title: 'Matrix Multiplication',
    description: 'Fill C[i][j] with the dot product of row i of A and column j of B.',
    build: () =>
      matMulFrames(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
  },
  {
    id: 'hnsw',
    title: 'HNSW Greedy Search',
    description:
      'Educational: greedy best-first descent over a proximity graph toward a query — the core mechanic behind HNSW (not production HNSW).',
    build: () => hnswGreedySearchFrames(SAMPLE_HNSW_GRAPH, 'A', {x: 0.85, y: 0.5}),
  },
  {
    id: 'kv-cache',
    title: 'KV Cache Growth',
    description:
      'How the key/value cache grows one row per generated token during autoregressive decoding — linear O(L·D) memory instead of O(L²) recomputation.',
    build: () => kvCacheGrowthFrames(8),
  },
];

export function getDemo(id: string): DemoDef | undefined {
  return DEMOS.find((d) => d.id === id);
}
