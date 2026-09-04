---
title: Tree Algorithms — LCA, Binary Lifting, Euler Tour & Tree DP
slug: /tree-algorithms
sidebar_position: 14
sidebar_label: Tree Algorithms (LCA & Tree DP)
description: >-
  Advanced rooted-tree techniques — lowest common ancestor via binary lifting, the Euler tour that linearizes a tree, and dynamic programming on trees.
tags:
  - trees
  - lca
  - binary-lifting
  - tree-dp
difficulty: advanced
reading_time: 24
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
  - title: Dynamic Programming
    to: /docs/dynamic-programming
pagination_prev: advanced-dsa/string-matching
pagination_next: advanced-dsa/array-range-techniques
path_step: 28
---

# Tree Algorithms: LCA, Binary Lifting, Euler Tour & Tree DP

> [Trees & BSTs](/docs/trees-and-bst) covered traversal, BST operations, and LCA *in a BST* (where the ordering invariant makes it trivial). This guide handles the **general rooted tree**, where there is no ordering to exploit: computing the **lowest common ancestor** efficiently (**binary lifting**), **linearizing** a tree so subtree/path queries become array queries (**Euler tour**), and solving optimization problems with **dynamic programming on trees**. These are the workhorses behind hierarchy queries, dependency analysis, and structured reasoning.

Assumes comfort with DFS ([BFS & DFS](/docs/bfs-dfs)) and 1-D DP ([Dynamic Programming](/docs/dynamic-programming)).

---

## 1. Lowest Common Ancestor (LCA)

### 1.1 What and why

The **LCA** of two nodes `u` and `v` in a rooted tree is the **deepest node that is an ancestor of both**. It answers "where do the paths from the root to `u` and to `v` diverge?" — the join point of two elements in a hierarchy.

**Why it matters.** Distance between two nodes (`dist(u,v) = depth[u] + depth[v] - 2·depth[LCA]`), path queries, taxonomy/ontology reasoning ("most specific common category"), version-control merge bases (`git merge-base` *is* an LCA on the commit DAG), and phylogenetic trees.

### 1.2 The naïve approaches

- **Walk up equalizing depth, then together:** bring the deeper node up to the shallower's depth, then move both up one step at a time until they meet. `O(depth)` per query — fine for one query, too slow for many on a deep tree.
- **Store parent pointers + a visited set:** walk `u` to root marking nodes, then walk `v` up until you hit a marked node. `O(depth)`.

For **many queries**, we precompute so each query is `O(log n)` (binary lifting) or `O(1)` (Euler tour + sparse table).

### 1.3 Binary lifting

> **Precompute `up[k][v]` = the `2^k`-th ancestor of `v`.** Any jump of `j` steps decomposes into powers of two (binary representation of `j`), so you can climb any distance in `O(log n)` hops. Answer LCA by (1) lifting the deeper node to equal depth, then (2) lifting both in lockstep by decreasing powers of two while their ancestors differ.

```python
import math

class LCA:
    def __init__(self, n, adj, root=0):
        """adj: undirected tree adjacency lists. Preprocessing O(n log n)."""
        self.LOG = max(1, math.ceil(math.log2(n)))
        self.up = [[-1] * n for _ in range(self.LOG)]   # up[k][v] = 2^k-th ancestor
        self.depth = [0] * n
        # iterative DFS to set depth[] and up[0][] = direct parent
        stack = [(root, -1)]
        while stack:
            u, p = stack.pop()
            self.up[0][u] = p
            for w in adj[u]:
                if w != p:
                    self.depth[w] = self.depth[u] + 1
                    stack.append((w, u))
        # fill the lifting table: 2^k ancestor = 2^(k-1) ancestor of the 2^(k-1) ancestor
        for k in range(1, self.LOG):
            for v in range(n):
                mid = self.up[k - 1][v]
                self.up[k][v] = self.up[k - 1][mid] if mid != -1 else -1

    def kth_ancestor(self, v, k):
        """The k-th ancestor of v, or -1. O(log n)."""
        for i in range(self.LOG):
            if v == -1:
                break
            if (k >> i) & 1:                 # this power-of-two is in k's binary form
                v = self.up[i][v]
        return v

    def query(self, u, v):
        """LCA of u and v. O(log n)."""
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        # 1) lift the deeper node (u) up to v's depth
        u = self.kth_ancestor(u, self.depth[u] - self.depth[v])
        if u == v:
            return u                          # v was an ancestor of u
        # 2) lift both by decreasing powers until their parents coincide
        for k in range(self.LOG - 1, -1, -1):
            if self.up[k][u] != self.up[k][v]:
                u = self.up[k][u]
                v = self.up[k][v]
        return self.up[0][u]                  # parent of the divergence point

# Tree:      0
#           / \
#          1   2
#         / \   \
#        3   4   5
adj = {0: [1, 2], 1: [0, 3, 4], 2: [0, 5], 3: [1], 4: [1], 5: [2]}
lca = LCA(6, [adj[i] for i in range(6)])
print(lca.query(3, 4))   # 1
print(lca.query(3, 5))   # 0
print(lca.query(4, 1))   # 1  (1 is an ancestor of 4)
```

### 1.4 Complexity

| Method | Preprocess | Per query | Space |
|---|---|---|---|
| Naïve walk-up | `O(n)` | `O(depth)` = `O(n)` worst | `O(n)` |
| **Binary lifting** | `O(n log n)` | **`O(log n)`** | `O(n log n)` |
| Euler tour + sparse table (§2) | `O(n log n)` | **`O(1)`** | `O(n log n)` |

Binary lifting is the pragmatic default: simple, supports **k-th ancestor** queries for free, and `O(log n)` per query is plenty fast. Euler-tour + sparse table wins when you need `O(1)` queries and don't need k-th ancestor.

### 1.5 Common mistakes

- **Wrong `LOG`.** `LOG` must satisfy `2^LOG > n`; too small and deep ancestors overflow the table. Use `ceil(log2(n))` and guard `n = 1`.
- **`-1` sentinel handling.** Climbing past the root must yield `-1` and stay `-1`; propagate it carefully when filling `up[k]`.
- **Recursion depth.** A path-shaped tree has depth `n`; recursive DFS overflows Python's stack. Use the iterative DFS shown above.

---

## 2. Euler Tour: linearizing a tree

### 2.1 The idea

> **A DFS that records each node when it is *entered* (and optionally when *exited*) produces an "Euler tour" — a flat array in which each subtree occupies a *contiguous range*.** This converts **subtree queries** into **range queries** on an array, letting you apply a [Fenwick/segment tree](/docs/segment-tree-fenwick) to tree problems.

Record `tin[v]` (entry time) and `tout[v]` (exit time) during DFS. Then:

- **`u` is an ancestor of `v`** iff `tin[u] <= tin[v] and tout[v] <= tout[u]` — an `O(1)` ancestry test.
- **The subtree of `v`** is exactly the array positions `[tin[v], tout[v]]` — so "sum over `v`'s subtree" becomes a range-sum query.

```python
def euler_tour(n, adj, root=0):
    """Compute entry/exit times (subtree of v = positions [tin[v], tout[v]]). O(n)."""
    tin = [0] * n
    tout = [0] * n
    timer = [0]
    stack = [(root, -1, False)]                # (node, parent, is_exit)
    while stack:
        u, p, is_exit = stack.pop()
        if is_exit:
            tout[u] = timer[0] - 1             # last position inside u's subtree
            continue
        tin[u] = timer[0]; timer[0] += 1
        stack.append((u, p, True))             # schedule the exit marker
        for w in adj[u]:
            if w != p:
                stack.append((w, u, False))
    return tin, tout

adj = {0: [1, 2], 1: [0, 3, 4], 2: [0, 5], 3: [1], 4: [1], 5: [2]}
tin, tout = euler_tour(6, [adj[i] for i in range(6)])
# Subtree of node 1 = array positions [tin[1], tout[1]] -> includes 1, 3, 4
print(tin, tout)
```

### 2.2 Why this is powerful

Combining Euler tour with a Fenwick/segment tree gives:

- **Subtree aggregate + point update:** "add `x` to node `v`," "sum of `v`'s subtree" — both `O(log n)` (point update, range query on the tour array).
- **Path update via Euler tour on edges** (with a `+`/`-` at entry/exit) supports "add to every node on the path root→v."
- **LCA in `O(1)`:** a different Euler tour (recording every visit, `2n-1` entries) plus a **sparse table** for range-minimum-of-depth answers LCA in constant time per query. This is the `O(1)`-query row in §1.4.

### 2.3 AI / systems connection

- **Hierarchy/subtree queries at scale.** Category trees, org charts, file systems, and comment threads use Euler-tour + Fenwick to answer "aggregate over this subtree" without re-walking it — the same move databases use for nested-set models of hierarchies.
- **Scene/computation graphs.** Aggregating a property over a subtree of a render graph or a nested module tree maps to a contiguous-range query after linearization.

---

## 3. Dynamic Programming on Trees

### 3.1 The idea

> **Solve a tree optimization by combining children's answers into the parent's answer during a post-order DFS.** Each node's DP value depends only on its subtree, computed *after* its children — exactly [post-order traversal](/docs/trees-and-bst). This is [DP](/docs/dynamic-programming) where the "smaller subproblems" are subtrees.

Tree DP shines on problems that are NP-hard on general graphs but **polynomial on trees**, because the tree structure removes the overlapping-choice explosion.

### 3.2 Worked example — maximum weight independent set (House Robber III)

*Choose a subset of nodes with no two adjacent (parent–child), maximizing total value.* On a general graph this is NP-hard; on a tree it's linear via two states per node:

```python
def max_independent_set(adj, values, root=0):
    """dp[v] = (best if v is EXCLUDED, best if v is INCLUDED). O(n)."""
    # iterative post-order so children are processed before parents
    order, stack = [], [(root, -1)]
    parent = {root: -1}
    while stack:
        u, p = stack.pop()
        order.append(u)
        for w in adj[u]:
            if w != p:
                parent[w] = u
                stack.append((w, u))
    excl = {v: 0 for v in adj}
    incl = {v: 0 for v in adj}
    for u in reversed(order):                  # leaves first, root last
        incl[u] = values[u]
        excl[u] = 0
        for w in adj[u]:
            if w != parent[u]:
                incl[u] += excl[w]             # if u is taken, children must be excluded
                excl[u] += max(incl[w], excl[w])   # if u is skipped, children are free
    return max(incl[root], excl[root])

#        3(root)
#       / \
#      2   3
#       \   \
#        3   1
adj = {0: [1, 2], 1: [0, 3], 2: [0, 4], 3: [1], 4: [2]}
values = [3, 2, 3, 3, 1]
print(max_independent_set(adj, values))   # 7  (take root=3 + the two grandchildren 3,1)
```

### 3.3 The recurring tree-DP patterns

- **Two-state DP (include/exclude the node):** independent set, min vertex cover, tree matching.
- **Subtree aggregate:** subtree sizes, sums, counts — one post-order pass.
- **Rerooting ("all roots") DP:** compute an answer for *every* node as root in `O(n)` total, by a second pass that re-uses the first pass's subtree answers (e.g. "sum of distances from each node to all others," LC 834).
- **Tree diameter:** the longest path; two DFS passes, or one post-order tracking the two deepest child-depths per node.

### 3.4 Complexity & pitfalls

- **Time:** typically `O(n · states)` — linear when states are constant. **Space:** `O(n)` for the DP tables + `O(n)` recursion (use iterative post-order for deep trees).
- **Pitfall — recomputing subtrees.** Each subtree must be solved once; the post-order ordering guarantees children finish before parents. Recomputing turns `O(n)` into exponential.
- **Pitfall — rerooting done wrong.** Rerooting needs the parent's answer *excluding the current child's contribution*; naïvely reusing the full subtree answer double-counts. Subtract the child's contribution before passing down.

### 3.5 AI / ML / systems connection

- **Parse-tree & AST evaluation.** Evaluating an expression tree, type-checking an AST, or scoring a constituency parse is post-order tree DP — combine children's results at each node.
- **Probabilistic graphical models on trees.** **Belief propagation / the sum-product algorithm** on a tree-structured factor graph is exactly tree DP: messages flow leaf→root (collect) then root→leaf (distribute), and it is *exact* precisely because the graph is a tree (no cycles → no overlapping recomputation). Loopy graphs lose this guarantee.
- **Hierarchical softmax.** Computing token probabilities via a tree over the vocabulary aggregates path probabilities root→leaf — a tree traversal that turns an `O(V)` softmax into `O(log V)`.
- **Decision-tree inference & tree ensembles.** A prediction is a root-to-leaf walk; training splits recursively per subtree — the structure of tree DP with a learned objective.

---

## 4. Summary

| Technique | Solves | Preprocess | Query | Core idea |
|---|---|---|---|---|
| Binary lifting | LCA, k-th ancestor | `O(n log n)` | `O(log n)` | jump by powers of two |
| Euler tour | subtree/ancestry queries | `O(n)` | `O(1)`–`O(log n)` | linearize → range queries |
| Euler tour + sparse table | LCA | `O(n log n)` | `O(1)` | range-min of depths |
| Tree DP | subtree optimization | — | `O(n · states)` | post-order child→parent combine |

The connective tissue: a rooted tree is solved by processing it in **DFS order** — pre-order timestamps (Euler tour) linearize it, post-order (tree DP) combines it bottom-up, and ancestor jumps (binary lifting) navigate it. All three are DFS wearing different hats.

---

## 5. Practice Problems

| # | Problem | Technique | What it teaches |
|---|---|---|---|
| 1 | **Lowest Common Ancestor of a Binary Tree** (LC 236) | LCA (recursive) | The general-tree LCA (no BST ordering) — contrast with the BST version in [Trees & BST](/docs/trees-and-bst). |
| 2 | **Kth Ancestor of a Tree Node** (LC 1483) | Binary lifting | The lifting table itself is the intended solution. |
| 3 | **Count of Nodes / subtree sums via Euler tour** | Euler tour + Fenwick | Subtree query = contiguous range after linearization. |
| 4 | **House Robber III** (LC 337) | Tree DP (include/exclude) | The two-state pattern verbatim. |
| 5 | **Diameter of Binary Tree** (LC 543) | Tree DP | Longest path via per-node deepest two child-depths. |
| 6 | **Sum of Distances in Tree** (LC 834) | Rerooting DP | The `O(n)` all-roots pattern — two DFS passes. |
| 7 | **Binary Tree Maximum Path Sum** (LC 124) | Tree DP | Post-order combine with a "best path through this node" accumulator. |

### Worked note — LCA distance formula (problem 1 follow-up)

Once you have LCA and depths, the distance between any two nodes is `O(log n)`:

```python
def tree_distance(lca_struct, u, v):
    w = lca_struct.query(u, v)
    return (lca_struct.depth[u] + lca_struct.depth[v]
            - 2 * lca_struct.depth[w])       # both paths meet at the LCA

print(tree_distance(lca, 3, 5))   # 3->1->0->2->5 = 4 edges
```

**Why it works:** the path `u→v` goes up to the LCA then down to `v`. Its length is `(depth[u] − depth[LCA]) + (depth[v] − depth[LCA])`, which simplifies to the formula. **Failure mode:** using the wrong node as LCA (e.g., a shallow common ancestor) inflates the distance — the *lowest* common ancestor is what makes the two upward segments minimal.

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Dynamic Programming](/docs/dynamic-programming)  
**See also:** [BFS & DFS Traversal](/docs/bfs-dfs) · [Segment Tree & Fenwick Tree](/docs/segment-tree-fenwick) · [Graph Theory](/docs/graph-theory)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
