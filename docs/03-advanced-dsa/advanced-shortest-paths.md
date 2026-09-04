---
title: Advanced Shortest Paths — Bellman-Ford, Floyd-Warshall & 0-1 BFS
slug: /advanced-shortest-paths
sidebar_position: 10
sidebar_label: Advanced Shortest Paths
description: >-
  Beyond Dijkstra — handling negative edges (Bellman-Ford), all-pairs distances (Floyd-Warshall), and 0/1-weighted graphs (0-1 BFS) with correct complexity and failure modes.
tags:
  - shortest-path
  - bellman-ford
  - floyd-warshall
  - graphs
difficulty: advanced
reading_time: 22
prerequisites:
  - title: Shortest Path Algorithms
    to: /docs/shortest-path
  - title: BFS & DFS Traversal
    to: /docs/bfs-dfs
pagination_prev: advanced-dsa/segment-tree-fenwick
pagination_next: advanced-dsa/minimum-spanning-tree
path_step: 24
---

# Advanced Shortest Paths: Bellman-Ford, Floyd-Warshall & 0-1 BFS

> [Dijkstra and A*](/docs/shortest-path) solve shortest paths when **every edge weight is non-negative**. Three important problems fall outside that assumption: graphs with **negative edges**, the **all-pairs** problem, and graphs whose weights are only **0 or 1**. This guide completes the shortest-path family with the algorithm each case demands — and, just as importantly, *why Dijkstra fails* on each.

All three rest on one primitive you already know from Dijkstra: **relaxation** — `if dist[u] + w(u,v) < dist[v]: dist[v] = dist[u] + w(u,v)`. What changes is the *order* and *number of times* edges are relaxed.

---

## 1. Bellman-Ford: shortest paths with negative edges

### 1.1 Why it exists

Dijkstra's correctness relies on a permanent decision: once it extracts the closest unsettled vertex, that distance is final. A **negative edge discovered later** can undercut a "finalized" distance, so Dijkstra silently returns wrong answers. Bellman-Ford makes no permanence assumption: it relaxes **every edge, `V-1` times**, which is enough for any shortest path (which has at most `V-1` edges) to fully propagate.

Negative edges are not academic: they model **refunds/rebates** in cost networks, **profit legs** in currency/arbitrage graphs, and **potentials** in Johnson's all-pairs algorithm.

### 1.2 The key idea and invariant

> **After `k` rounds of relaxing all edges, `dist[v]` is correct for every vertex whose shortest path from the source uses at most `k` edges.** Since a shortest path in a graph with no negative cycle has at most `V-1` edges, `V-1` rounds suffice. A *`V`-th* round that still relaxes something proves a **negative cycle** exists.

### 1.3 Implementation

```python
def bellman_ford(n, edges, source):
    """
    n      : number of vertices (labeled 0..n-1)
    edges  : list of (u, v, w) directed edges (w may be negative)
    source : start vertex
    Returns (dist, has_negative_cycle).
    Time O(V*E), Space O(V).
    """
    INF = float('inf')
    dist = [INF] * n
    dist[source] = 0

    # V-1 rounds: enough for any shortest path (<= V-1 edges) to settle.
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:   # RELAX
                dist[v] = dist[u] + w
                changed = True
        if not changed:            # early exit: a full pass changed nothing
            break

    # One more pass: any relaxation now means a reachable negative cycle.
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return dist, True
    return dist, False


edges = [(0, 1, 4), (0, 2, 5), (1, 2, -3), (2, 3, 4), (1, 3, 6)]
dist, neg = bellman_ford(4, edges, 0)
print(dist, neg)   # [0, 4, 1, 5] False   (0->1->2 costs 4-3=1, cheaper than 0->2=5)
```

> 💡 **The early-exit optimization is not cosmetic.** If a full pass relaxes nothing, all distances are final and you can stop — often far before `V-1` rounds. The **SPFA** ("Bellman-Ford with a queue") variant only re-examines vertices whose distance changed; it is fast on average but still `O(V·E)` worst case, so never rely on it for adversarial inputs.

### 1.4 Detecting and extracting a negative cycle

To *report the cycle* (not just its existence), remember the predecessor during relaxation, and if the `V`-th pass relaxes vertex `x`, walk `x` back `V` times to land guaranteed inside the cycle, then follow predecessors until you repeat a vertex.

### 1.5 Complexity

- **Time:** `O(V·E)` — `V-1` passes, each relaxing all `E` edges. With early exit, often much less in practice, but the worst case is tight.
- **Space:** `O(V)` for `dist` (+ `O(V)` for predecessors if reconstructing paths).
- **Best/avg/worst:** worst case `O(V·E)`; best case `O(E)` (one pass, early exit) on already-settled graphs.

### 1.6 Edge cases & common mistakes

- **Overflow / `INF + w`.** Guard with `dist[u] != INF` before relaxing, or `INF + negative` can wrap into a spurious "improvement." This is the #1 Bellman-Ford bug.
- **Undirected graphs with a negative edge.** An undirected negative edge *is* a negative cycle (traverse it back and forth). Bellman-Ford assumes directed edges; model undirected graphs as two directed edges only if all weights are non-negative.
- **Cycle detection scope.** The `V`-th-pass test finds negative cycles **reachable from the source**. To find *any* negative cycle, add a virtual source with 0-weight edges to all vertices.

### 1.7 When to use / when not to

**Use it** when edges can be negative and you need single-source distances, or specifically to **detect negative cycles** (arbitrage detection, feasibility of difference constraints). **Don't** use it when all weights are non-negative — Dijkstra's `O((V+E) log V)` crushes `O(V·E)`.

### 1.8 AI / systems connection

- **Arbitrage & constraint feasibility.** Negative-cycle detection powers currency-arbitrage finders and checking whether a system of difference constraints (`x_j - x_i ≤ w`) is satisfiable — the constraint graph has a solution iff it has no negative cycle.
- **Johnson's algorithm** (below, §2.5) uses one Bellman-Ford run to compute *vertex potentials* that reweight a graph to be non-negative, enabling fast Dijkstra all-pairs on sparse graphs.

---

## 2. Floyd-Warshall: all-pairs shortest paths

### 2.1 Why it exists

Sometimes you need the distance between **every pair** of vertices — routing tables, graph diameter, transitive closure, metric preprocessing. Running Dijkstra from every source works on sparse non-negative graphs (`O(V·(V+E) log V)`), but Floyd-Warshall is dramatically simpler to implement, handles **negative edges** (no negative cycles), and is competitive on **dense** graphs.

### 2.2 The key idea (a beautiful DP)

> **`dist[i][j]` using only intermediate vertices from the set `{0, 1, ..., k}`** is built up by considering each `k` in turn: either the best path avoids `k` (already computed for `{0..k-1}`), or it goes `i → k → j`. Take the min.

```
dist_k[i][j] = min( dist_{k-1}[i][j],  dist_{k-1}[i][k] + dist_{k-1}[k][j] )
```

The elegance: the `k` loop must be the **outermost** loop. That ordering is what lets the algorithm reuse each newly-allowed intermediate vertex correctly — swapping the loop order silently produces wrong answers.

### 2.3 Implementation

```python
def floyd_warshall(n, edges):
    """All-pairs shortest paths. edges: (u, v, w), directed, negatives OK
    (no negative cycles). Returns dist matrix; dist[i][j] = INF if unreachable.
    Time O(V^3), Space O(V^2)."""
    INF = float('inf')
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)     # keep the cheapest parallel edge

    # k MUST be the outermost loop: "allow vertex k as an intermediate."
    for k in range(n):
        dk = dist[k]
        for i in range(n):
            dik = dist[i][k]
            if dik == INF:                  # no path i->k; skip (also avoids overflow)
                continue
            di = dist[i]
            for j in range(n):
                if dik + dk[j] < di[j]:
                    di[j] = dik + dk[j]
    return dist

edges = [(0, 1, 3), (1, 2, 1), (0, 2, 10), (2, 0, 2)]
D = floyd_warshall(3, edges)
print(D[0])   # [0, 3, 4]   0->1->2 = 4 beats direct 0->2 = 10
```

**Negative-cycle detection:** after the algorithm, if any `dist[i][i] < 0`, vertex `i` lies on a negative cycle.

### 2.4 Complexity

- **Time:** `Θ(V³)` — three nested loops, always. No data-dependent speedup (the bound is the same best/average/worst).
- **Space:** `O(V²)` for the matrix. Note the in-place update over `k` is provably correct (the `k`-th row/column don't change during iteration `k`).
- **Path reconstruction:** keep a `next[i][j]` matrix updated alongside `dist` (`O(V²)` extra) to recover actual paths.

### 2.5 When to use / when not to — and Johnson's alternative

| Situation | Best choice |
|---|---|
| Dense graph (`E ≈ V²`), need all pairs | **Floyd-Warshall** `O(V³)` |
| Sparse graph, all pairs, non-negative | **Dijkstra ×V** `O(V·(V+E) log V)` |
| Sparse graph, all pairs, **negative edges** | **Johnson's** — reweight via one Bellman-Ford, then Dijkstra ×V |
| Just transitive closure (reachability) | Floyd-Warshall with boolean OR/AND (**Warshall's algorithm**) |

**Don't** run Floyd-Warshall on a large sparse graph if you only need a few pairs — `V³` for `V = 10^4` is `10^{12}` operations.

### 2.6 AI / systems connection

- **Graph diameter & centrality.** All-pairs distances feed **closeness/betweenness centrality** on knowledge graphs (see [Graph Algorithms for KG & GraphRAG](/docs/graph-algorithms-kg-graphrag)) and small-world analysis.
- **Isomap / manifold learning** approximates geodesic distances in embedding space by running all-pairs shortest paths on a k-NN graph — Floyd-Warshall or Dijkstra-×V depending on density.
- **Metric preprocessing** for routing and for RL environments with small state spaces where a precomputed distance matrix accelerates planning.

---

## 3. 0-1 BFS: shortest paths when weights are 0 or 1

### 3.1 Why it exists

When every edge weighs **exactly 0 or 1**, Dijkstra works but its heap is overkill — a `log` factor you don't need. **0-1 BFS** replaces the priority queue with a **double-ended queue (deque)** and achieves `O(V + E)`: weight-0 edges push to the **front** (same distance layer), weight-1 edges push to the **back** (next layer). It generalizes plain BFS (which handles all-weight-1) to the 0/1 case.

This pattern appears constantly in **grid problems**: moving in your current direction is free, turning or "breaking a wall" costs 1.

### 3.2 The key idea (invariant)

> **The deque always holds vertices in non-decreasing distance order, split across at most two distinct distance values (`d` at the front, `d+1` toward the back).** A 0-edge keeps you in the current layer → push front; a 1-edge advances a layer → push back. This monotonic-deque invariant replaces the heap's ordering.

### 3.3 Implementation

```python
from collections import deque

def zero_one_bfs(graph, n, source):
    """graph[u] = list of (v, w) with w in {0, 1}. Returns dist[] from source.
    Time O(V + E), Space O(V)."""
    INF = float('inf')
    dist = [INF] * n
    dist[source] = 0
    dq = deque([source])

    while dq:
        u = dq.popleft()
        for v, w in graph[u]:
            nd = dist[u] + w
            if nd < dist[v]:                 # RELAX
                dist[v] = nd
                if w == 0:
                    dq.appendleft(v)         # same layer -> front
                else:
                    dq.append(v)             # next layer -> back
    return dist

# 0-cost to move right, 1-cost to move down; reach node 3 cheaply.
graph = {0: [(1, 0), (2, 1)], 1: [(3, 1)], 2: [(3, 0)], 3: []}
print(zero_one_bfs(graph, 4, 0))   # [0, 0, 1, 1]
```

> ⚠️ **Guard the relaxation.** A vertex can be pushed multiple times (once per improving edge). Always check `nd < dist[v]` before updating and pushing, and skip stale pops — otherwise the deque can bloat and correctness slips. This mirrors Dijkstra's lazy-deletion discipline.

### 3.4 Complexity

- **Time:** `O(V + E)` — each edge relaxes a vertex's distance at most a constant number of times; no `log` factor. This is the whole point versus Dijkstra's `O((V+E) log V)`.
- **Space:** `O(V)` for `dist` and the deque.

### 3.5 When to use / when not to

**Use it** when all weights are in `{0, 1}` (or reducible to it) — classic on grids where "continue straight = 0, turn/break = 1." **Don't** use it for general non-negative weights (→ Dijkstra) or when weights can be negative (→ Bellman-Ford). If weights are small integers in `{0..k}`, **Dial's algorithm** (bucket queue) generalizes 0-1 BFS to `O(E + V·k)`.

### 3.6 AI / systems connection

- **Grid navigation with turn costs.** Robot and game pathfinding where straight motion is free but turning costs (minimizing turns) is a 0-1 BFS — e.g., "minimum obstacle removals to reach the exit" (LC 2290) makes wall-breaking the weight-1 edge.
- **Layered reasoning graphs.** Any search where some transitions are "free" (renaming, no-op steps) and others "cost a step" maps onto 0/1 weights, letting you find minimum-cost derivations in linear time.

---

## 4. Choosing the right algorithm

```
Need shortest paths. Ask, in order:

1. Are weights negative?
     YES -> Bellman-Ford (single source) / Johnson's or Floyd-Warshall (all pairs)
     NO  -> continue

2. Do you need ALL pairs?
     YES, dense  -> Floyd-Warshall  O(V^3)
     YES, sparse -> Dijkstra x V     O(V*(V+E) log V)
     NO          -> continue

3. Are all weights 0 or 1?
     YES -> 0-1 BFS (deque)          O(V + E)
     NO  -> continue

4. Are all weights equal (unweighted)?
     YES -> plain BFS                O(V + E)
     NO  -> Dijkstra (single target + heuristic? -> A*)  O((V+E) log V)
```

| Algorithm | Weights | Scope | Time | Detects neg cycle? |
|---|---|---|---|---|
| BFS | all equal | single source | `O(V+E)` | — |
| 0-1 BFS | 0 or 1 | single source | `O(V+E)` | — |
| Dijkstra | ≥ 0 | single source | `O((V+E) log V)` | — |
| Bellman-Ford | any | single source | `O(V·E)` | ✅ |
| Floyd-Warshall | any (no neg cycle) | all pairs | `O(V³)` | ✅ (`dist[i][i]<0`) |

---

## 5. Practice Problems

| # | Problem | Algorithm | What it teaches |
|---|---|---|---|
| 1 | **Cheapest Flights Within K Stops** (LC 787) | Bellman-Ford (bounded rounds) | `k`-round relaxation = "shortest path with ≤ k edges" — the Bellman-Ford invariant made literal. |
| 2 | **Negative-cycle detection / arbitrage** | Bellman-Ford | The `V`-th-pass test; model exchange rates as `-log(rate)`. |
| 3 | **Find the City With the Smallest Number of Neighbors** (LC 1334) | Floyd-Warshall | All-pairs on a small dense graph — the natural fit. |
| 4 | **Evaluate Division** (LC 399) | Floyd-Warshall / DFS | Transitive multiplicative closure — Warshall's structure with products. |
| 5 | **01 Matrix** (LC 542) | Multi-source BFS / 0-1 BFS | Distance to nearest zero; contrast with the 0-1 framing. |
| 6 | **Minimum Obstacle Removal to Reach Corner** (LC 2290) | 0-1 BFS | Empty cell = weight 0, obstacle = weight 1 — the textbook 0-1 BFS. |
| 7 | **Reachability / transitive closure** | Warshall's | Boolean Floyd-Warshall; connect to matrix multiplication. |

### Worked failure mode — why Dijkstra breaks on negatives

```python
# Graph: 0->1 (weight 2), 0->2 (weight 5), 2->1 (weight -4)
# True shortest 0->1 = 0->2->1 = 5 + (-4) = 1, NOT the direct edge 2.
# Dijkstra settles vertex 1 at distance 2 the moment it pops it -- BEFORE
# discovering the cheaper route through vertex 2 -- and never revisits it.
edges = [(0, 1, 2), (0, 2, 5), (2, 1, -4)]
dist, neg = bellman_ford(3, edges, 0)
print(dist)   # [0, 1, 5]  <- Bellman-Ford gets the correct 1; Dijkstra would report 2.
```

**The lesson:** the negative edge `2→1` appears *after* Dijkstra has permanently settled vertex 1. Bellman-Ford's repeated full-edge relaxation is exactly what lets that late discount propagate.

---

## Related Guides

**Prerequisites:** [Shortest Path Algorithms](/docs/shortest-path) · [BFS & DFS Traversal](/docs/bfs-dfs)  
**See also:** [Graph Theory](/docs/graph-theory) · [Minimum Spanning Trees](/docs/minimum-spanning-tree) · [Dynamic Programming](/docs/dynamic-programming)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
