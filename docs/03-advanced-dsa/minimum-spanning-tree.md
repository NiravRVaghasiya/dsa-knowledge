---
title: Minimum Spanning Trees — Kruskal & Prim
slug: /minimum-spanning-tree
sidebar_position: 11
sidebar_label: Minimum Spanning Trees
description: >-
  The two canonical MST algorithms — Kruskal (sort edges + union-find) and Prim (grow one tree with a heap) — with the cut/cycle properties that prove them correct.
tags:
  - mst
  - kruskal
  - prim
  - greedy
  - graphs
difficulty: advanced
reading_time: 20
prerequisites:
  - title: Union-Find (Disjoint Set Union)
    to: /docs/union-find
  - title: Greedy Algorithms & Interval Scheduling
    to: /docs/greedy-algorithms
pagination_prev: advanced-dsa/advanced-shortest-paths
pagination_next: advanced-dsa/graph-connectivity
path_step: 25
---

# Minimum Spanning Trees: Kruskal & Prim

> A **Minimum Spanning Tree (MST)** of a connected, weighted, undirected graph is a subset of edges that connects all vertices with **no cycles** and **minimum total weight**. It is the cheapest way to wire everything together. Two greedy algorithms find it optimally — **Kruskal** and **Prim** — and both are worth knowing because they showcase *different* greedy structures and *different* supporting data structures ([union-find](/docs/union-find) vs. [heaps](/docs/heaps-and-priority-queues)).

The [Union-Find guide](/docs/union-find) already introduced Kruskal's *edge-acceptance step* as the flagship DSU application. This guide completes the picture: the full MST algorithms, Prim's alternative, and the **cut/cycle properties** that prove why greedy is optimal here (unlike most greedy problems).

---

## 1. Foundations

### 1.1 What is an MST and why does it exist?

Given `G = (V, E)` connected and weighted, a **spanning tree** is any acyclic connected subgraph touching all `V` vertices (exactly `V-1` edges). The **minimum** spanning tree minimizes the sum of chosen edge weights.

**Why it exists / where it's used.** MST is the mathematical core of "connect everything as cheaply as possible": network/cable/road layout, clustering (cutting the longest MST edges yields clusters), approximation algorithms (a 2-approximation for metric TSP uses an MST), image segmentation, and circuit design. It is one of the oldest studied graph problems (Borůvka, 1926).

### 1.2 The two properties that make greedy provably optimal

Most greedy algorithms need careful exchange-argument proofs. MST greed is justified by two clean structural facts:

- **Cut property.** For any partition of vertices into two non-empty sets (a "cut"), the **minimum-weight edge crossing the cut is in *some* MST.** (This is *why* it is always safe to add the cheapest edge that connects two currently-separate groups.)
- **Cycle property.** For any cycle, the **maximum-weight edge on that cycle is in *no* MST.** (This is *why* it is always safe to reject an edge that would close a cycle.)

Kruskal is the cycle property in action (reject cycle-closing edges); Prim is the cut property in action (always add the cheapest edge leaving the growing tree). If all edge weights are **distinct**, the MST is **unique**; ties can yield multiple MSTs of equal total weight.

---

## 2. Kruskal's Algorithm

### 2.1 Intuition

> **Sort all edges by weight ascending. Walk them cheapest-first, adding an edge to the MST iff it connects two so-far-separate components** (i.e., it doesn't form a cycle). Stop when you've added `V-1` edges.

It grows a **forest** that gradually merges into one tree. The "does this edge connect two separate components?" test is exactly `find(u) != find(v)` in a [union-find](/docs/union-find) — and adding the edge is a `union(u, v)`.

### 2.2 Implementation

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    def find(self, x):
        while self.parent[x] != x:            # iterative path halving
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                      # already connected -> would form a cycle
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True

def kruskal(n, edges):
    """n vertices (0..n-1), edges: list of (w, u, v). Returns (mst_weight, mst_edges).
    Time O(E log E), Space O(V)."""
    edges = sorted(edges)                     # by weight ascending (w is first)
    dsu = DSU(n)
    total, chosen = 0, []
    for w, u, v in edges:
        if dsu.union(u, v):                   # accept iff it merges two components
            total += w
            chosen.append((u, v, w))
            if len(chosen) == n - 1:          # a tree has exactly V-1 edges
                break
    return total, chosen

edges = [(1, 0, 1), (3, 0, 2), (2, 1, 2), (4, 1, 3), (5, 2, 3)]
print(kruskal(4, edges))
# -> (7, [(0, 1, 1), (1, 2, 2), (1, 3, 4)])   total weight 1+2+4 = 7
```

### 2.3 Complexity

- **Time:** `O(E log E)` = `O(E log V)` (since `E ≤ V²`, `log E = O(log V)`). The **sort dominates**; the `E` union-find operations cost `O(E·α(V))` ≈ `O(E)`, which is smaller.
- **Space:** `O(V)` for the DSU (+ `O(E)` if you hold all edges).

### 2.4 When Kruskal shines

**Sparse graphs** (`E ≈ V`), or graphs given as an **edge list**, or when edges *arrive sorted* (skip the sort → near-linear). Kruskal also parallelizes and streams more naturally than Prim.

---

## 3. Prim's Algorithm

### 3.1 Intuition

> **Grow a single tree from an arbitrary start vertex. Repeatedly add the cheapest edge that connects the tree to a vertex *not yet in it*.** A min-heap keyed on "cheapest edge crossing the current frontier" makes each step efficient.

Notice the structural echo of **Dijkstra** — both pop the minimum-key frontier vertex from a heap and relax neighbors. The *only* difference is the key: Dijkstra keys on `dist_from_source` (cumulative path cost), Prim keys on `edge_weight_to_tree` (a single edge). That one change turns "shortest paths" into "cheapest tree."

### 3.2 Implementation

```python
import heapq

def prim(n, adj, start=0):
    """adj[u] = list of (v, w). Returns (mst_weight, mst_edges).
    Lazy-heap version. Time O(E log V), Space O(V + E)."""
    in_tree = [False] * n
    total, chosen = 0, []
    # heap of (edge_weight, to_vertex, from_vertex)
    heap = [(0, start, -1)]
    while heap and len(chosen) < n:
        w, u, parent = heapq.heappop(heap)
        if in_tree[u]:                        # stale entry (lazy deletion) -> skip
            continue
        in_tree[u] = True
        if parent != -1:
            total += w
            chosen.append((parent, u, w))
        for v, wt in adj[u]:
            if not in_tree[v]:
                heapq.heappush(heap, (wt, v, u))   # frontier edge candidate
    return total, chosen

adj = {0: [(1, 1), (2, 3)], 1: [(0, 1), (2, 2), (3, 4)],
       2: [(0, 3), (1, 2), (3, 5)], 3: [(1, 4), (2, 5)]}
print(prim(4, adj))
# -> (7, [(0, 1, 1), (1, 2, 2), (1, 3, 4)])   same total 7 as Kruskal
```

> 💡 **Lazy vs. eager Prim.** The version above uses **lazy deletion** — push every frontier edge, skip stale pops — exactly like the idiomatic Python Dijkstra. The heap can hold up to `O(E)` entries. An **eager** version keeps at most one entry per vertex (`best[v]` = cheapest known edge to the tree) with a `decrease-key`, bounding the heap to `O(V)`; with a Fibonacci heap this gives the theoretically optimal `O(E + V log V)`. In practice the lazy binary-heap version is simplest and fast.

### 3.3 Complexity

| Prim variant | Time | Best for |
|---|---|---|
| Lazy binary heap | `O(E log V)` | default; sparse graphs |
| Eager binary heap (decrease-key) | `O(E log V)` | fewer heap entries |
| Fibonacci heap | `O(E + V log V)` | dense graphs, theory |
| Adjacency-matrix, no heap | `O(V²)` | **dense** graphs (`E ≈ V²`) — beats heaps |

**Space:** `O(V + E)` (lazy) or `O(V)` (eager / matrix).

### 3.4 When Prim shines

**Dense graphs** (`E ≈ V²`) — the `O(V²)` matrix version has no heap overhead and beats `O(E log V) = O(V² log V)`. Prim also fits when the graph is given as an **adjacency list/matrix** rather than an edge list.

---

## 4. Kruskal vs. Prim

| Dimension | Kruskal | Prim |
|---|---|---|
| Greedy structure | cheapest **edge** globally (cycle property) | cheapest edge **leaving the tree** (cut property) |
| Core data structure | Union-Find | Min-heap (or `best[]` array) |
| Grows | a **forest** that merges | a **single tree** |
| Input shape | edge list | adjacency list/matrix |
| Best on | **sparse** graphs | **dense** graphs |
| Time | `O(E log E)` | `O(E log V)` heap / `O(V²)` matrix |
| Handles disconnected input | naturally → minimum spanning **forest** | needs a restart per component |

> **One-line mental model:** *Kruskal sorts edges and unions components; Prim grows one tree with a heap. Same MST, different bookkeeping — pick by graph density and input format.*

Both are **provably optimal** by the cut/cycle properties — a rare case where greedy is not just a heuristic but exact.

---

## 5. Common mistakes

- **Kruskal without cycle check.** Skipping the `find(u) != find(v)` test lets cycles in and breaks the tree. The DSU *is* the correctness mechanism.
- **Prim keyed like Dijkstra.** Keying the heap on cumulative distance instead of single-edge weight computes a shortest-path tree, **not** an MST — a subtle, common bug. Key on the edge weight to the frontier.
- **Assuming MST = shortest-path tree.** They are different objects. An MST minimizes *total* edge weight; a shortest-path tree minimizes *each vertex's distance from a source*. They often disagree.
- **Forgetting disconnected graphs.** If `G` isn't connected, Kruskal yields a spanning *forest* (fewer than `V-1` edges); Prim only spans the start's component. Detect and handle it.
- **Directed graphs.** MST is defined for **undirected** graphs. The directed analog (minimum arborescence) needs **Chu–Liu/Edmonds'** algorithm — do not apply Kruskal/Prim to a digraph.

---

## 6. AI / ML / systems connection

- **Single-linkage clustering *is* Kruskal.** Building the MST of a distance graph and then **cutting the `k-1` heaviest MST edges** yields `k` single-linkage clusters. This is a standard way to cluster embeddings: build a k-NN distance graph, take its MST, cut the longest edges. (See the clustering discussion in [Union-Find](/docs/union-find).)
- **Approximation algorithms.** The metric-TSP 2-approximation walks an MST; MST-based heuristics appear in network design and VLSI routing.
- **Dendrograms & hierarchy.** Hierarchical agglomerative clustering's merge order corresponds to adding MST edges cheapest-first — the dendrogram is the MST's merge tree.
- **Feature graphs & manifold learning.** MSTs summarize the "backbone" of a similarity graph, used for outlier detection (long MST edges = outliers) and for building sparse connectivity in graph-based semi-supervised learning.

---

## 7. Practice Problems

| # | Problem | Algorithm | What it teaches |
|---|---|---|---|
| 1 | **Min Cost to Connect All Points** (LC 1584) | Prim (dense) or Kruskal | Complete graph over points → Prim's `O(V²)` shines; the canonical MST problem. |
| 2 | **Connecting Cities With Minimum Cost** (LC 1135) | Kruskal | Edge list + connectivity check → detect if a spanning tree even exists. |
| 3 | **Min Cost to Supply Water** (LC 1168) | Kruskal + virtual node | Model "build a well" as an edge from a virtual source — a classic modeling trick. |
| 4 | **Optimize Water Distribution** | Kruskal + virtual node | Same virtual-source pattern; reinforces the modeling insight. |
| 5 | **Critical & Pseudo-Critical Edges in MST** (LC 1489) | Kruskal ×(E+1) | Advanced: an edge is critical if removing it raises MST weight; teaches MST uniqueness/ties. |
| 6 | **Single-linkage clustering from an MST** | Kruskal | Build MST, cut `k-1` heaviest edges → `k` clusters. Bridges DSA to ML. |

### Worked note — the virtual-node trick (problems 3–4)

*You can either lay pipes between houses or dig a well at a house.* Model "dig a well at house `i`" as an **edge from a virtual node `0` to `i`** with the well's cost, then run a plain MST over `V+1` nodes. The MST automatically decides, per component, whether it's cheaper to connect to the "well source" or to pipe in from a neighbor. **Why it works:** the cut property still holds on the augmented graph, so the MST is optimal over *both* choices simultaneously — no special-casing needed.

---

## Related Guides

**Prerequisites:** [Union-Find (Disjoint Set Union)](/docs/union-find) · [Greedy Algorithms & Interval Scheduling](/docs/greedy-algorithms)  
**See also:** [Shortest Path Algorithms](/docs/shortest-path) · [Heaps & Priority Queues](/docs/heaps-and-priority-queues) · [Graph Theory](/docs/graph-theory)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
