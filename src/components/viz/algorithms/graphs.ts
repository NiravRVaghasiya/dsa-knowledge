// Pure frame builders for graph algorithms (BFS, Dijkstra). No React/DOM.
// Each function takes a graph with pre-placed node coordinates and emits a
// GraphFrame per step, marking node/edge roles (active/visited/frontier/path).

import type {GraphFrame, GraphNode, GraphEdge, HighlightRole} from '../model';

/** Input graph: nodes with layout coordinates + a weighted/directed edge list. */
export type GraphInput = {
  nodes: Array<{id: string; label?: string; x: number; y: number}>;
  edges: Array<{from: string; to: string; weight?: number; directed?: boolean}>;
};

type NodeRoles = Record<string, HighlightRole>;
type NodeValues = Record<string, string | number>;

function snapshot(
  input: GraphInput,
  nodeRoles: NodeRoles,
  nodeValues: NodeValues,
  activeEdge: {from: string; to: string} | null,
  pathEdges: Set<string>,
  meta: {caption?: string; operation?: string; invariant?: string},
): GraphFrame {
  const edgeKey = (e: {from: string; to: string}) => `${e.from}->${e.to}`;
  const nodes: GraphNode[] = input.nodes.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    x: n.x,
    y: n.y,
    role: nodeRoles[n.id] ?? 'default',
    ...(nodeValues[n.id] !== undefined ? {value: nodeValues[n.id]} : {}),
  }));
  const edges: GraphEdge[] = input.edges.map((e) => {
    let role: HighlightRole = 'default';
    if (pathEdges.has(edgeKey(e))) role = 'path';
    else if (activeEdge && e.from === activeEdge.from && e.to === activeEdge.to) role = 'active';
    return {
      from: e.from,
      to: e.to,
      ...(e.weight !== undefined ? {weight: e.weight} : {}),
      ...(e.directed !== undefined ? {directed: e.directed} : {}),
      role,
    };
  });
  return {kind: 'graph', nodes, edges, ...meta};
}

function adjacency(input: GraphInput): Map<string, Array<{to: string; weight: number}>> {
  const adj = new Map<string, Array<{to: string; weight: number}>>();
  for (const n of input.nodes) adj.set(n.id, []);
  for (const e of input.edges) {
    adj.get(e.from)!.push({to: e.to, weight: e.weight ?? 1});
    if (!e.directed) adj.get(e.to)!.push({to: e.from, weight: e.weight ?? 1});
  }
  return adj;
}

/** Breadth-first search from `source`, recording the expanding frontier. */
export function bfsFrames(input: GraphInput, source: string): GraphFrame[] {
  const frames: GraphFrame[] = [];
  const adj = adjacency(input);
  const roles: NodeRoles = {};
  const dist: NodeValues = {};
  const visited = new Set<string>();
  const queue: string[] = [source];
  visited.add(source);
  roles[source] = 'frontier';
  dist[source] = 0;

  frames.push(
    snapshot(input, roles, dist, null, new Set(), {
      operation: 'enqueue source',
      caption: `Start BFS at ${source}. Queue: [${source}].`,
      invariant: 'Nodes are discovered in non-decreasing distance (hop) order.',
    }),
  );

  while (queue.length) {
    const u = queue.shift()!;
    roles[u] = 'active';
    frames.push(
      snapshot(input, roles, dist, null, new Set(), {
        operation: 'dequeue',
        caption: `Dequeue ${u} (distance ${dist[u]}). Explore its neighbors.`,
        invariant: 'A dequeued node has its final shortest hop-distance.',
      }),
    );
    for (const {to} of adj.get(u)!) {
      if (!visited.has(to)) {
        visited.add(to);
        dist[to] = (dist[u] as number) + 1;
        roles[to] = 'frontier';
        queue.push(to);
        frames.push(
          snapshot(input, roles, dist, {from: u, to}, new Set(), {
            operation: 'discover neighbor',
            caption: `Discover ${to} via ${u} → distance ${dist[to]}. Enqueue it.`,
            invariant: 'Each node is enqueued exactly once (marked on discovery).',
          }),
        );
      }
    }
    roles[u] = 'visited';
    frames.push(
      snapshot(input, roles, dist, null, new Set(), {
        operation: 'finish node',
        caption: `${u} fully explored.`,
        invariant: 'Visited nodes will never be revisited.',
      }),
    );
  }

  frames.push(
    snapshot(input, roles, dist, null, new Set(), {
      operation: 'done',
      caption: 'BFS complete — every reachable node has its shortest hop-distance.',
      invariant: 'All reachable nodes are visited.',
    }),
  );
  return frames;
}

/**
 * Dijkstra's algorithm from `source` on a non-negative weighted graph.
 * Records each extract-min (settle) and each relaxation, and highlights the
 * shortest-path tree edges at the end.
 */
export function dijkstraFrames(input: GraphInput, source: string): GraphFrame[] {
  const frames: GraphFrame[] = [];
  const adj = adjacency(input);
  const roles: NodeRoles = {};
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const settled = new Set<string>();
  for (const n of input.nodes) dist.set(n.id, Infinity);
  dist.set(source, 0);

  const valueLabels = (): NodeValues => {
    const v: NodeValues = {};
    for (const [id, d] of dist) v[id] = d === Infinity ? '∞' : d;
    return v;
  };

  roles[source] = 'frontier';
  frames.push(
    snapshot(input, roles, valueLabels(), null, new Set(), {
      operation: 'init',
      caption: `Start Dijkstra at ${source}. dist[${source}]=0, others = ∞.`,
      invariant: 'A settled node has its final shortest distance.',
    }),
  );

  while (settled.size < input.nodes.length) {
    // extract-min over unsettled nodes
    let u: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!settled.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Infinity) break; // remaining nodes unreachable

    settled.add(u);
    roles[u] = 'active';
    frames.push(
      snapshot(input, roles, valueLabels(), null, new Set(), {
        operation: 'extract-min (settle)',
        caption: `Settle ${u} with distance ${best}. This distance is now final.`,
        invariant: 'No later path can beat a settled distance (weights ≥ 0).',
      }),
    );

    for (const {to, weight} of adj.get(u)!) {
      if (settled.has(to)) continue;
      const nd = best + weight;
      if (nd < (dist.get(to) as number)) {
        dist.set(to, nd);
        prev.set(to, u);
        roles[to] = 'frontier';
        frames.push(
          snapshot(input, roles, valueLabels(), {from: u, to}, new Set(), {
            operation: 'relax edge',
            caption: `Relax ${u}→${to} (w=${weight}): dist[${to}] = ${nd}.`,
            invariant: 'Relaxation only ever lowers a tentative distance.',
          }),
        );
      }
    }
    roles[u] = 'visited';
  }

  // Highlight the shortest-path tree.
  const pathEdges = new Set<string>();
  for (const [to, from] of prev) {
    // find the edge orientation that exists in the input
    const direct = input.edges.some((e) => e.from === from && e.to === to);
    pathEdges.add(direct ? `${from}->${to}` : `${to}->${from}`);
  }
  for (const id of settled) roles[id] = 'path';
  frames.push(
    snapshot(input, roles, valueLabels(), null, pathEdges, {
      operation: 'done',
      caption: 'Dijkstra complete — highlighted edges form the shortest-path tree.',
      invariant: 'Every settled node holds its true shortest distance from source.',
    }),
  );
  return frames;
}
