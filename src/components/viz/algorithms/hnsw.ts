// Pure frame builder for an EDUCATIONAL, simplified HNSW greedy search over a
// single navigable layer. This is NOT production HNSW (no hierarchy build, no
// heuristic neighbor selection, no efSearch beam) — it visualizes the *core
// idea*: greedy graph descent toward a query. No React/DOM.

import type {GraphFrame, HighlightRole} from '../model';

export type HnswNode = {id: string; x: number; y: number};
export type HnswGraph = {nodes: HnswNode[]; edges: Array<[string, string]>};

/** Euclidean distance between a node and the query point (in 0..1 layout space). */
function dist(a: {x: number; y: number}, q: {x: number; y: number}): number {
  return Math.hypot(a.x - q.x, a.y - q.y);
}

/**
 * Greedy best-first search over a proximity graph toward `query`, starting at
 * `entry`. At each step it moves to the neighbor closest to the query, stopping
 * at a local minimum — exactly the mechanic that makes HNSW's per-layer descent
 * work. Records a GraphFrame per hop.
 */
export function hnswGreedySearchFrames(
  graph: HnswGraph,
  entryId: string,
  query: {x: number; y: number},
): GraphFrame[] {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const [a, b] of graph.edges) {
    adj.get(a)!.push(b);
    adj.get(b)!.push(a); // proximity graph is undirected
  }

  const frames: GraphFrame[] = [];
  const visited = new Set<string>();
  let current = entryId;

  // A synthetic "query" node so the renderer can show the target.
  const queryNode = {id: '__query__', label: '🔍', x: query.x, y: query.y};

  const snapshot = (
    activeEdge: [string, string] | null,
    meta: {caption?: string; operation?: string; invariant?: string},
    roleOverride?: Record<string, HighlightRole>,
  ): GraphFrame => {
    const nodes = graph.nodes.map((n) => {
      let role: HighlightRole = 'default';
      if (roleOverride?.[n.id]) role = roleOverride[n.id];
      else if (n.id === current) role = 'active';
      else if (visited.has(n.id)) role = 'visited';
      return {
        id: n.id,
        label: n.id,
        x: n.x,
        y: n.y,
        role,
        value: dist(n, query).toFixed(2),
      };
    });
    // add the query marker (path role so it stands out)
    nodes.push({id: queryNode.id, label: queryNode.label, x: queryNode.x, y: queryNode.y, role: 'path', value: ''});

    const edges = graph.edges.map(([a, b]) => ({
      from: a,
      to: b,
      role:
        activeEdge && ((a === activeEdge[0] && b === activeEdge[1]) || (a === activeEdge[1] && b === activeEdge[0]))
          ? ('active' as HighlightRole)
          : ('default' as HighlightRole),
    }));
    return {kind: 'graph', nodes, edges, ...meta};
  };

  visited.add(current);
  frames.push(
    snapshot(null, {
      operation: 'enter layer',
      caption: `Start at entry point ${current}. Distance to query = ${dist(nodeById.get(current)!, query).toFixed(2)}.`,
      invariant: 'Greedy search moves to a strictly closer neighbor each step.',
    }),
  );

  // Greedy descent: repeatedly jump to the closest neighbor if it improves.
  // Bounded by node count to guarantee termination.
  for (let guard = 0; guard < graph.nodes.length + 1; guard++) {
    const curNode = nodeById.get(current)!;
    const curDist = dist(curNode, query);
    let best = current;
    let bestDist = curDist;
    for (const nb of adj.get(current)!) {
      const d = dist(nodeById.get(nb)!, query);
      if (d < bestDist) {
        bestDist = d;
        best = nb;
      }
    }
    if (best === current) {
      // local minimum — this is the greedy result for the layer
      frames.push(
        snapshot(null, {
          operation: 'converge',
          caption: `No neighbor is closer than ${current} (dist ${curDist.toFixed(2)}). Local minimum reached — this is the greedy nearest.`,
          invariant: 'A local minimum of the proximity graph approximates the true nearest neighbor.',
        }, {[current]: 'done'}),
      );
      break;
    }
    // show the edge we are about to traverse
    frames.push(
      snapshot([current, best], {
        operation: 'evaluate neighbors',
        caption: `Neighbor ${best} is closer (${bestDist.toFixed(2)} < ${curDist.toFixed(2)}) → move there.`,
        invariant: 'Each hop strictly decreases distance to the query.',
      }),
    );
    current = best;
    visited.add(current);
  }
  return frames;
}

/** A small sample proximity graph used by the HNSW demo/practice page. */
export const SAMPLE_HNSW_GRAPH: HnswGraph = {
  nodes: [
    {id: 'A', x: 0.12, y: 0.5},
    {id: 'B', x: 0.3, y: 0.22},
    {id: 'C', x: 0.32, y: 0.78},
    {id: 'D', x: 0.52, y: 0.4},
    {id: 'E', x: 0.55, y: 0.7},
    {id: 'F', x: 0.75, y: 0.28},
    {id: 'G', x: 0.8, y: 0.62},
    {id: 'H', x: 0.9, y: 0.45},
  ],
  edges: [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'D'],
    ['C', 'E'],
    ['D', 'E'],
    ['D', 'F'],
    ['E', 'G'],
    ['F', 'G'],
    ['F', 'H'],
    ['G', 'H'],
  ],
};
