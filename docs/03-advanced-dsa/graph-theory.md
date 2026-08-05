---
title: Graph Theory
slug: /graph-theory
sidebar_position: 3
sidebar_label: Graph Theory
description: >-
  Graph representation, traversal, and the core algorithms that everything else in graphs builds on.
tags:
  - graphs
  - graph-theory
difficulty: advanced
reading_time: 24
prerequisites:
  - title: BFS & DFS Traversal
    to: /docs/bfs-dfs
pagination_prev: 03-advanced-dsa/dynamic-programming
pagination_next: 03-advanced-dsa/shortest-path
path_step: 18
---

# Graph Theory: The Ultimate Reference Guide

> A definitive, self-contained reference on graph representation, BFS, DFS, and
> topological sort — written for engineers preparing for top-tier interviews
> **and** ML engineers designing production AI pipelines. Every algorithm here
> is correct and runnable. Every major section ties back to a concrete AI/ML/LLM
> application.

---

## Table of Contents

1. [Foundations & Terminology](#1-foundations--terminology)
2. [Graph Representations](#2-graph-representations)
3. [Breadth-First Search (BFS)](#3-breadth-first-search-bfs)
4. [Depth-First Search (DFS)](#4-depth-first-search-dfs)
5. [Topological Sort](#5-topological-sort)
6. [BFS vs DFS vs Topological Sort — Comparison](#6-bfs-vs-dfs-vs-topological-sort--comparison)
7. [Expert Patterns, Pro Tips & Interview Insights](#7-expert-patterns-pro-tips--interview-insights)
8. [Graph Theory in Modern AI Systems](#8-graph-theory-in-modern-ai-systems)

---

## 1. Foundations & Terminology

### 1.1 Definition

A **graph** is a pair `G = (V, E)` where:

- `V` is a finite set of **vertices** (also called *nodes*).
- `E ⊆ V × V` is a set of **edges**, each connecting a pair of vertices.

For a **weighted** graph we add a weight function `w : E → ℝ`.

### 1.2 Intuitive Analogy

Think of a **city map**: intersections are vertices, roads are edges. A one-way
street is a **directed** edge; a two-way street is an **undirected** edge. The
distance/time on a road is the edge **weight**. "Can I get from home to the
office?" is a **reachability** question. "What's the fastest route?" is a
**shortest-path** question. Almost every graph problem has a maps-style intuition.

### 1.3 Core Vocabulary

| Term | Meaning |
|---|---|
| **Directed / Undirected** | Edges have direction (`u→v`) or not (`u—v`). |
| **Weighted / Unweighted** | Edges carry a numeric cost, or all cost 1. |
| **Degree** | Number of edges incident to a vertex. Directed graphs split into **in-degree** and **out-degree**. |
| **Path** | Sequence of vertices connected by edges. |
| **Cycle** | Path that starts and ends at the same vertex. |
| **DAG** | Directed Acyclic Graph — directed with no cycles. |
| **Connected** | Undirected graph where every pair is reachable. |
| **Strongly connected** | Directed graph where every pair is mutually reachable. |
| **Tree** | Connected acyclic undirected graph with `V` nodes and `V−1` edges. |
| **Forest** | Disjoint union of trees. |
| **Dense / Sparse** | `E ≈ V²` (dense) vs `E ≈ V` (sparse). Drives representation choice. |
| **Self-loop** | Edge from a vertex to itself. |
| **Multigraph** | Allows multiple edges between the same pair. |
| **Bipartite** | Vertices split into two sets with edges only across sets. |

### 1.4 The Two Numbers That Govern Everything

Nearly all complexity in this guide is expressed in terms of:

- `V` = number of vertices
- `E` = number of edges

Two facts to internalize immediately:

- In a **simple** directed graph, `0 ≤ E ≤ V(V−1)`; undirected, `0 ≤ E ≤ V(V−1)/2`.
- **Sparsity is the norm** in the real world. Social graphs, dependency graphs,
  road networks, and neural computation graphs are all sparse (`E = O(V)` or
  `O(V log V)`), which is *why* adjacency lists and `O(V+E)` traversals dominate.

### 1.5 Expert Takeaway

- **Big-O in graphs is almost always `O(V+E)`, not `O(V²)`.** The moment you see
  `O(V²)`, ask whether an adjacency-matrix assumption is hiding a sparse graph.
- **A DAG is the most important special case in ML.** Every dataflow /
  computation graph (PyTorch autograd, TensorFlow, Airflow, Spark) is a DAG, and
  its execution order is a topological sort.

---

## 2. Graph Representations

How you store a graph determines the asymptotic cost of every operation you run
on it. We build one running example and represent it four ways.

**Running example (directed):**

```
Nodes: A B C D E
Edges: A→B, A→C, B→D, C→D, D→E

        A
       / \
      v   v
      B   C
       \ /
        v
        D
        |
        v
        E
```

### 2.1 Adjacency Matrix

**Definition.** A `V × V` matrix `M` where `M[i][j] = 1` (or the edge weight) if
edge `i→j` exists, else `0`. For undirected graphs the matrix is symmetric.

**Intuitive analogy.** A **seating chart / attendance grid**: rows and columns are
people; a mark at `(i, j)` means "i knows j". Instant to check any single pair,
but you reserve a full grid cell for every *possible* relationship — most stay empty.

**Representation.**

```
     A  B  C  D  E
  A [ 0  1  1  0  0 ]
  B [ 0  0  0  1  0 ]
  C [ 0  0  0  1  0 ]
  D [ 0  0  0  0  1 ]
  E [ 0  0  0  0  0 ]
```

```python
import numpy as np

nodes = ["A", "B", "C", "D", "E"]
idx = {n: i for i, n in enumerate(nodes)}
M = np.zeros((5, 5), dtype=int)
for u, v in [("A","B"), ("A","C"), ("B","D"), ("C","D"), ("D","E")]:
    M[idx[u]][idx[v]] = 1
# Edge query is O(1):  M[idx["A"]][idx["B"]] == 1
```

**Complexity.**

| Operation | Cost |
|---|---|
| Space | `O(V²)` |
| Has-edge `(u,v)?` | `O(1)` |
| Iterate neighbors of `u` | `O(V)` |
| Add / remove edge | `O(1)` |
| Add vertex | `O(V²)` (resize) |

**When to use.** Dense graphs (`E ≈ V²`), or when you need constant-time edge
lookups and matrix algebra (e.g., counting paths of length `k` via `Mᵏ`,
spectral methods, PageRank, GCN message passing).

### 2.2 Adjacency List

**Definition.** An array/dict mapping each vertex to a collection of its
neighbors (with weights, if any).

**Intuitive analogy.** A **contacts app**: each person stores only the handful of
people they actually know — no wasted space on non-relationships.

**Representation.**

```
A -> [B, C]
B -> [D]
C -> [D]
D -> [E]
E -> []
```

```python
from collections import defaultdict

graph = defaultdict(list)
for u, v in [("A","B"), ("A","C"), ("B","D"), ("C","D"), ("D","E")]:
    graph[u].append(v)
# Weighted variant: graph[u].append((v, weight))
```

**Complexity.**

| Operation | Cost |
|---|---|
| Space | `O(V + E)` |
| Has-edge `(u,v)?` | `O(deg(u))` |
| Iterate neighbors of `u` | `O(deg(u))` |
| Add edge | `O(1)` |
| Remove edge | `O(deg(u))` |

**When to use.** The **default** for almost everything: sparse graphs, BFS/DFS,
Dijkstra, topological sort. `O(V+E)` traversals depend on this structure.

> **Pro tip.** If you need both fast neighbor iteration *and* `O(1)` edge lookup,
> back each adjacency list with a `set` instead of a `list`
> (`dict[node] -> set(neighbors)`).

### 2.3 Edge List

**Definition.** A flat list of edges `[(u, v), ...]` (or `(u, v, w)` weighted).

**Intuitive analogy.** A **spreadsheet of transactions** — one row per
relationship, no per-node structure at all.

**Representation.**

```
[ (A,B), (A,C), (B,D), (C,D), (D,E) ]
```

```python
edges = [("A","B"), ("A","C"), ("B","D"), ("C","D"), ("D","E")]
```

**Complexity.**

| Operation | Cost |
|---|---|
| Space | `O(E)` |
| Has-edge `(u,v)?` | `O(E)` |
| Iterate all edges | `O(E)` |
| Add edge | `O(1)` |

**When to use.** Algorithms that process edges globally rather than by vertex:
**Kruskal's MST** (sort all edges), **Bellman-Ford** (relax every edge `V−1`
times), and as a compact serialization/interchange format. Convert to an
adjacency list when you need neighbor queries.

### 2.4 Incidence Matrix

**Definition.** A `V × E` matrix `B`. For directed graphs, column `e = (u→v)` has
`B[u][e] = −1` (tail) and `B[v][e] = +1` (head); for undirected, both endpoints
are `1`.

**Intuitive analogy.** A **circuit/pin diagram**: rows are components (nodes),
columns are wires (edges); each column shows which two components a wire connects.

**Representation (directed, columns = edges e1..e5).**

```
        e1   e2   e3   e4   e5
      (A→B)(A→C)(B→D)(C→D)(D→E)
  A [  -1   -1    0    0    0 ]
  B [  +1    0   -1    0    0 ]
  C [   0   +1    0   -1    0 ]
  D [   0    0   +1   +1   -1 ]
  E [   0    0    0    0   +1 ]
```

**Complexity.**

| Operation | Cost |
|---|---|
| Space | `O(V · E)` |
| Neighbors of `u` | `O(E)` |
| Edges incident to `u` | `O(E)` |

**When to use.** Rare in day-to-day coding, but foundational in **algebraic graph
theory** (the graph Laplacian is `L = B Bᵀ` for the unsigned/oriented incidence
matrix), flow/circuit analysis, and hypergraph modeling. Worth knowing because
**GNN theory and spectral clustering lean on the Laplacian**.

### 2.5 Comparison Table

| Representation | Space | Has-edge | Neighbors of `u` | Best for |
|---|---|---|---|---|
| Adjacency Matrix | `O(V²)` | `O(1)` | `O(V)` | Dense graphs, matrix algebra, GCNs |
| Adjacency List | `O(V+E)` | `O(deg u)` | `O(deg u)` | Sparse graphs, BFS/DFS/Dijkstra (**default**) |
| Edge List | `O(E)` | `O(E)` | `O(E)` | Kruskal, Bellman-Ford, serialization |
| Incidence Matrix | `O(V·E)` | `O(E)` | `O(E)` | Spectral/algebraic theory, flows |

**Edge cases & pitfalls.**

- **Undirected graphs**: remember to insert *both* `(u→v)` and `(v→u)` in an
  adjacency list, and symmetric entries in a matrix. Forgetting the reverse edge
  is the #1 silent bug.
- **Parallel edges / self-loops**: a plain matrix can't represent multigraphs
  (a cell is 0/1); use counts or a list.
- **Dense-graph memory blowup**: an adjacency matrix for `V = 100,000` needs
  `10¹⁰` cells — infeasible. Choose the list.

**Expert takeaway.**

- The representation is a **space-time trade-off in disguise**. Matrix buys
  `O(1)` edge lookups by paying `O(V²)` memory; lists do the opposite.
- **`scipy.sparse` (CSR/CSC)** is the production sweet spot: adjacency-list
  memory with matrix-algebra APIs. This is exactly what GNN frameworks
  (PyG, DGL) use under the hood for sparse message passing.

---

## 3. Breadth-First Search (BFS)

### 3.1 Concept & Analogy

**Definition.** BFS explores a graph in **layers**: it visits all vertices at
distance `k` from the source before any at distance `k+1`. It uses a **FIFO
queue** and produces a **shortest-path tree** for unweighted graphs.

**Intuitive analogy.** **Ripples in a pond.** Drop a stone at the source; the wave
reaches all 1-hop neighbors, then all 2-hop neighbors, and so on. Everything at
radius `k` is touched before radius `k+1`. Equivalently: an epidemic spreading
one handshake at a time.

**Types / variants.**

- **Plain BFS** — reachability / traversal order.
- **Shortest path (unweighted)** — record `dist[]` and `parent[]` while expanding.
- **Multi-source BFS** — seed the queue with several sources at distance 0 (used
  for "nearest of any" problems, flood fill, 0-1 BFS variants).
- **Bidirectional BFS** — search from source and target simultaneously; meets in
  the middle, dramatically cutting the frontier on large graphs.
- **0-1 BFS** — a deque-based variant for graphs with weights in `{0, 1}`.

### 3.2 Algorithm (Pseudocode + Python)

**Pseudocode (iterative, queue-based):**

```
BFS(graph, start):
    visited  <- { start }
    queue    <- [ start ]
    order    <- []
    while queue not empty:
        node <- queue.dequeue()          # FIFO
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)     # mark on ENQUEUE, not dequeue
                queue.enqueue(neighbor)
    return order
```

> **Critical invariant:** mark a node visited the moment you **enqueue** it, not
> when you dequeue it. Marking on dequeue lets the same node be added multiple
> times, breaking the `O(V+E)` bound and corrupting `dist[]`.

**Working Python — traversal:**

```python
from collections import deque

def bfs(graph: dict, start) -> list:
    """
    BFS traversal order on an adjacency-list graph.
    Time:  O(V + E)
    Space: O(V)
    """
    visited = {start}
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order
```

**Working Python — shortest path (unweighted) with path reconstruction:**

```python
from collections import deque

def bfs_shortest_path(graph: dict, start, goal):
    """
    Shortest path (fewest edges) in an unweighted graph.
    Returns (distance, path) or (inf, []) if unreachable.
    Time:  O(V + E)   Space: O(V)
    """
    if start == goal:
        return 0, [start]
    visited = {start}
    parent = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nb in graph.get(node, []):
            if nb not in visited:
                visited.add(nb)
                parent[nb] = node
                if nb == goal:
                    # reconstruct path
                    path, cur = [], nb
                    while cur is not None:
                        path.append(cur)
                        cur = parent[cur]
                    path.reverse()
                    return len(path) - 1, path
                queue.append(nb)
    return float("inf"), []
```

**Multi-source BFS (seed several starts):**

```python
def multi_source_bfs(graph: dict, sources: list) -> dict:
    """Distance from the NEAREST source to every reachable node."""
    from collections import deque
    dist = {s: 0 for s in sources}
    queue = deque(sources)
    while queue:
        node = queue.popleft()
        for nb in graph.get(node, []):
            if nb not in dist:
                dist[nb] = dist[node] + 1
                queue.append(nb)
    return dist
```

### 3.3 Worked Examples

**Example 1 — simple (the running graph).**

```
Nodes: [A, B, C, D, E]
Edges: A→B, A→C, B→D, C→D, D→E
Start: A
```

```
BFS Traversal Order: A → B → C → D → E

Step | Dequeue | Queue after       | Visited
-----+---------+-------------------+---------------------
  0  |   —     | [A]               | {A}
  1  |   A     | [B, C]            | {A, B, C}
  2  |   B     | [C, D]            | {A, B, C, D}
  3  |   C     | [D]               | {A, B, C, D}   (D already visited)
  4  |   D     | [E]               | {A, B, C, D, E}
  5  |   E     | []                | {A, B, C, D, E}
```

**BFS tree / level structure:**

```
Level 0:        A
              /   \
Level 1:     B     C
              \   /
Level 2:        D
                |
Level 3:        E
```

**Example 2 — complex (grid shortest path, unweighted).**

A `4×4` grid; `#` = wall, `.` = open. Move up/down/left/right. Find the shortest
number of steps from `S` to `G`.

```
S . # .
. # . .
. . . #
# . . G
```

```python
def grid_bfs(grid, start, goal):
    from collections import deque
    R, C = len(grid), len(grid[0])
    q = deque([(start, 0)])
    seen = {start}
    while q:
        (r, c), d = q.popleft()
        if (r, c) == goal:
            return d
        for dr, dc in ((1,0), (-1,0), (0,1), (0,-1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C \
               and grid[nr][nc] != '#' and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append(((nr, nc), d + 1))
    return -1  # unreachable

grid = [
    ['S','.','#','.'],
    ['.','#','.','.'],
    ['.','.','.','#'],
    ['#','.','.','G'],
]
print(grid_bfs(grid, (0,0), (3,3)))   # -> 6
```

A grid *is* a graph: each open cell is a vertex, adjacency is the 4-neighborhood.
BFS gives the minimum number of steps because every move has unit cost.

### 3.4 Complexity Analysis

- **Time: `O(V + E)`.** Each vertex is enqueued and dequeued **exactly once**
  (guaranteed by marking visited on enqueue) → `O(V)`. Across all dequeues we scan
  each vertex's adjacency list once → the total neighbor work is
  `Σ deg(v) = O(E)`. Sum: `O(V + E)`.
- **Space: `O(V)`.** The `visited` set holds up to `V` entries; the queue holds at
  most `V` at once (in the worst case, one full level — up to `O(V)`).

> With an **adjacency matrix**, iterating neighbors costs `O(V)` per vertex, so BFS
> degrades to `O(V²)`. This is the classic reason lists beat matrices for traversal.

### 3.5 Applications in AI/ML/LLMs

- **Unweighted shortest paths / hop distance** in knowledge graphs — e.g., "how
  many hops connect entity A to entity B" for KG-RAG retrieval and multi-hop QA.
- **Neural network layer traversal.** A network's layers form a DAG; a BFS/level
  order groups operations that can execute in the same "wave", which is how
  batched, parallel layer scheduling is reasoned about.
- **LLM/agent search — Tree/Graph-of-Thoughts.** BFS explores reasoning branches
  level by level, expanding all candidate thoughts at depth `k` before depth `k+1`
  (breadth-first beam search over reasoning states).
- **Retrieval graph expansion.** GraphRAG expands a query node's neighborhood in
  BFS layers to gather context within `k` hops.
- **Web/crawler frontier & recommendation** ("people within 2 connections"),
  which is literally multi-source / bounded BFS.

### 3.6 Expert Takeaways

- **BFS = shortest path *only* for unweighted (or uniform-weight) graphs.** The
  instant edges have varying weights, you need Dijkstra (non-negative) or
  Bellman-Ford (negative). Reaching for BFS on a weighted graph is a classic trap.
- **Bidirectional BFS** can turn a `b^d` frontier into roughly `2·b^(d/2)` — a
  massive win on large, high-branching graphs (social networks, state spaces).
- **0-1 BFS with a deque** solves `{0,1}`-weighted graphs in `O(V+E)` — push
  0-weight moves to the front, 1-weight moves to the back — a favorite in
  competitive programming and grid problems with "free" moves.

---

## 4. Depth-First Search (DFS)

### 4.1 Concept & Analogy

**Definition.** DFS explores **as deep as possible along each branch before
backtracking**. It uses a **LIFO stack** (explicit, or the call stack via
recursion) and produces a **DFS forest** with a rich edge classification.

**Intuitive analogy.** **Exploring a maze by always taking the next unexplored
corridor**, unrolling a string behind you; when you hit a dead end, you rewind the
string (backtrack) to the last junction with an unexplored corridor. You go deep,
not wide.

**Types / variants.**

- **Recursive DFS** — natural, uses the call stack.
- **Iterative DFS** — explicit stack; avoids recursion-depth limits on deep graphs.
- **Pre-order vs post-order** — record a node on entry (discovery) vs on exit
  (finish). Post-order is the backbone of topological sort and SCC algorithms.
- **DFS with timestamps** — discovery/finish times enable edge classification and
  interval ("parenthesis") reasoning.

### 4.2 Representation — Edge Classification

Running DFS on a directed graph, with `d[v]` = discovery time and `f[v]` = finish
time, classifies every edge `u→v`:

| Edge type | Condition (directed) | Meaning |
|---|---|---|
| **Tree edge** | `v` first discovered via this edge | Part of the DFS tree/forest |
| **Back edge** | `v` is an **ancestor** of `u` (v in recursion stack / gray) | Indicates a **cycle** |
| **Forward edge** | `v` is a **descendant** already finished, `d[u] < d[v]` | Shortcut to a descendant |
| **Cross edge** | neither ancestor nor descendant, `d[v] < d[u]` | Between different subtrees |

> **Cycle-detection rule (directed):** a directed graph has a cycle **iff** DFS
> finds a back edge (an edge to a vertex currently on the recursion stack).
> Undirected graphs use a different rule (any edge to a visited non-parent).

**Parenthesis theorem.** For any two vertices, the intervals `[d[u], f[u]]` and
`[d[v], f[v]]` are either **disjoint** or **nested** — never partially
overlapping. Nesting ⇒ ancestor/descendant relationship. This is the formal engine
behind the edge classification above.

### 4.3 Algorithm (Pseudocode + Python)

**Pseudocode (recursive):**

```
DFS(graph):
    for each vertex v in V:
        color[v] <- WHITE
    time <- 0
    for each vertex v in V:
        if color[v] == WHITE:
            DFS-VISIT(v)

DFS-VISIT(u):
    time <- time + 1;  d[u] <- time;  color[u] <- GRAY   # on the stack
    for each neighbor v of u:
        if color[v] == WHITE:        # tree edge
            parent[v] <- u
            DFS-VISIT(v)
        elif color[v] == GRAY:       # back edge  => CYCLE
            report cycle
    color[u] <- BLACK                 # finished
    time <- time + 1;  f[u] <- time
```

**Working Python — recursive, with timestamps and edge classification:**

```python
def dfs_timed(graph: dict, vertices=None):
    """
    Recursive DFS producing discovery/finish times and edge types.
    Time:  O(V + E)   Space: O(V) (recursion + bookkeeping)
    Colors: WHITE=unseen, GRAY=on stack, BLACK=finished.
    """
    color = {v: "WHITE" for v in (vertices or graph)}
    disc, finish, parent = {}, {}, {}
    edges = {"tree": [], "back": [], "forward": [], "cross": []}
    t = 0

    def visit(u):
        nonlocal t
        t += 1; disc[u] = t; color[u] = "GRAY"
        for v in graph.get(u, []):
            if color.get(v, "WHITE") == "WHITE":
                parent[v] = u
                edges["tree"].append((u, v))
                visit(v)
            elif color[v] == "GRAY":
                edges["back"].append((u, v))           # cycle!
            elif disc[u] < disc[v]:
                edges["forward"].append((u, v))
            else:
                edges["cross"].append((u, v))
        color[u] = "BLACK"
        t += 1; finish[u] = t

    for v in (vertices or graph):
        if color.get(v, "WHITE") == "WHITE":
            visit(v)
    return disc, finish, edges
```

**Working Python — iterative DFS (explicit stack), preorder:**

```python
def dfs_iterative(graph: dict, start) -> list:
    """
    Iterative preorder DFS. Avoids Python recursion limits on deep graphs.
    Time: O(V + E)   Space: O(V)
    """
    visited, order, stack = set(), [], [start]
    while stack:
        node = stack.pop()                 # LIFO
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        # reversed() so neighbors are popped in their natural order
        for nb in reversed(graph.get(node, [])):
            if nb not in visited:
                stack.append(nb)
    return order
```

**Working Python — directed cycle detection (3-color):**

```python
def has_cycle_directed(graph: dict) -> bool:
    """True iff the directed graph contains a cycle (a back edge)."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {v: WHITE for v in graph}

    def visit(u):
        color[u] = GRAY
        for v in graph.get(u, []):
            if color.get(v, WHITE) == GRAY:
                return True                # back edge -> cycle
            if color.get(v, WHITE) == WHITE and visit(v):
                return True
        color[u] = BLACK
        return False

    return any(color[v] == WHITE and visit(v) for v in graph)
```

### 4.4 Worked Examples

**Example 1 — simple (recursive, running graph).**

```
Edges: A→B, A→C, B→D, C→D, D→E   Start: A
DFS preorder:  A → B → D → E → C

Trace (recursive, neighbors in listed order):
  visit A  -> visit B  -> visit D  -> visit E (dead end, backtrack)
                                      backtrack to D, C, B, A
           -> visit C  -> D already BLACK  => forward/cross edge, no re-visit

Discovery/finish (d/f) times:
  A: 1/10   B: 2/7   D: 3/6   E: 4/5   C: 8/9
```

```
DFS tree:                 Edge C→D is a cross/forward edge
   A                       (D finished before C started).
  / \                      Interval nesting (parenthesis theorem):
 B   C                     A( B( D( E ) ) ) C( )
 |
 D
 |
 E
```

**Example 2 — complex (cycle detection).**

```
Edges: 1→2, 2→3, 3→1, 3→4
              ┌────────────┐
              v            │
        1 ──> 2 ──> 3 ─────┘
                    │
                    v
                    4
```

```python
g = {1:[2], 2:[3], 3:[1, 4], 4:[]}
print(has_cycle_directed(g))   # True  (back edge 3→1 closes cycle 1→2→3→1)
```

Removing edge `3→1` makes it a DAG and `has_cycle_directed` returns `False`.

### 4.5 Complexity Analysis

- **Time: `O(V + E)`.** Each vertex is colored once (`O(V)`); each edge is examined
  exactly once when scanning adjacency lists (`O(E)`). Sum: `O(V + E)`.
- **Space: `O(V)`.** Color/disc/finish maps are `O(V)`. Recursion depth (or the
  explicit stack) is up to `O(V)` in the worst case (a path/"linked-list" graph).

> **Pitfall:** recursive DFS on a graph with a very long path can blow Python's
> default recursion limit (`~1000`). Use the **iterative** version, or raise the
> limit deliberately, for deep graphs.

### 4.6 Applications in AI/ML/LLMs

- **Cycle detection in computation graphs.** Autograd frameworks assume a **DAG**;
  DFS-based cycle checks validate that the forward graph is acyclic before
  building the backward pass.
- **Dependency resolution.** DFS post-order underlies topological ordering used by
  build systems, package managers, and ML DAG schedulers (Airflow, Kubeflow).
- **Pathfinding & exhaustive search / backtracking.** DFS is the skeleton of
  constraint solvers, tree-of-thought depth-first exploration, and program-search
  agents that go deep on one hypothesis before backtracking.
- **Transformer attention graphs.** Attention defines a directed graph over tokens;
  DFS/reachability reasoning helps analyze information-flow paths and dependency
  chains across layers.
- **Strongly Connected Components (SCC)** via **Tarjan/Kosaraju** (both DFS-based)
  identify feedback clusters in dependency and citation graphs.

### 4.7 Expert Takeaways

- **Post-order finish times are a superpower.** Sorting vertices by *decreasing*
  finish time yields a topological order (for DAGs) and drives Kosaraju's SCC
  algorithm. Most "advanced DFS" results are really "post-order + timestamps".
- **BFS and DFS differ only in the frontier data structure** — a **queue** (FIFO)
  vs a **stack** (LIFO). Swap the container and the traversal changes character
  entirely. Understanding this makes both algorithms one idea.
- **Recursive DFS hides its stack in the call frames.** That's elegant but risky at
  scale; production graph code on large inputs almost always uses an explicit stack.

---

## 5. Topological Sort

### 5.1 Concept & Analogy

**Definition.** A **topological sort** of a **DAG** is a linear ordering of its
vertices such that for every directed edge `u→v`, `u` appears **before** `v`. It
exists **iff** the graph is a DAG (no cycles).

**Intuitive analogy.** **Getting dressed** (socks before shoes) or a **university
prerequisite chain** (Calc I before Calc II). Each task depends on others being
done first; a topological order is any valid schedule that respects all
"before" constraints. There can be **many** valid orders.

**Types / variants.**

- **Kahn's algorithm (BFS-based)** — repeatedly remove zero-in-degree vertices.
  Naturally detects cycles and supports level/"generation" grouping.
- **DFS-based** — order by *decreasing* finish time (push each node on exit).
- **Lexicographically smallest order** — Kahn's with a min-heap instead of a queue.

### 5.2 Algorithm (Pseudocode + Python)

**Kahn's algorithm — pseudocode:**

```
KAHN(graph):
    compute in_degree[v] for all v
    queue <- all vertices with in_degree == 0
    order <- []
    while queue not empty:
        u <- queue.dequeue()
        order.append(u)
        for each neighbor v of u:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.enqueue(v)
    if len(order) != V:
        raise "cycle detected — not a DAG"   # some nodes never hit in-degree 0
    return order
```

**Working Python — Kahn's (BFS-based), with cycle detection:**

```python
from collections import deque, defaultdict

def topo_sort_kahn(graph: dict):
    """
    Topological order via Kahn's algorithm.
    Raises ValueError if the graph has a cycle.
    Time: O(V + E)   Space: O(V)
    """
    in_deg = defaultdict(int)
    nodes = set(graph)
    for u in graph:
        for v in graph[u]:
            in_deg[v] += 1
            nodes.add(v)
    for n in nodes:
        in_deg.setdefault(n, 0)

    queue = deque([n for n in nodes if in_deg[n] == 0])
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph.get(u, []):
            in_deg[v] -= 1
            if in_deg[v] == 0:
                queue.append(v)

    if len(order) != len(nodes):
        raise ValueError("Graph has a cycle — no topological order exists")
    return order
```

**Working Python — DFS-based topological sort:**

```python
def topo_sort_dfs(graph: dict):
    """
    Topological order via DFS post-order (reverse finish order).
    Raises ValueError on a cycle.  Time: O(V + E)  Space: O(V)
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = defaultdict(int)                 # default WHITE = 0
    nodes = set(graph) | {v for u in graph for v in graph[u]}
    order = []

    def visit(u):
        color[u] = GRAY
        for v in graph.get(u, []):
            if color[v] == GRAY:
                raise ValueError("Cycle detected — not a DAG")
            if color[v] == WHITE:
                visit(v)
        color[u] = BLACK
        order.append(u)                      # push on FINISH (post-order)

    for n in nodes:
        if color[n] == WHITE:
            visit(n)
    return order[::-1]                        # reverse => topological order
```

**Lexicographically smallest order (Kahn's + heap):**

```python
import heapq
from collections import defaultdict

def topo_sort_lex(graph: dict):
    in_deg = defaultdict(int)
    nodes = set(graph) | {v for u in graph for v in graph[u]}
    for u in graph:
        for v in graph[u]:
            in_deg[v] += 1
    heap = [n for n in nodes if in_deg[n] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        u = heapq.heappop(heap)              # smallest available
        order.append(u)
        for v in graph.get(u, []):
            in_deg[v] -= 1
            if in_deg[v] == 0:
                heapq.heappush(heap, v)
    if len(order) != len(nodes):
        raise ValueError("Cycle detected")
    return order
```

### 5.3 Worked Examples

**Example 1 — simple (running graph is already a DAG).**

```
Edges: A→B, A→C, B→D, C→D, D→E
In-degrees:  A:0  B:1  C:1  D:2  E:1

Kahn's trace:
  in_deg0 queue = [A]
  pop A -> order=[A];   B:0, C:0   -> queue=[B, C]
  pop B -> order=[A,B]; D:1                 queue=[C]
  pop C -> order=[A,B,C]; D:0     -> queue=[D]
  pop D -> order=[A,B,C,D]; E:0   -> queue=[E]
  pop E -> order=[A,B,C,D,E]

Valid topological order: A, B, C, D, E
```

> Note the order is **not unique**: `A, C, B, D, E` is equally valid, since `B`
> and `C` are independent. Any order respecting all `u→v` constraints is correct.

**Example 2 — complex (course scheduling with a cycle check).**

```
Courses: intro, data_struct, algorithms, ml, db, capstone
Prereqs (edge = "must precede"):
  intro -> data_struct
  intro -> db
  data_struct -> algorithms
  algorithms -> ml
  db -> ml
  ml -> capstone
  algorithms -> capstone
```

```
       intro
       /    \
data_struct  db
      |        \
 algorithms     \
     |   \        \
     ml <-+--------+
     |
  capstone
```

```python
courses = {
    "intro":       ["data_struct", "db"],
    "data_struct": ["algorithms"],
    "algorithms":  ["ml", "capstone"],
    "db":          ["ml"],
    "ml":          ["capstone"],
    "capstone":    [],
}
print(topo_sort_kahn(courses))
# e.g. ['intro', 'data_struct', 'db', 'algorithms', 'ml', 'capstone']

# Introduce a cycle: capstone -> intro
courses["capstone"] = ["intro"]
try:
    topo_sort_kahn(courses)
except ValueError as e:
    print(e)   # Graph has a cycle — no topological order exists
```

### 5.4 Complexity Analysis

- **Time: `O(V + E)`** for both Kahn's and DFS. Kahn's computes in-degrees in
  `O(V+E)`, then each vertex is enqueued/dequeued once and each edge relaxed once.
  DFS visits each vertex and edge once.
- **Space: `O(V)`** for the in-degree map / color map, queue/stack, and output list
  (plus `O(V)` recursion depth for the recursive DFS variant).

### 5.5 DAG Validation / Cycle Detection

Both algorithms detect cycles for free:

- **Kahn's:** if the output has fewer than `V` vertices, some never reached
  in-degree 0 → they sit inside a cycle → **not a DAG**.
- **DFS:** encountering a **GRAY** (on-stack) neighbor is a **back edge** → cycle.

### 5.6 Applications in AI/ML/LLMs

- **ML DAG schedulers.** **Airflow**, **Kubeflow**, **Dagster**, **Luigi**, and
  **Spark** execute tasks in topological order of a dependency DAG.
- **PyTorch/TensorFlow autograd.** The forward pass builds a DAG of operations;
  **backpropagation walks it in reverse topological order** so every node's
  gradient is available before its inputs' gradients are computed.
- **LLM inference & agent pipelines.** Multi-step chains (retrieve → rerank →
  generate → verify) and DAG-structured agent workflows (LangGraph) execute nodes
  in dependency order; topological sort finds a valid execution schedule and
  detects illegal cycles.
- **Build systems & feature stores.** `make`, Bazel, dbt, and feature-engineering
  DAGs all resolve build/compute order via topological sort.
- **Symbolic/probabilistic models.** Bayesian networks are DAGs; ancestral
  sampling and variable-elimination orderings rely on topological order.

### 5.7 Expert Takeaways

- **Kahn's vs DFS is a choice about what you also need.** Kahn's gives cheap cycle
  detection *and* natural **level grouping** (all zero-in-degree nodes in one
  "generation" can run in parallel — exactly what a scheduler wants). DFS is a few
  lines shorter and fits when you already have DFS machinery.
- **The reverse topological order is the gradient order.** If you understand
  topological sort, you understand the *scheduling* half of backprop.
- **"Longest path in a DAG" is easy (`O(V+E)`) but NP-hard in general graphs.**
  Process vertices in topological order and relax edges — this is the basis of
  **critical-path / PERT** scheduling for pipeline latency analysis.

---

## 6. BFS vs DFS vs Topological Sort — Comparison

### 6.1 Side-by-Side Table

| Aspect | BFS | DFS | Topological Sort |
|---|---|---|---|
| **Frontier structure** | Queue (FIFO) | Stack (LIFO) / recursion | Queue (Kahn) or DFS post-order |
| **Exploration order** | Layer by layer (breadth) | Deep along a branch, backtrack | Dependency order |
| **Graph type** | Any | Any | **DAG only** |
| **Time** | `O(V+E)` | `O(V+E)` | `O(V+E)` |
| **Space** | `O(V)` (wide frontier) | `O(V)` (deep recursion) | `O(V)` |
| **Shortest path?** | ✅ unweighted | ❌ (not shortest) | N/A |
| **Cycle detection?** | ✅ (undirected; directed via extra state) | ✅ back edge (natural) | ✅ (< V nodes ⇒ cycle) |
| **Output** | Levels / shortest-path tree | DFS forest, disc/finish times | Linear dependency order |
| **Signature use** | Shortest hops, level order, flood fill | Cycle detect, SCC, backtracking | Scheduling, build order, backprop |

### 6.2 Decision Guide — When to Use Which

- **"Fewest hops / shortest path in an unweighted graph?"** → **BFS**.
- **"Nearest of several targets?" / "flood fill from many sources?"** → **multi-source BFS**.
- **"Does this directed graph have a cycle?" / "connected components / SCC?"** → **DFS**.
- **"Explore/enumerate all possibilities, backtracking?"** → **DFS** (backtracking).
- **"In what order can I run these dependent tasks?" / "valid build or execution order?"** → **Topological sort** (needs a DAG).
- **"Can I even schedule these tasks (no circular dependency)?"** → **Topological sort** or DFS cycle check.
- **Weighted shortest path?** → not covered by these three: use **Dijkstra**
  (non-negative weights) or **Bellman-Ford** (negative weights allowed).

> **Memory hook:** *Queue = wide = BFS. Stack = deep = DFS. Dependencies = order = Topo.*

---

## 7. Expert Patterns, Pro Tips & Interview Insights

### 7.1 Interview Patterns (Recognition → Tool)

| Problem phrasing | Reach for |
|---|---|
| "shortest path in a grid/maze/unweighted graph" | BFS |
| "minimum number of steps/moves/transformations" | BFS (state graph) |
| "number of islands / connected regions" | DFS or BFS flood fill |
| "clone a graph / traverse all nodes" | DFS or BFS |
| "detect a cycle (directed)" | DFS 3-color / Kahn's count |
| "course schedule / task ordering / build order" | Topological sort |
| "word ladder / shortest transformation" | BFS (implicit graph) |
| "all paths from A to B" | DFS + backtracking |
| "bipartite check / 2-coloring" | BFS/DFS coloring |
| "strongly connected components" | Tarjan / Kosaraju (DFS) |

### 7.2 Pro Tips

- **Model implicit graphs.** Many problems have no explicit graph — a grid, a set
  of word transformations, or game states. The trick is spotting that "states +
  legal transitions" *is* a graph, then applying BFS/DFS.
- **Mark visited on enqueue (BFS), color GRAY on entry (DFS).** These invariants
  are where most bugs live.
- **Prefer iterative for depth.** Deep or adversarial inputs blow recursion limits;
  keep an iterative DFS in your back pocket.
- **`visited` as a `set`, adjacency as `defaultdict(list)`.** Idiomatic, `O(1)`
  membership, no `KeyError` on leaf nodes.
- **`collections.deque`, never `list.pop(0)`.** `list.pop(0)` is `O(n)` and turns
  an `O(V+E)` BFS into `O(V·E)`.
- **Bidirectional BFS** for large state spaces with a known target.
- **Kahn's for parallel scheduling.** The set of current zero-in-degree nodes is a
  "wave" of tasks that can run concurrently — directly useful in pipeline design.

### 7.3 Graph Problems in ML System Design

- **Feature/data lineage as a DAG.** Interviewers love "design a feature store" —
  the answer hinges on a dependency DAG, topological execution, and cycle
  prevention.
- **Pipeline orchestration.** "Design a training pipeline / workflow engine" →
  DAG scheduling (topo sort), critical-path latency (longest path in a DAG),
  and fan-out parallelism (level grouping from Kahn's).
- **Model/service dependency graphs.** Microservice or model-ensemble dependency
  resolution, deadlock (cycle) detection, and staged rollout ordering.
- **Knowledge-graph retrieval.** Multi-hop reasoning = bounded BFS/DFS over an
  entity graph; ranking neighbors = weighted expansion.

### 7.4 Computation Graphs in PyTorch / TensorFlow

- **Forward pass builds a DAG.** Each tensor op is a node; edges point from inputs
  to outputs. PyTorch builds this **dynamically** (define-by-run); classic
  TensorFlow 1.x built it **statically** first, then ran it.
- **Backprop = reverse topological traversal.** Autograd sorts the graph
  topologically and walks it **in reverse**, so each node receives the upstream
  gradient before computing its own — the chain rule executed in dependency order.
- **Acyclicity is mandatory.** Because gradients require a well-defined order, the
  op graph must be a **DAG**; a cycle would make "which gradient first?"
  ill-defined. (RNNs *appear* cyclic but are **unrolled through time** into a DAG.)
- **Graph optimizations are graph algorithms.** Operator fusion, dead-node
  elimination, and common-subexpression elimination are transformations on this
  DAG — reachability, dominators, and topological passes in disguise.
- **GNN message passing = the representations from Section 2.** Sparse adjacency
  (CSR) + neighbor aggregation is literally "iterate the adjacency list and
  reduce", which is why representation choice drives GNN performance.

---

## 8. Graph Theory in Modern AI Systems

A consolidated map of where each concept shows up in production AI/ML/LLM work:

| Concept | Where it lives in AI/ML/LLMs |
|---|---|
| **Adjacency list / CSR sparse matrix** | GNN frameworks (PyG, DGL) store graphs as sparse adjacency for message passing. |
| **Adjacency matrix / `Mᵏ`** | Spectral methods, PageRank, GCN propagation (`ÂXW`), path counting. |
| **Graph Laplacian (incidence matrix)** | Spectral clustering, GNN theory, positional encodings on graphs. |
| **BFS (layers / hops)** | KG multi-hop retrieval, GraphRAG neighborhood expansion, Tree/Graph-of-Thought breadth search, layer-wise NN scheduling. |
| **DFS (backtracking / edges)** | Cycle validation of compute graphs, dependency resolution, SCC, depth-first reasoning/program search. |
| **Topological sort** | Airflow/Kubeflow/Dagster schedulers, PyTorch/TF autograd (reverse-topo backprop), dbt/Bazel builds, Bayesian-network ordering. |
| **DAG + longest path** | Critical-path latency analysis for training/inference pipelines. |
| **Bipartite / matching** | User–item recommendation graphs, entity resolution. |
| **Shortest path (weighted)** | Routing, retrieval ranking (extends BFS via Dijkstra). |

### Closing Synthesis

Four ideas unlock the entire domain:

1. **A graph is just `(V, E)`** — and choosing how to store `E` (list vs matrix)
   sets the cost of everything else.
2. **BFS and DFS are the same traversal with a different frontier** — swap a queue
   for a stack. BFS gives you *distance/layers*; DFS gives you *structure and
   timing (finish times)*.
3. **Topological sort is post-order DFS (or Kahn's) applied to a DAG** — and its
   *reverse* is the order backprop runs in. Master it and you understand how every
   modern ML pipeline and autograd engine schedules work.
4. **Almost every AI system is a graph** — computation graphs, knowledge graphs,
   attention graphs, dependency DAGs. The `O(V+E)` traversal you learned for
   interviews is the same one running inside PyTorch, Airflow, and your RAG stack.

---

*End of reference guide.*

---

## Related Guides

**Prerequisites:** [BFS & DFS Traversal](/docs/bfs-dfs)  
**See also:** [Shortest Path Algorithms](/docs/shortest-path) · [Union-Find (Disjoint Set Union)](/docs/union-find) · [Graph Algorithms for KG & GraphRAG](/docs/graph-algorithms-kg-graphrag)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
