---
title: Graph Connectivity — SCC, Bridges, Articulation Points & Bipartite
slug: /graph-connectivity
sidebar_position: 12
sidebar_label: Graph Connectivity
description: >-
  DFS-timestamp algorithms for deep graph structure — strongly connected components (Kosaraju & Tarjan), bridges, articulation points, and bipartite checking.
tags:
  - graphs
  - scc
  - tarjan
  - connectivity
difficulty: advanced
reading_time: 24
prerequisites:
  - title: Graph Theory
    to: /docs/graph-theory
  - title: BFS & DFS Traversal
    to: /docs/bfs-dfs
pagination_prev: advanced-dsa/minimum-spanning-tree
pagination_next: advanced-dsa/string-matching
path_step: 26
---

# Graph Connectivity: SCC, Bridges, Articulation Points & Bipartite

> [Graph Theory](/docs/graph-theory) covered BFS, DFS, and topological sort. This guide goes deeper into **graph structure**: which vertices are mutually reachable (**strongly connected components**), which edges/vertices are *critical* to connectivity (**bridges** and **articulation points**), and whether a graph is **2-colorable** (**bipartite**). The unifying tool is DFS augmented with **discovery timestamps** and **low-link values** — one idea that answers all of these.

The `disc[]`/`finish[]` timestamps and edge classification from [Graph Theory §4](/docs/graph-theory) are the foundation; if "back edge" and "DFS finish time" aren't reflexes yet, review that first.

---

## 1. Strongly Connected Components (SCC)

### 1.1 What and why

In a **directed** graph, a **Strongly Connected Component** is a maximal set of vertices where **every vertex can reach every other** vertex in the set. Contracting each SCC to a single node turns any digraph into a **DAG** (the "condensation"), which is why SCC is the standard first step for analyzing cyclic dependency graphs.

**Why it matters.** Deadlock/feedback detection (mutually-dependent modules), 2-SAT solving, collapsing cyclic dependency graphs into a schedulable DAG, and finding "clusters" of mutual reachability in citation/knowledge graphs.

### 1.2 Kosaraju's algorithm — two passes, dead simple

> **Idea:** Run DFS and record vertices by **finish time**. Then DFS the **transpose graph** (all edges reversed) in *decreasing* finish-time order. Each tree in that second forest is one SCC.

**Why it works (intuition):** finishing order gives a reverse-topological order of the condensation DAG. Reversing edges keeps SCCs intact but flips the DAG, so starting from the last-finished vertex confines each DFS to exactly one SCC.

```python
def kosaraju(n, adj):
    """adj: list of out-neighbor lists (directed). Returns list of SCCs.
    Time O(V + E), Space O(V + E)."""
    # Pass 1: order vertices by DFS finish time (iterative to avoid recursion limits)
    visited = [False] * n
    order = []
    for s in range(n):
        if visited[s]:
            continue
        stack = [(s, 0)]
        visited[s] = True
        while stack:
            u, i = stack.pop()
            if i < len(adj[u]):
                stack.append((u, i + 1))          # resume u after this neighbor
                v = adj[u][i]
                if not visited[v]:
                    visited[v] = True
                    stack.append((v, 0))
            else:
                order.append(u)                   # u finishes -> record
    # Build the transpose (reversed edges)
    radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)
    # Pass 2: DFS transpose in reverse finish order; each tree is one SCC
    comp = [-1] * n
    sccs = []
    for u in reversed(order):
        if comp[u] != -1:
            continue
        stack, members = [u], []
        comp[u] = len(sccs)
        while stack:
            x = stack.pop()
            members.append(x)
            for y in radj[x]:
                if comp[y] == -1:
                    comp[y] = len(sccs)
                    stack.append(y)
        sccs.append(members)
    return sccs

adj = {0: [1], 1: [2], 2: [0, 3], 3: [4], 4: [5], 5: [3]}
print(kosaraju(6, [adj[i] for i in range(6)]))
# -> [[0, 2, 1], [3, 5, 4]]   two SCCs: {0,1,2} and {3,4,5}
```

### 1.3 Tarjan's algorithm — one pass with low-link

Tarjan finds SCCs in a **single DFS** using a `low[]` value: `low[u]` is the smallest discovery time reachable from `u`'s subtree via at most one back/cross edge into the current stack. When `low[u] == disc[u]`, `u` is the **root** of an SCC and everything above it on a maintained stack forms that component.

```python
def tarjan_scc(n, adj):
    """Single-pass SCC via low-link values. Returns list of SCCs. O(V + E)."""
    import sys
    sys.setrecursionlimit(1 << 20)
    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack = []
    sccs = []
    timer = [0]

    def dfs(u):
        disc[u] = low[u] = timer[0]; timer[0] += 1
        stack.append(u); on_stack[u] = True
        for v in adj[u]:
            if disc[v] == -1:                 # tree edge
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:                 # back edge into the current SCC
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:                 # u is an SCC root
            comp = []
            while True:
                w = stack.pop(); on_stack[w] = False
                comp.append(w)
                if w == u:
                    break
            sccs.append(comp)

    for s in range(n):
        if disc[s] == -1:
            dfs(s)
    return sccs

adj = [[1], [2], [0, 3], [4], [5], [3]]
print(tarjan_scc(6, adj))   # [[3, 5, 4], [0, 2, 1]] (order differs from Kosaraju)
```

### 1.4 Kosaraju vs. Tarjan

| | Kosaraju | Tarjan |
|---|---|---|
| DFS passes | **2** (+ build transpose) | **1** |
| Extra structure | reversed graph | low-link + explicit stack |
| Constant factor | higher (transpose + 2 walks) | **lower** (single walk) |
| Conceptual clarity | easier to explain | trickier `low` invariant |
| Time | `O(V+E)` | `O(V+E)` |

Both are linear; Tarjan is usually faster in practice (one pass, no transpose), Kosaraju is easier to remember and implement correctly.

---

## 2. Bridges & Articulation Points (undirected)

These identify the **single points of failure** in an undirected graph.

- A **bridge** is an edge whose removal **disconnects** the graph (increases the number of components).
- An **articulation point** (cut vertex) is a vertex whose removal disconnects the graph.

Both are found with the **same DFS + low-link machinery** as Tarjan, adapted to undirected graphs. Here `low[u]` = the earliest-discovered vertex reachable from `u`'s subtree using tree edges plus at most one back edge.

### 2.1 The criteria (the whole insight)

> - **Edge `(u, v)`** (with `v` a child of `u` in the DFS tree) is a **bridge** iff `low[v] > disc[u]` — `v`'s subtree has **no** back edge climbing above `u`, so cutting `(u,v)` isolates it.
> - **Vertex `u`** is an **articulation point** iff either (a) `u` is the DFS **root with ≥ 2 children**, or (b) `u` is non-root and has a child `v` with `low[v] >= disc[u]` — `v`'s subtree cannot bypass `u` to reach an ancestor.

The `>` (strict) for bridges vs. `>=` for articulation points is deliberate and is the classic source of bugs.

### 2.2 Implementation (bridges + articulation points together)

```python
def bridges_and_articulation(n, adj):
    """adj: undirected adjacency lists. Returns (bridges, articulation_points).
    Time O(V + E)."""
    disc = [-1] * n
    low = [0] * n
    timer = [0]
    bridges = []
    ap = set()

    def dfs(u, parent):
        disc[u] = low[u] = timer[0]; timer[0] += 1
        children = 0
        for v in adj[u]:
            if v == parent:
                continue                      # don't go straight back up the tree edge
            if disc[v] == -1:                 # tree edge
                children += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:          # STRICT: bridge
                    bridges.append((u, v))
                if parent != -1 and low[v] >= disc[u]:   # non-root articulation
                    ap.add(u)
            else:                             # back edge
                low[u] = min(low[u], disc[v])
        if parent == -1 and children > 1:     # root articulation
            ap.add(u)

    for s in range(n):
        if disc[s] == -1:
            dfs(s, -1)
    return bridges, sorted(ap)

adj = {0: [1, 2], 1: [0, 2], 2: [0, 1, 3], 3: [2, 4], 4: [3]}
print(bridges_and_articulation(5, [adj[i] for i in range(5)]))
# -> ([(2, 3), (3, 4)], [2, 3])
# Edges 2-3 and 3-4 are bridges; vertices 2 and 3 are cut vertices.
# The triangle {0,1,2} is 2-edge-connected, so none of its internal edges are bridges.
```

### 2.3 Complexity & pitfalls

- **Time:** `O(V + E)` — one DFS. **Space:** `O(V)` (+ recursion; use iterative or raise the limit on deep graphs).
- **Parallel edges.** With multi-edges, a repeated edge is *never* a bridge — track edge *ids*, not just the parent vertex, or you'll wrongly climb back a duplicate edge.
- **`>` vs `>=`.** Bridges use strict `>`, articulation points use `>=`. Swapping them is the #1 bug.
- **Root special case.** The DFS root is an articulation point *only* if it has ≥ 2 DFS children — the child-count check, not the low-link rule, decides the root.

### 2.4 AI / systems connection

- **Network reliability & robustness.** Bridges and cut vertices are literal single points of failure in communication, power, and service-dependency graphs — you monitor and redundantly provision them.
- **Knowledge-graph robustness.** In a KG powering GraphRAG, an articulation entity is a chokepoint whose removal fragments retrieval reachability; identifying them highlights fragile parts of the schema.

---

## 3. Bipartite Checking

### 3.1 What and why

A graph is **bipartite** if its vertices can be **2-colored** so that no edge joins two same-colored vertices — equivalently, it has **no odd-length cycle**. Bipartite structure underlies matching problems (jobs↔workers, users↔items), conflict-free scheduling, and is a precondition for bipartite-matching and max-flow formulations.

### 3.2 Algorithm — 2-coloring via BFS/DFS

> **Color the start vertex 0. Every neighbor must get the opposite color. If you ever try to color a vertex with a color that conflicts with an already-assigned one, an odd cycle exists → not bipartite.**

```python
from collections import deque

def is_bipartite(n, adj):
    """adj: undirected adjacency lists. Returns (True, coloring) or (False, None).
    Handles disconnected graphs. Time O(V + E)."""
    color = [-1] * n
    for s in range(n):
        if color[s] != -1:
            continue
        color[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if color[v] == -1:            # uncolored -> take the opposite color
                    color[v] = color[u] ^ 1
                    q.append(v)
                elif color[v] == color[u]:    # same color across an edge -> odd cycle
                    return False, None
    return True, color

adj_ok  = {0: [1, 3], 1: [0, 2], 2: [1, 3], 3: [0, 2]}   # a 4-cycle: bipartite
adj_bad = {0: [1, 2], 1: [0, 2], 2: [0, 1]}              # a triangle: NOT bipartite
print(is_bipartite(4, [adj_ok[i]  for i in range(4)])[0])   # True
print(is_bipartite(3, [adj_bad[i] for i in range(3)])[0])   # False
```

- **Complexity:** `O(V + E)`, `O(V)` space. **Disconnected graphs:** loop over all vertices so every component is colored.
- **Union-Find alternative:** you can also detect bipartiteness incrementally with a DSU over `2n` "nodes" (each vertex split into "even" and "odd") — useful when edges arrive online.

### 3.3 Beyond checking — bipartite matching (concept)

Once a graph is bipartite, **maximum bipartite matching** asks for the largest set of edges with no shared endpoint (assign the most jobs to workers). The standard algorithms:

- **Kuhn's / Hungarian augmenting-path** algorithm: repeatedly find an augmenting path and flip it, `O(V·E)`.
- **Hopcroft–Karp**: batches augmenting paths for `O(E·√V)`.
- **Max-flow reduction**: add a super-source → left set → right set → super-sink, all unit capacities; **max flow = maximum matching** (König's theorem ties this to minimum vertex cover).

> Full matching and max-flow/min-cut implementations (Ford–Fulkerson, Edmonds–Karp, Dinic) are a substantial topic in their own right and are **deferred** to keep this guide focused; the reduction above and König's theorem are the essential bridge to know. See [Deferred topics](#4-what-this-guide-deliberately-defers).

### 3.4 AI / systems connection

- **Assignment problems.** Bipartite matching assigns GPUs↔jobs, requests↔replicas, or labels↔predictions (the **Hungarian algorithm** solves the assignment cost-minimization used in **DETR**-style object detection to match predicted boxes to ground truth).
- **Recommendation & ad allocation.** User↔item and advertiser↔impression allocations are bipartite matching / flow problems at their core.

---

## 4. What this guide deliberately defers

To keep depth over breadth, these related topics are intentionally **not** implemented here (they warrant their own treatment): **max-flow / min-cut** (Ford–Fulkerson, Edmonds–Karp, Dinic), **full bipartite matching** implementations (Hopcroft–Karp), **Eulerian path/circuit** (Hierholzer's algorithm), and **2-SAT** (which builds directly on the SCC algorithms above). The SCC, low-link, and bipartite foundations in this guide are the prerequisites for all of them.

---

## 5. Summary — one DFS, many structures

| Question | Graph type | Tool | Key criterion |
|---|---|---|---|
| Mutually reachable groups? | directed | Kosaraju / Tarjan | `low[u] == disc[u]` (Tarjan root) |
| Critical edge? | undirected | low-link DFS | `low[v] > disc[u]` (bridge) |
| Critical vertex? | undirected | low-link DFS | `low[v] >= disc[u]` (articulation) |
| 2-colorable? | undirected | BFS/DFS coloring | no edge joins equal colors |

Every row is a variation on **DFS with discovery times and low-link values**. Internalize that single machine and the whole family collapses into one idea with different read-out rules.

---

## 6. Practice Problems

| # | Problem | Topic | What it teaches |
|---|---|---|---|
| 1 | **Critical Connections in a Network** (LC 1192) | Bridges | The bridge criterion `low[v] > disc[u]` verbatim. |
| 2 | **Is Graph Bipartite?** (LC 785) | Bipartite | 2-coloring with disconnected components. |
| 3 | **Possible Bipartition** (LC 886) | Bipartite | "Dislike" edges → 2-coloring; models conflict-free grouping. |
| 4 | **Number of Strongly Connected Components** | SCC | Kosaraju or Tarjan on a directed graph. |
| 5 | **Course Schedule II** (LC 210) | SCC / topo | Cycle = SCC of size > 1 blocks a valid order; ties SCC to topological sort. |
| 6 | **Redundant Connection** (LC 684) | Connectivity | DSU cycle detection — contrast with the DFS-based bridge approach. |
| 7 | **Minimize Malware Spread** (LC 924) | Articulation / components | Component sizes + critical nodes; combines DSU and cut-vertex thinking. |

### Worked note — why `low[v] > disc[u]` means "bridge"

`low[v]` is the earliest vertex `v`'s subtree can reach *without using the tree edge `(u,v)`*. If `low[v] > disc[u]`, then **nothing in `v`'s subtree can reach `u` or any ancestor of `u`** except through `(u, v)` itself. So deleting `(u, v)` strands the entire subtree — it is a bridge. If instead `low[v] <= disc[u]`, some back edge from the subtree climbs to `u` or above, providing an alternate route, and the edge is redundant. **Failure mode:** using `>=` here would flag *every* tree edge as a bridge, because `low[v] >= disc[v] > disc[u]` trivially — the strict `>` compares against `u`, not `v`.

---

## Related Guides

**Prerequisites:** [Graph Theory](/docs/graph-theory) · [BFS & DFS Traversal](/docs/bfs-dfs)  
**See also:** [Union-Find (Disjoint Set Union)](/docs/union-find) · [Minimum Spanning Trees](/docs/minimum-spanning-tree) · [Graph Algorithms for KG & GraphRAG](/docs/graph-algorithms-kg-graphrag)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
